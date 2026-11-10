// Shadow Cloud: the only place your AI keys live. The app registers once per install,
// gets a device token, and spends credits on answers and listening minutes.
//
//   POST /v1/devices           register an install (free starter credits once per PC)
//   GET  /v1/me                credits left
//   GET  /v1/config            which models the app should use, and the credit prices
//   POST /v1/gemini/...        AI requests, passed on to Gemini
//   POST /v1/groq/...          AI requests, passed on to Groq (the backup)
//   POST /v1/listen/start|token|tick|stop
//   GET  /v1/paywall           packs + what this install already got from Shadow
//   POST /v1/checkout          start buying a pack; GET /v1/checkout/:id polls it
//   GET  /pay/:id              Shadow's payment page (opens Razorpay checkout); POST /pay/:id/verify
//   POST /v1/razorpay/webhook  Razorpay's signed order.paid message
//   POST /v1/admin/grant       give a device credits (you, by hand)
//   GET  /v1/admin/stats       what answers really cost

import { config, type Config, type Env } from './config'
import { LOGO_PNG_BASE64 } from './logo'
import { credit, deviceFor, newDeviceId, newToken, now, safeEqual, sha256, today, type Device } from './db'
import { matchProxy, providerError, proxy } from './proxy'
import { refreshListenToken, startListen, stopListen, tickListen } from './listen'
import { checkoutStatus, createCheckout, paywall, razorpayPayPage, razorpayWebhook, testPayPage, verifyRazorpayPayment } from './checkout'

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } })

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const cfg = config(env)
    try {
      return await route(request, url, env, cfg, ctx)
    } catch (err) {
      console.error('[shadow-cloud]', err)
      return json({ error: 'Shadow Cloud had a problem. Please try again.' }, 500)
    }
  }
} satisfies ExportedHandler<Env>

async function route(request: Request, url: URL, env: Env, cfg: Config, ctx: ExecutionContext): Promise<Response> {
  const { pathname } = url
  const method = request.method

  if (method === 'GET' && pathname === '/') return new Response('Shadow Cloud is running.')
  if (method === 'GET' && pathname === '/logo.png') {
    const bytes = Uint8Array.from(atob(LOGO_PNG_BASE64), (c) => c.charCodeAt(0))
    return new Response(bytes, { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' } })
  }
  if (method === 'GET' && pathname === '/v1/config') return json(publicConfig(cfg))
  if (method === 'POST' && pathname === '/v1/devices') return register(request, env, cfg)
  if (pathname.startsWith('/v1/admin/')) return admin(request, url, env)
  const testPay = pathname.match(/^\/pay\/test\/(ord_[a-z0-9]+)$/)
  if (testPay) return testPayPage(env, cfg, request, testPay[1])
  const payPage = pathname.match(/^\/pay\/(ord_[a-z0-9]+)(\/verify)?$/)
  if (payPage && method === 'GET' && !payPage[2]) return razorpayPayPage(env, cfg, payPage[1], url.origin)
  if (payPage && method === 'POST' && payPage[2]) return verifyRazorpayPayment(env, cfg, request, payPage[1])
  if (method === 'POST' && pathname === '/v1/razorpay/webhook') return razorpayWebhook(env, request)

  // Everything below needs a device token.
  const provider = method === 'POST' ? matchProxy(pathname) : null
  const device = await deviceFor(env, request)
  if (!device) {
    return provider
      ? providerError(provider, 401, 'Shadow Cloud did not recognise this install. Restart Shadow.')
      : json({ error: 'Shadow Cloud did not recognise this install. Restart Shadow.' }, 401)
  }

  if (provider) return proxy(provider, request, url, env, cfg, device, ctx)
  if (method === 'GET' && pathname === '/v1/me') return me(env, device, cfg)
  if (method === 'GET' && pathname === '/v1/paywall') return paywall(env, cfg, device)
  if (method === 'POST' && pathname === '/v1/checkout') return createCheckout(env, cfg, device, request, url)
  const order = method === 'GET' ? pathname.match(/^\/v1\/checkout\/(ord_[a-z0-9]+)$/) : null
  if (order) return checkoutStatus(env, cfg, device, order[1])
  if (method === 'POST' && pathname === '/v1/listen/start') return startListen(env, cfg, device)
  if (method === 'POST' && pathname === '/v1/listen/token') return refreshListenToken(env, cfg, device, request)
  if (method === 'POST' && pathname === '/v1/listen/tick') return tickListen(env, cfg, device, request)
  if (method === 'POST' && pathname === '/v1/listen/stop') return stopListen(env, cfg, device, request)
  return json({ error: 'Not found' }, 404)
}

function publicConfig(cfg: Config) {
  return {
    models: cfg.models,
    freeCredits: cfg.freeCredits,
    creditsPerAnswer: cfg.creditsPerAnswer,
    creditsPerListenMinute: cfg.creditsPerListenMinute
  }
}

function me(_env: Env, device: Device, cfg: Config) {
  return json({ deviceId: device.id, balance: device.balance, ...publicConfig(cfg) })
}

// ---------- registration ----------

async function register(request: Request, env: Env, cfg: Config): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { machine?: unknown }
  const machine = typeof body.machine === 'string' && /^[a-f0-9]{64}$/.test(body.machine) ? body.machine : null
  if (!machine) return json({ error: 'Please update Shadow.' }, 400)

  const token = newToken()
  const tokenHash = await sha256(token)

  // Same PC (a reinstall, or the app lost its token): give the same device back with a fresh token.
  const existing = await env.DB.prepare('SELECT id, balance FROM devices WHERE machine = ?').bind(machine).first<Device>()
  if (existing) {
    await env.DB.prepare('UPDATE devices SET token_hash = ?, last_seen_at = ? WHERE id = ?').bind(tokenHash, now(), existing.id).run()
    return json({ deviceId: existing.id, token, balance: existing.balance, ...publicConfig(cfg) })
  }

  // A new PC. Limit how many free starters one network can collect in a day.
  const ip = request.headers.get('cf-connecting-ip') ?? 'local'
  const day = today()
  await env.DB.prepare(
    `INSERT INTO ip_days (ip, day, count) VALUES (?, ?, 1) ON CONFLICT(ip, day) DO UPDATE SET count = count + 1`
  )
    .bind(ip, day)
    .run()
  const seen = await env.DB.prepare('SELECT count FROM ip_days WHERE ip = ? AND day = ?').bind(ip, day).first<{ count: number }>()
  const free = (seen?.count ?? 1) <= cfg.registrationsPerIpPerDay ? cfg.freeCredits : 0

  let deviceId = newDeviceId()
  for (let attempt = 0; attempt < 5; attempt++) {
    const inserted = await env.DB.prepare(
      'INSERT OR IGNORE INTO devices (id, token_hash, machine, balance, created_at, last_seen_at) VALUES (?, ?, ?, 0, ?, ?)'
    )
      .bind(deviceId, tokenHash, machine, now(), now())
      .run()
    if (inserted.meta.changes) break
    deviceId = newDeviceId()
  }
  const balance = free > 0 ? await credit(env, deviceId, free, 'free', 'starter') : 0
  await env.DB.prepare(
    `INSERT INTO daily (day, registrations) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET registrations = registrations + 1`
  )
    .bind(day)
    .run()
  return json({ deviceId, token, balance, ...publicConfig(cfg) })
}

// ---------- admin (you only) ----------

async function admin(request: Request, url: URL, env: Env): Promise<Response> {
  const given = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] ?? ''
  if (!env.ADMIN_SECRET || env.ADMIN_SECRET.length < 16 || !safeEqual(given, env.ADMIN_SECRET)) {
    return json({ error: 'Not allowed' }, 403)
  }

  if (request.method === 'POST' && url.pathname === '/v1/admin/grant') {
    const body = (await request.json().catch(() => ({}))) as { deviceId?: unknown; credits?: unknown; note?: unknown }
    const deviceId = typeof body.deviceId === 'string' ? body.deviceId.toUpperCase() : ''
    const amount = typeof body.credits === 'number' && Number.isInteger(body.credits) ? body.credits : 0
    if (!deviceId || amount === 0 || Math.abs(amount) > 100_000) return json({ error: 'Need deviceId and a whole number of credits' }, 400)
    const found = await env.DB.prepare('SELECT id FROM devices WHERE id = ?').bind(deviceId).first()
    if (!found) return json({ error: `No device ${deviceId}` }, 404)
    const balance = await credit(env, deviceId, amount, 'grant', typeof body.note === 'string' ? body.note.slice(0, 200) : undefined)
    return json({ deviceId, balance })
  }

  if (request.method === 'GET' && url.pathname === '/v1/admin/stats') return json(await stats(env))
  return json({ error: 'Not found' }, 404)
}

/** The numbers that decide pricing: what an answer and a listening minute really cost. */
async function stats(env: Env) {
  const since = now() - 7 * 86_400_000
  const usd = (micro: number | null) => Math.round((micro ?? 0) / 10) / 100_000
  const [days, devices, byKind, perAnswer] = await env.DB.batch([
    env.DB.prepare('SELECT day, cost_micro_usd, registrations FROM daily ORDER BY day DESC LIMIT 7'),
    env.DB.prepare('SELECT COUNT(*) AS total, SUM(CASE WHEN last_seen_at > ? THEN 1 ELSE 0 END) AS active_7d FROM devices').bind(since),
    env.DB.prepare(
      `SELECT kind, provider, model, COUNT(*) AS calls, AVG(input_tokens) AS avg_in, AVG(output_tokens) AS avg_out,
              SUM(minutes) AS minutes, SUM(cost_micro_usd) AS cost
       FROM usage WHERE created_at > ? GROUP BY kind, provider, model ORDER BY cost DESC`
    ).bind(since),
    // An "answer" may call several models (main, backup, screenshot reader): cost it as a whole.
    env.DB.prepare(
      `SELECT kind, COUNT(*) AS answers, AVG(cost) AS avg_cost, MAX(cost) AS max_cost FROM
         (SELECT action_id, kind, SUM(cost_micro_usd) AS cost FROM usage
          WHERE created_at > ? AND kind IN ('solve','debug','followup','live') GROUP BY action_id, kind)
       GROUP BY kind`
    ).bind(since)
  ])
  return {
    note: 'Costs in USD. Multiply by about 95 for rupees.',
    last7Days: (days.results as any[]).map((d) => ({ day: d.day, costUsd: usd(d.cost_micro_usd), newDevices: d.registrations })),
    devices: devices.results[0],
    costPerAnswer: (perAnswer.results as any[]).map((r) => ({
      kind: r.kind,
      answers: r.answers,
      avgUsd: usd(r.avg_cost),
      maxUsd: usd(r.max_cost)
    })),
    calls: (byKind.results as any[]).map((r) => ({
      kind: r.kind,
      provider: r.provider,
      model: r.model,
      calls: r.calls,
      avgInputTokens: Math.round(r.avg_in ?? 0),
      avgOutputTokens: Math.round(r.avg_out ?? 0),
      listenMinutes: r.minutes ?? 0,
      costUsd: usd(r.cost)
    }))
  }
}
