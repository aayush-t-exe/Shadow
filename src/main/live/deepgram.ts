import WebSocket from 'ws'
import { SAMPLE_RATE } from '@shared/live'

// Deepgram Flux: streaming speech-to-text with built-in turn detection, so it tells us
// when someone has *finished* talking (EndOfTurn) rather than just pausing.
// Docs: https://developers.deepgram.com/docs/flux/quickstart and /docs/flux/state

export type FluxEvent = 'StartOfTurn' | 'Update' | 'EagerEndOfTurn' | 'TurnResumed' | 'EndOfTurn'

export interface FluxTurn {
  event: FluxEvent
  turnIndex: number
  transcript: string
}

export interface FluxHandlers {
  onTurn: (turn: FluxTurn) => void
  onError: (message: string) => void
  /** The socket closed without us asking (network drop, server timeout). */
  onDrop: () => void
}

const FLUX_URL = 'wss://api.deepgram.com/v2/listen'
const CONNECT_TIMEOUT_MS = 10_000
const FORCE_END_TIMEOUT_MS = 1500

export class DeepgramFlux {
  private ws: WebSocket | null = null
  private closing = false
  // True between StartOfTurn and EndOfTurn: someone is mid-sentence.
  private inTurn = false
  private turnEnded: (() => void) | null = null

  constructor(
    private apiKey: string,
    private language: 'en' | 'multi',
    private handlers: FluxHandlers
  ) {}

  async connect(): Promise<void> {
    const params = new URLSearchParams({
      model: this.language === 'multi' ? 'flux-general-multi' : 'flux-general-en',
      encoding: 'linear16',
      sample_rate: String(SAMPLE_RATE),
      // EagerEndOfTurn fires early so an answer can start before the turn is certain.
      eager_eot_threshold: '0.5',
      // Force a turn end after 3 s of silence (the default 5 s feels sluggish when listening for questions).
      eot_timeout_ms: '3000'
    })
    if (this.language === 'multi') {
      params.append('language_hint', 'en')
      params.append('language_hint', 'hi')
    }

    const ws = new WebSocket(`${FLUX_URL}?${params}`, { headers: { Authorization: `Token ${this.apiKey}` } })
    this.ws = ws

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        ws.terminate()
        reject(new Error("Couldn't reach Deepgram. Check your internet connection."))
      }, CONNECT_TIMEOUT_MS)
      ws.once('open', () => {
        clearTimeout(timer)
        resolve()
      })
      // Deepgram answers a bad key with an HTTP error instead of upgrading the socket.
      ws.once('unexpected-response', (_req, res) => {
        clearTimeout(timer)
        ws.terminate()
        reject(
          new Error(
            res.statusCode === 401 || res.statusCode === 403
              ? 'Deepgram rejected the API key. Check it in Settings.'
              : `Deepgram refused the connection (HTTP ${res.statusCode}).`
          )
        )
      })
      ws.once('error', (err) => {
        clearTimeout(timer)
        reject(err)
      })
    })

    ws.on('message', (data, isBinary) => {
      if (isBinary) return
      try {
        this.handleMessage(JSON.parse(data.toString()))
      } catch {
        // Ignore anything that isn't JSON; Deepgram only sends JSON text frames.
      }
    })
    ws.on('error', (err) => this.handlers.onError(err.message))
    ws.on('close', () => {
      if (!this.closing) this.handlers.onDrop()
    })
  }

  private handleMessage(msg: Record<string, unknown>) {
    if (msg.type === 'Error') {
      this.handlers.onError(String(msg.description ?? msg.message ?? 'Deepgram error'))
      return
    }
    // TurnInfo messages carry an `event`; Connected and other control messages don't.
    if (typeof msg.event !== 'string') return
    if (msg.event === 'StartOfTurn') this.inTurn = true
    if (msg.event === 'EndOfTurn') {
      this.inTurn = false
      this.turnEnded?.()
    }
    this.handlers.onTurn({
      event: msg.event as FluxEvent,
      turnIndex: Number(msg.turn_index ?? 0),
      transcript: String(msg.transcript ?? '').trim()
    })
  }

  send(pcm: Buffer) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(pcm)
  }

  /**
   * Ends the stream without losing the sentence in progress. CloseStream alone never
   * finalizes a turn, so if someone is mid-turn we first send ForceEndTurn and wait
   * (briefly) for its EndOfTurn.
   */
  async close(): Promise<void> {
    this.closing = true
    const ws = this.ws
    this.ws = null
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      ws?.terminate()
      return
    }
    if (this.inTurn) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, FORCE_END_TIMEOUT_MS)
        this.turnEnded = () => {
          clearTimeout(timer)
          resolve()
        }
        ws.send(JSON.stringify({ type: 'ForceEndTurn' }))
      })
      this.turnEnded = null
    }
    ws.send(JSON.stringify({ type: 'CloseStream' }))
    setTimeout(() => ws.terminate(), 500)
  }
}
