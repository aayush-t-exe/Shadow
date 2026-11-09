// Buying credits. The app asks for a checkout, opens the returned URL in the browser,
// and polls the order until it's paid. Credits are added only by fulfil(), exactly once.
//
// CHECKOUT_MODE=test serves a fake checkout page (development only). Razorpay plugs into
// createCheckout() and a webhook that calls fulfil() — nothing else changes.

import type { Config, Env, Pack } from './config'
import { balanceOf, credit, now, type Device } from './db'

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } })

/** What the paywall shows: the packs and what this install already got from Shadow. */
export async function paywall(env: Env, cfg: Config, device: Device): Promise<Response> {
  const weekAgo = now() - 7 * 86_400_000
  const [answers, listen, days, bought] = await env.DB.batch([
    env.DB.prepare(
      `SELECT SUM(CASE WHEN kind IN ('solve','debug') THEN 1 ELSE 0 END) AS problems,
              SUM(CASE WHEN kind IN ('followup','live') THEN 1 ELSE 0 END) AS followups
       FROM actions WHERE device_id = ? AND charged = 1`
    ).bind(device.id),
    env.DB.prepare(`SELECT COALESCE(SUM(minutes), 0) AS minutes FROM usage WHERE device_id = ? AND kind = 'listen'`).bind(device.id),
    env.DB.prepare(
      `SELECT date(created_at / 1000, 'unixepoch') AS day, COUNT(*) AS n FROM actions
       WHERE device_id = ? AND charged = 1 AND created_at > ? GROUP BY day`
    ).bind(device.id, weekAgo),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM orders WHERE device_id = ? AND status = 'paid'`).bind(device.id)
  ])
  const a = (answers.results[0] ?? {}) as { problems: number | null; followups: number | null }
  const perDay = new Map((days.results as { day: string; n: number }[]).map((d) => [d.day, d.n]))
  // The last 7 days, oldest first, including days with nothing.
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(now() - (6 - i) * 86_400_000).toISOString().slice(0, 10)
    return { day, answers: perDay.get(day) ?? 0 }
  })
  return json({
    balance: device.balance,
    creditsPerAnswer: cfg.creditsPerAnswer,
    creditsPerListenMinute: cfg.creditsPerListenMinute,
    canBuy: cfg.checkoutMode !== null,
    packs: cfg.packs.map((p) => ({ ...p, listenMinutes: Math.floor(p.credits / cfg.creditsPerListenMinute) })),
    usage: {
      problems: a.problems ?? 0,
      followups: a.followups ?? 0,
      listenMinutes: Math.max(0, (listen.results[0] as { minutes: number } | undefined)?.minutes ?? 0),
      days: last7,
      purchased: ((bought.results[0] as { n: number } | undefined)?.n ?? 0) > 0
    }
  })
}

export async function createCheckout(env: Env, cfg: Config, device: Device, request: Request, url: URL): Promise<Response> {
  if (!cfg.checkoutMode) return json({ error: "Payments aren't set up yet." }, 503)
  const body = (await request.json().catch(() => ({}))) as { pack?: unknown }
  const pack = cfg.packs.find((p) => p.id === body.pack)
  if (!pack) return json({ error: 'Unknown pack.' }, 400)
  const id = `ord_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`
  await env.DB.prepare(
    'INSERT INTO orders (id, device_id, pack_id, credits, amount_paise, provider, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(id, device.id, pack.id, pack.credits, pack.pricePaise, cfg.checkoutMode, now())
    .run()
  return json({ orderId: id, url: `${url.origin}/pay/test/${id}`, credits: pack.credits, pricePaise: pack.pricePaise })
}

export async function checkoutStatus(env: Env, device: Device, orderId: string): Promise<Response> {
  const order = await env.DB.prepare('SELECT status, credits FROM orders WHERE id = ? AND device_id = ?')
    .bind(orderId, device.id)
    .first<{ status: string; credits: number }>()
  if (!order) return json({ error: 'Unknown order.' }, 404)
  return json({ status: order.status, credits: order.credits, balance: await balanceOf(env, device.id) })
}

/** Marks an order paid and adds its credits. Safe to call twice: only the first call credits. */
export async function fulfil(env: Env, orderId: string, providerRef: string | null): Promise<boolean> {
  const order = await env.DB.prepare(
    `UPDATE orders SET status = 'paid', paid_at = ?, provider_ref = ? WHERE id = ? AND status = 'pending' RETURNING device_id, credits, amount_paise`
  )
    .bind(now(), providerRef, orderId)
    .first<{ device_id: string; credits: number; amount_paise: number }>()
  if (!order) return false
  await credit(env, order.device_id, order.credits, 'purchase', `${orderId} ₹${order.amount_paise / 100}`)
  return true
}

// ---------- the test checkout page (CHECKOUT_MODE=test only) ----------

const page = (title: string, inner: string) => new Response(
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0d0d12;color:#ecedf1;font:15px/1.5 'Segoe UI',system-ui,sans-serif}
main{width:min(380px,calc(100% - 32px));padding:28px;border-radius:20px;background:#17171f;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}
.tag{display:inline-block;padding:2px 9px;border-radius:999px;background:#f59e0b22;color:#fbbf24;font-size:12px;font-weight:600}
h1{margin:12px 0 4px;font-size:22px}.muted{color:#9a9ba5;font-size:13px}.price{margin:18px 0;font-size:34px;font-weight:700}
button{width:100%;height:44px;border:0;border-radius:999px;background:linear-gradient(180deg,#7a6cff,#4b3bdc);color:#fff;font:600 15px 'Segoe UI',sans-serif;cursor:pointer}
.ok{color:#34d399;font-weight:600}</style><main>${inner}</main>`,
  { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } }
)

export async function testPayPage(env: Env, cfg: Config, request: Request, orderId: string): Promise<Response> {
  if (cfg.checkoutMode !== 'test') return new Response('Not found', { status: 404 })
  const order = await env.DB.prepare('SELECT status, credits, amount_paise FROM orders WHERE id = ?')
    .bind(orderId)
    .first<{ status: string; credits: number; amount_paise: number }>()
  if (!order) return page('Order not found', '<h1>Order not found</h1>')
  if (request.method === 'POST') {
    await fulfil(env, orderId, 'test')
    return page('Paid', `<span class="tag">TEST MODE · no real money</span><h1 class="ok">✓ Payment received</h1><p class="muted">${order.credits} credits were added. You can close this tab and go back to Shadow.</p>`)
  }
  if (order.status === 'paid') return page('Already paid', `<h1 class="ok">✓ Already paid</h1><p class="muted">Go back to Shadow.</p>`)
  return page(
    'Shadow Cloud checkout (test)',
    `<span class="tag">TEST MODE · no real money</span><h1>Shadow Cloud</h1><p class="muted">${order.credits} credits · pay once, nothing renews</p>
<div class="price">₹${order.amount_paise / 100}</div>
<form method="post"><button type="submit">Pay ₹${order.amount_paise / 100} (test)</button></form>
<p class="muted" style="margin-top:14px">In the real app this is Razorpay's page with UPI and cards.</p>`
  )
}

export type { Pack }
