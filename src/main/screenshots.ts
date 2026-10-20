import { desktopCapturer, screen } from 'electron'
import { getOverlay } from './windows'

export interface Screenshot {
  id: string
  png: Buffer
  thumb: string
}

// Wider than this gets downscaled: 2560px keeps code legible while keeping uploads fast.
const MAX_WIDTH = 2560
// Time for Windows' compositor to actually remove the hidden overlay from the screen.
const HIDE_SETTLE_MS = 160

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Captures the monitor under the mouse cursor at full physical resolution. */
export async function captureScreen(): Promise<Screenshot> {
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  // Screen coordinates are in DIPs; the capture must be in physical pixels.
  const size = {
    width: Math.round(display.size.width * display.scaleFactor),
    height: Math.round(display.size.height * display.scaleFactor)
  }

  // Hide Shadow itself so it doesn't cover the problem in the screenshot.
  const overlay = getOverlay()
  const wasVisible = overlay?.isVisible() ?? false
  if (wasVisible) {
    overlay!.hide()
    await sleep(HIDE_SETTLE_MS)
  }
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: size })
    const source = sources.find((s) => s.display_id === String(display.id)) ?? sources[0]
    if (!source || source.thumbnail.isEmpty()) throw new Error('Windows returned an empty screenshot')
    const image = source.thumbnail
    const full = image.getSize().width > MAX_WIDTH ? image.resize({ width: MAX_WIDTH, quality: 'best' }) : image
    return {
      id: crypto.randomUUID(),
      png: full.toPNG(),
      thumb: image.resize({ width: 200, quality: 'good' }).toDataURL()
    }
  } finally {
    if (wasVisible) overlay!.showInactive()
  }
}
