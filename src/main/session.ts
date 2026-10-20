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
  solvePrompt,
  solveUserText
} from './ai/prompts'
import { broadcast } from './windows'

// The session holds everything about the current problem: queued screenshots,
// the conversation so far, and the answer that is streaming right now.

const MAX_SCREENSHOTS = 4
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

export function resetSession(): void {
  cancelAnswer()
  screenshots = []
  history = []
  currentAnswer = ''
  emitScreenshots()
  broadcast(IPC.sessionReset)
}

export function copyLastCode(): void {
  const code = lastCodeBlock(currentAnswer)
  if (code === null) {
    broadcast(IPC.toast, 'No code to copy yet')
    return
  }
  clipboard.writeText(code)
  broadcast(IPC.toast, 'Code copied')
}

/** Ctrl+Shift+Enter: solve the queue, or debug if a solution already exists and new shots are queued. */
export function smartAnswer(): Promise<void> {
  const mode: AskMode = history.length > 0 && screenshots.length > 0 ? 'debug' : 'solve'
  return ask({ mode })
}

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
  const settings = getSettings()
  const promptOptions = { language: settings.language, verbosity: settings.verbosity }

  let mode = req.mode
  if (mode === 'debug' && history.length === 0) mode = 'solve'
  if (mode === 'followup' && !req.text?.trim()) return
  // Solve/debug with an empty queue means "use what's on screen right now".
  if (mode !== 'followup' && screenshots.length === 0) await takeScreenshot()

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
  }

  const id = crypto.randomUUID()
  const controller = new AbortController()
  inflight = { id, controller }
  currentAnswer = ''
  const model = settings.answerModel
  broadcast(IPC.answerStart, {
    id,
    mode,
    prompt: mode === 'followup' ? userText : mode === 'solve' ? 'Solve this problem' : 'Debug this',
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
    const userTurn = shots.length > 0 ? `${userText} [${shots.length} screenshot(s) attached]` : userText
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
  }
}
