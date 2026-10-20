import type { ModelChoice, ProviderId, SecretId } from './types'

export interface ProviderInfo {
  id: ProviderId
  label: string
  needsKey: boolean
  /** Where a student gets a key; shown as a link in Settings. */
  keyUrl?: string
  /** A sensible starting model. Users can pick any model from "Fetch models". */
  defaultModel: ModelChoice
  note: string
}

// Model IDs verified against provider docs on 2026-10-21 (see research/04-ai-apis.md).
export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    needsKey: true,
    keyUrl: 'https://aistudio.google.com/apikey',
    defaultModel: { provider: 'gemini', modelId: 'gemini-3.5-flash-lite', vision: true },
    note: 'Free tier, no card. Reads screenshots. Recommended default.'
  },
  {
    id: 'groq',
    label: 'Groq',
    needsKey: true,
    keyUrl: 'https://console.groq.com/keys',
    defaultModel: { provider: 'groq', modelId: 'qwen/qwen3.8-27b', vision: true },
    note: 'Free tier, extremely fast. Also powers free Whisper transcription.'
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    needsKey: true,
    keyUrl: 'https://openrouter.ai/keys',
    defaultModel: { provider: 'openrouter', modelId: 'openrouter/free', vision: false },
    note: 'One key for hundreds of models; ":free" models cost nothing.'
  },
  {
    id: 'openai',
    label: 'OpenAI',
    needsKey: true,
    keyUrl: 'https://platform.openai.com/api-keys',
    defaultModel: { provider: 'openai', modelId: '', vision: true },
    note: 'Paid. Use "Fetch models" to pick one.'
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    needsKey: true,
    keyUrl: 'https://platform.claude.com/settings/keys',
    defaultModel: { provider: 'anthropic', modelId: 'claude-sonnet-5-5', vision: true },
    note: 'Paid. Strong at code and reasoning.'
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    needsKey: false,
    defaultModel: { provider: 'ollama', modelId: 'qwen3-vl:4b', vision: true },
    note: 'Runs on your laptop, offline and free. Slower on CPU.'
  },
  {
    id: 'custom',
    label: 'Custom (OpenAI-compatible)',
    needsKey: true,
    defaultModel: { provider: 'custom', modelId: '', vision: false },
    note: 'Any server that speaks the OpenAI API: LM Studio, DeepSeek, vLLM…'
  }
]

export const providerInfo = (id: ProviderId): ProviderInfo => PROVIDERS.find((p) => p.id === id)!

/** Speech-to-text services; they need keys but aren't chat models. */
export const SPEECH_PROVIDERS = [
  {
    id: 'deepgram' as const,
    label: 'Deepgram (live transcription)',
    keyUrl: 'https://console.deepgram.com/signup',
    note: '$200 free credit, no card needed.'
  }
]

/** Every key page Shadow may open, by secret id. The renderer can only name an id, never a URL. */
export function keyUrlFor(id: SecretId): string | undefined {
  return id === 'deepgram' ? SPEECH_PROVIDERS[0].keyUrl : providerInfo(id).keyUrl
}
