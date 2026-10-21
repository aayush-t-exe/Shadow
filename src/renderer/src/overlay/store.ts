import { create } from 'zustand'
import type { AnswerStartEvent, ErrorCode, KeyStatus, ScreenshotInfo, Settings } from '@shared/types'
import type { AudioLevels, ListenStatus, TranscriptLine } from '@shared/live'

export interface Turn extends AnswerStartEvent {
  answer: string
  /** Pre-answer progress ("Reading screen…"); cleared by the first token. */
  status: string | null
  streaming: boolean
  aborted: boolean
  error: { code: ErrorCode; message: string } | null
  firstTokenMs: number | null
  totalMs: number | null
}

interface OverlayState {
  turns: Turn[]
  screenshots: ScreenshotInfo[]
  toast: { key: number; text: string } | null
  panelOpen: boolean
  settings: Settings | null
  listen: ListenStatus
  levels: AudioLevels
  transcript: TranscriptLine[]
  /** null until loaded; used to show the first-run welcome card. */
  keys: KeyStatus | null
  openPanel: () => void
  closePanel: () => void
}

const MAX_TRANSCRIPT_LINES = 200

export const useOverlay = create<OverlayState>()((set) => ({
  turns: [],
  screenshots: [],
  toast: null,
  panelOpen: false,
  settings: null,
  listen: { state: 'off', startedAt: null, warning: null },
  levels: { mic: 0, system: 0 },
  transcript: [],
  keys: null,
  openPanel: () => set({ panelOpen: true }),
  closePanel: () => set({ panelOpen: false })
}))

const TOAST_MS = 2400

function updateTurn(id: string, patch: (t: Turn) => Partial<Turn>) {
  useOverlay.setState((s) => ({ turns: s.turns.map((t) => (t.id === id ? { ...t, ...patch(t) } : t)) }))
}

export function showToast(text: string) {
  const key = Date.now()
  useOverlay.setState({ toast: { key, text } })
  setTimeout(() => {
    if (useOverlay.getState().toast?.key === key) useOverlay.setState({ toast: null })
  }, TOAST_MS)
}

/** Shows a failed IPC call as a toast, minus Electron's "Error invoking remote method…" prefix. */
export function reportError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err)
  showToast(message.replace(/^Error invoking remote method '[^']+': (Error: )?/, ''))
}

/** Subscribes the store to events from main. Called once at startup. */
export function connectToMain() {
  const api = window.shadow
  void api.getSettings().then((settings) => useOverlay.setState({ settings }))
  api.onSettingsChanged((settings) => useOverlay.setState({ settings }))

  api.onAnswerStart((e) =>
    useOverlay.setState((s) => ({
      panelOpen: true,
      turns: [
        ...s.turns,
        { ...e, answer: '', status: null, streaming: true, aborted: false, error: null, firstTokenMs: null, totalMs: null }
      ]
    }))
  )
  api.onAnswerStatus(({ id, status, provider, modelId }) =>
    updateTurn(id, () => (provider && modelId ? { status, provider, modelId } : { status }))
  )
  api.onAnswerChunk(({ id, delta }) => updateTurn(id, (t) => ({ answer: t.answer + delta, status: null })))
  api.onAnswerDone(({ id, aborted, firstTokenMs, totalMs }) =>
    updateTurn(id, () => ({ streaming: false, status: null, aborted, firstTokenMs, totalMs }))
  )
  api.onAnswerError(({ id, code, message }) =>
    updateTurn(id, () => ({ streaming: false, status: null, error: { code, message } }))
  )
  api.onScreenshots((screenshots) => useOverlay.setState({ screenshots }))
  api.onSessionReset(() => useOverlay.setState({ turns: [], transcript: [], panelOpen: false }))
  api.onToast(showToast)

  void api.getKeyStatus().then((keys) => useOverlay.setState({ keys }))
  api.onKeysChanged((keys) => useOverlay.setState({ keys }))

  void api.getListenStatus().then((listen) => useOverlay.setState({ listen }))
  api.onListenStatus((listen) => useOverlay.setState({ listen }))
  api.onTranscriptLine(upsertLine)
}

/** Partial updates replace the line with the same id; an empty final line (echo) removes it. */
function upsertLine(line: TranscriptLine) {
  useOverlay.setState((s) => {
    const rest = s.transcript.filter((l) => l.id !== line.id)
    if (line.final && !line.text) return { transcript: rest }
    const index = s.transcript.findIndex((l) => l.id === line.id)
    const next = index === -1 ? [...s.transcript, line] : s.transcript.map((l) => (l.id === line.id ? line : l))
    return { transcript: next.slice(-MAX_TRANSCRIPT_LINES) }
  })
}
