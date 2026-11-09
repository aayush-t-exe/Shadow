import { app } from 'electron'
import type { LanguageModel } from 'ai'
import { IPC } from '@shared/api'
import { broadcast } from '../windows'
import { createGoogle } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { createOllama } from 'ollama-ai-provider-v2'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { ModelChoice, ModelListResult, ProviderId, Settings } from '@shared/types'
import { providerInfo } from '@shared/providers'
import { CLOUD_URL } from '@shared/edition'
import { getApiKey } from '../secrets'
import { cloudFetch, cloudModels, cloudToken, type CloudAction } from '../cloud'
import { ShadowError } from './errors'

async function requireKey(provider: ProviderId): Promise<string | undefined> {
  if (!providerInfo(provider).needsKey) return undefined
  const key = await getApiKey(provider)
  if (!key) throw new ShadowError('NO_KEY', `Add a ${providerInfo(provider).label} API key in Settings.`)
  return key
}

// Free tiers cap requests per minute. When a provider answers 429 the AI SDK quietly waits
// and retries, which feels like Shadow "hanging". Tell the user, at most once a minute.
const RATE_LIMIT_TOAST_EVERY_MS = 60_000
let lastRateLimitToast = 0

/**
 * fetch wrapper for every model request: logs status and time-to-response in development
 * (never headers or bodies, which hold keys and screenshots) and explains rate limits.
 */
function instrumentedFetch(provider: ProviderId): typeof fetch {
  return async (input, init) => {
    const started = performance.now()
    const response = await fetch(input, init)
    const ms = Math.round(performance.now() - started)
    if (!app.isPackaged) {
      const url = new URL(input instanceof Request ? input.url : String(input))
      console.log(`[ai] ${provider} ${url.pathname.split('/').slice(-1)[0]} → ${response.status} in ${ms} ms`)
    }
    if (response.status === 429 && Date.now() - lastRateLimitToast > RATE_LIMIT_TOAST_EVERY_MS) {
      lastRateLimitToast = Date.now()
      broadcast(
        IPC.toast,
        `${providerInfo(provider).label}'s free per-minute limit was reached, so Shadow is waiting and retrying. Answers will be slower for about a minute.`
      )
    }
    return response
  }
}

export type Purpose = 'solve' | 'live' | 'classify'

/**
 * Per-request tuning for speed. Gemini 3.x models "think" before answering, which can add
 * seconds; live answers and the classifier need speed far more than deep reasoning.
 * Only Gemini 3.x understands `thinkingLevel`, so nothing is sent to other models.
 */
export function speedOptions(choice: ModelChoice, purpose: Purpose) {
  if (choice.provider === 'gemini' && /^gemini-3/.test(choice.modelId)) {
    return { google: { thinkingConfig: { thinkingLevel: purpose === 'solve' ? 'low' : 'minimal' } } } as const
  }
  return undefined
}

/** The models in use: Shadow Cloud's (decided by the server) or the ones picked in Settings. */
export function activeModels(settings: Settings): { answer: ModelChoice; vision: ModelChoice; backup: ModelChoice | null } {
  if (settings.source === 'cloud') {
    const { answer, backup } = cloudModels()
    return { answer, vision: answer, backup }
  }
  return { answer: settings.answerModel, vision: settings.visionModel, backup: settings.backupModel }
}

/** Whether a model can be called right now (Cloud: it's one the server offers; own keys: the key is saved). */
export async function canUse(choice: ModelChoice, settings: Settings): Promise<boolean> {
  if (settings.source === 'cloud') return choice.provider === 'gemini' || choice.provider === 'groq'
  return !providerInfo(choice.provider).needsKey || !!(await getApiKey(choice.provider))
}

/**
 * Shadow Cloud: the same providers, pointed at the Shadow Cloud server with this install's
 * device token. The server swaps in the real key, so prompts, the backup race and streaming
 * all behave exactly as with the user's own key.
 */
async function cloudModel(choice: ModelChoice, action: CloudAction): Promise<LanguageModel> {
  const apiKey = await cloudToken()
  const fetch = cloudFetch(action)
  switch (choice.provider) {
    case 'gemini':
      return createGoogle({ apiKey, baseURL: `${CLOUD_URL}/v1/gemini/v1beta`, fetch })(choice.modelId)
    case 'groq':
      return createGroq({ apiKey, baseURL: `${CLOUD_URL}/v1/groq/openai/v1`, fetch })(choice.modelId)
    default:
      throw new ShadowError('CLOUD', `Shadow Cloud doesn't offer ${providerInfo(choice.provider).label}.`)
  }
}

/**
 * Turns a provider + model id into an AI SDK model. Keys are read here and never leave main.
 * `action` groups the calls made for one answer, so Shadow Cloud charges it once.
 */
export async function getModel(choice: ModelChoice, settings: Settings, action?: CloudAction): Promise<LanguageModel> {
  if (settings.source === 'cloud') {
    if (!action) throw new ShadowError('CLOUD', 'This needs your own API keys, not Shadow Cloud.')
    return cloudModel(choice, action)
  }
  if (!choice.modelId) throw new ShadowError('UNKNOWN', `Pick a ${providerInfo(choice.provider).label} model in Settings.`)
  const apiKey = await requireKey(choice.provider)
  const fetch = instrumentedFetch(choice.provider)
  switch (choice.provider) {
    case 'gemini':
      return createGoogle({ apiKey, fetch })(choice.modelId)
    case 'groq':
      return createGroq({ apiKey, fetch })(choice.modelId)
    case 'openai':
      return createOpenAI({ apiKey, fetch })(choice.modelId)
    case 'anthropic':
      return createAnthropic({ apiKey, fetch })(choice.modelId)
    case 'openrouter':
      return createOpenRouter({ apiKey, fetch, headers: { 'X-Title': 'Shadow' } }).chat(choice.modelId)
    case 'ollama':
      return createOllama({ baseURL: `${settings.ollamaBaseURL.replace(/\/$/, '')}/api`, fetch })(choice.modelId)
    case 'custom':
      if (!settings.customBaseURL) throw new ShadowError('UNKNOWN', 'Set the custom provider base URL in Settings.')
      return createOpenAICompatible({ name: 'custom', baseURL: settings.customBaseURL, apiKey, fetch })(choice.modelId)
  }
}

// ---- model discovery ("Fetch models" button) ----

async function getJson(url: string, headers: Record<string, string> = {}): Promise<any> {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

export async function listModels(provider: ProviderId, settings: Settings): Promise<ModelListResult> {
  try {
    const key = await requireKey(provider)
    const bearer = { Authorization: `Bearer ${key}` }
    let ids: string[]
    switch (provider) {
      case 'gemini': {
        const data = await getJson('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', {
          'x-goog-api-key': key!
        })
        ids = data.models
          .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m: any) => String(m.name).replace(/^models\//, ''))
        break
      }
      case 'groq':
        ids = (await getJson('https://api.groq.com/openai/v1/models', bearer)).data.map((m: any) => m.id)
        break
      case 'openai':
        ids = (await getJson('https://api.openai.com/v1/models', bearer)).data.map((m: any) => m.id)
        break
      case 'openrouter':
        ids = (await getJson('https://openrouter.ai/api/v1/models', bearer)).data.map((m: any) => m.id)
        break
      case 'anthropic':
        ids = (
          await getJson('https://api.anthropic.com/v1/models?limit=100', {
            'x-api-key': key!,
            'anthropic-version': '2023-06-01'
          })
        ).data.map((m: any) => m.id)
        break
      case 'ollama':
        ids = (await getJson(`${settings.ollamaBaseURL.replace(/\/$/, '')}/api/tags`)).models.map((m: any) => m.name)
        break
      case 'custom':
        ids = (await getJson(`${settings.customBaseURL.replace(/\/$/, '')}/models`, bearer)).data.map((m: any) => m.id)
        break
    }
    return { ok: true, models: [...new Set(ids)].sort() }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) }
  }
}
