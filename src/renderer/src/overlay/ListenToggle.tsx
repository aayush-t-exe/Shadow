import { useEffect, useState } from 'react'
import { Mic } from 'lucide-react'
import { hotkeyFor, keycaps } from '@shared/hotkeys'
import { useOverlay } from './store'
import { toggleListening } from './listening'

const shortcut = keycaps(hotkeyFor('listen').accelerator).join('+')

function useElapsed(startedAt: number | null): string {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (startedAt === null) return
    const timer = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(timer)
  }, [startedAt])
  if (startedAt === null) return '00:00'
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000))
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

/** Four bars that rise with the source's loudness. */
function Meter({ level, label }: { level: number; label: string }) {
  const bars = [0.25, 0.5, 0.75, 1]
  return (
    <span className="meter" title={label}>
      {bars.map((threshold, i) => (
        <i key={i} style={{ height: `${4 + Math.min(1, level / threshold) * (6 + i * 2)}px` }} />
      ))}
      <b>{label}</b>
    </span>
  )
}

export function ListenToggle() {
  const listen = useOverlay((s) => s.listen)
  const levels = useOverlay((s) => s.levels)
  const elapsed = useElapsed(listen.startedAt)

  if (listen.state === 'off') {
    return (
      <button className="btn" title={`Listen to the conversation  (${shortcut})`} onClick={() => void toggleListening()}>
        <Mic /> Listen
      </button>
    )
  }
  if (listen.state === 'starting') {
    return (
      <button className="btn" disabled>
        <span className="dots">
          <i />
          <i />
          <i />
        </span>
      </button>
    )
  }
  return (
    <button className="btn btn-live" title={`Stop listening  (${shortcut})`} onClick={() => void toggleListening()}>
      <span className="live-dot" />
      <span className="timer">{elapsed}</span>
      <Meter level={levels.system} label="Them" />
      <Meter level={levels.mic} label="You" />
    </button>
  )
}
