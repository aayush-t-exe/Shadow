import { safeStorage, shell } from 'electron'
import Store from 'electron-store'
import { execFile } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { IPC } from '@shared/api'
import { CLOUD_URL } from '@shared/edition'
import type { AskMode, CloudStatus, ModelChoice, PaywallInfo, PaywallReason, PurchaseStatus } from '@shared/types'
import { broadcast } from './windows'
import { ShadowError } from './ai/errors'

// Shadow Cloud client: registers this install once (no sign-up), keeps the device token
// encrypted like an API key, and tells the UI how many credits are left. The AI requests
// themselves go through the normal AI SDK providers, pointed at the server (ai/providers.ts).

/** One user action. Every model call made for it shares the id, so it's charged once. */
export interface CloudAction {
  id: string
  kind: AskMode | 'classify'
}

interface CloudModels {
  answer: ModelChoice
  backup: ModelChoice | null
}

interface CloudStore {
  /** The device token, encrypted with Windows DPAPI. */
  cipher?: string
  deviceId?: string
  /** Fallback machine id when Windows' MachineGuid can't be read. */
  machineFallback?: string
  models?: CloudModels
  creditsPerAnswer?: number
  creditsPerListenMinute?: number
  firstTokenTotalMs?: number
  firstTokenCount?: number
}

// Matches the server's defaults, so answers work even before /v1/config has been fetched.
const DEFAULT_MODELS: CloudModels = {
  answer: { provider: 'gemini', modelId: 'gemini-3.5-flash-lite', vision: true },
  backup: { provider: 'groq', modelId: 'qwen/qwen3.8-27b', vision: true }
}
const TIMEOUT_MS = 15_000
const OFFLINE = "Couldn't reach Shadow Cloud. Check your internet connection."

let store: Store<CloudStore> | undefined
const getStore = () => (store ??= new Store<CloudStore>({ name: 'cloud' }))

let status: CloudStatus = {
  state: 'connecting',
  deviceId: null,
  balance: null,
  creditsPerAnswer: 1,
  creditsPerListenMinute: 3,
  error: null
}

export function getCloudStatus(): CloudStatus {
  const s = getStore()
  return {
    ...status,
    deviceId: status.deviceId ?? s.get('deviceId') ?? null,
    creditsPerAnswer: s.get('creditsPerAnswer') ?? status.creditsPerAnswer,
    creditsPerListenMinute: s.get('creditsPerListenMinute') ?? status.creditsPerListenMinute
  }
}

function setStatus(patch: Partial<CloudStatus>) {
  status = { ...getCloudStatus(), ...patch }
  broadcast(IPC.cloudStatus, status)
}

/** The models Shadow Cloud answers with (the server decides; cached from the last check). */
export function cloudModels(): CloudModels {
  return getStore().get('models') ?? DEFAULT_MODELS
}

/** Remembers what the server said about models and prices. */
function remember(data: { deviceId?: string; models?: CloudModels; creditsPerAnswer?: number; creditsPerListenMinute?: number }) {
  const s = getStore()
  if (data.deviceId) s.set('deviceId', data.deviceId)
  if (data.models?.answer) s.set('models', data.models)
  if (typeof data.creditsPerAnswer === 'number') s.set('creditsPerAnswer', data.creditsPerAnswer)
  if (typeof data.creditsPerListenMinute === 'number') s.set('creditsPerListenMinute', data.creditsPerListenMinute)
}

// ---------- device identity ----------

/** Windows' MachineGuid, hashed, so a reinstall on the same PC gets the same account (and credits) back. */
async function machineId(): Promise<string> {
  const guid = await new Promise<string | null>((resolve) =>
    execFile('reg', ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'], { windowsHide: true }, (err, stdout) =>
      resolve(err ? null : (stdout.match(/MachineGuid\s+REG_SZ\s+(\S+)/)?.[1] ?? null))
    )
  )
  let source = guid
  if (!source) {
    source = getStore().get('machineFallback') ?? randomUUID()
    getStore().set('machineFallback', source)
  }
  return createHash('sha256').update(`shadow-cloud:${source}`).digest('hex')
}

async function saveToken(token: string) {
  if (!(await safeStorage.isAsyncEncryptionAvailable())) throw new ShadowError('CLOUD', 'Windows encryption is unavailable, so Shadow Cloud cannot sign in.')
  getStore().set('cipher', (await safeStorage.encryptStringAsync(token)).toString('base64'))
}

async function loadToken(): Promise<string | null> {
  const cipher = getStore().get('cipher')
  if (!cipher) return null
  try {
    const { result } = await safeStorage.decryptStringAsync(Buffer.from(cipher, 'base64'))
    return result
  } catch {
    return null
  }
}

async function register(): Promise<string> {
  const data = await request('/v1/devices', { method: 'POST', body: { machine: await machineId() }, auth: false })
  await saveToken(data.token)
  remember(data)
  setStatus({ state: 'ready', deviceId: data.deviceId, balance: data.balance, error: null })
  return data.token
}

let tokenPromise: Promise<string> | null = null

/** The device token, registering this install first if needed. */
export function cloudToken(): Promise<string> {
  tokenPromise ??= (async () => (await loadToken()) ?? register())().catch((err) => {
    tokenPromise = null
    throw err
  })
  return tokenPromise
}

/** The server no longer knows our token: forget it; the next call registers again (same PC → same account). */
function forgetToken() {
  getStore().delete('cipher')
  tokenPromise = null
}

// ---------- requests to the server ----------

interface RequestOptions {
  method?: 'GET' | 'POST'
  body?: unknown
  auth?: boolean
}

async function request(path: string, { method = 'GET', body, auth = true }: RequestOptions = {}, retried = false): Promise<any> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (auth) headers.authorization = `Bearer ${await cloudToken()}`
  let res: Response
  try {
    res = await fetch(`${CLOUD_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    })
  } catch {
    setStatus({ state: 'offline', error: OFFLINE })
    throw new ShadowError('CLOUD', OFFLINE)
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, any>
  if (auth && res.status === 401 && !retried) {
    forgetToken()
    return request(path, { method, body, auth }, true)
  }
  if (typeof data.balance === 'number') setStatus({ state: 'ready', balance: data.balance, error: null })
  if (!res.ok) {
    const message = typeof data.error === 'string' ? data.error : `Shadow Cloud returned an error (${res.status}).`
    throw new ShadowError(res.status === 402 ? 'NO_CREDITS' : 'CLOUD', message)
  }
  return data
}

/** Checks credits (registering first if needed) and updates the UI. Never throws. */
export async function refreshCloud(): Promise<CloudStatus> {
  try {
    const me = await request('/v1/me')
    remember(me)
    setStatus({ state: 'ready', deviceId: me.deviceId, balance: me.balance, error: null })
  } catch (err) {
    if (status.state !== 'offline') setStatus({ error: err instanceof Error ? err.message : String(err) })
  }
  return getCloudStatus()
}

/**
 * fetch for the AI SDK in Cloud mode: tags each call with its action, keeps the credit
 * count in the UI current, and signs in again once if the server forgot this install.
 */
export function cloudFetch(action: CloudAction): typeof fetch {
  const send = async (input: Parameters<typeof fetch>[0], init: RequestInit | undefined, retried: boolean): Promise<Response> => {
    const headers = new Headers(init?.headers)
    headers.set('x-shadow-action', action.id)
    headers.set('x-shadow-kind', action.kind)
    let res: Response
    try {
      res = await fetch(input, { ...init, headers })
    } catch (err) {
      if (!(init?.signal?.aborted ?? false)) setStatus({ state: 'offline', error: OFFLINE })
      throw err
    }
    const balance = res.headers.get('x-shadow-balance')
    if (balance !== null) setStatus({ state: 'ready', balance: Number(balance), error: null })
    if (res.status === 401 && !retried) {
      forgetToken()
      const token = await cloudToken()
      // Gemini's SDK sends the token as x-goog-api-key, OpenAI-style SDKs as a Bearer header.
      if (headers.has('x-goog-api-key')) headers.set('x-goog-api-key', token)
      if (headers.has('authorization')) headers.set('authorization', `Bearer ${token}`)
      return send(input, { ...init, headers }, true)
    }
    return res
  }
  return (input, init) => send(input, init, false)
}

// ---------- the paywall and buying credits ----------

/** Shows the paywall in the overlay (e.g. Listen ran out, or "Add credits" in Settings). */
export function showPaywall(reason: PaywallReason): void {
  if (purchase.state !== 'opening' && purchase.state !== 'waiting') setPurchase({ state: 'idle' })
  broadcast(IPC.showPaywall, reason)
}

/** Remembers how fast answers start on this PC, for the paywall's "what you got" line. */
export function recordFirstToken(ms: number): void {
  const s = getStore()
  s.set('firstTokenTotalMs', (s.get('firstTokenTotalMs') ?? 0) + ms)
  s.set('firstTokenCount', (s.get('firstTokenCount') ?? 0) + 1)
}

export async function getPaywall(): Promise<PaywallInfo> {
  const data = (await request('/v1/paywall')) as Omit<PaywallInfo, 'usage'> & { usage: Omit<PaywallInfo['usage'], 'avgFirstTokenMs'> }
  const count = getStore().get('firstTokenCount') ?? 0
  const avgFirstTokenMs = count > 0 ? Math.round((getStore().get('firstTokenTotalMs') ?? 0) / count) : null
  return { ...data, usage: { ...data.usage, avgFirstTokenMs } }
}

let purchase: PurchaseStatus = { state: 'idle' }
let pollTimer: ReturnType<typeof setTimeout> | null = null
let pollStartedAt = 0
const purchasedListeners = new Set<() => boolean>()

export const getPurchase = () => purchase

function setPurchase(next: PurchaseStatus) {
  purchase = next
  broadcast(IPC.purchaseStatus, next)
}

/** Called once a payment lands; return true if a saved problem is being answered because of it. */
export function onPurchased(listener: () => boolean): void {
  purchasedListeners.add(listener)
}

// Check every 3 s while the checkout is fresh, then every 15 s, and give up after 40 minutes.
const FAST_POLL_MS = 3_000
const SLOW_POLL_MS = 15_000
const SLOW_AFTER_MS = 10 * 60_000
const GIVE_UP_AFTER_MS = 40 * 60_000

function stopPolling() {
  if (pollTimer) clearTimeout(pollTimer)
  pollTimer = null
}

async function pollOnce(): Promise<void> {
  const orderId = purchase.orderId
  if (purchase.state !== 'waiting' || !orderId) return
  try {
    const order = await request(`/v1/checkout/${orderId}`)
    if (purchase.orderId !== orderId) return // cancelled or replaced meanwhile
    if (order.status === 'paid') {
      stopPolling()
      let resuming = false
      for (const listener of purchasedListeners) resuming = listener() || resuming
      setPurchase({ ...purchase, state: 'paid', resuming })
      return
    }
    if (order.status === 'failed') {
      // Razorpay says the link expired or was cancelled without a payment.
      stopPolling()
      setPurchase({ state: 'error', packId: purchase.packId, message: 'The payment page expired before a payment went through. No money was taken. Try again.' })
      return
    }
  } catch {
    // Offline for a moment: keep waiting.
  }
  schedulePoll()
}

function schedulePoll() {
  stopPolling()
  const waited = Date.now() - pollStartedAt
  if (waited > GIVE_UP_AFTER_MS) {
    setPurchase({ state: 'error', message: "We haven't seen your payment. If money left your account, contact support with your Shadow ID and the UPI reference." })
    return
  }
  if (waited > SLOW_AFTER_MS && !purchase.slow) setPurchase({ ...purchase, slow: true })
  pollTimer = setTimeout(() => void pollOnce(), waited > SLOW_AFTER_MS ? SLOW_POLL_MS : FAST_POLL_MS)
}

/** Only our own server's pages may be opened as a checkout. */
function openCheckout(url: string) {
  if (process.env.SHADOW_TEST_NO_BROWSER) {
    console.log(`[checkout] ${url}`) // the app test pays this page itself
    return
  }
  const allowed = url.startsWith(`${CLOUD_URL}/`) || url.startsWith('https://rzp.io/') || url.startsWith('https://checkout.razorpay.com/')
  if (allowed) void shell.openExternal(url)
}

/** Starts buying a pack: creates the order, opens the payment page, and waits for it. */
export async function buyPack(packId: string): Promise<void> {
  if (purchase.state === 'opening' || purchase.state === 'waiting') return
  stopPolling()
  setPurchase({ state: 'opening', packId })
  try {
    const order = await request('/v1/checkout', { method: 'POST', body: { pack: packId } })
    setPurchase({ state: 'waiting', packId, orderId: order.orderId, credits: order.credits, pricePaise: order.pricePaise, url: order.url })
    openCheckout(order.url)
    pollStartedAt = Date.now()
    schedulePoll()
  } catch (err) {
    setPurchase({ state: 'error', packId, message: err instanceof Error ? err.message : String(err) })
  }
}

/** The waiting card's buttons: check now ("I've paid"), reopen the payment page, or cancel. */
export function checkoutAction(action: 'check' | 'reopen' | 'cancel'): void {
  if (purchase.state !== 'waiting') return
  if (action === 'check') {
    stopPolling()
    void pollOnce()
  } else if (action === 'reopen' && purchase.url) {
    openCheckout(purchase.url)
  } else if (action === 'cancel') {
    stopPolling()
    setPurchase({ state: 'idle' })
  }
}

// ---------- listening ----------

export interface CloudListen {
  session: string
  token: string
}

/** Pays for the first minute and returns a short-lived Deepgram token for the sockets. */
export async function startCloudListen(): Promise<CloudListen> {
  const data = await request('/v1/listen/start', { method: 'POST' })
  return { session: data.session, token: data.token }
}

/** A fresh Deepgram token for reconnecting within the same session. */
export async function cloudListenToken(session: string): Promise<string> {
  return (await request('/v1/listen/token', { method: 'POST', body: { session } })).token
}

/** Pays for the next minute; throws NO_CREDITS when the credits run out. */
export async function cloudListenTick(session: string): Promise<void> {
  await request('/v1/listen/tick', { method: 'POST', body: { session } })
}

/** Ends the session. `failed`: Deepgram never connected, so the prepaid first minute is refunded. */
export function stopCloudListen(session: string, failed = false): void {
  void request('/v1/listen/stop', { method: 'POST', body: { session, failed } }).catch(() => {})
}
