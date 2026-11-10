// Razorpay Orders + Standard Checkout. Each Shadow order gets a Razorpay order; our own page
// (/pay/:id) opens Razorpay's checkout window on it (UPI QR, UPI apps, cards). Nothing the
// browser says is trusted: a payment counts only with a valid signature made with the key
// secret, or when Razorpay itself reports the order paid (status check or signed webhook).
// Docs: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/

import type { Config, Env } from './config'

export interface RazorpayOrder {
  id: string
  amount: number
  amount_paid: number
  status: 'created' | 'attempted' | 'paid'
}

async function call<T>(env: Env, cfg: Config, path: string, init: RequestInit = {}): Promise<T> {
  const auth = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`)
  const res = await fetch(`${cfg.bases.razorpay}/v1${path}`, {
    ...init,
    headers: { authorization: `Basic ${auth}`, 'content-type': 'application/json' }
  })
  const data = (await res.json().catch(() => ({}))) as { error?: { description?: string } }
  if (!res.ok) throw new Error(data.error?.description ?? `Razorpay returned ${res.status}`)
  return data as T
}

export function createOrder(
  env: Env,
  cfg: Config,
  order: { id: string; deviceId: string; credits: number; amountPaise: number }
): Promise<RazorpayOrder> {
  return call<RazorpayOrder>(env, cfg, '/orders', {
    method: 'POST',
    body: JSON.stringify({
      amount: order.amountPaise,
      currency: 'INR',
      receipt: order.id,
      notes: { order_id: order.id, shadow_id: order.deviceId, credits: String(order.credits) }
    })
  })
}

export function fetchOrder(env: Env, cfg: Config, razorpayOrderId: string): Promise<RazorpayOrder> {
  return call<RazorpayOrder>(env, cfg, `/orders/${encodeURIComponent(razorpayOrderId)}`)
}

/** The captured payment on a paid order, for the receipt trail. */
export async function paidPaymentId(env: Env, cfg: Config, razorpayOrderId: string): Promise<string | null> {
  try {
    const { items } = await call<{ items: { id: string; status: string }[] }>(env, cfg, `/orders/${encodeURIComponent(razorpayOrderId)}/payments`)
    return items.find((p) => p.status === 'captured')?.id ?? null
  } catch {
    return null
  }
}

export async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function sameHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** Checkout's success signature: HMAC-SHA256(order_id + "|" + payment_id, key secret), hex. */
export async function validPaymentSignature(keySecret: string, razorpayOrderId: string, paymentId: string, signature: string): Promise<boolean> {
  if (!keySecret || !razorpayOrderId || !paymentId || !signature) return false
  return sameHex(await hmacHex(keySecret, `${razorpayOrderId}|${paymentId}`), signature)
}

/** Webhooks are signed with the webhook secret over the raw body (X-Razorpay-Signature). */
export async function validWebhook(secret: string, rawBody: string, signature: string | null): Promise<boolean> {
  if (!secret || !signature) return false
  return sameHex(await hmacHex(secret, rawBody), signature)
}
