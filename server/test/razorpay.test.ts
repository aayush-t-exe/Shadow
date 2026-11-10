import { describe, expect, it } from 'vitest'
import { validPaymentSignature, validWebhook } from '../src/razorpay'

// Razorpay's documented formulas (HMAC-SHA256, hex), computed here with Web Crypto.
async function sign(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

describe('checkout receipt signature', () => {
  const secret = 'key_secret_for_tests'
  it('accepts HMAC-SHA256(order_id|payment_id) made with the key secret', async () => {
    const sig = await sign(secret, 'order_ABC|pay_XYZ')
    expect(await validPaymentSignature(secret, 'order_ABC', 'pay_XYZ', sig)).toBe(true)
  })
  it('rejects a different payment, a different secret, or junk', async () => {
    const sig = await sign(secret, 'order_ABC|pay_XYZ')
    expect(await validPaymentSignature(secret, 'order_ABC', 'pay_OTHER', sig)).toBe(false)
    expect(await validPaymentSignature('wrong_secret', 'order_ABC', 'pay_XYZ', sig)).toBe(false)
    expect(await validPaymentSignature(secret, 'order_ABC', 'pay_XYZ', 'a'.repeat(64))).toBe(false)
    expect(await validPaymentSignature(secret, 'order_ABC', 'pay_XYZ', '')).toBe(false)
  })
})

describe('webhook signature', () => {
  const secret = 'webhook_secret_for_tests'
  const body = JSON.stringify({ event: 'order.paid', payload: { order: { entity: { id: 'order_ABC', amount_paid: 9900 } } } })
  it('accepts HMAC-SHA256(raw body) made with the webhook secret', async () => {
    expect(await validWebhook(secret, body, await sign(secret, body))).toBe(true)
  })
  it('rejects a changed body, a missing signature, or no secret configured', async () => {
    expect(await validWebhook(secret, body.replace('9900', '1'), await sign(secret, body))).toBe(false)
    expect(await validWebhook(secret, body, null)).toBe(false)
    expect(await validWebhook('', body, await sign('x', body))).toBe(false)
  })
})
