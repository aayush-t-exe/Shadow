// Runs on the audio thread. Receives 128-sample blocks at the AudioContext's rate (16 kHz),
// downmixes to mono, converts to 16-bit PCM and posts one frame every `frameSamples`
// samples, together with the frame's loudness (RMS, 0..1) for the level meter.
class Pcm16Processor extends AudioWorkletProcessor {
  constructor(options) {
    super()
    this.frameSamples = options.processorOptions.frameSamples
    this.frame = new Int16Array(this.frameSamples)
    this.filled = 0
    this.sumSquares = 0
  }

  process(inputs) {
    const channels = inputs[0]
    if (!channels || channels.length === 0) return true
    const length = channels[0].length
    for (let i = 0; i < length; i++) {
      let sample = 0
      for (let c = 0; c < channels.length; c++) sample += channels[c][i]
      sample = Math.max(-1, Math.min(1, sample / channels.length))
      this.sumSquares += sample * sample
      this.frame[this.filled++] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
      if (this.filled === this.frameSamples) {
        const rms = Math.sqrt(this.sumSquares / this.frameSamples)
        const pcm = this.frame.buffer
        this.port.postMessage({ pcm, rms }, [pcm]) // transfer, no copy
        this.frame = new Int16Array(this.frameSamples)
        this.filled = 0
        this.sumSquares = 0
      }
    }
    return true
  }
}

registerProcessor('pcm16', Pcm16Processor)
