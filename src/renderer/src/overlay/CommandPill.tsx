import { useEffect, useState } from 'react'
import { Building2, Camera, EyeOff, GripVertical, MessageSquare, Settings, Sparkles, Wand2 } from 'lucide-react'
import { hotkeyFor, keycaps, type HotkeyAction } from '@shared/hotkeys'
import { ANSWER_STYLES } from '@shared/profile'
import { Keycaps } from '../components/Keycaps'
import { Logo } from '../components/Logo'
import { reportError as report, useOverlay } from './store'
import { ListenToggle } from './ListenToggle'

const tip = (label: string, action: HotkeyAction) => `${label}  (${keycaps(hotkeyFor(action).accelerator).join('+')})`

export function CommandPill() {
  const openPanel = useOverlay((s) => s.openPanel)

  const answerStyle = useOverlay((s) => s.settings?.answerStyle ?? 'standard')
  const activeProfile = useOverlay((s) => s.settings?.activeProfile ?? null)
  const [company, setCompany] = useState<string | null>(null)
  useEffect(() => {
    setCompany(null)
    if (activeProfile) void window.shadow.getProfile(activeProfile).then((p) => setCompany(p?.company ?? null))
  }, [activeProfile])

  const style = ANSWER_STYLES.find((s) => s.id === answerStyle) ?? ANSWER_STYLES[0]
  const nextStyle = () => {
    const next = ANSWER_STYLES[(ANSWER_STYLES.indexOf(style) + 1) % ANSWER_STYLES.length]
    void window.shadow.setSettings({ answerStyle: next.id })
  }

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

      <button className="btn" title={`Answer style: ${style.hint}. Click for the next style.`} onClick={nextStyle}>
        <Wand2 /> {style.label}
      </button>
      {company && (
        <button className="btn" title="Company brief used for answers. Change it in Settings." onClick={() => window.shadow.openSettings()}>
          <Building2 /> {company}
        </button>
      )}

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
