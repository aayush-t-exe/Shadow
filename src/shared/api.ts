import type {
  AnswerChunkEvent,
  AnswerDoneEvent,
  AnswerErrorEvent,
  AnswerStartEvent,
  AnswerStatusEvent,
  AskRequest,
  CreditResult,
  KeyStatus,
  KeyTestResult,
  ModelChoice,
  ModelListResult,
  ProviderId,
  ResearchResult,
  ResumeImportResult,
  ScreenshotInfo,
  SecretId,
  Settings
} from './types'
import type { Rect } from './geometry'
import type { AudioSourceId, ListenStatus, TranscriptLine } from './live'
import type { InterviewProfile, ProfileSummary } from './profile'

/** Every IPC channel name lives here so main, preload and renderer can't drift apart. */
export const IPC = {
  // renderer → main (invoke)
  ask: 'session:ask',
  takeScreenshot: 'session:screenshot',
  removeScreenshot: 'session:remove-screenshot',
  getSettings: 'settings:get',
  setSettings: 'settings:set',
  getKeyStatus: 'keys:status',
  setKey: 'keys:set',
  deleteKey: 'keys:delete',
  testModel: 'models:test',
  listModels: 'models:list',
  startListening: 'listen:start',
  getListenStatus: 'listen:get-status',
  checkSpeechCredit: 'listen:check-credit',
  listProfiles: 'profiles:list',
  getProfile: 'profiles:get',
  saveProfile: 'profiles:save',
  deleteProfile: 'profiles:delete',
  researchCompany: 'profiles:research',
  getResume: 'resume:get',
  saveResume: 'resume:save',
  importResume: 'resume:import',
  // renderer → main (fire and forget)
  cancel: 'session:cancel',
  reset: 'session:reset',
  copyCode: 'session:copy-code',
  setInteractiveRegions: 'overlay:interactive-regions',
  hideOverlay: 'overlay:hide',
  openSettings: 'app:open-settings',
  openKeyPage: 'app:open-key-page',
  quit: 'app:quit',
  openProfilesFolder: 'profiles:open-folder',
  stopListening: 'listen:stop',
  pushAudio: 'listen:audio',
  reportCaptureWarning: 'listen:capture-warning',
  // main → renderer
  answerStart: 'answer:start',
  answerStatus: 'answer:status',
  answerChunk: 'answer:chunk',
  answerDone: 'answer:done',
  answerError: 'answer:error',
  screenshots: 'session:screenshots',
  sessionReset: 'session:did-reset',
  toast: 'overlay:toast',
  settingsChanged: 'settings:changed',
  keysChanged: 'keys:changed',
  listenStatus: 'listen:status',
  listenToggle: 'listen:toggle',
  scrollAnswer: 'overlay:scroll-answer',
  transcriptLine: 'listen:transcript-line'
} as const

type Unsubscribe = () => void
type Listener<T> = (cb: (payload: T) => void) => Unsubscribe

export interface ShadowAPI {
  ask(req: AskRequest): Promise<void>
  takeScreenshot(): Promise<void>
  removeScreenshot(id: string): Promise<void>
  cancel(): void
  reset(): void
  /** Copies the last code block of the current answer to the clipboard. */
  copyCode(): void
  /** Where the visible controls are (window coordinates). Clicks anywhere else pass through to the app below. */
  setInteractiveRegions(rects: Rect[]): void
  hideOverlay(): void
  openSettings(): void
  openKeyPage(id: SecretId): void
  quit(): void

  /** Opens the transcription connections; capture audio only after this resolves. */
  startListening(): Promise<void>
  stopListening(): void
  getListenStatus(): Promise<ListenStatus>
  /** Remaining Deepgram credit and roughly how many hours of listening it covers. */
  checkSpeechCredit(): Promise<CreditResult>
  /** One 80 ms frame of 16 kHz mono PCM16. */
  pushAudio(source: AudioSourceId, pcm: ArrayBuffer): void
  reportCaptureWarning(warning: string | null): void

  getSettings(): Promise<Settings>
  setSettings(patch: Partial<Settings>): Promise<Settings>
  getKeyStatus(): Promise<KeyStatus>
  setKey(id: SecretId, key: string): Promise<KeyStatus>
  deleteKey(id: SecretId): Promise<KeyStatus>
  testModel(choice: ModelChoice): Promise<KeyTestResult>
  listModels(provider: ProviderId): Promise<ModelListResult>

  /** Interview profiles: one markdown company brief per file in %APPDATA%\Shadow\profiles. */
  listProfiles(): Promise<ProfileSummary[]>
  getProfile(id: string): Promise<InterviewProfile | null>
  saveProfile(profile: InterviewProfile): Promise<void>
  deleteProfile(id: string): Promise<void>
  /** Gemini + Google Search writes a brief and saves it as a profile. */
  researchCompany(company: string, role: string): Promise<ResearchResult>
  openProfilesFolder(): void
  getResume(): Promise<string>
  saveResume(text: string): Promise<void>
  /** Opens a file picker (PDF, TXT, MD) and saves the text. null when cancelled. */
  importResume(): Promise<ResumeImportResult>

  onAnswerStart: Listener<AnswerStartEvent>
  onAnswerStatus: Listener<AnswerStatusEvent>
  onAnswerChunk: Listener<AnswerChunkEvent>
  onAnswerDone: Listener<AnswerDoneEvent>
  onAnswerError: Listener<AnswerErrorEvent>
  onScreenshots: Listener<ScreenshotInfo[]>
  onSessionReset: Listener<void>
  onToast: Listener<string>
  onSettingsChanged: Listener<Settings>
  onKeysChanged: Listener<KeyStatus>
  onListenStatus: Listener<ListenStatus>
  /** Main asks the overlay to start/stop listening (Ctrl+Shift+L); the overlay owns the microphone. */
  onListenToggle: Listener<void>
  onTranscriptLine: Listener<TranscriptLine>
  /** Ctrl+Shift+Up/Down: scroll the answer panel up (-1) or down (1). */
  onScrollAnswer: Listener<-1 | 1>
}
