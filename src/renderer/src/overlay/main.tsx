import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../styles/base.css'
import './overlay.css'
import { CommandPill } from './CommandPill'
import { ScreenshotStrip } from './ScreenshotStrip'
import { ResponsePanel } from './ResponsePanel'
import { connectToMain, useOverlay } from './store'
import { connectListening } from './listening'
import { TranscriptPane } from './TranscriptPane'
import { Welcome } from './Welcome'
import { Toast } from './Toast'
import { useClickThrough } from './useClickThrough'

function Overlay() {
  useClickThrough()
  const panelOpen = useOverlay((s) => s.panelOpen)
  const showTranscript = useOverlay((s) => s.listen.state !== 'off' || s.transcript.length > 0)
  return (
    <main className="stage">
      <CommandPill />
      <Toast />
      <Welcome />
      <ScreenshotStrip />
      <div className="workspace">
        {showTranscript && <TranscriptPane />}
        {panelOpen && <ResponsePanel />}
      </div>
    </main>
  )
}

connectToMain()
connectListening()
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Overlay />
  </StrictMode>
)
