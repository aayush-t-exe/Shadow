import { app, globalShortcut, session } from 'electron'
import { IPC } from '@shared/api'
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

    // Deny every browser permission (camera, notifications, geolocation…) by default.
    // Audio capture gets its own narrow allowance when live listening is added.
    session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))

    registerIpc()
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
