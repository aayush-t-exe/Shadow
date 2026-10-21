import { app } from 'electron'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { looksLikeQuestion, questionScore } from '@shared/question'
import { similarity } from '@shared/text'
import { getSettings } from '../settings'
import { getModel, speedOptions } from '../ai/providers'
import { getApiKey } from '../secrets'
import { providerInfo } from '@shared/providers'
import type { ModelChoice } from '@shared/types'
import { TRIAGE_PROMPT, formatTranscript } from '../ai/prompts'
import { ask, onSessionReset, whenIdle } from '../session'
import { SPEAKER } from '@shared/live'
import { IPC } from '@shared/api'
import { hotkeyFor, keycaps } from '@shared/hotkeys'
import { broadcast } from '../windows'
import { onTurnSignal, recentTranscript, type FinalTurn } from './listen'

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
  /** The latest turn repeats a question that was already answered. */
  alreadyAnswered: z.boolean(),
  question: z.string(),
  confidence: z.number().min(0).max(1)
})

const answerAgainHint = `Press ${keycaps(hotkeyFor('solve').accelerator).join('+')} to answer it again.`
const REPEAT_TOAST_EVERY_MS = 10_000
let lastRepeatToastAt = 0

/** Says "heard you" when a repeated question is skipped, once per stretch of fragments. */
function toastRepeat() {
  if (Date.now() - lastRepeatToastAt < REPEAT_TOAST_EVERY_MS) return
  lastRepeatToastAt = Date.now()
  broadcast(IPC.toast, `Heard that question again; it's answered above. ${answerAgainHint}`)
}

let lastMicStart = 0
let lastAutoAnswerAt = 0
let resetEpoch = 0
let queue: Promise<void> = Promise.resolve()
let answered: string[] = []

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** The classifier runs on the backup model when there is one: it's usually the fast one, and it keeps the main model's free quota for answers. */
async function classifierModel(): Promise<ModelChoice> {
  const settings = getSettings()
  const backup = settings.backupModel
  if (backup?.modelId && (!providerInfo(backup.provider).needsKey || (await getApiKey(backup.provider)))) return backup
  return settings.answerModel
}

async function classify(turn: FinalTurn): Promise<z.infer<typeof triageSchema> | null> {
  const settings = getSettings()
  const choice = await classifierModel()
  try {
    const { output } = await generateText({
      model: await getModel(choice, settings),
      providerOptions: speedOptions(choice, 'classify'),
      instructions: TRIAGE_PROMPT,
      prompt: `RECENT TRANSCRIPT (oldest → newest):
${formatTranscript(recentTranscript(8, 4000))}

ALREADY ANSWERED:
${answered.length ? answered.map((q) => `- ${q}`).join('\n') : '(none)'}

LATEST TURN (${SPEAKER[turn.source]}): ${turn.text}`,
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
  // No "still listening?" check: the final sentence is often delivered just after the user
  // stops listening, and that's exactly the question they want answered.
  const settings = getSettings()
  if (!settings.autoAnswer) return
  if (turn.source === 'mic' && settings.answerFrom !== 'anyone') return
  if (!looksLikeQuestion(turn.text)) return

  if (turn.source === 'system') {
    await sleep(SELF_ANSWER_GRACE_MS)
    if (lastMicStart > turn.endedAt) return
  }
  if (Date.now() - lastAutoAnswerAt < COOLDOWN_MS) return

  const verdict = await classify(turn)
  if (!app.isPackaged) console.log('[auto-answer]', JSON.stringify({ heard: turn.text, verdict }))
  let question: string
  if (verdict) {
    if (verdict.alreadyAnswered) {
      // Let the user know it was heard, not ignored.
      toastRepeat()
      return
    }
    if (!verdict.needsAnswer || verdict.confidence < MIN_CONFIDENCE) return
    question = verdict.question.trim() || turn.text
  } else {
    if (questionScore(turn.text) < 2) return
    question = turn.text
  }
  if (answered.some((q) => similarity(q, question) >= DUPLICATE_SIMILARITY)) {
    toastRepeat()
    return
  }

  answered = [...answered, question].slice(-REMEMBERED_QUESTIONS)
  lastAutoAnswerAt = Date.now()
  // Queue behind any answer that's still streaming (ask() resolves only when its answer is
  // complete, so chaining serialises them). A reset in the meantime drops queued questions.
  const epoch = resetEpoch
  const job = queue.then(async () => {
    await whenIdle()
    if (epoch === resetEpoch) await ask({ mode: 'live', text: question })
  })
  queue = job.catch(() => {}) // one failed answer must not block the ones queued after it
  await job
}

export function startAutoAnswer() {
  onTurnSignal((signal) => {
    if (signal.kind === 'mic-start') lastMicStart = Date.now()
    else if (signal.kind === 'final') void consider(signal.turn)
  })
  onSessionReset(() => {
    answered = []
    resetEpoch++
  })
}
