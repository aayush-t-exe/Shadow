import { generateText, Output } from 'ai'
import { z } from 'zod'
import { looksLikeQuestion, questionScore } from '@shared/question'
import { similarity } from '@shared/text'
import { getSettings } from '../settings'
import { getModel } from '../ai/providers'
import { TRIAGE_PROMPT, formatTranscript } from '../ai/prompts'
import { ask, onSessionReset } from '../session'
import { getListenStatus, onTurnSignal, recentTranscript, type FinalTurn } from './listen'

// Decides when a finished "Them" turn deserves an automatic answer:
//   1. free heuristic (question words, "?")       → most small talk stops here
//   2. short pause: if "You" starts talking, they're answering it themselves
//   3. cooldown + "already answered this" check
//   4. AI classifier returns {needsAnswer, question, confidence} as JSON
//   5. stream a live answer for the rewritten, self-contained question

const SELF_ANSWER_GRACE_MS = 700
const COOLDOWN_MS = 6000
const MIN_CONFIDENCE = 0.6
const DUPLICATE_SIMILARITY = 0.8
const TRIAGE_TIMEOUT_MS = 6000
const REMEMBERED_QUESTIONS = 10

const triageSchema = z.object({
  needsAnswer: z.boolean(),
  question: z.string(),
  confidence: z.number().min(0).max(1)
})

let lastMicStart = 0
let lastAutoAnswerAt = 0
let answered: string[] = []

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function classify(turn: FinalTurn): Promise<z.infer<typeof triageSchema> | null> {
  const settings = getSettings()
  try {
    const { output } = await generateText({
      model: await getModel(settings.answerModel, settings),
      instructions: TRIAGE_PROMPT,
      prompt: `RECENT TRANSCRIPT (oldest → newest; the last Them line is the LATEST turn):
${formatTranscript(recentTranscript(8, 4000))}

ALREADY ANSWERED:
${answered.length ? answered.map((q) => `- ${q}`).join('\n') : '(none)'}

LATEST THEM TURN: ${turn.text}`,
      output: Output.object({ schema: triageSchema }),
      maxOutputTokens: 300,
      maxRetries: 0,
      timeout: { totalMs: TRIAGE_TIMEOUT_MS }
    })
    return output
  } catch (err) {
    // Small or local models sometimes can't produce JSON; fall back to the heuristic alone.
    console.warn('[auto-answer] classifier failed:', err instanceof Error ? err.message : err)
    return null
  }
}

async function consider(turn: FinalTurn) {
  if (!getSettings().autoAnswer || getListenStatus().state !== 'on') return
  if (!looksLikeQuestion(turn.text)) return

  await sleep(SELF_ANSWER_GRACE_MS)
  if (lastMicStart > turn.endedAt) return
  if (Date.now() - lastAutoAnswerAt < COOLDOWN_MS) return

  const verdict = await classify(turn)
  let question: string
  if (verdict) {
    if (!verdict.needsAnswer || verdict.confidence < MIN_CONFIDENCE) return
    question = verdict.question.trim() || turn.text
  } else {
    if (questionScore(turn.text) < 2) return
    question = turn.text
  }
  if (answered.some((q) => similarity(q, question) >= DUPLICATE_SIMILARITY)) return

  answered = [...answered, question].slice(-REMEMBERED_QUESTIONS)
  lastAutoAnswerAt = Date.now()
  await ask({ mode: 'live', text: question })
}

export function startAutoAnswer() {
  onTurnSignal((signal) => {
    if (signal.kind === 'mic-start') lastMicStart = Date.now()
    else if (signal.kind === 'final' && signal.turn.source === 'system') void consider(signal.turn)
  })
  onSessionReset(() => {
    answered = []
  })
}
