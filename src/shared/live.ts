// Types for live listening: two audio sources, a transcript, and the listen state.

/** `mic` is the user ("You"); `system` is everything playing through the speakers ("Them"). */
export type AudioSourceId = 'mic' | 'system'

export const SPEAKER: Record<AudioSourceId, 'You' | 'Them'> = { mic: 'You', system: 'Them' }

/** 16 kHz mono 16-bit PCM, sent in 80 ms frames (Deepgram Flux's recommended chunk size). */
export const SAMPLE_RATE = 16000
export const FRAME_MS = 80
export const FRAME_SAMPLES = (SAMPLE_RATE * FRAME_MS) / 1000

export interface TranscriptLine {
  /** Stable per speaking turn: partial updates replace the line with the same id. */
  id: string
  source: AudioSourceId
  text: string
  final: boolean
  /** Milliseconds since listening started. */
  at: number
}

export type ListenState = 'off' | 'starting' | 'on'

export interface ListenStatus {
  state: ListenState
  /** Epoch ms when listening started, for the timer. */
  startedAt: number | null
  /** Per-source problems that didn't stop listening entirely (e.g. "mic blocked"). */
  warning: string | null
}

export interface AudioLevels {
  mic: number
  system: number
}
