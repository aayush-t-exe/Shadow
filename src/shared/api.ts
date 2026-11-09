import type {
  AnswerChunkEvent,
  AnswerDoneEvent,
  AnswerErrorEvent,
  AnswerStartEvent,
  AnswerStatusEvent,
  AskRequest,
  CloudStatus,
  CreditResult,
  KeyStatus,
  KeyTestResult,
  ModelChoice,
  ModelListResult,
  PaywallInfo,
  PaywallReason,
  PurchaseStatus,
  ProviderId,
  ScreenshotInfo,
  SecretId,
  Settings
} from './types'
import type { Rect } from './geometry'
import type { AudioSourceId, ListenStatus, TranscriptLine } from './live'

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
  getCloudStatus: 'cloud:get-status',
  refreshCloud: 'cloud:refresh',
  getPaywall: 'cloud:get-paywall',
  buyPack: 'cloud:buy-pack',
  checkoutAction: 'cloud:checkout-action',
  openPaywall: 'cloud:open-paywall',
  // renderer → main (fire and forget)
  cancel: 'session:cancel',
  reset: 'session:reset',
  copyCode: 'session:copy-code',
  setInteractiveRegions: 'overlay:interactive-regions',
  hideOverlay: 'overlay:hide',
  openSettings: 'app:open-settings',
  openKeyPage: 'app:open-key-page',
  quit: 'app:quit',
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
  transcriptLine: 'listen:transcript-line',
  cloudStatus: 'cloud:status',
  purchaseStatus: 'cloud:purchase-status',
  showPaywall: 'cloud:show-paywall'
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

  /** Opens the transcription connections; capture audio only if this resolves true (false: out of credits, paywall shown). */
  startListening(): Promise<boolean>
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

  /** Shadow Cloud credits and Shadow ID, as last known. */
  getCloudStatus(): Promise<CloudStatus>
  /** Asks the server for the current credits (registers this install first if needed). */
  refreshCloud(): Promise<CloudStatus>
  /** Packs and what this install already got from Shadow. */
  getPaywall(): Promise<PaywallInfo>
  /** Creates an order and opens the payment page in the browser. */
  buyPack(packId: string): Promise<void>
  checkoutAction(action: 'check' | 'reopen' | 'cancel'): void
  /** Shows the overlay with the paywall (from Settings). */
  openPaywall(): void

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
  onCloudStatus: Listener<CloudStatus>
  onPurchaseStatus: Listener<PurchaseStatus>
  onShowPaywall: Listener<PaywallReason>
}
