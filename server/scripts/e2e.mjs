// End-to-end test of Shadow Cloud on your own PC, with no real keys and no money:
// a fake Gemini/Groq/Deepgram runs here, the real server runs under `wrangler dev`,
// and requests are made with the same AI SDK providers the Shadow app uses.
//
//   cd server && npm run e2e

import { spawn, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { rmSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { mockVars, startMockProviders } from './mock-providers.mjs'

const serverDir = fileURLToPath(new URL('..', import.meta.url))
const appRequire = createRequire(new URL('../../package.json', import.meta.url)) // the Shadow app's node_modules
const load = async (name) => import(pathToFileURL(appRequire.resolve(name)).href)
const { streamText, generateText, Output } = await load('ai')
const { createGoogle } = await load('@ai-sdk/google')
const { createGroq } = await load('@ai-sdk/groq')
const { z } = await load('zod')

const MOCK_PORT = 8788
const CLOUD_PORT = 8797
const CLOUD = `http://127.0.0.1:${CLOUD_PORT}`
const ADMIN = 'e2e-admin-secret-0123456789'
const STATE = '.wrangler/e2e-state'

let failures = 0
function check(name, ok, detail = '') {
  console.log(`${ok ? '  ok ' : '  FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
  if (!ok) failures++
}

// ---------- fake providers ----------

const upstreamSeen = []
const mock = await startMockProviders(MOCK_PORT, upstreamSeen)

// ---------- the real server, locally ----------

rmSync(new URL(`../${STATE}`, import.meta.url), { recursive: true, force: true })
const wrangler = (args, opts = {}) =>
  spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['wrangler', ...args], { cwd: serverDir, shell: true, encoding: 'utf8', ...opts })
const migrate = wrangler(['d1', 'migrations', 'apply', 'shadow-cloud', '--local', '--persist-to', STATE])
if (migrate.status !== 0) {
  console.error(migrate.stdout, migrate.stderr)
  process.exit(1)
}

const vars = mockVars(MOCK_PORT, ADMIN)
const dev = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['wrangler', 'dev', '--port', String(CLOUD_PORT), '--persist-to', STATE, ...Object.entries(vars).flatMap(([k, v]) => ['--var', `${k}:${v}`])],
  { cwd: serverDir, shell: true, stdio: ['ignore', 'pipe', 'pipe'] }
)
let devLog = ''
dev.stdout.on('data', (d) => (devLog += d))
dev.stderr.on('data', (d) => (devLog += d))

async function waitForServer() {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(CLOUD)).ok) return
    } catch {}
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`wrangler dev did not start:\n${devLog}`)
}

const machine = (n) => n.toString(16).padStart(64, '0')
const post = (path, body, token) =>
  fetch(`${CLOUD}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body ?? {})
  })
const admin = (path, init = {}) => fetch(`${CLOUD}${path}`, { ...init, headers: { authorization: `Bearer ${ADMIN}`, 'content-type': 'application/json' } })

/** The same provider setup the Shadow app uses in Cloud mode. */
function cloudModels(token, action, kind, seen) {
  const headers = { 'x-shadow-action': action, 'x-shadow-kind': kind }
  const fetchAndRead = async (input, init) => {
    const res = await fetch(input, init)
    seen.balance = res.headers.get('x-shadow-balance')
    seen.status = res.status
    return res
  }
  return {
    gemini: (id) => createGoogle({ apiKey: token, baseURL: `${CLOUD}/v1/gemini/v1beta`, headers, fetch: fetchAndRead })(id),
    groq: (id) => createGroq({ apiKey: token, baseURL: `${CLOUD}/v1/groq/openai/v1`, headers, fetch: fetchAndRead })(id)
  }
}

async function streamAll(model) {
  let text = ''
  for await (const part of streamText({ model, prompt: 'Solve it', maxRetries: 0 }).stream) {
    if (part.type === 'text-delta') text += part.text
    if (part.type === 'error') throw part.error
  }
  return text
}

try {
  await waitForServer()
  console.log('Shadow Cloud e2e\n')

  const config = await (await fetch(`${CLOUD}/v1/config`)).json()
  check('config lists the answer and backup models', config.models.answer.modelId === 'gemini-3.5-flash-lite' && config.models.backup.provider === 'groq')

  // Registration
  const first = await (await post('/v1/devices', { machine: machine(1) })).json()
  check('a new PC gets the free starter credits', first.balance === config.freeCredits, `balance ${first.balance}`)
  check('the Shadow ID is readable', /^[2-9A-Z]{4}-[2-9A-Z]{4}$/.test(first.deviceId), first.deviceId)
  const again = await (await post('/v1/devices', { machine: machine(1) })).json()
  check('reinstalling on the same PC gets the same device back, no new free credits', again.deviceId === first.deviceId && again.balance === first.balance)
  const oldToken = await fetch(`${CLOUD}/v1/me`, { headers: { authorization: `Bearer ${first.token}` } })
  check('the old token stops working after re-registering', oldToken.status === 401)
  const token = again.token
  check('bad registration is refused', (await post('/v1/devices', { machine: 'nope' })).status === 400)

  // A solve, then its backup call under the same action: charged once.
  const action = crypto.randomUUID()
  const seen = {}
  const m = cloudModels(token, action, 'solve', seen)
  const text = await streamAll(m.gemini('gemini-3.5-flash-lite'))
  check('a solve streams the answer through', text.includes('fake Gemini through Shadow Cloud'), JSON.stringify(text))
  check('a solve costs one credit', Number(seen.balance) === config.freeCredits - 1, `balance ${seen.balance}`)
  const backupText = await streamAll(m.groq('qwen/qwen3.8-27b'))
  check('the backup model works through Groq', backupText === 'Hello from Groq')
  check('the backup under the same answer costs nothing extra', Number(seen.balance) === config.freeCredits - 1, `balance ${seen.balance}`)
  const geminiCall = upstreamSeen.find((u) => u.url.includes(':streamGenerateContent'))
  check('Gemini receives the real key, not the device token', geminiCall?.headers['x-goog-api-key'] === 'test-gemini')

  // The classifier is free
  const cSeen = {}
  const c = cloudModels(token, crypto.randomUUID(), 'classify', cSeen)
  const { output } = await generateText({
    model: c.gemini('gemini-3.5-flash-lite'),
    prompt: 'is this a question?',
    output: Output.object({ schema: z.object({ needsAnswer: z.boolean(), question: z.string() }) }),
    maxRetries: 0
  })
  check('the question classifier works', output.needsAnswer === true)
  check('the classifier is free', Number(cSeen.balance) === config.freeCredits - 1, `balance ${cSeen.balance}`)

  // Refusals
  const wrongModel = await streamAll(cloudModels(token, crypto.randomUUID(), 'solve', {}).gemini('gemini-ultra-max')).catch((e) => e)
  check('models Shadow Cloud does not offer are refused', wrongModel?.statusCode === 403, String(wrongModel?.statusCode))
  const noToken = await streamAll(createGoogle({ apiKey: 'AIza-not-ours', baseURL: `${CLOUD}/v1/gemini/v1beta` })('gemini-3.5-flash-lite')).catch((e) => e)
  check('requests without a Shadow token are refused', noToken?.statusCode === 401, String(noToken?.statusCode))
  const noKind = await fetch(`${CLOUD}/v1/gemini/v1beta/models/gemini-3.5-flash-lite:streamGenerateContent?alt=sse`, {
    method: 'POST',
    headers: { 'x-goog-api-key': token, 'content-type': 'application/json' },
    body: '{}'
  })
  check('requests without an action id are refused', noKind.status === 400)

  // Admin
  check('admin needs the secret', (await fetch(`${CLOUD}/v1/admin/stats`)).status === 403)
  const me = await (await fetch(`${CLOUD}/v1/me`, { headers: { authorization: `Bearer ${token}` } })).json()
  const drained = await (await admin('/v1/admin/grant', { method: 'POST', body: JSON.stringify({ deviceId: first.deviceId, credits: -me.balance, note: 'e2e' }) })).json()
  check('admin can set credits (down to 0 here)', drained.balance === 0, `balance ${drained.balance}`)

  // Out of credits
  const broke = await streamAll(cloudModels(token, crypto.randomUUID(), 'solve', {}).gemini('gemini-3.5-flash-lite')).catch((e) => e)
  check('with 0 credits, a solve is refused with 402', broke?.statusCode === 402, String(broke?.statusCode))
  check('the 402 explains why', /credits/i.test(broke?.message ?? ''), broke?.message)
  const brokeListen = await post('/v1/listen/start', {}, token)
  check('with 0 credits, listening is refused', brokeListen.status === 402)

  // Listening
  await admin('/v1/admin/grant', { method: 'POST', body: JSON.stringify({ deviceId: first.deviceId, credits: 10, note: 'e2e' }) })
  const start = await (await post('/v1/listen/start', {}, token)).json()
  check('listening hands out a temporary Deepgram token', start.token === 'temporary-deepgram-token')
  check('the first listening minute is paid up front', start.balance === 10 - config.creditsPerListenMinute, `balance ${start.balance}`)
  const tick = await (await post('/v1/listen/tick', { session: start.session }, token)).json()
  check('a tick within the same minute costs nothing', tick.balance === start.balance, `balance ${tick.balance}`)
  const fresh = await (await post('/v1/listen/token', { session: start.session }, token)).json()
  check('a dropped stream can get a fresh token', fresh.token === 'temporary-deepgram-token')
  const deepgramCall = upstreamSeen.find((u) => u.url === '/v1/auth/grant')
  check('Deepgram receives the real key', deepgramCall?.headers.authorization === 'Token test-deepgram')
  await post('/v1/listen/stop', { session: start.session }, token)
  check('a stopped session gets no more tokens', (await post('/v1/listen/token', { session: start.session }, token)).status === 410)
  const failedStart = await (await post('/v1/listen/start', {}, token)).json()
  const refunded = await (await post('/v1/listen/stop', { session: failedStart.session, failed: true }, token)).json()
  check('if the app could not connect to Deepgram, the first minute is refunded', refunded.balance === start.balance, `balance ${refunded.balance}`)
  const again2 = await (await post('/v1/listen/stop', { session: failedStart.session, failed: true }, token)).json()
  check('a refund only happens once', again2.balance === start.balance, `balance ${again2.balance}`)

  // Free-credit farming from one network
  const balances = []
  for (let i = 2; i <= 7; i++) balances.push((await (await post('/v1/devices', { machine: machine(i) })).json()).balance)
  check('one network gets free credits on at most 5 new PCs a day', balances.filter((b) => b > 0).length === 4 && balances.at(-1) === 0, balances.join(','))

  // Buying credits (test checkout)
  const authed = { headers: { authorization: `Bearer ${token}` } }
  const pw = await (await fetch(`${CLOUD}/v1/paywall`, authed)).json()
  check('the paywall lists three packs with Listen minutes', pw.packs?.length === 3 && pw.packs[1].listenMinutes === 40 && pw.packs[1].default === true, JSON.stringify(pw.packs?.[1]))
  check('the paywall shows what this install already got', pw.usage?.problems === 1 && pw.usage?.days?.length === 7, JSON.stringify(pw.usage))
  const order = await (await post('/v1/checkout', { pack: 'regular' }, token)).json()
  check('checkout returns an order and a payment page', /^ord_/.test(order.orderId ?? '') && order.url?.includes('/pay/test/'), JSON.stringify(order))
  const pending = await (await fetch(`${CLOUD}/v1/checkout/${order.orderId}`, authed)).json()
  check('a new order is pending', pending.status === 'pending')
  const before = pending.balance
  const payPage = await (await fetch(order.url)).text()
  check('the test payment page shows the price', payPage.includes('₹99') && payPage.includes('TEST MODE'))
  await fetch(order.url, { method: 'POST' })
  await fetch(order.url, { method: 'POST' }) // paying twice must not credit twice
  const paid = await (await fetch(`${CLOUD}/v1/checkout/${order.orderId}`, authed)).json()
  check('after paying, the order is paid and 120 credits are added once', paid.status === 'paid' && paid.balance === before + 120, `${before} → ${paid.balance}`)
  check('unknown packs are refused', (await post('/v1/checkout', { pack: 'gold' }, token)).status === 400)

  // Measurements
  const stats = await (await admin('/v1/admin/stats')).json()
  const solve = stats.costPerAnswer.find((r) => r.kind === 'solve')
  // Gemini: 2000 × 0.30 + 1500 × 2.50 = 4350 µ$; Groq: 900 × 0.80 + 400 × 4.00 = 2320 µ$ → $0.00667 for the answer
  check('stats show the real cost of an answer', solve?.avgUsd === 0.00667, JSON.stringify(solve))
  check('stats count listening minutes', stats.calls.some((r) => r.kind === 'listen' && r.listenMinutes === 1))
} catch (err) {
  failures++
  console.error(err)
} finally {
  // Kill the whole tree (npx → wrangler → workerd); killing only the parent leaves workerd running.
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(dev.pid), '/T', '/F'], { stdio: 'ignore' })
  else dev.kill()
  mock.close()
}

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed')
process.exit(failures ? 1 : 0)
