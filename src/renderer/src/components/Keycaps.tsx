import { keycaps } from '@shared/hotkeys'

export function Keycaps({ accelerator }: { accelerator: string }) {
  return (
    <span className="keys">
      {keycaps(accelerator).map((k) => (
        <kbd key={k} className="key">
          {k}
        </kbd>
      ))}
    </span>
  )
}
