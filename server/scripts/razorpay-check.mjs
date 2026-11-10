// Live check against Razorpay TEST mode, using the keys in .dev.vars (no real money).
// Starts Shadow Cloud locally, buys the ₹99 pack, prints the Razorpay link, and waits
// (up to 10 minutes) for you to pay it with Razorpay's test UPI ID: success@razorpay
//
//   cd server && node scripts/razorpay-check.mjs

import { spawn, spawnSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const serverDir = fileURLToPath(new URL('..', import.meta.url))
const PORT = 8798
const CLOUD = `http://127.0.0.1:${PORT}`
const STATE = '.wrangler/razorpay-check-state'
const WEBHOOK_SECRET = 'local-webhook-secret-for-this-check'
const isWin = process.platform === 'win32'
const npx = isWin ? 'npx.cmd' : 'npx'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const vars = Object.fromEntries(
  readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)])
)
if (!vars.RAZORPAY_KEY_ID?.startsWith('rzp_test_')) {
  console.error('Put your Razorpay TEST keys in server/.dev.vars first (this check refuses live keys).')
  process.exit(1)
}

let failures = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '  ok ' : '  FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
  if (!ok) failures++
}

rmSync(new URL(`../${STATE}`, import.meta.url), { recursive: true, force: true })
spawnSync(npx, ['wrangler', 'd1', 'migrations', 'apply', 'shadow-cloud', '--local', '--persist-to', STATE], { cwd: serverDir, shell: true })
const dev = spawn(
  npx,
  ['wrangler', 'dev', '--port', String(PORT), '--persist-to', STATE, '--var', 'CHECKOUT_MODE:razorpay', '--var', `RAZORPAY_WEBHOOK_SECRET:${WEBHOOK_SECRET}`],
  { cwd: serverDir, shell: true, stdio: 'ignore' }
)
const stop = () => {
  if (isWin) spawnSync('taskkill', ['/pid', String(dev.pid), '/T', '/F'], { stdio: 'ignore' })
  else dev.kill()
}
process.on('SIGINT', () => {
  stop()
  process.exit(1)
})

try {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(CLOUD)).ok) break
    } catch {}
    await sleep(500)
  }
  const machine = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, '0')).join('')
  const device = await (await fetch(`${CLOUD}/v1/devices`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ machine }) })).json()
  const auth = { authorization: `Bearer ${device.token}`, 'content-type': 'application/json' }
  console.log(`\nRazorpay test-mode check · Shadow ID ${device.deviceId} · starting with ${device.balance} credits\n`)

  const pw = await (await fetch(`${CLOUD}/v1/paywall`, { headers: auth })).json()
  check('payments are switched on (Razorpay mode)', pw.canBuy === true)

  const order = await (await fetch(`${CLOUD}/v1/checkout`, { method: 'POST', headers: auth, body: JSON.stringify({ pack: 'regular' }) })).json()
  check('Razorpay created an order and Shadow made a payment page for it', (order.url ?? '').startsWith(`${CLOUD}/pay/ord_`), order.url ?? JSON.stringify(order))

  const pending = await (await fetch(`${CLOUD}/v1/checkout/${order.orderId}`, { headers: auth })).json()
  check('before paying, Razorpay says the order is unpaid', pending.status === 'pending', pending.status)

  const forged = await fetch(`${CLOUD}/v1/razorpay/webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-razorpay-signature': 'f'.repeat(64) },
    body: JSON.stringify({ event: 'order.paid', payload: { order: { entity: { id: 'order_fake', amount_paid: 9900 } } } })
  })
  check('a fake "paid" message without the right signature is rejected', forged.status === 400)
  const still = await (await fetch(`${CLOUD}/v1/checkout/${order.orderId}`, { headers: auth })).json()
  check('…and no credits were added', still.status === 'pending' && still.balance === device.balance, `balance ${still.balance}`)

  const payHtml = await (await fetch(order.url)).text()
  check('the payment page opens Razorpay checkout for this order', payHtml.includes('checkout.razorpay.com') && /"order_id":"order_/.test(payHtml) && payHtml.includes('₹99'))
  const rzpOrderId = payHtml.match(/"order_id":"(order_[A-Za-z0-9]+)"/)?.[1]
  const fakeReceipt = await (
    await fetch(`${order.url}/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ razorpay_order_id: rzpOrderId, razorpay_payment_id: 'pay_fake123', razorpay_signature: 'a'.repeat(64) })
    })
  ).json()
  check('a fake payment receipt (wrong signature) is rejected', fakeReceipt.paid === false)

  console.log(`\n  ▶ Open this page and pay (test mode: Netbanking → any bank → Success)\n    ${order.url}\n\n  Waiting for the payment (up to 10 minutes; Ctrl+C to stop)…`)
  let paid = null
  for (let i = 0; i < 200 && !paid; i++) {
    await sleep(3000)
    const s = await (await fetch(`${CLOUD}/v1/checkout/${order.orderId}`, { headers: auth })).json()
    if (s.status === 'paid') paid = s
    if (s.status === 'failed') {
      check('payment went through', false, 'the link expired or was cancelled')
      break
    }
  }
  if (paid) {
    check('Razorpay confirmed the payment and 120 credits were added', paid.balance === device.balance + 120, `${device.balance} → ${paid.balance}`)
    const again = await (await fetch(`${CLOUD}/v1/checkout/${order.orderId}`, { headers: auth })).json()
    check('checking again never adds the credits twice', again.balance === paid.balance)
  } else if (!failures) {
    console.log('  (no payment within 10 minutes; nothing was charged)')
  }
} catch (err) {
  failures++
  console.error(err)
} finally {
  stop()
}
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed')
process.exit(failures ? 1 : 0)
