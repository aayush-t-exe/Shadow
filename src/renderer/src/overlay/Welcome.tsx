import { useState } from 'react'
import { ExternalLink, Settings, X } from 'lucide-react'
import { hotkeyFor } from '@shared/hotkeys'
import { providerInfo } from '@shared/providers'
import { Keycaps } from '../components/Keycaps'
import { Logo } from '../components/Logo'
import { useOverlay } from './store'

const DISMISSED_KEY = 'shadow.welcomeDismissed'

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

/** First-run card: shown until the selected AI provider has a key (or the user closes it). */
export function Welcome() {
  const settings = useOverlay((s) => s.settings)
  const keys = useOverlay((s) => s.keys)
  const [dismissed, setDismissed] = useState(wasDismissed)

  if (!settings || !keys || dismissed) return null
  const provider = providerInfo(settings.answerModel.provider)
  if (!provider.needsKey || keys[provider.id]) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // Private storage unavailable: it just shows again next launch.
    }
  }

  return (
    <section className="welcome glass" data-interactive>
      <button className="btn btn-sm btn-icon welcome-close" title="Dismiss" onClick={dismiss}>
        <X />
      </button>
      <div className="welcome-title">
        <Logo size={26} />
        <div>
          <h2>Welcome to Shadow</h2>
          <p>Three steps to your first answer. It's free.</p>
        </div>
      </div>
      <ol className="welcome-steps">
        <li>
          <span>Get a free {provider.label} API key</span>
          <button className="btn btn-sm btn-raised" onClick={() => window.shadow.openKeyPage(provider.id)}>
            Get key <ExternalLink />
          </button>
        </li>
        <li>
          <span>Paste it in Settings → API keys</span>
          <button className="btn btn-sm btn-raised" onClick={() => window.shadow.openSettings()}>
            <Settings /> Settings
          </button>
        </li>
        <li>
          <span>Open a coding problem, press</span>
          <Keycaps accelerator={hotkeyFor('solve').accelerator} />
        </li>
      </ol>
    </section>
  )
}
