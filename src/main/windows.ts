import { app, BrowserWindow, screen, shell } from 'electron'
import { join } from 'node:path'
import { pointInRects, type Rect } from '@shared/geometry'

// One transparent, always-on-top window holds the pill and every panel. Most of it
// is empty, so it ignores the mouse by default (clicks fall through to the app
// underneath) and the renderer turns mouse capture on only while the pointer is
// over a visible control.
const OVERLAY_WIDTH = 960
const OVERLAY_HEIGHT = 780
const TOP_OFFSET = 12
const MOVE_STEP = 80

let overlay: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let quitting = false
app.on('before-quit', () => (quitting = true))

const preloadPath = () => join(import.meta.dirname, '../preload/index.cjs')

function loadPage(win: BrowserWindow, page: 'overlay' | 'settings') {
  const devUrl = process.env.ELECTRON_RENDERER_URL
  if (!app.isPackaged && devUrl) void win.loadURL(`${devUrl}/${page}.html`)
  else void win.loadFile(join(import.meta.dirname, `../renderer/${page}.html`))
}

/** Pages may never navigate away or spawn windows; https links open in the real browser. */
function harden(win: BrowserWindow) {
  if (!app.isPackaged) {
    // Surface renderer warnings and crashes in the terminal during development.
    win.webContents.on('console-message', ({ level, message }) => {
      if (level === 'warning' || level === 'error') console.log(`[renderer:${level}] ${message}`)
    })
  }
  win.webContents.on('render-process-gone', (_e, details) => console.error('[renderer gone]', details.reason))
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (e) => e.preventDefault())
}

const secureWebPreferences = () => ({
  preload: preloadPath(),
  sandbox: true,
  contextIsolation: true,
  nodeIntegration: false,
  spellcheck: false
})

export function createOverlay(): BrowserWindow {
  const { workArea } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  overlay = new BrowserWindow({
    width: OVERLAY_WIDTH,
    height: OVERLAY_HEIGHT,
    x: Math.round(workArea.x + (workArea.width - OVERLAY_WIDTH) / 2),
    y: workArea.y + TOP_OFFSET,
    transparent: true,
    frame: false,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    title: 'Shadow',
    webPreferences: { ...secureWebPreferences(), backgroundThrottling: false }
  })
  overlay.setAlwaysOnTop(true, 'screen-saver')
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  overlay.setIgnoreMouseEvents(true, { forward: true })
  overlay.once('ready-to-show', () => overlay?.showInactive())
  // Closing the overlay (Ctrl+W, Alt+F4 while it has focus) only hides it; quitting from
  // the tray is the one way to exit.
  overlay.on('close', (e) => {
    if (quitting) return
    e.preventDefault()
    hideOverlay()
  })
  overlay.on('closed', () => {
    clearInterval(cursorTimer)
    overlay = null
  })
  cursorTimer = setInterval(updateMouseCapture, CURSOR_POLL_MS)
  harden(overlay)
  loadPage(overlay, 'overlay')
  return overlay
}

export const getOverlay = () => overlay

// ---- click-through ----
// The renderer reports where its visible controls are; we poll the real cursor and
// capture the mouse only while it's over one of them.
const CURSOR_POLL_MS = 40
let interactiveRegions: Rect[] = []
let capturing = false
let cursorTimer: NodeJS.Timeout | undefined

export function setInteractiveRegions(rects: Rect[]) {
  interactiveRegions = rects
}

function updateMouseCapture() {
  if (!overlay || overlay.isDestroyed()) return
  const shouldCapture =
    overlay.isVisible() && pointInRects(screen.getCursorScreenPoint(), interactiveRegions, overlay.getContentBounds())
  if (shouldCapture === capturing) return
  capturing = shouldCapture
  overlay.setIgnoreMouseEvents(!shouldCapture, { forward: true })
}

export function showOverlay() {
  if (!overlay) return
  overlay.showInactive()
  // Windows can drop the topmost flag after Win+D or a full-screen app; re-assert it.
  overlay.setAlwaysOnTop(true, 'screen-saver')
}

export function hideOverlay() {
  overlay?.hide()
}

export function toggleOverlay() {
  if (overlay?.isVisible()) hideOverlay()
  else showOverlay()
}

export function moveOverlay(dx: number, dy: number) {
  if (!overlay) return
  const bounds = overlay.getBounds()
  const { workArea } = screen.getDisplayMatching(bounds)
  // Keep at least 120px of the window on screen so the pill can't be lost off an edge.
  const x = Math.min(Math.max(bounds.x + dx * MOVE_STEP, workArea.x - bounds.width + 120), workArea.x + workArea.width - 120)
  const y = Math.min(Math.max(bounds.y + dy * MOVE_STEP, workArea.y), workArea.y + workArea.height - 60)
  overlay.setPosition(Math.round(x), Math.round(y))
}

export function openSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.show()
    settingsWindow.focus()
    return
  }
  settingsWindow = new BrowserWindow({
    width: 820,
    height: 680,
    minWidth: 640,
    minHeight: 480,
    title: 'Shadow Settings',
    backgroundColor: '#0f0f13',
    autoHideMenuBar: true,
    show: false,
    webPreferences: secureWebPreferences()
  })
  settingsWindow.once('ready-to-show', () => settingsWindow?.show())
  settingsWindow.on('closed', () => (settingsWindow = null))
  harden(settingsWindow)
  loadPage(settingsWindow, 'settings')
}

export function broadcast(channel: string, payload?: unknown) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, payload)
  }
}
