import { app, Menu, nativeImage, Tray, type NativeImage } from 'electron'
import { hotkeyFor, keycaps } from '@shared/hotkeys'
import { openSettingsWindow, toggleOverlay } from './windows'
import { resetSession } from './session'

let tray: Tray | null = null

/**
 * Draws Shadow's crescent mark straight into a pixel buffer, so the tray icon
 * needs no image file. 4x4 supersampling smooths the edges.
 */
export function crescentIcon(size = 32): NativeImage {
  const pixels = Buffer.alloc(size * size * 4)
  const r = size * 0.44
  const c = size / 2
  const cutX = c + size * 0.2
  const cutY = c - size * 0.14
  const cutR = r * 0.82
  const samples = 4
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let hits = 0
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const px = x + (sx + 0.5) / samples
          const py = y + (sy + 0.5) / samples
          const inDisc = (px - c) ** 2 + (py - c) ** 2 <= r * r
          const inCut = (px - cutX) ** 2 + (py - cutY) ** 2 <= cutR * cutR
          if (inDisc && !inCut) hits++
        }
      }
      const alpha = Math.round((hits / samples ** 2) * 255)
      const i = (y * size + x) * 4
      pixels.writeUInt32LE(((alpha << 24) | 0xffffff) >>> 0, i) // BGRA, white
    }
  }
  return nativeImage.createFromBitmap(pixels, { width: size, height: size, scaleFactor: 2 })
}

export function createTray() {
  tray = new Tray(crescentIcon())
  tray.setToolTip('Shadow')
  const toggleKeys = keycaps(hotkeyFor('toggle').accelerator).join('+')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: `Show / hide   (${toggleKeys})`, click: toggleOverlay },
      { label: 'New session', click: resetSession },
      { label: 'Settings…', click: openSettingsWindow },
      { type: 'separator' },
      { label: 'Quit Shadow', click: () => app.quit() }
    ])
  )
  tray.on('click', toggleOverlay)
}
