// Drives the real Shadow app (public edition) against Shadow Cloud on this PC, with fake
// AI providers: no real keys, no money, and a separate test profile so your own Shadow
// settings are untouched. The overlay appears on screen for about a minute while it runs.
//
//   cd server && node scripts/app-e2e.mjs [screenshot-folder]

import { spawn, spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mockVars, startMockProviders } from './mock-providers.mjs'

const serverDir = fileURLToPath(new URL('..', import.meta.url))
const appDir = fileURLToPath(new URL('../..', import.meta.url))
const shotsDir = process.argv[2] ?? null
const MOCK_PORT = 8788
const CLOUD_PORT = 8787 // what a build without SHADOW_CLOUD_URL looks for
const CLOUD = `http://127.0.0.1:${CLOUD_PORT}`
const DEBUG_PORT = 9339
const ADMIN = 'app-e2e-admin-secret-0123456789'
const STATE = '.wrangler/app-e2e-state'
const isWin = process.platform === 'win32'

let failures = 0
function check(name, ok, detail = '') {
  console.log(`${ok ? '  ok ' : '  FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
  if (!ok) failures++
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const killTree = (child) => {
  if (!child?.pid) return
  if (isWin) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else child.kill()
}

// ---------- build the public edition ----------
console.log('Building the public edition…')
const build = spawnSync(process.execPath, ['scripts/electron-vite.mjs', 'build'], {
  cwd: appDir,
  env: { ...process.env, SHADOW_EDITION: 'public', SHADOW_CLOUD_URL: CLOUD },
  encoding: 'utf8'
})
if (build.status !== 0) {
  console.error(build.stdout, build.stderr)
  process.exit(1)
}

// ---------- Shadow Cloud + fake providers ----------
const mock = await startMockProviders(MOCK_PORT)
rmSync(join(serverDir, STATE), { recursive: true, force: true })
const npx = isWin ? 'npx.cmd' : 'npx'
const migrate = spawnSync(npx, ['wrangler', 'd1', 'migrations', 'apply', 'shadow-cloud', '--local', '--persist-to', STATE], {
  cwd: serverDir,
  shell: true,
  encoding: 'utf8'
})
if (migrate.status !== 0) {
  console.error(migrate.stdout, migrate.stderr)
  process.exit(1)
}
const vars = mockVars(MOCK_PORT, ADMIN)
const cloud = spawn(
  npx,
  ['wrangler', 'dev', '--port', String(CLOUD_PORT), '--persist-to', STATE, ...Object.entries(vars).flatMap(([k, v]) => ['--var', `${k}:${v}`])],
  { cwd: serverDir, shell: true, stdio: 'ignore' }
)
for (let i = 0; i < 120; i++) {
  try {
    if ((await fetch(CLOUD)).ok) break
  } catch {}
  await sleep(500)
}

// ---------- the app, in a throwaway profile ----------
const profile = mkdtempSync(join(tmpdir(), 'shadow-app-e2e-'))
const electron = createRequire(join(appDir, 'package.json'))('electron')
const env = { ...process.env, SHADOW_TEST_NO_BROWSER: '1' } // the test pays the checkout page itself
delete env.ELECTRON_RUN_AS_NODE
const app = spawn(electron, [appDir, `--user-data-dir=${profile}`, `--remote-debugging-port=${DEBUG_PORT}`], { env, stdio: ['ignore', 'pipe', 'ignore'] })
let checkoutUrl = null
app.stdout.on('data', (d) => {
  const m = String(d).match(/\[checkout\] (\S+)/)
  if (m) checkoutUrl = m[1]
})

/** A minimal Chrome DevTools Protocol client for one page. */
async function connect(urlPart) {
  let target
  for (let i = 0; i < 60 && !target; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`)).json()
      target = list.find((t) => t.type === 'page' && t.url.includes(urlPart))
    } catch {}
    if (!target) await sleep(500)
  }
  if (!target) throw new Error(`No ${urlPart} page`)
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = reject
  })
  let nextId = 1
  const pending = new Map()
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data)
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg)
      pending.delete(msg.id)
    }
  }
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = nextId++
      pending.set(id, resolve)
      ws.send(JSON.stringify({ id, method, params }))
    })
  const evaluate = async (expression) => {
    const { result } = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? 'evaluate failed')
    return result.result.value
  }
  const screenshot = async (name) => {
    if (!shotsDir) return
    const { result } = await send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(join(shotsDir, name), Buffer.from(result.data, 'base64'))
  }
  return { evaluate, screenshot, close: () => ws.close() }
}

async function waitFor(page, expression, timeoutMs = 15_000) {
  const until = Date.now() + timeoutMs
  for (;;) {
    const value = await page.evaluate(expression).catch(() => null)
    if (value) return value
    if (Date.now() > until) return null
    await sleep(250)
  }
}

const admin = (path, body) =>
  fetch(`${CLOUD}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { authorization: `Bearer ${ADMIN}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  }).then((r) => r.json())

try {
  console.log('\nShadow app ↔ Shadow Cloud\n')
  const overlay = await connect('overlay.html')

  // First launch: registered with no sign-up, free credits shown in the welcome card.
  const status = await waitFor(overlay, `window.shadow.getCloudStatus().then(s => s.state === 'ready' ? s : null)`)
  check('the app registers itself on first launch, no sign-up', !!status?.deviceId, status?.deviceId)
  check('it starts with the free credits', status?.balance === 20, `balance ${status?.balance}`)
  check('the profile is separate from your real Shadow settings', existsSync(join(profile, 'cloud.json')))
  const welcome = await waitFor(overlay, `document.querySelector('.welcome')?.innerText`)
  check('the welcome card says no API key is needed', /20 free credits\. No API key needed/.test(welcome ?? ''), JSON.stringify(welcome))
  check('the welcome card has no "Get a key" step', !/Get key|API keys/.test(welcome ?? ''))
  await overlay.screenshot('1-welcome.png')

  // Settings: public edition shows only Shadow Cloud, no keys or model pickers.
  await overlay.evaluate('window.shadow.openSettings()')
  const settings = await connect('settings.html')
  const settingsText = await waitFor(settings, `(() => { const t = document.body.innerText; return t.includes('Your Shadow ID') && /\\d/.test(document.querySelector('.cloud-balance')?.innerText ?? '') ? t : null })()`)
  check('Settings shows credits and the Shadow ID', settingsText?.includes(status?.deviceId ?? '?'))
  check('Settings has no API keys, model pickers or source switch', settingsText && !/API keys|Answer model|Backup model|My own API keys/.test(settingsText))
  await settings.screenshot('2-settings.png')
  const forced = await settings.evaluate(`window.shadow.setSettings({ source: 'keys' }).then(() => 'allowed', () => 'refused')`)
  check('the public edition refuses to switch to own keys', forced === 'refused')

  // An answer through Shadow Cloud (a typed question, so no screenshot of your screen is taken).
  await overlay.evaluate(`window.shadow.ask({ mode: 'followup', text: 'What is a heap?' })`)
  const answer = await waitFor(overlay, `(() => { const a = document.querySelector('.panel-body')?.innerText ?? ''; return a.includes('fake Gemini') ? a : null })()`)
  check('the answer streams in from Shadow Cloud', !!answer)
  check('the welcome card goes away after the first question', !(await overlay.evaluate(`!!document.querySelector('.welcome')`)))
  const meta = await waitFor(overlay, `(() => { const m = document.querySelector('.panel-meta')?.innerText ?? ''; return m.includes('19') ? m : null })()`)
  check('the panel shows credits left instead of the provider', /^Shadow Cloud · 19 credits left/.test(meta ?? ''), meta)
  await overlay.screenshot('3-answer.png')

  // Listen: a fake Deepgram token is rejected by the real Deepgram, so the start fails and is refunded.
  const listen = await overlay.evaluate(`window.shadow.startListening().then(() => 'started', (e) => e.message)`)
  check('listening asks Shadow Cloud, and a failed connection is reported', /Shadow Cloud couldn't start listening|Deepgram/.test(listen), listen)
  await sleep(1500)
  const afterListen = await overlay.evaluate('window.shadow.refreshCloud()')
  check('a listening start that failed is refunded', afterListen.balance === 19, `balance ${afterListen.balance}`)

  // Out of credits: the paywall takes the answer's place.
  await admin('/v1/admin/grant', { deviceId: status.deviceId, credits: -afterListen.balance })
  await overlay.evaluate(`window.shadow.ask({ mode: 'followup', text: 'And a stack?' })`)
  const pw = await waitFor(overlay, `(() => { const p = document.querySelector('.pw'); return p && p.querySelectorAll('.pw-opt').length === 3 ? p.innerText : null })()`)
  check('with 0 credits the paywall shows three orbs instead of an error', !!pw && !(await overlay.evaluate(`!!document.querySelector('.panel-body .error')`)))
  check('each pack says what it buys in answers and Listen minutes', /≈ 120 answers/.test(pw ?? '') && /≈ 40 min of Listen/.test(pw ?? ''), JSON.stringify(pw?.slice(0, 300)))
  check('the paywall recaps what the free credits got', /1 question answered/.test(pw ?? '') && !/0 problems/.test(pw ?? ''), JSON.stringify(pw?.slice(0, 80)))
  check('the panel says "Out of credits"', (await overlay.evaluate(`document.querySelector('.panel-title')?.innerText`)) === 'Out of credits')
  await overlay.screenshot('4-paywall.png')

  // Buy the ₹99 pack: the waiting card, then the test checkout is paid, then the orb lights up.
  await overlay.evaluate(`document.querySelector('.pw-cta').click()`)
  const waiting = await waitFor(overlay, `(() => { const t = document.querySelector('.pw-wait')?.innerText ?? ''; return t.includes('Finish paying') ? t : null })()`)
  check('buying shows "Finish paying in your browser"', /Finish paying in your browser/.test(waiting ?? ''), JSON.stringify(waiting))
  for (let i = 0; i < 40 && !checkoutUrl; i++) await sleep(250)
  check('the checkout page would open in the browser', /\/pay\/test\/ord_/.test(checkoutUrl ?? ''), checkoutUrl)
  await overlay.screenshot('5-waiting.png')
  await fetch(checkoutUrl, { method: 'POST' })
  const paidCard = await waitFor(overlay, `document.querySelector('.pw-paid')?.innerText`, 10_000)
  check('after paying, the card switches to "Payment received"', /Payment received/.test(paidCard ?? ''), JSON.stringify(paidCard))
  await sleep(4500) // let the slow orb animation finish
  check('the orb counts up to 120', (await overlay.evaluate(`document.querySelector('.pw-num')?.innerText`)) === '120')
  await overlay.screenshot('6-paid.png')
  const resumed = await waitFor(overlay, `(() => { const n = (document.querySelector('.panel-body')?.innerText.match(/fake Gemini/g) ?? []).length; return n >= 2 ? n : null })()`, 10_000)
  check('the saved question is answered automatically after paying', !!resumed)
  const afterBuy = await waitFor(overlay, `window.shadow.getCloudStatus().then(s => s.balance === 119 ? s.balance : null)`, 10_000)
  check('120 credits arrived and the saved answer used one', afterBuy === 119, `balance ${afterBuy}`)

  // Running low: the header chip.
  await admin('/v1/admin/grant', { deviceId: status.deviceId, credits: -116 })
  await overlay.evaluate('window.shadow.refreshCloud()')
  const chip = await waitFor(overlay, `document.querySelector('.pw-low')?.innerText`)
  check('with 3 credits left the header shows "3 left · Top up"', /3 left/.test(chip ?? ''), JSON.stringify(chip))
  await overlay.screenshot('7-low.png')
  await overlay.evaluate(`document.querySelector('.pw-low').click()`)
  const topup = await waitFor(overlay, `(() => { const t = document.querySelector('.panel-title')?.innerText; return t === 'Add credits' ? t : null })()`)
  check('the chip opens the paywall to add credits', topup === 'Add credits')
  await waitFor(overlay, `document.querySelectorAll('.pw-later').length > 0 || null`)
  await overlay.evaluate(`[...document.querySelectorAll('.pw-later')].pop().click()`)

  // Listen with too few credits opens the paywall instead of failing.
  await admin('/v1/admin/grant', { deviceId: status.deviceId, credits: -3 })
  await overlay.evaluate('window.shadow.refreshCloud()')
  const started = await overlay.evaluate(`window.shadow.startListening()`)
  const listenPw = await waitFor(overlay, `[...document.querySelectorAll('.pw .pw-title')].map((t) => t.innerText).find((t) => t === 'Listen needs credits') ?? null`)
  check('Listen with no credits shows the paywall, not an error', started === false && !!listenPw, `${started} ${listenPw}`)
  await overlay.screenshot('8-listen.png')

  // What it cost (the fake answer's tokens priced like real Gemini Flash-Lite).
  const stats = await admin('/v1/admin/stats')
  const perAnswer = stats.costPerAnswer.find((r) => r.kind === 'followup')
  check('the server measured the cost of the answer', perAnswer?.avgUsd > 0, JSON.stringify(perAnswer))

  overlay.close()
  settings.close()
} catch (err) {
  failures++
  console.error(err)
} finally {
  killTree(app)
  killTree(cloud)
  mock.close()
  await sleep(1000)
  rmSync(profile, { recursive: true, force: true })
}

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed')
process.exit(failures ? 1 : 0)
