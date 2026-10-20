import { app, globalShortcut, Menu } from 'electron'
import { IPC } from '@shared/api'
import { installPermissions } from './live/capture'
import { startAutoAnswer } from './live/autoAnswer'
import { registerIpc } from './ipc'
import { registerHotkeys } from './hotkeys'
import { createTray } from './tray'
import { broadcast, createOverlay, showOverlay } from './windows'

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', showOverlay)

  void app.whenReady().then(() => {
    app.setAppUserModelId('app.shadow.copilot')
    // Electron's default menu carries hidden shortcuts (Ctrl+W closes the window, Ctrl+R
    // reloads it) that fire whenever Shadow has focus. Shadow has no menu, so drop it.
    // Copy/paste in text boxes still works without it on Windows.
    Menu.setApplicationMenu(null)

    installPermissions()

    registerIpc()
    startAutoAnswer()
    const overlay = createOverlay()
    createTray()

    const taken = registerHotkeys()
    if (taken.length > 0) {
      overlay.webContents.once('did-finish-load', () =>
        broadcast(IPC.toast, `Another app is using ${taken.join(', ')}. Those hotkeys are disabled.`)
      )
    }
  })

  app.on('will-quit', () => globalShortcut.unregisterAll())
  // The overlay is never closed during normal use; if it is, the app is done.
  app.on('window-all-closed', () => app.quit())
}
