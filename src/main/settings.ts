import Store from 'electron-store'
import { z } from 'zod'
import type { Settings } from '@shared/types'
import { providerInfo } from '@shared/providers'

const providerId = z.enum(['gemini', 'groq', 'openai', 'anthropic', 'openrouter', 'ollama', 'custom'])
const modelChoice = z.object({ provider: providerId, modelId: z.string().max(200), vision: z.boolean() })

// Patches from the renderer are validated before they touch disk.
const settingsPatch = z
  .object({
    language: z.enum(['python', 'java']),
    verbosity: z.enum(['concise', 'detailed']),
    answerModel: modelChoice,
    visionModel: modelChoice,
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
  language: 'python',
  verbosity: 'concise',
  answerModel: providerInfo('gemini').defaultModel,
  visionModel: providerInfo('gemini').defaultModel,
  ollamaBaseURL: 'http://127.0.0.1:11434',
  customBaseURL: '',
  sttLanguage: 'en',
  autoAnswer: true,
  answerFrom: 'anyone'
}

let store: Store<Settings> | undefined
const getStore = () => (store ??= new Store<Settings>({ name: 'settings', defaults: DEFAULTS }))

export function getSettings(): Settings {
  return { ...DEFAULTS, ...getStore().store }
}

export function updateSettings(patch: unknown): Settings {
  const parsed = settingsPatch.parse(patch)
  getStore().set(parsed as Partial<Settings>)
  return getSettings()
}
