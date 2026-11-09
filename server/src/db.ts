import type { Config, Env } from './config'

export interface Device {
  id: string
  balance: number
}

export const now = () => Date.now()
export const today = () => new Date().toISOString().slice(0, 10)

// ---------- tokens and ids ----------

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ' // no 0/O, 1/I/L: easy to read out loud

function randomBytes(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n))
}

/** A readable Shadow ID like K7Q2-9MPX, for support and manual credit grants. */
export function newDeviceId(): string {
  const chars = [...randomBytes(8)].map((b) => ALPHABET[b % ALPHABET.length])
  return `${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`
}

export function newToken(): string {
  const b64 = btoa(String.fromCharCode(...randomBytes(32)))
  return `shd_${b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`
}

export async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Constant-time string comparison for the admin secret. */
export function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a)
  const eb = new TextEncoder().encode(b)
  let diff = ea.length ^ eb.length
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0)
  return diff === 0
}

// ---------- devices ----------

/** The token from whichever header the caller used: our own, Gemini's, or OpenAI-style Bearer. */
export function tokenFrom(request: Request): string | null {
  const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1]
  const token = bearer ?? request.headers.get('x-goog-api-key') ?? null
  return token && token.startsWith('shd_') ? token : null
}

export async function deviceFor(env: Env, request: Request): Promise<Device | null> {
  const token = tokenFrom(request)
  if (!token) return null
  const row = await env.DB.prepare('SELECT id, balance FROM devices WHERE token_hash = ?')
    .bind(await sha256(token))
    .first<Device>()
  return row ?? null
}

export async function balanceOf(env: Env, deviceId: string): Promise<number> {
  const row = await env.DB.prepare('SELECT balance FROM devices WHERE id = ?').bind(deviceId).first<{ balance: number }>()
  return row?.balance ?? 0
}

/** Takes `amount` credits if the balance covers it. Returns the new balance, or null if it didn't. */
export async function charge(env: Env, deviceId: string, amount: number, reason: string, note?: string): Promise<number | null> {
  if (amount <= 0) return balanceOf(env, deviceId)
  const update = await env.DB.prepare('UPDATE devices SET balance = balance - ?, last_seen_at = ? WHERE id = ? AND balance >= ?')
    .bind(amount, now(), deviceId, amount)
    .run()
  if (!update.meta.changes) return null
  await env.DB.prepare('INSERT INTO ledger (device_id, delta, reason, note, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(deviceId, -amount, reason, note ?? null, now())
    .run()
  return balanceOf(env, deviceId)
}

export async function credit(env: Env, deviceId: string, amount: number, reason: string, note?: string): Promise<number> {
  await env.DB.batch([
    env.DB.prepare('UPDATE devices SET balance = balance + ? WHERE id = ?').bind(amount, deviceId),
    env.DB.prepare('INSERT INTO ledger (device_id, delta, reason, note, created_at) VALUES (?, ?, ?, ?, ?)').bind(
      deviceId,
      amount,
      reason,
      note ?? null,
      now()
    )
  ])
  return balanceOf(env, deviceId)
}

// ---------- the daily safety cap ----------

export async function spentToday(env: Env): Promise<number> {
  const row = await env.DB.prepare('SELECT cost_micro_usd FROM daily WHERE day = ?').bind(today()).first<{ cost_micro_usd: number }>()
  return row?.cost_micro_usd ?? 0
}

export async function overDailyCap(env: Env, cfg: Config): Promise<boolean> {
  return (await spentToday(env)) >= cfg.dailyCapMicroUsd
}

export interface UsageRow {
  deviceId: string
  actionId?: string | null
  kind: string
  provider: string
  model?: string | null
  status?: number | null
  inputTokens?: number | null
  outputTokens?: number | null
  minutes?: number | null
  costMicroUsd: number
  ms?: number | null
}

export async function recordUsage(env: Env, u: UsageRow): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO usage (device_id, action_id, kind, provider, model, status, input_tokens, output_tokens, minutes, cost_micro_usd, ms, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      u.deviceId,
      u.actionId ?? null,
      u.kind,
      u.provider,
      u.model ?? null,
      u.status ?? null,
      u.inputTokens ?? null,
      u.outputTokens ?? null,
      u.minutes ?? null,
      u.costMicroUsd,
      u.ms ?? null,
      now()
    ),
    env.DB.prepare(
      `INSERT INTO daily (day, cost_micro_usd) VALUES (?, ?)
       ON CONFLICT(day) DO UPDATE SET cost_micro_usd = cost_micro_usd + excluded.cost_micro_usd`
    ).bind(today(), u.costMicroUsd)
  ])
}
