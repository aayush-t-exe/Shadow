// Types shared by the main process, the preload bridge and the renderer.
// Nothing in here may import from Electron or Node.

export type ProviderId = 'gemini' | 'groq' | 'openai' | 'anthropic' | 'openrouter' | 'ollama' | 'custom'
export type CodeLanguage = 'python' | 'java'
export type Verbosity = 'concise' | 'detailed'

export interface ModelChoice {
  provider: ProviderId
  modelId: string
  /** Whether the model can read images. Non-vision models get screenshots via `visionModel` first. */
  vision: boolean
}

export interface Settings {
  schemaVersion: 1
  language: CodeLanguage
  verbosity: Verbosity
  answerModel: ModelChoice
  /** Reads screenshots into text when `answerModel` cannot see images. */
  visionModel: ModelChoice
  ollamaBaseURL: string
  customBaseURL: string
  /** Speech-to-text language: English only, or multilingual (handles Hinglish). */
  sttLanguage: 'en' | 'multi'
  /** Answer automatically when the other person finishes asking a question. */
  autoAnswer: boolean
}

/** Anything with an API key: the AI providers plus speech-to-text services. */
export type SecretId = ProviderId | 'deepgram'

/** What the renderer is allowed to know about saved keys: never the key itself. */
export type KeyStatus = Partial<Record<SecretId, { last4: string }>>

/** live = answer a question heard in the conversation, using the transcript as context. */
export type AskMode = 'solve' | 'debug' | 'followup' | 'live'

export interface AskRequest {
  mode: AskMode
  /** Typed follow-up, or the spoken question for live mode (defaults to the last "Them" turn). */
  text?: string
  /** Live mode: also attach a screenshot of the current screen. */
  withScreen?: boolean
}

export interface ScreenshotInfo {
  id: string
  /** Small data-URL preview for the queue strip. */
  thumb: string
}

export type ErrorCode =
  | 'NO_KEY'
  | 'AUTH'
  | 'RATE_LIMIT'
  | 'NO_VISION'
  | 'NO_SCREENSHOTS'
  | 'NETWORK'
  | 'OLLAMA_DOWN'
  | 'UNKNOWN'

// ---- events pushed from main to the overlay ----

export interface AnswerStartEvent {
  id: string
  mode: AskMode
  /** The user's side of the turn as shown in the chat bubble. */
  prompt: string
  screenshotCount: number
  provider: ProviderId
  modelId: string
}
/** Progress text shown before the first token, e.g. "Reading screenshots…". */
export interface AnswerStatusEvent {
  id: string
  status: string
}
export interface AnswerChunkEvent {
  id: string
  delta: string
}
export interface AnswerDoneEvent {
  id: string
  aborted: boolean
  /** Milliseconds from request start to first token (null if no token arrived). */
  firstTokenMs: number | null
  totalMs: number
}
export interface AnswerErrorEvent {
  id: string
  code: ErrorCode
  message: string
}

export type ModelListResult = { ok: true; models: string[] } | { ok: false; message: string }
export type KeyTestResult = { ok: true; ms: number } | { ok: false; message: string }
