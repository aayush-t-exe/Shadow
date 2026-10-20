import { APICallError, RetryError, StreamProviderError } from 'ai'
import type { ErrorCode, ModelChoice } from '@shared/types'
import { providerInfo } from '@shared/providers'

export class ShadowError extends Error {
  constructor(
    public code: ErrorCode,
    message: string
  ) {
    super(message)
  }
}

/** Maps any thrown value to a short, key-free message the overlay can show. */
export function toUserError(err: unknown, model: ModelChoice): { code: ErrorCode; message: string } {
  if (err instanceof ShadowError) return { code: err.code, message: err.message }

  const label = providerInfo(model.provider).label
  const inner = RetryError.isInstance(err) ? err.lastError : err
  const status =
    APICallError.isInstance(inner) || StreamProviderError.isInstance(inner)
      ? (inner as { statusCode?: number }).statusCode
      : undefined
  const text = inner instanceof Error ? inner.message : String(inner)

  if (status === 401 || status === 403) return { code: 'AUTH', message: `${label} rejected the API key. Check it in Settings.` }
  if (status === 429) return { code: 'RATE_LIMIT', message: `${label} rate limit reached. Wait a minute or switch provider in Settings.` }
  if (status === 404) return { code: 'UNKNOWN', message: `${label} doesn't know the model "${model.modelId}". Pick another in Settings.` }
  if (model.provider === 'ollama' && /ECONNREFUSED|fetch failed/i.test(text)) {
    return { code: 'OLLAMA_DOWN', message: 'Ollama is not running. Start it with `ollama serve`.' }
  }
  if (/ENOTFOUND|ECONNRESET|ETIMEDOUT|fetch failed|network/i.test(text)) {
    return { code: 'NETWORK', message: `Couldn't reach ${label}. Check your internet connection.` }
  }
  return { code: 'UNKNOWN', message: redact(text).slice(0, 300) }
}

/** Belt and braces: never let anything that looks like a key reach the UI. */
function redact(s: string): string {
  return s.replace(/(sk-|gsk_|AIza|sk-ant-|sk-or-)[A-Za-z0-9_\-]{8,}/g, '$1••••')
}
