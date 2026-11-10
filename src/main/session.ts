import { clipboard } from 'electron'
import { generateText, streamText, type ModelMessage, type UserContent } from 'ai'
import { IPC } from '@shared/api'
import { lastCodeBlock } from '@shared/markdown'
import type { AskMode, AskRequest, ModelChoice, ScreenshotInfo, Settings } from '@shared/types'
import { providerInfo } from '@shared/providers'
import { styleFromQuestion } from '@shared/profile'
import { spokeHindi } from '@shared/question'
import { getSettings } from './settings'
import { loadInterviewContext } from './profiles'
import { captureScreen, type Screenshot } from './screenshots'
import { activeModels, canUse, getModel, speedOptions } from './ai/providers'
import { raceText, type Finish } from './ai/race'
import { getCloudStatus, recordFirstToken, refreshCloud, type CloudAction } from './cloud'
import { NO_CREDITS_MESSAGE, ShadowError, toUserError } from './ai/errors'
import {
  EXTRACT_PROMPT,
  CONTINUE_CUT_OFF,
  ENGLISH_REPLY,
  HINGLISH_REPLY,
  debugPrompt,
  debugUserText,
  followupPrompt,
  formatTranscript,
  livePrompt,
  type PromptOptions,
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
// No text from the main model after this long: race the backup model too.
const HEDGE_AFTER_MS = 5000
// Main batches tokens for this long before sending them to the UI (fewer IPC messages, smoother rendering).
const FLUSH_MS = 30

let screenshots: Screenshot[] = []
let history: ModelMessage[] = []
let currentAnswer = ''
let inflight: { id: string; controller: AbortController } | null = null
/** A question that hit the paywall, with its screenshots: answered automatically once credits arrive. */
let parked: { req: AskRequest; shots: Screenshot[] } | null = null

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

const manualListeners = new Set<(question: string) => void>()
/** Ctrl+Shift+Enter answered a heard question, so auto-answer can drop its own late answer. */
export const onManualLiveAnswer = (fn: (question: string) => void) => manualListeners.add(fn)

export function resetSession(): void {
  resetListeners.forEach((fn) => fn())
  cancelAnswer()
  copyWhenCodeCompletes = false
  screenshots = []
  parked = null
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
  const question = heardRecently && screenshots.length === 0 ? latestQuestion() : undefined
  if (question) {
    manualListeners.forEach((fn) => fn(question))
    return ask({ mode: 'live', text: question, withScreen: true })
  }
  const mode: AskMode = history.length > 0 && screenshots.length > 0 ? 'debug' : 'solve'
  return ask({ mode })
}

export const isAnswering = () => inflight !== null

/**
 * After a purchase: answers the question that hit the paywall, with the screenshots it had.
 * Returns true if there was one.
 */
export function resumePending(): boolean {
  const saved = parked
  parked = null
  if (!saved) return false
  screenshots = [...saved.shots, ...screenshots].slice(-MAX_SCREENSHOTS)
  emitScreenshots()
  void ask(saved.req)
  return true
}

/** Shadow Cloud: true when the credits can't cover an answer (checks the server before saying so). */
async function outOfCredits(): Promise<boolean> {
  const status = getCloudStatus()
  if (status.balance === null || status.balance >= status.creditsPerAnswer) return false
  const fresh = await refreshCloud()
  return fresh.balance !== null && fresh.balance < fresh.creditsPerAnswer
}

const idleWaiters: Array<() => void> = []
/** Resolves once no answer is streaming. Auto-answers queue behind the current answer instead of cutting it off. */
export function whenIdle(): Promise<void> {
  if (!inflight) return Promise.resolve()
  return new Promise((resolve) => idleWaiters.push(resolve))
}

const imageParts = (shots: Screenshot[]) =>
  shots.map((s) => ({ type: 'file' as const, mediaType: 'image/png', data: s.png }))

/** The backup model, if one is set, is usable, and can handle this request. */
async function usableBackup(
  settings: Settings,
  answer: ModelChoice,
  backup: ModelChoice | null,
  sendsImages: boolean
): Promise<ModelChoice | undefined> {
  if (!backup?.modelId || (sendsImages && !backup.vision)) return undefined
  if (backup.provider === answer.provider && backup.modelId === answer.modelId) return undefined
  if (!(await canUse(backup, settings))) return undefined
  return backup
}

/** For answer models without vision: have the vision model transcribe the screenshots first. */
async function transcribeScreenshots(
  shots: Screenshot[],
  settings: Settings,
  vision: ModelChoice,
  action: CloudAction,
  signal: AbortSignal
): Promise<string> {
  if (!vision.vision) {
    throw new ShadowError('NO_VISION', 'Neither selected model can read images. Pick a vision model in Settings.')
  }
  const { text } = await generateText({
    model: await getModel(vision, settings, action),
    instructions: EXTRACT_PROMPT,
    messages: [{ role: 'user', content: [{ type: 'text', text: 'Transcribe this problem.' }, ...imageParts(shots)] }],
    maxOutputTokens: 4096,
    abortSignal: signal
  })
  return text
}

/**
 * What project cards are matched against: the question plus what came just before it,
 * so "what was the hardest part there?" still finds the project named a moment ago.
 */
function cardQuery(question: string): string {
  const spoken = recentTranscript(3, 1200).map((t) => t.text)
  const lastAsked = history.findLast((m) => m.role === 'user')
  const content = lastAsked?.content
  const typed = (
    typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? content.map((p) => (p.type === 'text' ? p.text : '')).join(' ')
        : ''
  ).slice(-600)
  return [question, ...spoken, typed].join('\n')
}

export async function ask(req: AskRequest): Promise<void> {
  cancelAnswer() // one answer at a time
  copyWhenCodeCompletes = false
  const settings = getSettings()
  const promptOptions: PromptOptions = { language: settings.language, style: settings.answerStyle }

  let mode = req.mode
  if (mode === 'debug' && history.length === 0) mode = 'solve'
  if (mode === 'followup' && !req.text?.trim()) return
  const liveQuestion = mode === 'live' ? (req.text?.trim() || latestQuestion()) : undefined
  if (mode === 'live' && !liveQuestion) {
    broadcast(IPC.toast, 'No question heard yet')
    return
  }
  // Live and follow-up answers speak for the user: they get the resume and company brief,
  // and the question's wording ("in one line", "tell me about a time") overrides the saved style.
  if (mode === 'live' || mode === 'followup') {
    promptOptions.style = styleFromQuestion(liveQuestion ?? req.text ?? '') ?? settings.answerStyle
    promptOptions.context = await loadInterviewContext(cardQuery(liveQuestion ?? req.text ?? '')).catch(() => undefined)
  }
  // Solve/debug with an empty queue means "use what's on screen right now".
  if ((mode === 'solve' || mode === 'debug' || req.withScreen) && screenshots.length === 0) await takeScreenshot()

  const shots = screenshots
  screenshots = []
  emitScreenshots()

  let instructions: string
  let userText: string
  // Which language to answer in, decided here from what was said and sent last, where the
  // model weighs it most. A rule in the instructions alone loses to the transcript and
  // history: one Hindi line anywhere pulled English questions into Hinglish answers.
  let languageNote = ''
  let context: ModelMessage[]
  switch (mode) {
    case 'solve':
      instructions = solvePrompt(promptOptions)
      userText = solveUserText(shots.length)
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
      languageNote = spokeHindi(userText) ? HINGLISH_REPLY : ENGLISH_REPLY
      context = history
      break
    case 'live':
      instructions = livePrompt(promptOptions)
      userText = `RECENT TRANSCRIPT (oldest → newest):\n${formatTranscript(recentTranscript()) || '(empty)'}\n\nQUESTION: ${liveQuestion}`
      languageNote = spokeHindi(liveQuestion!) ? HINGLISH_REPLY : ENGLISH_REPLY
      context = history
      break
  }

  const id = crypto.randomUUID()
  const controller = new AbortController()
  inflight = { id, controller }
  currentAnswer = ''
  const cloud = settings.source === 'cloud'
  const models = activeModels(settings)
  const model = models.answer
  // Every model call for this answer (main, backup, screenshot reader) shares one Shadow Cloud action.
  const action: CloudAction = { id, kind: mode }
  broadcast(IPC.answerStart, {
    id,
    mode,
    prompt: { solve: 'Solve this problem', debug: 'Debug this', followup: userText, live: `🎙 ${liveQuestion}` }[mode],
    screenshotCount: shots.length,
    provider: model.provider,
    modelId: model.modelId,
    cloud
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
    // Shadow Cloud with no credits: don't spend the question. Park it (screenshots too) for after paying.
    if (cloud && (await outOfCredits())) throw new ShadowError('NO_CREDITS', NO_CREDITS_MESSAGE)

    let content: UserContent
    const sentText = languageNote ? `${userText}\n\n${languageNote}` : userText
    if (shots.length > 0 && !model.vision) {
      broadcast(IPC.answerStatus, { id, status: 'Reading screenshots…' })
      const problem = await transcribeScreenshots(shots, settings, models.vision, action, controller.signal)
      content = [{ type: 'text', text: `${sentText}

The screenshots, transcribed:

${problem}` }]
    } else {
      content = [{ type: 'text', text: sentText }, ...imageParts(shots)]
    }
    broadcast(IPC.answerStatus, { id, status: shots.length > 0 ? 'Reading screen…' : 'Thinking…' })

    const messages: ModelMessage[] = [...context, { role: 'user', content }]
    const purpose = mode === 'live' ? 'live' : 'solve'
    // The backup only joins if it can handle this request (it must see images if we're sending them).
    const sendsImages = content.some((part) => typeof part !== 'string' && part.type === 'file')
    const backup = await usableBackup(settings, model, models.backup, sendsImages)

    let finish: Finish | undefined
    let winner = model
    const stream = raceText({
      primary: model,
      backup,
      hedgeAfterMs: HEDGE_AFTER_MS,
      signal: controller.signal,
      start: async (choice, signal) =>
        streamText({
          model: await getModel(choice, settings, action),
          instructions,
          messages,
          maxOutputTokens: 8192,
          maxRetries: 2,
          abortSignal: signal,
          timeout: { chunkMs: 60_000 },
          providerOptions: speedOptions(choice, purpose)
        }).stream,
      onHedge: (b) =>
        broadcast(IPC.answerStatus, {
          id,
          status: cloud
            ? 'Taking longer than usual, also trying the backup…'
            : `${providerInfo(model.provider).label} is slow right now, also asking ${providerInfo(b.provider).label}…`
        }),
      onWinner: (w) => {
        winner = w
        if (w !== model) broadcast(IPC.answerStatus, { id, status: null, provider: w.provider, modelId: w.modelId })
      },
      onFinish: (f) => (finish = f)
    })
    for await (const text of stream) {
      firstTokenMs ??= Math.round(performance.now() - startedAt)
      currentAnswer += text
      pending += text
      if (copyWhenCodeCompletes && lastCodeBlockIsClosed(currentAnswer)) copyNow()
    }
    flush()

    // A stream can end without an error but before the answer is done: Gemini stops replies
    // that repeat their input word for word ("recitation", reported as content-filter), and
    // long ones hit the token limit. Finish it instead of showing half an answer as complete.
    if (!controller.signal.aborted && finish && finish.reason !== 'stop' && currentAnswer.trim()) {
      console.log(`[ai] answer ended early: ${finish.reason}${finish.raw ? ` (${finish.raw})` : ''}`)
      // The same model usually trips the same filter again, so prefer the other one.
      const other = winner === model ? (backup ?? model) : model
      broadcast(IPC.answerStatus, { id, status: 'The answer was cut off, finishing it…' })
      try {
        const rest = streamText({
          model: await getModel(other, settings, action),
          instructions,
          messages: [...messages, { role: 'assistant', content: currentAnswer }, { role: 'user', content: CONTINUE_CUT_OFF }],
          maxOutputTokens: 4096,
          maxRetries: 1,
          abortSignal: controller.signal,
          providerOptions: speedOptions(other, purpose)
        })
        let first = true
        for await (const text of rest.textStream) {
          if (first && other !== winner) broadcast(IPC.answerStatus, { id, status: null, provider: other.provider, modelId: other.modelId })
          else if (first) broadcast(IPC.answerStatus, { id, status: null })
          first = false
          currentAnswer += text
          pending += text
        }
        if (first) broadcast(IPC.answerStatus, { id, status: null })
      } catch (err) {
        if (!controller.signal.aborted) {
          console.warn('[ai] could not finish the cut-off answer:', err instanceof Error ? err.message : err)
          broadcast(IPC.answerStatus, { id, status: null })
          broadcast(IPC.toast, 'The answer was cut off and could not be finished')
        }
      }
      flush()
    }

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
    if (cloud && firstTokenMs !== null) recordFirstToken(firstTokenMs)
    broadcast(IPC.answerDone, { id, aborted: false, firstTokenMs, totalMs: Math.round(performance.now() - startedAt) })
  } catch (err) {
    flush()
    if (controller.signal.aborted) {
      broadcast(IPC.answerDone, { id, aborted: true, firstTokenMs, totalMs: Math.round(performance.now() - startedAt) })
    } else {
      const error = toUserError(err, model, cloud)
      // Out of credits: keep the question and its screenshots; the paywall shows in its place.
      if (error.code === 'NO_CREDITS') {
        parked = { req: { mode, text: mode === 'live' ? liveQuestion : req.text, withScreen: req.withScreen }, shots }
      }
      broadcast(IPC.answerError, { id, ...error })
    }
  } finally {
    clearInterval(timer)
    if (inflight?.id === id) {
      inflight = null
      idleWaiters.splice(0).forEach((resolve) => resolve())
    }
    // The answer ended before the block closed (stopped, error, or truncated): copy what exists.
    if (copyWhenCodeCompletes) copyNow()
  }
}
