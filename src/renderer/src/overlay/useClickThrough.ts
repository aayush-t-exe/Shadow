import { useEffect } from 'react'
import type { Rect } from '@shared/geometry'

/**
 * The overlay window ignores the mouse so clicks reach the app underneath.
 * We report where the visible controls (`data-interactive`) are, and main
 * watches the real cursor position and captures the mouse only over them.
 * (Tracking forwarded mouse-move events instead flickers on Windows.)
 */
export function useClickThrough() {
  useEffect(() => {
    let last = ''
    const report = () => {
      const rects: Rect[] = [...document.querySelectorAll('[data-interactive]')].map((el) => {
        const r = el.getBoundingClientRect()
        return { x: Math.floor(r.x), y: Math.floor(r.y), width: Math.ceil(r.width), height: Math.ceil(r.height) }
      })
      const key = JSON.stringify(rects)
      if (key === last) return
      last = key
      window.shadow.setInteractiveRegions(rects)
    }

    // Elements appear, disappear, grow while streaming and animate in, so re-measure
    // on DOM changes, on size changes and when CSS animations finish.
    const resizes = new ResizeObserver(report)
    const observeAll = () => document.querySelectorAll('[data-interactive]').forEach((el) => resizes.observe(el))
    const mutations = new MutationObserver(() => {
      observeAll()
      report()
    })
    mutations.observe(document.body, { childList: true, subtree: true })
    document.addEventListener('animationend', report)
    observeAll()
    report()

    return () => {
      resizes.disconnect()
      mutations.disconnect()
      document.removeEventListener('animationend', report)
    }
  }, [])
}
