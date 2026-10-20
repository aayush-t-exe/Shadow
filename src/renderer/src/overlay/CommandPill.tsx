import { Camera, EyeOff, GripVertical, MessageSquare, Settings, Sparkles } from 'lucide-react'
import { hotkeyFor, keycaps, type HotkeyAction } from '@shared/hotkeys'
import type { CodeLanguage } from '@shared/types'
import { Keycaps } from '../components/Keycaps'
import { Logo } from '../components/Logo'
import { reportError as report, useOverlay } from './store'
import { ListenToggle } from './ListenToggle'

const tip = (label: string, action: HotkeyAction) => `${label}  (${keycaps(hotkeyFor(action).accelerator).join('+')})`

export function CommandPill() {
  const language = useOverlay((s) => s.settings?.language ?? 'python')
  const openPanel = useOverlay((s) => s.openPanel)

  const setLanguage = (lang: CodeLanguage) => void window.shadow.setSettings({ language: lang })

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

      <span className="segmented" role="group" aria-label="Answer language">
        {(['python', 'java'] as const).map((lang) => (
          <button key={lang} aria-pressed={language === lang} onClick={() => setLanguage(lang)}>
            {lang === 'python' ? 'Python' : 'Java'}
          </button>
        ))}
      </span>

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
