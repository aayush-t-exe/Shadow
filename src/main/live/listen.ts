import { IPC } from '@shared/api'
import { SPEAKER, type AudioSourceId, type ListenStatus, type TranscriptLine } from '@shared/live'
import { similarity } from '@shared/text'
import { latestQuestionRun } from '@shared/question'
import { getApiKey } from '../secrets'
import { getSettings } from '../settings'
import { broadcast } from '../windows'
import { ShadowError } from '../ai/errors'
import { cloudListenTick, cloudListenToken, showPaywall, startCloudListen, stopCloudListen } from '../cloud'
import { DeepgramFlux, type FluxTurn } from './deepgram'

// Owns one Deepgram socket per audio source while listening, turns their events into
// transcript lines for the UI, and keeps the finished turns for question detection.

export interface FinalTurn {
  source: AudioSourceId
  text: string
  /** Epoch ms when the turn ended. */
  endedAt: number
}

export type TurnSignal =
  | { kind: 'final'; turn: FinalTurn }
  /** "Them" probably finished; start preparing an answer early. */
  | { kind: 'eager'; text: string }
  /** "Them" kept talking after an eager signal; drop the early answer. */
  | { kind: 'resumed' }
  /** "You" started talking. */
  | { kind: 'mic-start' }

const SOURCES: AudioSourceId[] = ['mic', 'system']
const MAX_HISTORY = 300
// A "You" line this similar to a recent "Them" line is the call leaking from speakers into the mic.
const ECHO_SIMILARITY = 0.6
const ECHO_WINDOW_MS = 4000
const RECONNECT_DELAY_MS = 1000
// Shadow Cloud charges listening by the minute; the app checks in this often.
const CLOUD_TICK_MS = 60_000
const CLOUD_REJECTED = "Shadow Cloud couldn't start listening. Try again in a moment."

/** How the sockets sign in: the user's own Deepgram key, or a Shadow Cloud session. */
type SpeechAuth = { kind: 'key'; key: string } | { kind: 'cloud'; session: string }
let speechAuth: SpeechAuth | null = null
let tickTimer: ReturnType<typeof setInterval> | null = null

let status: ListenStatus = { state: 'off', startedAt: null, warning: null }
let sockets: Partial<Record<AudioSourceId, DeepgramFlux>> = {}
// Bumped on every (re)connect: Deepgram restarts turn numbering per socket, and ids must stay unique.
let generation = 0
let history: FinalTurn[] = []
let listenStartedAt = Date.now()
const signalListeners = new Set<(signal: TurnSignal) => void>()

export const getListenStatus = () => status
export const transcriptHistory = (): readonly FinalTurn[] => history

export function onTurnSignal(listener: (signal: TurnSignal) => void): () => void {
  signalListeners.add(listener)
  return () => signalListeners.delete(listener)
}
const emitSignal = (signal: TurnSignal) => signalListeners.forEach((fn) => fn(signal))

function setStatus(patch: Partial<ListenStatus>) {
  status = { ...status, ...patch }
  broadcast(IPC.listenStatus, status)
}

function sendLine(line: TranscriptLine) {
  broadcast(IPC.transcriptLine, line)
}

function isEcho(text: string, now: number): boolean {
  return history.some((t) => t.source === 'system' && now - t.endedAt < ECHO_WINDOW_MS && similarity(t.text, text) >= ECHO_SIMILARITY)
}

function handleTurn(source: AudioSourceId, gen: number, turn: FluxTurn) {
  if (!turn.transcript) return
  const id = `${source}-${gen}-${turn.turnIndex}`
  const now = Date.now()
  // The final turn can arrive just after listening stopped, so don't rely on status.startedAt.
  const at = now - listenStartedAt

  if (turn.event === 'StartOfTurn' && source === 'mic') emitSignal({ kind: 'mic-start' })
  if (source === 'system' && turn.event === 'EagerEndOfTurn') emitSignal({ kind: 'eager', text: turn.transcript })
  if (source === 'system' && turn.event === 'TurnResumed') emitSignal({ kind: 'resumed' })

  if (turn.event !== 'EndOfTurn') {
    sendLine({ id, source, text: turn.transcript, final: false, at })
    return
  }
  if (source === 'mic' && isEcho(turn.transcript, now)) {
    sendLine({ id, source, text: '', final: true, at }) // empty final = remove the line
    return
  }
  sendLine({ id, source, text: turn.transcript, final: true, at })
  const finalTurn: FinalTurn = { source, text: turn.transcript, endedAt: now }
  history = [...history, finalTurn].slice(-MAX_HISTORY)
  emitSignal({ kind: 'final', turn: finalTurn })
}

/** The Authorization header for a new socket. Shadow Cloud tokens live a minute, so reconnects get a fresh one. */
async function authorizationFor(auth: SpeechAuth): Promise<string> {
  return auth.kind === 'key' ? `Token ${auth.key}` : `Bearer ${await cloudListenToken(auth.session)}`
}

async function openSocket(source: AudioSourceId, authorization: string): Promise<void> {
  const gen = ++generation
  const socket = new DeepgramFlux(
    authorization,
    getSettings().sttLanguage,
    {
      onTurn: (turn) => handleTurn(source, gen, turn),
      onError: (message) => setStatus({ warning: `${SPEAKER[source]}: ${message}` }),
      onDrop: () => void reconnect(source)
    },
    speechAuth?.kind === 'cloud' ? CLOUD_REJECTED : undefined
  )
  sockets[source] = socket
  await socket.connect()
}

async function reconnect(source: AudioSourceId) {
  if (status.state !== 'on' || !speechAuth) return
  setStatus({ warning: `Reconnecting ${SPEAKER[source]}…` })
  await new Promise((r) => setTimeout(r, RECONNECT_DELAY_MS))
  if (status.state !== 'on' || !speechAuth) return
  try {
    await openSocket(source, await authorizationFor(speechAuth))
    setStatus({ warning: null })
  } catch (err) {
    setStatus({ warning: `${SPEAKER[source]} transcription stopped: ${err instanceof Error ? err.message : err}` })
  }
}

/**
 * Opens the transcription sockets. The renderer starts capturing audio only if this resolves
 * true; false means Shadow Cloud is out of credits and the paywall was shown instead.
 */
export async function startListening(): Promise<boolean> {
  if (status.state !== 'off') return status.state === 'on'
  setStatus({ state: 'starting', warning: null })
  let authorization: string
  try {
    if (getSettings().source === 'cloud') {
      // Pays for the first minute and returns a short-lived token both sockets can open with.
      const { session, token } = await startCloudListen()
      speechAuth = { kind: 'cloud', session }
      authorization = `Bearer ${token}`
    } else {
      const key = await getApiKey('deepgram')
      if (!key) throw new Error('Add a Deepgram API key in Settings to use live listening.')
      speechAuth = { kind: 'key', key }
      authorization = `Token ${key}`
    }
    await Promise.all(SOURCES.map((source) => openSocket(source, authorization)))
  } catch (err) {
    closeSockets()
    endSpeechAuth(true)
    setStatus({ state: 'off' })
    if (err instanceof ShadowError && err.code === 'NO_CREDITS') {
      showPaywall('listen')
      return false
    }
    throw err
  }
  listenStartedAt = Date.now()
  setStatus({ state: 'on', startedAt: listenStartedAt })
  if (speechAuth?.kind === 'cloud') {
    const session = speechAuth.session
    tickTimer = setInterval(() => void tick(session), CLOUD_TICK_MS)
  }
  return true
}

/** Pays for the next minute of Shadow Cloud listening; stops listening when the credits run out. */
async function tick(session: string) {
  try {
    await cloudListenTick(session)
  } catch (err) {
    if (err instanceof ShadowError && err.code === 'NO_CREDITS') {
      // The transcript so far stays on screen; the paywall offers more minutes.
      stopListening()
      showPaywall('listen')
    } else if (err instanceof ShadowError && /ended|busy/i.test(err.message)) {
      stopListening()
      broadcast(IPC.toast, err.message)
    } else {
      setStatus({ warning: err instanceof Error ? err.message : String(err) })
    }
  }
}

/** `failed`: the sockets never opened, so Shadow Cloud refunds the prepaid minute. */
function endSpeechAuth(failed = false) {
  if (tickTimer) clearInterval(tickTimer)
  tickTimer = null
  if (speechAuth?.kind === 'cloud') stopCloudListen(speechAuth.session, failed)
  speechAuth = null
}

/** Closes both sockets; each first finalizes any sentence still in progress. */
function closeSockets() {
  for (const socket of Object.values(sockets)) void socket?.close()
  sockets = {}
}

export function stopListening(): void {
  if (status.state === 'off') return
  closeSockets()
  endSpeechAuth()
  setStatus({ state: 'off', startedAt: null, warning: null })
}

export function pushAudio(source: AudioSourceId, pcm: Buffer): void {
  if (status.state === 'on') sockets[source]?.send(pcm)
}

export function setCaptureWarning(warning: string | null): void {
  setStatus({ warning })
}

export function clearTranscript(): void {
  history = []
}

/** The newest finished turns, oldest first, capped by count and total length, for AI prompts. */
export function recentTranscript(maxTurns = 25, maxChars = 10_000): { speaker: string; text: string; at: number }[] {
  const picked: FinalTurn[] = []
  let chars = 0
  for (let i = history.length - 1; i >= 0 && picked.length < maxTurns; i--) {
    chars += history[i].text.length
    if (chars > maxChars && picked.length > 0) break
    picked.unshift(history[i])
  }
  const base = history[0]?.endedAt ?? 0
  return picked.map((t) => ({ speaker: SPEAKER[t.source], text: t.text, at: t.endedAt - base }))
}

/**
 * The latest question as spoken, joined across the pauses it was read out in
 * (either speaker); falls back to the newest "Them" turn.
 */
export function latestQuestion(): string | undefined {
  return latestQuestionRun(history) ?? [...history].reverse().find((t) => t.source === 'system')?.text
}

/** Epoch ms when the newest turn ended, or 0. */
export const lastTurnEndedAt = () => history.at(-1)?.endedAt ?? 0
