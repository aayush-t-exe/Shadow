// Pure helpers (no Workers APIs) so they can be unit-tested: reading token counts out of the
// end of a provider's response, and turning them into money.

import type { Provider } from './config'

export interface TokenUsage {
  input: number
  output: number
}

/** The candidate JSON payloads in a response tail: SSE `data:` lines, or the whole body. */
function payloads(tail: string): unknown[] {
  const found: unknown[] = []
  try {
    found.push(JSON.parse(tail))
  } catch {
    // Not a plain JSON body: it's a stream of "data: {...}" lines.
  }
  for (const line of tail.split(/\r?\n/)) {
    const data = line.startsWith('data:') ? line.slice(5).trim() : ''
    if (!data || data === '[DONE]') continue
    try {
      found.push(JSON.parse(data))
    } catch {
      // The first line of a tail can be cut in half; skip it.
    }
  }
  return found
}

const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

/** Token counts from the last part of a Gemini or Groq (OpenAI-style) response, or null. */
export function extractUsage(provider: Provider, tail: string): TokenUsage | null {
  const objects = payloads(tail).reverse()
  for (const obj of objects) {
    if (!obj || typeof obj !== 'object') continue
    const o = obj as Record<string, any>
    if (provider === 'gemini' && o.usageMetadata) {
      const u = o.usageMetadata
      // Thinking tokens are billed as output.
      return { input: n(u.promptTokenCount), output: n(u.candidatesTokenCount) + n(u.thoughtsTokenCount) }
    }
    if (provider === 'groq') {
      const u = o.usage ?? o.x_groq?.usage
      if (u) return { input: n(u.prompt_tokens), output: n(u.completion_tokens) }
    }
  }
  return null
}

/** Cost in millionths of a dollar. Unknown models are charged at a deliberately high rate so they show up. */
export function costMicroUsd(model: string, usage: TokenUsage, prices: Record<string, [number, number]>): number {
  const [inPerM, outPerM] = prices[model] ?? [1, 5]
  // usd = tokens / 1e6 * pricePerMillion; micro-usd = usd * 1e6
  return Math.round(usage.input * inPerM + usage.output * outPerM)
}

/** Keeps the last `max` characters of a growing text, for reading usage at the end of a stream. */
export class Tail {
  private text = ''
  constructor(private max = 16_384) {}
  push(chunk: string) {
    this.text = (this.text + chunk).slice(-this.max)
  }
  toString() {
    return this.text
  }
}
