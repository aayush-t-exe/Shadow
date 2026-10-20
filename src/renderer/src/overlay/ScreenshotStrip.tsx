import { X } from 'lucide-react'
import { hotkeyFor } from '@shared/hotkeys'
import { Keycaps } from '../components/Keycaps'
import { useOverlay } from './store'

export function ScreenshotStrip() {
  const screenshots = useOverlay((s) => s.screenshots)
  const hasAnswer = useOverlay((s) => s.turns.length > 0)
  if (screenshots.length === 0) return null

  return (
    <div className="shots glass" data-interactive>
      {screenshots.map((shot, i) => (
        <div key={shot.id} className="shot">
          <img src={shot.thumb} alt={`Screenshot ${i + 1}`} />
          <button title="Remove" onClick={() => void window.shadow.removeScreenshot(shot.id)}>
            <X size={11} />
          </button>
        </div>
      ))}
      <div className="shots-hint">
        <span>{screenshots.length}/4 screenshots</span>
        <span>
          <Keycaps accelerator={hotkeyFor('solve').accelerator} /> {hasAnswer ? 'to debug' : 'to solve'}
        </span>
      </div>
    </div>
  )
}
