import { create } from 'zustand'
import type { AnswerStartEvent, ErrorCode, ScreenshotInfo, Settings } from '@shared/types'

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
  openPanel: () => void
  closePanel: () => void
}

export const useOverlay = create<OverlayState>()((set) => ({
  turns: [],
  screenshots: [],
  toast: null,
  panelOpen: false,
  settings: null,
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
  api.onAnswerStatus(({ id, status }) => updateTurn(id, () => ({ status })))
  api.onAnswerChunk(({ id, delta }) => updateTurn(id, (t) => ({ answer: t.answer + delta, status: null })))
  api.onAnswerDone(({ id, aborted, firstTokenMs, totalMs }) =>
    updateTurn(id, () => ({ streaming: false, status: null, aborted, firstTokenMs, totalMs }))
  )
  api.onAnswerError(({ id, code, message }) =>
    updateTurn(id, () => ({ streaming: false, status: null, error: { code, message } }))
  )
  api.onScreenshots((screenshots) => useOverlay.setState({ screenshots }))
  api.onSessionReset(() => useOverlay.setState({ turns: [], panelOpen: false }))
  api.onToast(showToast)
}
