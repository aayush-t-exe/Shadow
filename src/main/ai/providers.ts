import type { LanguageModel } from 'ai'
import { createGoogle } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { createOllama } from 'ollama-ai-provider-v2'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { ModelChoice, ModelListResult, ProviderId, Settings } from '@shared/types'
import { providerInfo } from '@shared/providers'
import { getApiKey } from '../secrets'
import { ShadowError } from './errors'

async function requireKey(provider: ProviderId): Promise<string | undefined> {
  if (!providerInfo(provider).needsKey) return undefined
  const key = await getApiKey(provider)
  if (!key) throw new ShadowError('NO_KEY', `Add a ${providerInfo(provider).label} API key in Settings.`)
  return key
}

/** Turns a provider + model id from Settings into an AI SDK model. Keys are read here and never leave main. */
export async function getModel(choice: ModelChoice, settings: Settings): Promise<LanguageModel> {
  if (!choice.modelId) throw new ShadowError('UNKNOWN', `Pick a ${providerInfo(choice.provider).label} model in Settings.`)
  const apiKey = await requireKey(choice.provider)
  switch (choice.provider) {
    case 'gemini':
      return createGoogle({ apiKey })(choice.modelId)
    case 'groq':
      return createGroq({ apiKey })(choice.modelId)
    case 'openai':
      return createOpenAI({ apiKey })(choice.modelId)
    case 'anthropic':
      return createAnthropic({ apiKey })(choice.modelId)
    case 'openrouter':
      return createOpenRouter({ apiKey, headers: { 'X-Title': 'Shadow' } }).chat(choice.modelId)
    case 'ollama':
      return createOllama({ baseURL: `${settings.ollamaBaseURL.replace(/\/$/, '')}/api` })(choice.modelId)
    case 'custom':
      if (!settings.customBaseURL) throw new ShadowError('UNKNOWN', 'Set the custom provider base URL in Settings.')
      return createOpenAICompatible({ name: 'custom', baseURL: settings.customBaseURL, apiKey })(choice.modelId)
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
