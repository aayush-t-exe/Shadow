import { useOverlay } from './store'

export function Toast() {
  const toast = useOverlay((s) => s.toast)
  if (!toast) return null
  return (
    <div key={toast.key} className="toast glass">
      {toast.text}
    </div>
  )
}
