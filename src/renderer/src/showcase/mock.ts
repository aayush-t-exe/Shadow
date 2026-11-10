// A stand-in for the preload bridge so Shadow's real components can render in the
// screenshot studio without Electron's main process. Must be imported first.
import type { ShadowAPI } from '@shared/api'
import type { Settings } from '@shared/types'
import { providerInfo } from '@shared/providers'

export const demoSettings: Settings = {
  schemaVersion: 2,
  source: 'keys',
  language: 'auto',
  answerStyle: 'standard',
  activeProfile: null,
  answerModel: providerInfo('gemini').defaultModel,
  visionModel: providerInfo('gemini').defaultModel,
  backupModel: providerInfo('groq').defaultModel,
  ollamaBaseURL: 'http://127.0.0.1:11434',
  customBaseURL: '',
  sttLanguage: 'multi',
  autoAnswer: true,
  answerFrom: 'anyone'
}

const cloudStatus = {
  state: 'ready' as const,
  deviceId: 'K7Q2-9MPX',
  balance: 14,
  creditsPerAnswer: 1,
  creditsPerListenMinute: 3,
  error: null
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
  startListening: async () => true,
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
  getCloudStatus: async () => cloudStatus,
  refreshCloud: async () => cloudStatus,
  getPaywall: async () => ({ balance: 0, creditsPerAnswer: 1, creditsPerListenMinute: 3, canBuy: true, packs: [], usage: { problems: 0, followups: 0, listenMinutes: 0, days: [], avgFirstTokenMs: null, purchased: false } }),
  buyPack: async () => {},
  checkoutAction: noop,
  openPaywall: noop,
  listProfiles: async () => [],
  getProfile: async () => null,
  saveProfile: async () => {},
  deleteProfile: async () => {},
  researchCompany: async () => ({ ok: false, message: 'Not available in the showcase' }),
  openProfilesFolder: noop,
  getResume: async () => '',
  saveResume: async () => {},
  importResume: async () => null,
  getKnowledgeSummary: async () => ({ hasAbout: true, projects: ['Shadow', 'Zen-Z'] }),
  openKnowledgeFolder: noop,
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
  onTranscriptLine: listen,
  onScrollAnswer: listen,
  onCloudStatus: listen,
  onPurchaseStatus: listen,
  onShowPaywall: listen
}

window.shadow = mock
