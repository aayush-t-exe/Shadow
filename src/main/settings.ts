import Store from 'electron-store'
import { z } from 'zod'
import type { Settings } from '@shared/types'
import { providerInfo } from '@shared/providers'
import { PROFILE_ID } from '@shared/profile'

const providerId = z.enum(['gemini', 'groq', 'openai', 'anthropic', 'openrouter', 'ollama', 'custom'])
const modelChoice = z.object({ provider: providerId, modelId: z.string().max(200), vision: z.boolean() })

// Patches from the renderer are validated before they touch disk.
const settingsPatch = z
  .object({
    language: z.enum(['python', 'java']),
    answerStyle: z.enum(['standard', 'concise', 'bullets', 'star', 'detailed']),
    activeProfile: z.string().regex(PROFILE_ID).nullable(),
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
  schemaVersion: 2,
  language: 'python',
  answerStyle: 'standard',
  activeProfile: null,
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

function getStore(): Store<Settings> {
  if (store) return store
  // answerStyle has no store default, so a version-1 file's `verbosity` can be carried over once.
  // Version 1's "concise" is today's "standard".
  const { answerStyle: _, ...defaults } = DEFAULTS
  store = new Store<Settings>({ name: 'settings', defaults: defaults as Settings })
  const raw = store.store as Partial<Settings> & { verbosity?: string }
  if (raw.schemaVersion !== 2) {
    store.set({ schemaVersion: 2, answerStyle: raw.answerStyle ?? (raw.verbosity === 'detailed' ? 'detailed' : 'standard') })
    store.delete('verbosity' as keyof Settings)
  }
  return store
}

export function getSettings(): Settings {
  return { ...DEFAULTS, ...getStore().store }
}

export function updateSettings(patch: unknown): Settings {
  const parsed = settingsPatch.parse(patch)
  getStore().set(parsed as Partial<Settings>)
  return getSettings()
}
