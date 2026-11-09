// Passes the app's AI requests on to Gemini or Groq with the real keys, after checking the
// device, its credits and the daily cap, and records what each call really cost.
//
// The app talks to these routes with the normal AI SDK providers, just pointed at this
// server, so every prompt, the backup race and streaming work exactly as with a user's own key.

import type { Config, Env, Provider } from './config'
import { balanceOf, charge, now, overDailyCap, recordUsage, type Device } from './db'
import { Tail, costMicroUsd, extractUsage } from './usage'

/** Kinds of request that use up credits, once per action. */
const CHARGED_KINDS = new Set(['solve', 'debug', 'followup', 'live'])
/** Free, but capped per hour: the small "was that a question?" check while listening. */
const FREE_KINDS = new Set(['classify'])

const GEMINI_PATH = /^\/v1\/gemini\/(v1beta|v1)\/models\/([A-Za-z0-9._-]+):(streamGenerateContent|generateContent)$/
const GROQ_PATH = /^\/v1\/groq\/openai\/v1\/chat\/completions$/

const STATUS_NAMES: Record<number, string> = {
  400: 'INVALID_ARGUMENT',
  401: 'UNAUTHENTICATED',
  402: 'PAYMENT_REQUIRED',
  403: 'PERMISSION_DENIED',
  413: 'INVALID_ARGUMENT',
  429: 'RESOURCE_EXHAUSTED',
  503: 'UNAVAILABLE'
}

/** An error in the shape the provider's SDK expects, so its message reaches the app intact. */
export function providerError(provider: Provider | null, status: number, message: string, balance?: number): Response {
  const body =
    provider === 'gemini'
      ? { error: { code: status, message, status: STATUS_NAMES[status] ?? 'UNKNOWN' } }
      : provider === 'groq'
        ? { error: { message, type: 'shadow_cloud', code: status } }
        : { error: message }
  const headers: Record<string, string> = { 'cache-control': 'no-store' }
  if (balance !== undefined) headers['x-shadow-balance'] = String(balance)
  return Response.json(body, { status, headers })
}

export function matchProxy(pathname: string): Provider | null {
  if (GEMINI_PATH.test(pathname)) return 'gemini'
  if (GROQ_PATH.test(pathname)) return 'groq'
  return null
}

/** The model id from the first bytes of an OpenAI-style body ("model" comes first in the AI SDK's requests). */
function modelFromBody(body: ArrayBuffer): string | null {
  const head = new TextDecoder().decode(body.slice(0, 4096))
  return head.match(/"model"\s*:\s*"([^"]+)"/)?.[1] ?? null
}

export async function proxy(
  provider: Provider,
  request: Request,
  url: URL,
  env: Env,
  cfg: Config,
  device: Device,
  ctx: ExecutionContext
): Promise<Response> {
  const fail = (status: number, message: string, balance?: number) => providerError(provider, status, message, balance)

  // ---- what is being asked for ----
  const declared = Number(request.headers.get('content-length') ?? 0)
  if (declared > cfg.maxBodyBytes) return fail(413, 'That request is too large.')
  const body = await request.arrayBuffer()
  if (body.byteLength > cfg.maxBodyBytes) return fail(413, 'That request is too large.')

  let model: string
  let upstreamUrl: string
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (provider === 'gemini') {
    const [, version, modelId, method] = url.pathname.match(GEMINI_PATH)!
    model = modelId
    upstreamUrl = `${cfg.bases.gemini}/${version}/models/${modelId}:${method}${url.search}`
    if (!env.GEMINI_API_KEY) return fail(503, 'Shadow Cloud is not set up yet (no Gemini key).')
    headers['x-goog-api-key'] = env.GEMINI_API_KEY
  } else {
    model = modelFromBody(body) ?? ''
    upstreamUrl = `${cfg.bases.groq}/openai/v1/chat/completions`
    if (!env.GROQ_API_KEY) return fail(503, 'Shadow Cloud is not set up yet (no Groq key).')
    headers.authorization = `Bearer ${env.GROQ_API_KEY}`
  }
  if (!cfg.allowedModels[provider].includes(model)) return fail(403, `Shadow Cloud doesn't offer the model "${model}".`)

  // ---- which user action this belongs to ----
  const actionId = request.headers.get('x-shadow-action') ?? ''
  const kind = request.headers.get('x-shadow-kind') ?? ''
  if (!/^[A-Za-z0-9-]{8,64}$/.test(actionId)) return fail(400, 'Missing action id. Please update Shadow.')
  const charged = CHARGED_KINDS.has(kind)
  if (!charged && !FREE_KINDS.has(kind)) return fail(400, 'Unknown request kind. Please update Shadow.')

  if (await overDailyCap(env, cfg)) return fail(503, 'Shadow Cloud is very busy today. Please try again later.')

  if (charged) {
    // One row per action; a few calls are allowed under it (main model, backup, screenshot reader).
    const upsert = await env.DB.prepare(
      `INSERT INTO actions (id, device_id, kind, requests, charged, created_at) VALUES (?, ?, ?, 1, 0, ?)
       ON CONFLICT(id) DO UPDATE SET requests = requests + 1
       WHERE actions.device_id = excluded.device_id AND actions.requests < ?`
    )
      .bind(actionId, device.id, kind, now(), cfg.maxRequestsPerAction)
      .run()
    if (!upsert.meta.changes) return fail(429, 'Too many requests for one answer.')
    const action = await env.DB.prepare('SELECT charged FROM actions WHERE id = ?').bind(actionId).first<{ charged: number }>()
    if (!action?.charged && device.balance < cfg.creditsPerAnswer) {
      return fail(402, "You've used all your Shadow Cloud credits.", device.balance)
    }
  } else {
    if (device.balance <= 0) return fail(402, "You've used all your Shadow Cloud credits.", device.balance)
    const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM usage WHERE device_id = ? AND kind = ? AND created_at > ?')
      .bind(device.id, kind, now() - 3_600_000)
      .first<{ n: number }>()
    if ((recent?.n ?? 0) >= cfg.classifyPerHour) return fail(429, 'Slow down a little.')
  }

  // ---- pass it on ----
  const started = now()
  let upstream: Response
  try {
    upstream = await fetch(upstreamUrl, { method: 'POST', headers, body, signal: request.signal })
  } catch {
    return fail(502, `Shadow Cloud couldn't reach ${provider === 'gemini' ? 'Gemini' : 'Groq'}.`)
  }

  // Charge on the first successful reply for this action, so failed attempts cost nothing.
  let balance = device.balance
  if (upstream.ok && charged) {
    const marked = await env.DB.prepare('UPDATE actions SET charged = 1 WHERE id = ? AND charged = 0').bind(actionId).run()
    if (marked.meta.changes) balance = (await charge(env, device.id, cfg.creditsPerAnswer, 'answer', actionId)) ?? 0
    else balance = await balanceOf(env, device.id)
  }

  const out = new Headers({
    'content-type': upstream.headers.get('content-type') ?? 'application/json',
    'cache-control': 'no-store',
    'x-shadow-balance': String(balance)
  })
  if (!upstream.body) {
    ctx.waitUntil(log(0, null))
    return new Response(null, { status: upstream.status, headers: out })
  }

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  ctx.waitUntil(pipe(upstream.body, writable))
  return new Response(readable, { status: upstream.status, headers: out })

  async function pipe(source: ReadableStream<Uint8Array>, sink: WritableStream<Uint8Array>) {
    const reader = source.getReader()
    const writer = sink.getWriter()
    const decoder = new TextDecoder()
    const tail = new Tail()
    let bytes = 0
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        bytes += value.byteLength
        if (bytes > cfg.maxResponseBytes) {
          await reader.cancel()
          break
        }
        tail.push(decoder.decode(value, { stream: true }))
        await writer.write(value)
      }
    } catch {
      // The app stopped the answer or disconnected; stop reading too.
      await reader.cancel().catch(() => {})
    } finally {
      await writer.close().catch(() => {})
    }
    await log(bytes, tail.toString())
  }

  async function log(bytes: number, tail: string | null) {
    const usage = tail ? extractUsage(provider, tail) : null
    // A stopped stream never reaches its usage line: estimate roughly from its size so the cap still sees it.
    const tokens = usage ?? (upstream.ok && bytes > 0 ? { input: 0, output: Math.round(bytes / 8) } : null)
    await recordUsage(env, {
      deviceId: device.id,
      actionId,
      kind,
      provider,
      model,
      status: upstream.status,
      inputTokens: usage?.input ?? null,
      outputTokens: tokens?.output ?? null,
      costMicroUsd: tokens ? costMicroUsd(model, tokens, cfg.prices) : 0,
      ms: now() - started
    })
  }
}
