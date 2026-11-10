// Buying credits. The app asks for a checkout, opens the returned URL in the browser,
// and polls the order until it's paid. Credits are added only by fulfil(), exactly once.
//
// CHECKOUT_MODE=test serves a fake checkout page (development only). Razorpay plugs into
// createCheckout() and a webhook that calls fulfil() — nothing else changes.

import type { Config, Env, Pack } from './config'
import { balanceOf, credit, now, type Device } from './db'
import { createOrder, fetchOrder, paidPaymentId, validPaymentSignature, validWebhook } from './razorpay'

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

  if (cfg.checkoutMode === 'razorpay') {
    try {
      const rzp = await createOrder(env, cfg, { id, deviceId: device.id, credits: pack.credits, amountPaise: pack.pricePaise })
      await env.DB.prepare('UPDATE orders SET link_id = ? WHERE id = ?').bind(rzp.id, id).run()
      return json({ orderId: id, url: `${url.origin}/pay/${id}`, credits: pack.credits, pricePaise: pack.pricePaise })
    } catch (err) {
      await env.DB.prepare(`UPDATE orders SET status = 'failed' WHERE id = ?`).bind(id).run()
      console.error('[razorpay] create order failed', err)
      return json({ error: "Couldn't open the payment page. Please try again." }, 502)
    }
  }
  return json({ orderId: id, url: `${url.origin}/pay/test/${id}`, credits: pack.credits, pricePaise: pack.pricePaise })
}

interface OrderRow {
  id: string
  status: string
  credits: number
  amount_paise: number
  provider: string
  /** The Razorpay order id (order_...). */
  link_id: string | null
}

const ORDER_COLUMNS = 'id, status, credits, amount_paise, provider, link_id'

/** Asks Razorpay whether a pending order is paid; credits it if so. Returns the order's status now. */
async function syncWithRazorpay(env: Env, cfg: Config, order: OrderRow): Promise<string> {
  if (order.status !== 'pending' || order.provider !== 'razorpay' || !order.link_id || cfg.checkoutMode !== 'razorpay') return order.status
  try {
    const rzp = await fetchOrder(env, cfg, order.link_id)
    if (rzp.status === 'paid' && rzp.amount_paid >= order.amount_paise) {
      await fulfil(env, order.id, await paidPaymentId(env, cfg, order.link_id))
      return 'paid'
    }
  } catch (err) {
    console.error('[razorpay] status check failed', err) // try again on the next poll
  }
  return 'pending'
}

export async function checkoutStatus(env: Env, cfg: Config, device: Device, orderId: string): Promise<Response> {
  const order = await env.DB.prepare(`SELECT ${ORDER_COLUMNS} FROM orders WHERE id = ? AND device_id = ?`)
    .bind(orderId, device.id)
    .first<OrderRow>()
  if (!order) return json({ error: 'Unknown order.' }, 404)
  const status = await syncWithRazorpay(env, cfg, order)
  return json({ status, credits: order.credits, balance: await balanceOf(env, device.id) })
}

// ---------- the payment page (CHECKOUT_MODE=razorpay) ----------

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`

/**
 * Shadow's own payment page: shows what's being bought, then opens Razorpay's checkout
 * window for the order. After paying, the window hands this page a signed receipt, which
 * the page posts to /pay/:id/verify.
 */
export async function razorpayPayPage(env: Env, cfg: Config, orderId: string, origin: string): Promise<Response> {
  if (cfg.checkoutMode !== 'razorpay') return new Response('Not found', { status: 404 })
  const order = await env.DB.prepare(`SELECT ${ORDER_COLUMNS} FROM orders WHERE id = ?`).bind(orderId).first<OrderRow>()
  if (!order || !order.link_id) return page('Order not found', '<h1>Order not found</h1><p class="muted">Start again from Shadow.</p>')
  const status = await syncWithRazorpay(env, cfg, order)
  if (status === 'paid') {
    return page('Paid', `<h1 class="ok">✓ Payment received</h1><p class="muted">${order.credits} credits are in Shadow Cloud. You can close this tab.</p>`)
  }
  const testMode = env.RAZORPAY_KEY_ID?.startsWith('rzp_test_')
  const options = {
    key: env.RAZORPAY_KEY_ID,
    order_id: order.link_id,
    amount: order.amount_paise,
    currency: 'INR',
    name: 'Shadow',
    image: `${origin}/logo.png`,
    description: `Shadow Cloud · ${order.credits} credits`,
    notes: { order_id: order.id },
    theme: { color: '#6d5ef5' }
  }
  return page(
    `Shadow Cloud · ${rupees(order.amount_paise)}`,
    `${testMode ? '<span class="tag">TEST MODE · no real money</span>' : ''}
<h1>Shadow Cloud</h1><p class="muted">${order.credits} credits · pay once, nothing renews · price includes GST</p>
<div class="price">${rupees(order.amount_paise)}</div>
<button id="pay" type="button">Pay ${rupees(order.amount_paise)} with UPI or card</button>
<p id="msg" class="muted" style="margin-top:14px">Paid securely through Razorpay. Shadow updates on its own once the payment goes through.</p>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
  const options = ${JSON.stringify(options)};
  const msg = document.getElementById('msg');
  const pay = document.getElementById('pay');
  options.handler = async (r) => {
    pay.disabled = true;
    msg.textContent = 'Confirming your payment…';
    const res = await fetch(location.pathname + '/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(r) }).catch(() => null);
    const ok = res && res.ok && (await res.json()).paid;
    document.querySelector('main').innerHTML = ok
      ? '<h1 class="ok">✓ Payment received</h1><p class="muted">${order.credits} credits are in Shadow Cloud. You can close this tab; Shadow has already updated.</p>'
      : '<h1>Checking your payment…</h1><p class="muted">Shadow updates on its own once it goes through, so you can close this tab.</p>';
  };
  options.modal = { ondismiss: () => { msg.textContent = 'Payment not finished. Nothing was charged. Press the button to try again.'; } };
  const rzp = new Razorpay(options);
  rzp.on('payment.failed', () => { msg.textContent = "The payment didn't go through. No money was taken. Try again or use another UPI app."; });
  pay.onclick = () => rzp.open();
  rzp.open();
</script>`
  )
}

/** The checkout window's signed receipt: verified with the key secret, then the order is credited. */
export async function verifyRazorpayPayment(env: Env, cfg: Config, request: Request, orderId: string): Promise<Response> {
  if (cfg.checkoutMode !== 'razorpay') return json({ error: 'Not found' }, 404)
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const order = await env.DB.prepare(`SELECT ${ORDER_COLUMNS} FROM orders WHERE id = ?`).bind(orderId).first<OrderRow>()
  if (!order?.link_id) return json({ paid: false }, 404)
  const paymentId = String(body.razorpay_payment_id ?? '')
  const signed =
    String(body.razorpay_order_id ?? '') === order.link_id &&
    (await validPaymentSignature(env.RAZORPAY_KEY_SECRET ?? '', order.link_id, paymentId, String(body.razorpay_signature ?? '')))
  if (signed) {
    await fulfil(env, order.id, paymentId)
    return json({ paid: true })
  }
  // Unsigned or wrong: fall back to asking Razorpay directly.
  return json({ paid: (await syncWithRazorpay(env, cfg, order)) === 'paid' })
}

/** Razorpay's server-to-server message (order.paid). Signed with RAZORPAY_WEBHOOK_SECRET. */
export async function razorpayWebhook(env: Env, request: Request): Promise<Response> {
  const raw = await request.text()
  if (!(await validWebhook(env.RAZORPAY_WEBHOOK_SECRET ?? '', raw, request.headers.get('x-razorpay-signature')))) {
    return json({ error: 'Bad signature' }, 400)
  }
  const event = JSON.parse(raw) as {
    event?: string
    payload?: { order?: { entity?: { id?: string; amount_paid?: number } }; payment?: { entity?: { id?: string } } }
  }
  if (event.event === 'order.paid') {
    const rzpOrderId = event.payload?.order?.entity?.id
    const order = rzpOrderId
      ? await env.DB.prepare(`SELECT ${ORDER_COLUMNS} FROM orders WHERE link_id = ?`).bind(rzpOrderId).first<OrderRow>()
      : null
    if (order && (event.payload?.order?.entity?.amount_paid ?? 0) >= order.amount_paise) {
      await fulfil(env, order.id, event.payload?.payment?.entity?.id ?? null)
    }
  }
  return json({ ok: true }) // 200 so Razorpay doesn't retry events we don't use
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
