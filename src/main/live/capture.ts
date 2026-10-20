import { desktopCapturer, session } from 'electron'
import { isTrustedUrl } from '../trust'

// Browser-level permissions. Everything is denied except:
// - clipboard writes (code blocks' copy buttons)
// - the microphone and screen/system-audio capture, and only for Shadow's own pages.
const ALWAYS = new Set(['clipboard-sanitized-write'])
// Electron ≤44 reports mic and display capture as 'media'; Electron 45 splits out 'display-capture'.
const CAPTURE = new Set(['media', 'display-capture'])

export function installPermissions() {
  const ses = session.defaultSession

  ses.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const url = details.requestingUrl || webContents.getURL()
    callback(ALWAYS.has(permission) || (CAPTURE.has(permission) && isTrustedUrl(url)))
  })
  ses.setPermissionCheckHandler((_wc, permission, requestingOrigin) => {
    return ALWAYS.has(permission) || (CAPTURE.has(permission) && isTrustedUrl(requestingOrigin))
  })

  // getDisplayMedia() in the overlay lands here. We never show a picker: we hand back the
  // primary screen (whose video track the renderer discards at once) plus 'loopback', which on
  // Windows is the system audio mix, i.e. what the user hears from Zoom, Meet or YouTube.
  ses.setDisplayMediaRequestHandler(async (request, callback) => {
    if (!isTrustedUrl(request.frame?.url ?? '')) {
      callback({})
      return
    }
    try {
      const [screen] = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 0, height: 0 } })
      // 'loopback', not 'loopbackWithMute': the user still needs to hear the call.
      callback({ video: screen, audio: 'loopback' })
    } catch (err) {
      console.error('[capture] display media request failed', err)
      callback({})
    }
  })
}
