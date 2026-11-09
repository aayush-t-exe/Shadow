import Store from 'electron-store'
import { z } from 'zod'
import { CODE_LANGUAGES, type Settings } from '@shared/types'
import { providerInfo } from '@shared/providers'
import { IS_OWNER_EDITION } from '@shared/edition'

const providerId = z.enum(['gemini', 'groq', 'openai', 'anthropic', 'openrouter', 'ollama', 'custom'])
const modelChoice = z.object({ provider: providerId, modelId: z.string().max(200), vision: z.boolean() })

// Patches from the renderer are validated before they touch disk.
const settingsPatch = z
  .object({
    // Only the owner edition may switch to the user's own keys.
    source: IS_OWNER_EDITION ? z.enum(['cloud', 'keys']) : z.literal('cloud'),
    language: z.enum(CODE_LANGUAGES),
    verbosity: z.enum(['concise', 'detailed']),
    answerModel: modelChoice,
    visionModel: modelChoice,
    backupModel: modelChoice.nullable(),
    ollamaBaseURL: z.url(),
    customBaseURL: z.union([z.url(), z.literal('')]),
    sttLanguage: z.enum(['en', 'multi']),
    autoAnswer: z.boolean(),
    answerFrom: z.enum(['anyone', 'them'])
  })
  .partial()
  .strict()

const DEFAULTS: Settings = {
  schemaVersion: 1,
  // The owner edition keeps working exactly as before (own keys) until switched.
  source: IS_OWNER_EDITION ? 'keys' : 'cloud',
  language: 'auto',
  verbosity: 'concise',
  answerModel: providerInfo('gemini').defaultModel,
  visionModel: providerInfo('gemini').defaultModel,
  backupModel: null,
  ollamaBaseURL: 'http://127.0.0.1:11434',
  customBaseURL: '',
  sttLanguage: 'en',
  autoAnswer: true,
  answerFrom: 'anyone'
}

let store: Store<Settings> | undefined
const getStore = () => (store ??= new Store<Settings>({ name: 'settings', defaults: DEFAULTS }))

export function getSettings(): Settings {
  const settings = { ...DEFAULTS, ...getStore().store }
  // A settings file copied from an owner install can't switch the public edition to own keys.
  if (!IS_OWNER_EDITION) settings.source = 'cloud'
  return settings
}

export function updateSettings(patch: unknown): Settings {
  const parsed = settingsPatch.parse(patch)
  getStore().set(parsed as Partial<Settings>)
  return getSettings()
}
