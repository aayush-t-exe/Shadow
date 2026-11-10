export interface Env {
  DB: D1Database
  // secrets
  GEMINI_API_KEY?: string
  GROQ_API_KEY?: string
  DEEPGRAM_API_KEY?: string
  ADMIN_SECRET?: string
  // plain settings (wrangler.toml [vars])
  FREE_CREDITS?: string
  CREDITS_PER_ANSWER?: string
  CREDITS_PER_LISTEN_MINUTE?: string
  DAILY_CAP_USD?: string
  REGISTRATIONS_PER_IP_PER_DAY?: string
  CLASSIFY_PER_HOUR?: string
  ANSWER_MODEL?: string
  BACKUP_MODEL?: string
  /** JSON: { "model-id": [usdPerMillionInput, usdPerMillionOutput] } overrides the defaults below. */
  PRICES?: string
  DEEPGRAM_USD_PER_STREAM_MINUTE?: string
  /** JSON list of credit packs; see DEFAULT_PACKS. */
  PACKS?: string
  /** "razorpay" = real checkout (test or live keys). "test" = a fake page for development. Unset = payments off. */
  CHECKOUT_MODE?: string
  RAZORPAY_KEY_ID?: string
  RAZORPAY_KEY_SECRET?: string
  /** Set the same value in Razorpay > Webhooks for the payment_link.paid event. */
  RAZORPAY_WEBHOOK_SECRET?: string
  RAZORPAY_BASE?: string
  // upstream addresses; only changed by tests, which point them at a fake server
  GEMINI_BASE?: string
  GROQ_BASE?: string
  DEEPGRAM_BASE?: string
}

export type Provider = 'gemini' | 'groq'

export interface ModelChoice {
  provider: Provider
  modelId: string
  vision: boolean
}

// USD per million tokens [input, output], from the providers' price pages (see
// research/paywall/05-unit-economics.md). Override with the PRICES var when they change.
const DEFAULT_PRICES: Record<string, [number, number]> = {
  'gemini-3.5-flash-lite': [0.3, 2.5],
  'gemini-3.1-flash-lite': [0.1, 0.4],
  'qwen/qwen3.8-27b': [0.8, 4.0],
  'openai/gpt-oss-20b': [0.075, 0.3]
}

export interface Pack {
  id: string
  credits: number
  /** Price including GST, in paise (₹99 = 9900). */
  pricePaise: number
  /** The pack the paywall pre-selects. */
  default?: boolean
}

const DEFAULT_PACKS: Pack[] = [
  { id: 'small', credits: 50, pricePaise: 4900 },
  { id: 'regular', credits: 120, pricePaise: 9900, default: true },
  { id: 'large', credits: 350, pricePaise: 24900 }
]

function packs(raw: string | undefined): Pack[] {
  if (!raw) return DEFAULT_PACKS
  try {
    const parsed = JSON.parse(raw) as Pack[]
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PACKS
  } catch {
    return DEFAULT_PACKS
  }
}

function num(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function prices(raw: string | undefined): Record<string, [number, number]> {
  if (!raw) return DEFAULT_PRICES
  try {
    return { ...DEFAULT_PRICES, ...(JSON.parse(raw) as Record<string, [number, number]>) }
  } catch {
    return DEFAULT_PRICES
  }
}

export function config(env: Env) {
  const answer: ModelChoice = { provider: 'gemini', modelId: env.ANSWER_MODEL || 'gemini-3.5-flash-lite', vision: true }
  const backup: ModelChoice = { provider: 'groq', modelId: env.BACKUP_MODEL || 'qwen/qwen3.8-27b', vision: true }
  return {
    freeCredits: num(env.FREE_CREDITS, 20),
    creditsPerAnswer: num(env.CREDITS_PER_ANSWER, 1),
    creditsPerListenMinute: num(env.CREDITS_PER_LISTEN_MINUTE, 3),
    dailyCapMicroUsd: Math.round(num(env.DAILY_CAP_USD, 2) * 1_000_000),
    registrationsPerIpPerDay: num(env.REGISTRATIONS_PER_IP_PER_DAY, 5),
    classifyPerHour: num(env.CLASSIFY_PER_HOUR, 120),
    /** Main model + backup + screenshot reader + a retry or two. */
    maxRequestsPerAction: 6,
    /** Four full-resolution screenshots as base64 fit well inside this. */
    maxBodyBytes: 20 * 1024 * 1024,
    /** The response is cut off past this; a full 8k-token answer is far smaller. */
    maxResponseBytes: 1024 * 1024,
    models: { answer, backup },
    allowedModels: { gemini: [answer.modelId], groq: [backup.modelId] } as Record<Provider, string[]>,
    prices: prices(env.PRICES),
    deepgramMicroUsdPerStreamMinute: Math.round(num(env.DEEPGRAM_USD_PER_STREAM_MINUTE, 0.0077) * 1_000_000),
    packs: packs(env.PACKS),
    checkoutMode:
      env.CHECKOUT_MODE === 'razorpay' && env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET
        ? ('razorpay' as const)
        : env.CHECKOUT_MODE === 'test'
          ? ('test' as const)
          : null,
    /** Listen runs two streams at once: the mic ("You") and the PC's sound ("Them"). */
    listenStreams: 2,
    bases: {
      gemini: env.GEMINI_BASE || 'https://generativelanguage.googleapis.com',
      groq: env.GROQ_BASE || 'https://api.groq.com',
      deepgram: env.DEEPGRAM_BASE || 'https://api.deepgram.com',
      razorpay: env.RAZORPAY_BASE || 'https://api.razorpay.com'
    }
  }
}

export type Config = ReturnType<typeof config>
