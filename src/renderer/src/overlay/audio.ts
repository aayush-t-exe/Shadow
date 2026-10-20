import { FRAME_SAMPLES, SAMPLE_RATE, type AudioSourceId } from '@shared/live'

export type FrameHandler = (source: AudioSourceId, pcm: ArrayBuffer, rms: number) => void

export interface Capture {
  stop(): Promise<void>
}

function micStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      // 'all' cancels everything the PC is playing (e.g. a Zoom call on speakers), not just
      // audio from this app. Typed as boolean in lib.dom, but Chromium accepts the string.
      echoCancellation: 'all' as unknown as boolean,
      noiseSuppression: true,
      autoGainControl: true
    },
    video: false
  })
}

async function systemStream(): Promise<MediaStream> {
  // getDisplayMedia must ask for video; main answers with the screen plus 'loopback' audio,
  // and we throw the (tiny) video track away straight away.
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { width: 4, height: 4, frameRate: 1 },
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
  })
  for (const track of stream.getVideoTracks()) {
    track.stop()
    stream.removeTrack(track)
  }
  if (stream.getAudioTracks().length === 0) throw new Error('Windows returned no system audio')
  return stream
}

/** Pipes a stream through the PCM16 worklet. Each source gets its own 16 kHz context so they never mix. */
async function tap(source: AudioSourceId, stream: MediaStream, onFrame: FrameHandler): Promise<() => Promise<void>> {
  // Chromium resamples the device's 48 kHz audio to the context's 16 kHz for us.
  const ctx = new AudioContext({ sampleRate: SAMPLE_RATE, latencyHint: 'interactive' })
  await ctx.audioWorklet.addModule(new URL('pcm16-worklet.js', location.href).href)
  const input = ctx.createMediaStreamSource(stream)
  const node = new AudioWorkletNode(ctx, 'pcm16', {
    numberOfInputs: 1,
    numberOfOutputs: 0,
    processorOptions: { frameSamples: FRAME_SAMPLES }
  })
  node.port.onmessage = (e: MessageEvent<{ pcm: ArrayBuffer; rms: number }>) => onFrame(source, e.data.pcm, e.data.rms)
  // Never connect to ctx.destination: playing the loopback back out would cause feedback.
  input.connect(node)

  return async () => {
    node.port.onmessage = null
    input.disconnect()
    node.disconnect()
    stream.getTracks().forEach((t) => t.stop())
    await ctx.close()
  }
}

function micProblem(err: unknown): string {
  const name = err instanceof DOMException ? err.name : ''
  if (name === 'NotAllowedError') {
    return 'Microphone is blocked. Turn on Windows Settings → Privacy & security → Microphone → "Let desktop apps access your microphone".'
  }
  if (name === 'NotFoundError') return 'No microphone found, so only "Them" is transcribed.'
  return `Couldn't open the microphone (${err instanceof Error ? err.message : err}).`
}

/**
 * Starts capturing "You" (mic) and "Them" (system audio). Either may fail on its own;
 * we carry on with whichever works and report the other as a warning.
 */
export async function startCapture(onFrame: FrameHandler, onWarning: (warning: string | null) => void): Promise<Capture> {
  const stops: Array<() => Promise<void>> = []
  const warnings: string[] = []

  try {
    stops.push(await tap('mic', await micStream(), onFrame))
  } catch (err) {
    warnings.push(micProblem(err))
  }
  try {
    const stream = await systemStream()
    stream.getAudioTracks()[0].addEventListener('ended', () => onWarning('System audio capture stopped. Toggle listening to restart it.'))
    stops.push(await tap('system', stream, onFrame))
  } catch (err) {
    warnings.push(`Couldn't capture system audio (${err instanceof Error ? err.message : err}).`)
  }

  if (stops.length === 0) throw new Error(warnings.join(' '))
  onWarning(warnings.length > 0 ? warnings.join(' ') : null)
  return { stop: async () => void (await Promise.all(stops.map((s) => s()))) }
}
