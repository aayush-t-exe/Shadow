import { useEffect, useState } from 'react'
import { ExternalLink, Settings, X } from 'lucide-react'
import { hotkeyFor } from '@shared/hotkeys'
import { providerInfo } from '@shared/providers'
import { Keycaps } from '../components/Keycaps'
import { Logo } from '../components/Logo'
import { useOverlay } from './store'

const DISMISSED_KEY = 'shadow.welcomeDismissed'
const CLOUD_DISMISSED_KEY = 'shadow.cloudWelcomeDismissed'

function wasDismissed(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function remember(key: string) {
  try {
    localStorage.setItem(key, '1')
  } catch {
    // Private storage unavailable: it just shows again next launch.
  }
}

/** First-run card. Shadow Cloud: "your free credits are ready". Own keys: how to add one. */
export function Welcome() {
  const settings = useOverlay((s) => s.settings)
  const keys = useOverlay((s) => s.keys)
  const cloud = useOverlay((s) => s.cloud)
  const asked = useOverlay((s) => s.turns.length > 0)
  const [dismissed, setDismissed] = useState(() => ({ keys: wasDismissed(DISMISSED_KEY), cloud: wasDismissed(CLOUD_DISMISSED_KEY) }))

  // The Shadow Cloud welcome has done its job once the first question is asked.
  useEffect(() => {
    if (asked && settings?.source === 'cloud' && !dismissed.cloud) {
      remember(CLOUD_DISMISSED_KEY)
      setDismissed((d) => ({ ...d, cloud: true }))
    }
  }, [asked, settings?.source, dismissed.cloud])

  if (!settings) return null
  if (settings.source === 'cloud') {
    if (dismissed.cloud) return null
    return (
      <CloudWelcome
        balance={cloud?.balance ?? null}
        offline={cloud?.state === 'offline'}
        perMinute={cloud?.creditsPerListenMinute ?? 3}
        onDismiss={() => {
          remember(CLOUD_DISMISSED_KEY)
          setDismissed((d) => ({ ...d, cloud: true }))
        }}
      />
    )
  }

  if (!keys || dismissed.keys) return null
  const provider = providerInfo(settings.answerModel.provider)
  if (!provider.needsKey || keys[provider.id]) return null

  const dismiss = () => {
    remember(DISMISSED_KEY)
    setDismissed((d) => ({ ...d, keys: true }))
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

function CloudWelcome({
  balance,
  offline,
  perMinute,
  onDismiss
}: {
  balance: number | null
  offline: boolean
  perMinute: number
  onDismiss: () => void
}) {
  const subtitle = offline
    ? "Couldn't reach Shadow Cloud. Check your internet connection."
    : balance === null
      ? 'Getting your free credits ready…'
      : `You have ${balance} free credit${balance === 1 ? '' : 's'}. No API key needed.`
  return (
    <section className="welcome glass" data-interactive>
      <button className="btn btn-sm btn-icon welcome-close" title="Dismiss" onClick={onDismiss}>
        <X />
      </button>
      <div className="welcome-title">
        <Logo size={26} />
        <div>
          <h2>Welcome to Shadow</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      <ol className="welcome-steps">
        <li>
          <span>Open a coding problem and press</span>
          <Keycaps accelerator={hotkeyFor('solve').accelerator} />
        </li>
        <li>
          <span>
            During a lecture or video, press (uses {perMinute} credits a minute)
          </span>
          <Keycaps accelerator={hotkeyFor('listen').accelerator} />
        </li>
      </ol>
    </section>
  )
}
