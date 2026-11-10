// Types shared by the main process, the preload bridge and the renderer.
// Nothing in here may import from Electron or Node.

export type ProviderId = 'gemini' | 'groq' | 'openai' | 'anthropic' | 'openrouter' | 'ollama' | 'custom'
/**
 * The user's preferred coding language. It's only a default: Shadow always answers in the
 * language the user asks for or the problem's starter code uses. "auto" = match the problem.
 */
export const CODE_LANGUAGES = ['auto', 'python', 'java', 'cpp', 'c', 'javascript', 'typescript', 'csharp', 'go', 'kotlin', 'rust'] as const
export type CodeLanguage = (typeof CODE_LANGUAGES)[number]
/** How live and follow-up answers are shaped; solve answers use it for length only. */
export type AnswerStyle = 'standard' | 'concise' | 'bullets' | 'star' | 'detailed'

export interface ModelChoice {
  provider: ProviderId
  modelId: string
  /** Whether the model can read images. Non-vision models get screenshots via `visionModel` first. */
  vision: boolean
}

/**
 * Where answers come from. "cloud" = Shadow Cloud (no key, uses credits). "keys" = the
 * user's own API keys; only the owner edition offers it (src/shared/edition.ts).
 */
export type AnswerSource = 'cloud' | 'keys'

export interface Settings {
  schemaVersion: 2
  source: AnswerSource
  language: CodeLanguage
  answerStyle: AnswerStyle
  /** Id of the interview profile (company brief) used for live and follow-up answers, or null. */
  activeProfile: string | null
  answerModel: ModelChoice
  /** Reads screenshots into text when `answerModel` cannot see images. */
  visionModel: ModelChoice
  /** Raced against `answerModel` when it's slow or failing; also runs the question classifier. */
  backupModel: ModelChoice | null
  ollamaBaseURL: string
  customBaseURL: string
  /** Speech-to-text language: English only, or multilingual (handles Hinglish). */
  sttLanguage: 'en' | 'multi'
  /** Answer automatically when someone finishes asking a question. */
  autoAnswer: boolean
  /** Whose questions get auto-answered: anyone (incl. the user reading a problem aloud) or only "Them". */
  answerFrom: 'anyone' | 'them'
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
  /** Shadow Cloud: no credits left. */
  | 'NO_CREDITS'
  /** Shadow Cloud: unreachable, busy, or refused the request. */
  | 'CLOUD'
  | 'UNKNOWN'

/** A credit pack as the paywall shows it (prices come from the server). */
export interface PaywallPack {
  id: string
  credits: number
  /** Price including GST, in paise. */
  pricePaise: number
  /** How long the pack lasts if spent only on Listen. */
  listenMinutes: number
  default?: boolean
}

export interface PaywallInfo {
  balance: number
  creditsPerAnswer: number
  creditsPerListenMinute: number
  /** False until payments are set up on the server. */
  canBuy: boolean
  packs: PaywallPack[]
  usage: {
    problems: number
    followups: number
    listenMinutes: number
    /** The last 7 days, oldest first. */
    days: { day: string; answers: number }[]
    /** Average time to the first word of an answer, measured on this PC. */
    avgFirstTokenMs: number | null
    /** Has this install bought credits before? */
    purchased: boolean
  }
}

/** Why the paywall opened: an answer or Listen needed credits, or the user chose to top up. */
export type PaywallReason = 'answer' | 'listen' | 'topup'

export interface PurchaseStatus {
  state: 'idle' | 'opening' | 'waiting' | 'paid' | 'error'
  packId?: string
  orderId?: string
  credits?: number
  pricePaise?: number
  /** The checkout page (so it can be reopened). */
  url?: string
  /** Still waiting after 10 minutes. */
  slow?: boolean
  /** A saved problem is being answered now that the payment arrived. */
  resuming?: boolean
  message?: string
}

/** What the app knows about this install's Shadow Cloud account. */
export interface CloudStatus {
  /** connecting = not registered yet; offline = the server couldn't be reached. */
  state: 'connecting' | 'ready' | 'offline'
  /** The readable "Shadow ID" (e.g. K7Q2-9MPX), for support and manual credit grants. */
  deviceId: string | null
  balance: number | null
  creditsPerAnswer: number
  creditsPerListenMinute: number
  error: string | null
}

// ---- events pushed from main to the overlay ----

export interface AnswerStartEvent {
  id: string
  mode: AskMode
  /** The user's side of the turn as shown in the chat bubble. */
  prompt: string
  screenshotCount: number
  provider: ProviderId
  modelId: string
  /** Answered through Shadow Cloud (the header shows credits instead of the provider). */
  cloud: boolean
}
/** Progress text shown before the first token, e.g. "Reading screenshots…". */
export interface AnswerStatusEvent {
  id: string
  status: string | null
  /** Set when the backup model won the race, so the header shows who actually answered. */
  provider?: ProviderId
  modelId?: string
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
/** What's in %APPDATA%\Shadow\knowledge, for the Settings window. */
export interface KnowledgeSummary {
  hasAbout: boolean
  /** Project names, A–Z. */
  projects: string[]
}
export type ResumeImportResult ={ ok: true; text: string } | { ok: false; message: string } | null
export type ResearchResult = { ok: true; id: string } | { ok: false; message: string }
export type CreditResult = { ok: true; usd: number; hoursOfListening: number } | { ok: false; message: string }
