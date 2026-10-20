import { startCapture, type Capture } from './audio'
import { reportError, useOverlay } from './store'

// The overlay owns the microphone (only a page can call getUserMedia), so starting and
// stopping is driven from here: main opens Deepgram first, then we start capturing.

let capture: Capture | null = null
let busy = false

// Meters update ~12 times a second per source; smooth them so the bars don't jitter.
const levels = { mic: 0, system: 0 }
function setLevel(source: 'mic' | 'system', rms: number) {
  // Speech RMS is roughly 0.01–0.2; scale up so normal speech fills most of the meter.
  const target = Math.min(1, rms * 6)
  levels[source] = levels[source] * 0.5 + target * 0.5
  useOverlay.setState({ levels: { ...levels } })
}

async function start() {
  try {
    await window.shadow.startListening()
  } catch (err) {
    reportError(err)
    return
  }
  try {
    capture = await startCapture(
      (source, pcm, rms) => {
        window.shadow.pushAudio(source, pcm)
        setLevel(source, rms)
      },
      (warning) => window.shadow.reportCaptureWarning(warning)
    )
  } catch (err) {
    window.shadow.stopListening()
    reportError(err)
  }
}

async function stopCapture() {
  const current = capture
  capture = null
  await current?.stop()
  levels.mic = levels.system = 0
  useOverlay.setState({ levels: { mic: 0, system: 0 } })
}

export async function toggleListening() {
  if (busy) return
  busy = true
  try {
    if (useOverlay.getState().listen.state === 'off') await start()
    else {
      window.shadow.stopListening()
      await stopCapture()
    }
  } finally {
    busy = false
  }
}

/** Keeps capture in step with main: hotkey toggles, and stops caused by errors. */
export function connectListening() {
  window.shadow.onListenToggle(() => void toggleListening())
  window.shadow.onListenStatus((status) => {
    if (status.state === 'off' && capture) void stopCapture()
  })
}
