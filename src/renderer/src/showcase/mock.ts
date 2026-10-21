// A stand-in for the preload bridge so Shadow's real components can render in the
// screenshot studio without Electron's main process. Must be imported first.
import type { ShadowAPI } from '@shared/api'
import type { Settings } from '@shared/types'
import { providerInfo } from '@shared/providers'

export const demoSettings: Settings = {
  schemaVersion: 1,
  language: 'python',
  verbosity: 'concise',
  answerModel: providerInfo('gemini').defaultModel,
  visionModel: providerInfo('gemini').defaultModel,
  backupModel: providerInfo('groq').defaultModel,
  ollamaBaseURL: 'http://127.0.0.1:11434',
  customBaseURL: '',
  sttLanguage: 'multi',
  autoAnswer: true,
  answerFrom: 'anyone'
}

const noop = () => {}
const listen = () => () => {}

const mock: ShadowAPI = {
  ask: async () => {},
  takeScreenshot: async () => {},
  removeScreenshot: async () => {},
  cancel: noop,
  reset: noop,
  copyCode: noop,
  setInteractiveRegions: noop,
  hideOverlay: noop,
  openSettings: noop,
  openKeyPage: noop,
  quit: noop,
  startListening: async () => {},
  stopListening: noop,
  getListenStatus: async () => ({ state: 'off', startedAt: null, warning: null }),
  checkSpeechCredit: async () => ({ ok: true, usd: 187.4, hoursOfListening: 240 }),
  pushAudio: noop,
  reportCaptureWarning: noop,
  getSettings: async () => demoSettings,
  setSettings: async () => demoSettings,
  getKeyStatus: async () => ({ gemini: { last4: 'xQ2k' }, groq: { last4: '7fLm' }, deepgram: { last4: 'a91c' } }),
  setKey: async () => ({}),
  deleteKey: async () => ({}),
  testModel: async () => ({ ok: true, ms: 412 }),
  listModels: async () => ({ ok: true, models: [] }),
  onAnswerStart: listen,
  onAnswerStatus: listen,
  onAnswerChunk: listen,
  onAnswerDone: listen,
  onAnswerError: listen,
  onScreenshots: listen,
  onSessionReset: listen,
  onToast: listen,
  onSettingsChanged: listen,
  onKeysChanged: listen,
  onListenStatus: listen,
  onListenToggle: listen,
  onTranscriptLine: listen
}

window.shadow = mock
