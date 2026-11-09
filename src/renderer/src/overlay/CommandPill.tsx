import { Camera, EyeOff, GripVertical, MessageSquare, Settings, Sparkles } from 'lucide-react'
import { hotkeyFor, keycaps, type HotkeyAction } from '@shared/hotkeys'
import { Keycaps } from '../components/Keycaps'
import { Logo } from '../components/Logo'
import { reportError as report, useOverlay } from './store'
import { ListenToggle } from './ListenToggle'

const tip = (label: string, action: HotkeyAction) => `${label}  (${keycaps(hotkeyFor(action).accelerator).join('+')})`

export function CommandPill() {
  const openPanel = useOverlay((s) => s.openPanel)

  return (
    <div className="pill glass" data-interactive>
      <span className="grip" title="Drag to move">
        <GripVertical size={14} />
      </span>
      <span className="logo">
        <Logo />
      </span>

      <button className="btn" title={tip('Take screenshot', 'screenshot')} onClick={() => window.shadow.takeScreenshot().catch(report)}>
        <Camera /> Screenshot
      </button>
      <button className="btn btn-primary" title={tip('Solve what is on screen', 'solve')} onClick={() => window.shadow.ask({ mode: 'solve' }).catch(report)}>
        <Sparkles /> Solve <Keycaps accelerator={hotkeyFor('solve').accelerator} />
      </button>
      <button className="btn" title="Ask a question" onClick={openPanel}>
        <MessageSquare /> Ask
      </button>
      <ListenToggle />

      <span className="divider" />

      <button className="btn btn-icon" title={tip('Hide', 'toggle')} onClick={() => window.shadow.hideOverlay()}>
        <EyeOff />
      </button>
      <button className="btn btn-icon btn-raised" title="Settings" onClick={() => window.shadow.openSettings()}>
        <Settings />
      </button>
    </div>
  )
}
