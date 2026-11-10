// Listen streams audio straight from the app to Deepgram (it never passes through here).
// This server hands out short-lived Deepgram tokens and charges per minute: the app checks
// in once a minute ("tick"), and stops when a tick says the credits ran out.

import type { Config, Env } from './config'
import { balanceOf, charge, credit, now, overDailyCap, recordUsage, type Device } from './db'

/** A tick within this long of the last one is treated as the same minute (no double charge). */
const MIN_TICK_GAP_MS = 50_000
/** A session that hasn't ticked for this long is over; it can't get fresh tokens. */
const SESSION_IDLE_MS = 150_000
const TOKEN_TTL_SECONDS = 60

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } })

async function grantToken(env: Env, cfg: Config): Promise<string> {
  if (!env.DEEPGRAM_API_KEY) throw new Error('Shadow Cloud is not set up yet (no Deepgram key).')
  const res = await fetch(`${cfg.bases.deepgram}/v1/auth/grant`, {
    method: 'POST',
    headers: { authorization: `Token ${env.DEEPGRAM_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ ttl_seconds: TOKEN_TTL_SECONDS })
  })
  if (!res.ok) throw new Error(`Deepgram refused to issue a token (HTTP ${res.status}).`)
  const data = (await res.json()) as { access_token?: string }
  if (!data.access_token) throw new Error('Deepgram returned no token.')
  return data.access_token
}

async function chargeMinute(env: Env, cfg: Config, device: Device, sessionId: string): Promise<number | null> {
  const balance = await charge(env, device.id, cfg.creditsPerListenMinute, 'listen', sessionId)
  if (balance === null) return null
  await recordUsage(env, {
    deviceId: device.id,
    actionId: sessionId,
    kind: 'listen',
    provider: 'deepgram',
    model: 'flux',
    minutes: 1,
    costMicroUsd: cfg.deepgramMicroUsdPerStreamMinute * cfg.listenStreams
  })
  return balance
}

export async function startListen(env: Env, cfg: Config, device: Device): Promise<Response> {
  if (await overDailyCap(env, cfg)) return json({ error: 'Shadow Cloud is very busy today. Please try again later.' }, 503)
  if (device.balance < cfg.creditsPerListenMinute) {
    return json({ error: "You don't have enough Shadow Cloud credits to listen.", balance: device.balance }, 402)
  }
  let token: string
  try {
    token = await grantToken(env, cfg)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 502)
  }
  const session = crypto.randomUUID()
  await env.DB.prepare('INSERT INTO listen_sessions (id, device_id, started_at, last_tick_at, minutes) VALUES (?, ?, ?, ?, 1)')
    .bind(session, device.id, now(), now())
    .run()
  // The first minute is paid up front.
  const balance = await chargeMinute(env, cfg, device, session)
  if (balance === null) return json({ error: "You don't have enough Shadow Cloud credits to listen.", balance: device.balance }, 402)
  return json({ session, token, balance, creditsPerMinute: cfg.creditsPerListenMinute })
}

interface SessionRow {
  device_id: string
  last_tick_at: number
  ended: number
}

async function openSession(env: Env, device: Device, request: Request): Promise<{ id: string; row: SessionRow } | Response> {
  const body = (await request.json().catch(() => ({}))) as { session?: unknown }
  const id = typeof body.session === 'string' ? body.session : ''
  const row = await env.DB.prepare('SELECT device_id, last_tick_at, ended FROM listen_sessions WHERE id = ?').bind(id).first<SessionRow>()
  if (!row || row.device_id !== device.id) return json({ error: 'Unknown listening session.' }, 404)
  if (row.ended || now() - row.last_tick_at > SESSION_IDLE_MS) return json({ error: 'This listening session has ended.' }, 410)
  return { id, row }
}

/** A fresh token for reconnecting a dropped stream within a live session. */
export async function refreshListenToken(env: Env, cfg: Config, device: Device, request: Request): Promise<Response> {
  const session = await openSession(env, device, request)
  if (session instanceof Response) return session
  try {
    return json({ token: await grantToken(env, cfg) })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 502)
  }
}

/** Called by the app about once a minute while listening; charges that minute. */
export async function tickListen(env: Env, cfg: Config, device: Device, request: Request): Promise<Response> {
  const session = await openSession(env, device, request)
  if (session instanceof Response) return session
  if (now() - session.row.last_tick_at < MIN_TICK_GAP_MS) return json({ balance: await balanceOf(env, device.id) })
  if (await overDailyCap(env, cfg)) {
    await endSession(env, session.id)
    return json({ error: 'Shadow Cloud is very busy today. Listening stopped.' }, 503)
  }
  const balance = await chargeMinute(env, cfg, device, session.id)
  if (balance === null) {
    await endSession(env, session.id)
    return json({ error: 'Your Shadow Cloud credits ran out, so listening stopped.', balance: device.balance }, 402)
  }
  await env.DB.prepare('UPDATE listen_sessions SET last_tick_at = ?, minutes = minutes + 1 WHERE id = ?').bind(now(), session.id).run()
  return json({ balance })
}

/**
 * Ends a session. `failed: true` means the app couldn't connect to Deepgram at all; the
 * prepaid first minute is refunded if it's still that first minute. (This adds no new way to
 * cheat: a modified app could already skip ticks, which is the known limit of letting audio
 * go straight to Deepgram. The daily cap bounds both.)
 */
export async function stopListen(env: Env, cfg: Config, device: Device, request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { session?: unknown; failed?: unknown }
  if (typeof body.session === 'string') {
    const ended = await env.DB.prepare(
      'UPDATE listen_sessions SET ended = 1 WHERE id = ? AND device_id = ? AND ended = 0 RETURNING started_at, minutes'
    )
      .bind(body.session, device.id)
      .first<{ started_at: number; minutes: number }>()
    if (body.failed === true && ended && ended.minutes === 1 && now() - ended.started_at < 60_000) {
      // Deepgram was never used, so take the minute back out of the cost records too.
      await recordUsage(env, {
        deviceId: device.id,
        actionId: body.session,
        kind: 'listen',
        provider: 'deepgram',
        model: 'flux',
        minutes: -1,
        costMicroUsd: -cfg.deepgramMicroUsdPerStreamMinute * cfg.listenStreams
      })
      return json({ balance: await credit(env, device.id, cfg.creditsPerListenMinute, 'refund', `listen failed ${body.session}`) })
    }
  }
  return json({ balance: await balanceOf(env, device.id) })
}

async function endSession(env: Env, id: string) {
  await env.DB.prepare('UPDATE listen_sessions SET ended = 1 WHERE id = ?').bind(id).run()
}
