import { clipboard } from 'electron'
import { generateText, streamText, type ModelMessage, type UserContent } from 'ai'
import { IPC } from '@shared/api'
import { lastCodeBlock } from '@shared/markdown'
import type { AskMode, AskRequest, ScreenshotInfo, Settings } from '@shared/types'
import { getSettings } from './settings'
import { captureScreen, type Screenshot } from './screenshots'
import { getModel } from './ai/providers'
import { ShadowError, toUserError } from './ai/errors'
import {
  EXTRACT_PROMPT,
  debugPrompt,
  debugUserText,
  followupPrompt,
  formatTranscript,
  livePrompt,
  solvePrompt,
  solveUserText
} from './ai/prompts'
import { broadcast } from './windows'
import { clearTranscript, getListenStatus, latestQuestion, lastTurnEndedAt, recentTranscript } from './live/listen'

// The session holds everything about the current problem: queued screenshots,
// the conversation so far, and the answer that is streaming right now.

const MAX_SCREENSHOTS = 4
// Ctrl+Shift+Enter answers the conversation (not just the screen) if someone spoke this recently.
const RECENT_SPEECH_MS = 2 * 60_000
// Main batches tokens for this long before sending them to the UI (fewer IPC messages, smoother rendering).
const FLUSH_MS = 30

let screenshots: Screenshot[] = []
let history: ModelMessage[] = []
let currentAnswer = ''
let inflight: { id: string; controller: AbortController } | null = null

const publicScreenshots = (): ScreenshotInfo[] => screenshots.map(({ id, thumb }) => ({ id, thumb }))
const emitScreenshots = () => broadcast(IPC.screenshots, publicScreenshots())

export async function takeScreenshot(): Promise<void> {
  const shot = await captureScreen()
  // Keep the newest shots; the oldest falls off the queue.
  screenshots = [...screenshots, shot].slice(-MAX_SCREENSHOTS)
  emitScreenshots()
}

export function removeScreenshot(id: string): void {
  screenshots = screenshots.filter((s) => s.id !== id)
  emitScreenshots()
}

export function cancelAnswer(): void {
  inflight?.controller.abort()
}

const resetListeners = new Set<() => void>()
export const onSessionReset = (fn: () => void) => resetListeners.add(fn)

export function resetSession(): void {
  resetListeners.forEach((fn) => fn())
  cancelAnswer()
  copyWhenCodeCompletes = false
  screenshots = []
  history = []
  currentAnswer = ''
  clearTranscript()
  emitScreenshots()
  broadcast(IPC.sessionReset)
}

// Set when the user asks to copy while the code block is still streaming in.
let copyWhenCodeCompletes = false

export function copyLastCode(): void {
  if (inflight && !lastCodeBlockIsClosed(currentAnswer)) {
    // Copying now would grab half a solution; wait for the block (or the answer) to finish.
    copyWhenCodeCompletes = true
    broadcast(IPC.toast, 'Code is still being written. It will be copied when it finishes.')
    return
  }
  copyNow()
}

function copyNow(): void {
  copyWhenCodeCompletes = false
  const code = lastCodeBlock(currentAnswer)
  if (code === null) {
    broadcast(IPC.toast, 'No code to copy yet')
    return
  }
  clipboard.writeText(code)
  broadcast(IPC.toast, 'Code copied')
}

/** True once the answer contains at least one code block and the last one has its closing fence. */
function lastCodeBlockIsClosed(markdown: string): boolean {
  const fences = markdown.match(/^[ \t]*(```|~~~)/gm)?.length ?? 0
  return fences > 0 && fences % 2 === 0
}

/**
 * Ctrl+Shift+Enter. While listening (or just after) with nothing queued: answer the last
 * question heard from either speaker, looking at the screen too. Otherwise: solve the queue,
 * or debug if a solution already exists and new shots are queued.
 */
export function smartAnswer(): Promise<void> {
  const heardRecently = getListenStatus().state === 'on' || Date.now() - lastTurnEndedAt() < RECENT_SPEECH_MS
  if (heardRecently && screenshots.length === 0 && latestQuestion()) {
    return ask({ mode: 'live', withScreen: true })
  }
  const mode: AskMode = history.length > 0 && screenshots.length > 0 ? 'debug' : 'solve'
  return ask({ mode })
}

export const isAnswering = () => inflight !== null

const imageParts = (shots: Screenshot[]) =>
  shots.map((s) => ({ type: 'file' as const, mediaType: 'image/png', data: s.png }))

/** For answer models without vision: have the vision model transcribe the screenshots first. */
async function transcribeScreenshots(shots: Screenshot[], settings: Settings, signal: AbortSignal): Promise<string> {
  if (!settings.visionModel.vision) {
    throw new ShadowError('NO_VISION', 'Neither selected model can read images. Pick a vision model in Settings.')
  }
  const { text } = await generateText({
    model: await getModel(settings.visionModel, settings),
    instructions: EXTRACT_PROMPT,
    messages: [{ role: 'user', content: [{ type: 'text', text: 'Transcribe this problem.' }, ...imageParts(shots)] }],
    maxOutputTokens: 4096,
    abortSignal: signal
  })
  return text
}

export async function ask(req: AskRequest): Promise<void> {
  cancelAnswer() // one answer at a time
  copyWhenCodeCompletes = false
  const settings = getSettings()
  const promptOptions = { language: settings.language, verbosity: settings.verbosity }

  let mode = req.mode
  if (mode === 'debug' && history.length === 0) mode = 'solve'
  if (mode === 'followup' && !req.text?.trim()) return
  const liveQuestion = mode === 'live' ? (req.text?.trim() || latestQuestion()) : undefined
  if (mode === 'live' && !liveQuestion) {
    broadcast(IPC.toast, 'No question heard yet')
    return
  }
  // Solve/debug with an empty queue means "use what's on screen right now".
  if ((mode === 'solve' || mode === 'debug' || req.withScreen) && screenshots.length === 0) await takeScreenshot()

  const shots = screenshots
  screenshots = []
  emitScreenshots()

  let instructions: string
  let userText: string
  let context: ModelMessage[]
  switch (mode) {
    case 'solve':
      instructions = solvePrompt(promptOptions)
      userText = solveUserText(shots.length, settings.language)
      context = []
      break
    case 'debug':
      instructions = debugPrompt(promptOptions)
      userText = debugUserText(shots.length)
      context = history
      break
    case 'followup':
      instructions = followupPrompt(promptOptions, history.length > 0)
      userText = req.text!.trim()
      context = history
      break
    case 'live':
      instructions = livePrompt(promptOptions)
      userText = `RECENT TRANSCRIPT (oldest → newest):\n${formatTranscript(recentTranscript()) || '(empty)'}\n\nQUESTION: ${liveQuestion}`
      context = history
      break
  }

  const id = crypto.randomUUID()
  const controller = new AbortController()
  inflight = { id, controller }
  currentAnswer = ''
  const model = settings.answerModel
  broadcast(IPC.answerStart, {
    id,
    mode,
    prompt: { solve: 'Solve this problem', debug: 'Debug this', followup: userText, live: `🎙 ${liveQuestion}` }[mode],
    screenshotCount: shots.length,
    provider: model.provider,
    modelId: model.modelId
  })

  const startedAt = performance.now()
  let firstTokenMs: number | null = null
  let pending = ''
  const flush = () => {
    if (!pending) return
    broadcast(IPC.answerChunk, { id, delta: pending })
    pending = ''
  }
  const timer = setInterval(flush, FLUSH_MS)

  try {
    let content: UserContent
    if (shots.length > 0 && !model.vision) {
      broadcast(IPC.answerStatus, { id, status: 'Reading screenshots…' })
      const problem = await transcribeScreenshots(shots, settings, controller.signal)
      content = [{ type: 'text', text: `${userText}\n\nThe screenshots, transcribed:\n\n${problem}` }]
    } else {
      content = [{ type: 'text', text: userText }, ...imageParts(shots)]
    }
    broadcast(IPC.answerStatus, { id, status: shots.length > 0 ? 'Reading screen…' : 'Thinking…' })

    const result = streamText({
      model: await getModel(model, settings),
      instructions,
      messages: [...context, { role: 'user', content }],
      maxOutputTokens: 8192,
      maxRetries: 2,
      abortSignal: controller.signal,
      timeout: { chunkMs: 60_000 }
    })
    for await (const part of result.stream) {
      if (part.type === 'text-delta') {
        firstTokenMs ??= Math.round(performance.now() - startedAt)
        currentAnswer += part.text
        pending += part.text
        if (copyWhenCodeCompletes && lastCodeBlockIsClosed(currentAnswer)) copyNow()
      } else if (part.type === 'error') {
        throw part.error
      }
    }
    flush()

    if (controller.signal.aborted) {
      broadcast(IPC.answerDone, { id, aborted: true, firstTokenMs, totalMs: Math.round(performance.now() - startedAt) })
      return
    }
    // History stays text-only: the answer's "## Problem" section already captures what the
    // screenshots said, and re-sending images on every follow-up would waste free-tier quota.
    // Live turns keep just the question; the transcript is re-sent fresh with each live answer.
    const asked = mode === 'live' ? `Question asked in the conversation: ${liveQuestion}` : userText
    const userTurn = shots.length > 0 ? `${asked} [${shots.length} screenshot(s) attached]` : asked
    history = [...context, { role: 'user', content: userTurn }, { role: 'assistant', content: currentAnswer }]
    broadcast(IPC.answerDone, { id, aborted: false, firstTokenMs, totalMs: Math.round(performance.now() - startedAt) })
  } catch (err) {
    flush()
    if (controller.signal.aborted) {
      broadcast(IPC.answerDone, { id, aborted: true, firstTokenMs, totalMs: Math.round(performance.now() - startedAt) })
    } else {
      broadcast(IPC.answerError, { id, ...toUserError(err, model) })
    }
  } finally {
    clearInterval(timer)
    if (inflight?.id === id) inflight = null
    // The answer ended before the block closed (stopped, error, or truncated): copy what exists.
    if (copyWhenCodeCompletes) copyNow()
  }
}
