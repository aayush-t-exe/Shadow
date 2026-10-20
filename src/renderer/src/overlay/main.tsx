import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../styles/base.css'
import './overlay.css'
import { CommandPill } from './CommandPill'
import { ScreenshotStrip } from './ScreenshotStrip'
import { ResponsePanel } from './ResponsePanel'
import { connectToMain, useOverlay } from './store'
import { useClickThrough } from './useClickThrough'

function Toast() {
  const toast = useOverlay((s) => s.toast)
  if (!toast) return null
  return (
    <div key={toast.key} className="toast glass">
      {toast.text}
    </div>
  )
}

function Overlay() {
  useClickThrough()
  const panelOpen = useOverlay((s) => s.panelOpen)
  return (
    <main className="stage">
      <CommandPill />
      <Toast />
      <ScreenshotStrip />
      {panelOpen && <ResponsePanel />}
    </main>
  )
}

connectToMain()
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Overlay />
  </StrictMode>
)
