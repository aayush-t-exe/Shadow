import { IPC } from '@shared/api'
import { SPEAKER, type AudioSourceId, type ListenStatus, type TranscriptLine } from '@shared/live'
import { similarity } from '@shared/text'
import { looksLikeQuestion } from '@shared/question'
import { getApiKey } from '../secrets'
import { getSettings } from '../settings'
import { broadcast } from '../windows'
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

async function openSocket(source: AudioSourceId, apiKey: string): Promise<void> {
  const gen = ++generation
  const socket = new DeepgramFlux(apiKey, getSettings().sttLanguage, {
    onTurn: (turn) => handleTurn(source, gen, turn),
    onError: (message) => setStatus({ warning: `${SPEAKER[source]}: ${message}` }),
    onDrop: () => void reconnect(source, apiKey)
  })
  sockets[source] = socket
  await socket.connect()
}

async function reconnect(source: AudioSourceId, apiKey: string) {
  if (status.state !== 'on') return
  setStatus({ warning: `Reconnecting ${SPEAKER[source]}…` })
  await new Promise((r) => setTimeout(r, RECONNECT_DELAY_MS))
  if (status.state !== 'on') return
  try {
    await openSocket(source, apiKey)
    setStatus({ warning: null })
  } catch (err) {
    setStatus({ warning: `${SPEAKER[source]} transcription stopped: ${err instanceof Error ? err.message : err}` })
  }
}

/** Opens the transcription sockets. The renderer starts capturing audio once this resolves. */
export async function startListening(): Promise<void> {
  if (status.state !== 'off') return
  setStatus({ state: 'starting', warning: null })
  const apiKey = await getApiKey('deepgram')
  if (!apiKey) {
    setStatus({ state: 'off' })
    throw new Error('Add a Deepgram API key in Settings to use live listening.')
  }
  try {
    await Promise.all(SOURCES.map((source) => openSocket(source, apiKey)))
  } catch (err) {
    closeSockets()
    setStatus({ state: 'off' })
    throw err
  }
  listenStartedAt = Date.now()
  setStatus({ state: 'on', startedAt: listenStartedAt })
}

/** Closes both sockets; each first finalizes any sentence still in progress. */
function closeSockets() {
  for (const socket of Object.values(sockets)) void socket?.close()
  sockets = {}
}

export function stopListening(): void {
  if (status.state === 'off') return
  closeSockets()
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

/** The newest turn that sounds like a question (either speaker), else the newest "Them" turn. */
export function lastQuestionTurn(): FinalTurn | undefined {
  const newestFirst = [...history].reverse()
  return newestFirst.find((t) => looksLikeQuestion(t.text)) ?? newestFirst.find((t) => t.source === 'system')
}

/** Epoch ms when the newest turn ended, or 0. */
export const lastTurnEndedAt = () => history.at(-1)?.endedAt ?? 0
