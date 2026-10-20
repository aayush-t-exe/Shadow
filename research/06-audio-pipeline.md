# 06: Audio pipeline for Shadow (mic + system audio, live STT, auto-answer)

Researched 21 Oct 2026. Target: Electron + React + TypeScript on **Windows 11**.
Tags: **[doc]** = official docs or source, **[issue]** = GitHub issue or PR, **[3p]** = third-party, **[infer]** = my inference, not verified.

---

## TL;DR: recommended approach

| Layer | Recommendation |
|---|---|
| Electron | Current stable is **45.0.0, released 20 Oct 2026** (Chromium M156). 44.x is fine too. On Windows, loopback has worked since `setDisplayMediaRequestHandler` arrived in **Electron 22**. `electron-audio-loopback` is **not needed**. |
| System audio ("Them") | `getDisplayMedia()` in the renderer. In main, `setDisplayMediaRequestHandler` answers `{ video: screen, audio: 'loopback' }`. Request a tiny video track, then stop and remove it straight away. |
| Mic ("You") | `getUserMedia({ audio: { echoCancellation: 'all', noiseSuppression: true, autoGainControl: true, channelCount: 1 } })`. Also run a text-level "echo dedupe" as a backup. Tell users that headphones are best. |
| Processing | One `AudioContext({ sampleRate: 16000 })` per source → `AudioWorklet` → PCM16 mono frames (20 ms, batched to 80–100 ms) → IPC to main. |
| VAD | `@ricky0123/vad-web` (Silero v5) for chunked or local engines and for the UI "speaking" indicator. Streaming engines do their own end-pointing. |
| STT default | **Deepgram over WebSocket from the main process, one socket per source.** Use **Flux** (`/v2/listen`, built-in `EndOfTurn`/`EagerEndOfTurn`) for "Them" and **Nova-3** for "You". Use Nova-3 `language=multi` for both if you need Hinglish. You get $200 in free credit. |
| STT fallbacks | (b) VAD-cut segments → **Groq `whisper-large-v3-turbo`** ($0.04/h, so effectively free). (c) Local **whisper.cpp** via `@fugood/whisper.node` (it has Vulkan/CUDA and a Parakeet API). Gemini `gemini-3.5-transcribe-live` and AssemblyAI Universal-Streaming are drop-in alternatives behind the same interface. |
| Question detection | Final "Them" turn (or Flux `EagerEndOfTurn` for speculation) → cheap heuristics → small LLM JSON classifier using the last few turns → answer. Cancel on `TurnResumed`. Add a cooldown and a manual hotkey override. |
| Native fallback | Only if you need per-process capture or endpoint independence: a **Rust/napi-rs WASAPI process-loopback addon** (for example `thomas-quant/wasapi-loopback`) or a small Rust sidecar using the `wasapi` crate. |

---

## 1. System audio on Windows in Electron

### 1.1 The supported path: `getDisplayMedia` + `setDisplayMediaRequestHandler` + `audio: 'loopback'`

- `ses.setDisplayMediaRequestHandler(handler[, opts])` arrived in **Electron 22**: "Added support for `navigator.mediaDevices.getDisplayMedia` via a new session handler" ([Electron 22 blog](https://www.electronjs.org/blog/electron-22-0)) **[doc]**.
- The callback's `streams.audio` can be the string `'loopback'` or `'loopbackWithMute'`. Per the docs: "Specifying a loopback device will capture system audio, and is currently only supported on Windows." `audio` can also be a `WebFrameMain`, which captures one tab's audio ([session docs](https://www.electronjs.org/docs/latest/api/session)) **[doc]**. Note that the macOS paths now exist too (see §1.4), but the docs sentence is still accurate for "it just works".
- `loopbackWithMute` mutes local playback while capturing. **Do not use it**: the user needs to hear the call.
- Passing `null` denies the request, and `getDisplayMedia()` rejects with `AbortError`.
- If no handler is registered at all, `getDisplayMedia()` rejects with **`NotSupportedError`** before any permission check ([hermes-agent #139458](https://github.com/NousResearch/hermes-agent/issues/139458)) **[issue]**.
- Passing `audio: true` (a boolean) instead of `'loopback'` makes Electron throw synchronously. The renderer then sees `AbortError: Error starting capture` ([cue PR #73](https://github.com/Blueturboguy07/cue/pull/73)) **[issue]**.

**Electron 45 breaking change (relevant now that 45 is stable).** Screen, window and tab capture requests now reach `setPermissionRequestHandler` as **`display-capture`** instead of `media`. A handler that allows only `media` must also allow `display-capture`, or `getDisplayMedia` breaks. A denied `display-capture` request never reaches the display-media handler ([PR #52824](https://github.com/electron/electron/pull/52824), [v45.0.0-alpha.2 notes](https://releases.electronjs.org/release/v45.0.0-alpha.2)) **[doc]**.

**`restrictOwnAudio` (Electron 43.x / 44.x / 45+).** `getDisplayMedia({ audio: { restrictOwnAudio: true } })` used to be ignored, so loopback included the app's own playback. It now maps to Chromium's `loopbackWithoutChrome` device ([PR #52455](https://github.com/electron/electron/pull/52455), backported as #52533/#52534) **[issue]**. This matters if Shadow ever plays TTS or sounds: without it, the app transcribes itself as "Them". A downstream commit says this covers Windows and macOS **[3p]**.

### 1.2 Audio without video?

- Per spec and MDN, `getDisplayMedia` requires video, and `video: false` rejects with `TypeError`. Chromium explicitly "Reject[s] audio-only requests" ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia), [crrev c0ba18e](https://crrev.com/c0ba18e18a3970b72a53f329e0a02da44427fd9c)) **[doc]**.
- The `electron-audio-loopback` README says "`getDisplayMedia` requires `video: true` to work". Its helper requests video, then stops and `removeTrack`s every video track, and warns that leaving video tracks in place causes bugs ([repo](https://github.com/alectrocute/electron-audio-loopback)) **[3p]**.
- Counter-evidence: the Electron 40 demo [chrhartm/electron-mic-speaker-loop](https://github.com/chrhartm/electron-mic-speaker-loop) calls `getDisplayMedia({ audio: true, video: false })`, and its main handler still answers `{ video: sources[0], audio: 'loopback' }`. I could not verify that this works on Windows **[3p]**.
- On macOS, a 0×0 video constraint caused "Can't wrap SharedImage as VideoFrame". **4×4 worked** ([#49607](https://github.com/electron/electron/issues/49607)) **[issue]**.
- **Recommendation:** request `video: { width: 4, height: 4, frameRate: 1 }` and `audio: true`. In the handler, always return a real screen source plus `'loopback'`. Then stop and remove the video track immediately. This works whichever way Chromium behaves.

### 1.3 Windows quirks

- Chromium's `'loopback'` captures the **default render endpoint** **[infer: WASAPI system loopback semantics]**. If the user sends Zoom or Meet to a non-default device (for example a Bluetooth headset while the default is speakers), you capture the wrong endpoint. Tell users to set the meeting app's output to "Same as system", or use process loopback (§1.5), which "is not tied to a specific audio endpoint" ([MS sample](https://learn.microsoft.com/en-us/samples/microsoft/windows-classic-samples/applicationloopbackaudio-sample/)) **[doc]**.
- Loopback contains **everything**: notification sounds, YouTube in another tab, Shadow's own TTS. Use `restrictOwnAudio` for Shadow's own audio. VAD and STT will mostly ignore the rest.
- No Windows permission prompt is needed for loopback. The mic needs Settings → Privacy → Microphone → "Let desktop apps access your microphone". You can check it with `systemPreferences.getMediaAccessStatus('microphone')` (works on Windows).
- If the capture lives in a hidden window, set `webPreferences.backgroundThrottling: false` on it **[infer]**.

### 1.4 `electron-audio-loopback` (npm)

- It patches Chromium flags so that loopback works on Electron 31–38 on macOS 12.3+, Windows 10+ and Linux (PulseAudio). The README says: "Electron 39 and up … you won't require `electron-audio-loopback`" ([README](https://github.com/alectrocute/electron-audio-loopback/blob/main/README.md)) **[3p]**. Its npm package was last published about a year ago.
- On Windows it was never really needed, because loopback is native there. **Skip it.**
- macOS notes, for when you port later. Electron 39.0.0-beta.4 switched to Apple's **CoreAudio Tap** API. This needs `NSAudioCaptureUsageDescription` in Info.plist (now added by default via #49717) ([#49607](https://github.com/electron/electron/issues/49607)). Open bug: with `useSystemPicker: false` on macOS, the loopback track arrives already `ended` ([#52738](https://github.com/electron/electron/issues/52738), Electron 43, open) **[issue]**.

### 1.5 Native alternatives

| Option | What | Pros | Cons |
|---|---|---|---|
| **`thomas-quant/wasapi-loopback`** (Rust, napi-rs) | WASAPI **process-loopback EXCLUDE** of a PID tree. You pass `process.pid` so Shadow's own audio is excluded. Output is 48 kHz stereo f32 in 480-frame chunks of about 10 ms. A prebuilt win32-x64 `.node` file is committed ([repo](https://github.com/thomas-quant/wasapi-loopback)) **[3p]** | Endpoint-independent, excludes self, no screen-capture plumbing | Small or unknown maintainer, x64 only, requires Windows 10 build **20348+** ([MS sample](https://learn.microsoft.com/en-us/samples/microsoft/windows-classic-samples/applicationloopbackaudio-sample/)) |
| **`application-loopback`** ([WerdoxDev](https://github.com/WerdoxDev/application-loopback)) | Node wrapper around a native binary, for **per-app** capture (for example only `Zoom.exe`) | Captures only the meeting app | Windows 10 x64+ only, small project |
| **`loopback-capture`** ([jsDelivr](https://www.jsdelivr.com/package/npm/loopback-capture)) | N-API, system or per-app audio as Buffers on Windows and Linux (v3.0.2) | Simple Node API | Unknown quality |
| **Rust sidecar** with the `wasapi` crate ([docs.rs](https://docs.rs/crate/wasapi/latest)), which has a `loopback` example, or `cpal` | A separate `.exe` that writes PCM16 to stdout. Electron spawns it and reads stdout | No Electron ABI rebuilds, crash-isolated. The pattern is proven by cheating-daddy's macOS `SystemAudioDump` | Extra build toolchain and a code-signing surface |
| C# sidecar with **NAudio** `WasapiLoopbackCapture` ([NuGet](https://www.nuget.org/packages/NAudio.Wasapi/)) | Same idea as the Rust sidecar | Very easy if you know C# | .NET runtime (or a 30–70 MB self-contained build) |
| `naudiodon` (PortAudio) | Old Node PortAudio binding | — | Effectively unmaintained, painful to rebuild for Electron. **Avoid.** |
| `tauri-plugin-system-audio` ([docs.rs](https://docs.rs/tauri-plugin-system-audio)) | WASAPI loopback + mic **with WebRTC AEC3 using loopback as the far-end reference**, emitting two separate 16 kHz streams | Shows the ideal design | Tauri, not Electron. A reference only |

**Most reliable for Shadow on Windows 11:** the **built-in Electron `getDisplayMedia` loopback**. It is first-party, has no native code, and has been stable on Windows since Electron 22. Keep the `AudioSource` interface (§6) abstract so that a `NativeLoopbackSource` (a Rust sidecar or the napi addon) can be swapped in later if you need per-app capture or a non-default endpoint.

### Code: main process

```ts
// src/main/audio/displayMedia.ts
import { session, desktopCapturer } from 'electron';

export function installCapturePermissions() {
  const ses = session.defaultSession;

  // Electron 45+: screen capture arrives as 'display-capture'; mic stays 'media'
  ses.setPermissionRequestHandler((_wc, permission, cb, details) => {
    const trusted = details.requestingUrl.startsWith('file://') || details.requestingUrl.startsWith('http://localhost');
    cb(trusted && (permission === 'media' || permission === 'display-capture'));
  });
  ses.setPermissionCheckHandler((_wc, permission) =>
    permission === 'media' || permission === 'display-capture');

  ses.setDisplayMediaRequestHandler(async (_request, callback) => {
    try {
      const [screen] = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 0, height: 0 } });
      // Always hand back a video source; the renderer discards the track.
      callback({ video: screen, audio: 'loopback' }); // NOT 'loopbackWithMute', NOT `true`
    } catch (e) {
      console.error('display media handler failed', e);
      callback(null as any); // -> AbortError in renderer
    }
  });
}
```

### Code: renderer

```ts
// src/renderer/audio/systemAudio.ts
export async function getSystemAudioStream(): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { width: 4, height: 4, frameRate: 1 },      // tiny; 0x0 breaks on some builds
    audio: {
      // @ts-expect-error: not in lib.dom yet
      restrictOwnAudio: true,                         // exclude Shadow's own TTS (Electron 43.x+/44.x+/45)
      echoCancellation: false, noiseSuppression: false, autoGainControl: false,
    },
  });
  for (const t of stream.getVideoTracks()) { t.stop(); stream.removeTrack(t); }
  const [a] = stream.getAudioTracks();
  if (!a || a.readyState !== 'live') throw new Error('System audio track missing/ended');
  return stream;
}
```

---

## 2. Microphone and echo

```ts
export async function getMicStream(deviceId?: string): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      channelCount: 1,
      // 'all' = cancel ALL system playout (incl. Zoom through speakers), not just Chromium's own output
      echoCancellation: 'all' as unknown as boolean,   // TS lib.dom still types this as boolean
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  });
}
// verify: stream.getAudioTracks()[0].getSettings().echoCancellation === 'all'
```

**Why `'all'` matters.** With `echoCancellation: true`, Chrome historically cancelled only audio that **Chrome itself** plays (the WebRTC remote-only behaviour). Zoom or Meet desktop audio coming out of the speakers reaches the mic, and gets transcribed as "You". The Media Capture spec added `echoCancellation: "all" | "remote-only" | true | false`. `"all"` means "All user system-generated audio captured by the user's microphone is removed" ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints/echoCancellation)) **[doc]**.

- Sokuji (an Electron app) probed this. **Windows 11 / Chrome 155** reports capabilities `[true,false,"remote-only","all"]` and applies `"all"`. Electron 40 on macOS does too. Linux silently falls back to `true`. It reportedly shipped in Chrome 141, so any **Electron ≥ 39** should have it ([sokuji PR #614](https://github.com/kizuna-ai-lab/sokuji/pull/614), merged 12 Oct 2026) **[3p]**. Their live speaker test was still marked "to do", so **test it yourself.**
- Risk: **double-talk suppression**. When "Them" and "You" talk over each other, your words may get clipped.
- Older runtimes read the string as `true` through WebIDL coercion, so it is a safe default.

**Defence in depth:**

1. **Headphones** remove the problem entirely. Show a one-time tip ("Using speakers? Answers may get confused; headphones recommended").
2. **Text-level dedupe in main.** Drop or merge a "You" segment if, within ±2 s of a "Them" segment, the normalized-text similarity is above 0.8 (token Jaccard or Levenshtein ratio). Cheap and effective.
3. **Energy gating.** While the system-audio VAD says "speech" and the mic RMS sits within a small margin of the expected echo level, mark mic frames as probable echo. This is crude. Prefer step 2.
4. Real AEC with the loopback stream as far-end reference (WebRTC AEC3, as `tauri-plugin-system-audio` does) is the "proper" fix, but it means a native module. Not worth it for v1.

Note that the loopback stream does **not** contain your mic, because Windows loopback is render-only. So "Them" is clean. Only "You" is at risk of echo.

---

## 3. Renderer audio processing

### 3.1 16 kHz mono PCM16 via AudioWorklet

The simplest resampler is to let Chromium do it: `new AudioContext({ sampleRate: 16000 })` and `createMediaStreamSource(stream)`. Chromium resamples the 48 kHz device audio to the context rate. Use **one AudioContext per source** so the streams never mix.

```ts
// public/worklets/pcm16-processor.js  (plain JS, loaded via addModule)
class Pcm16Processor extends AudioWorkletProcessor {
  constructor(opts) {
    super();
    this.frame = opts.processorOptions.frameSamples; // 1600 = 100 ms @16k (Deepgram Flux likes 80 ms = 1280)
    this.buf = new Int16Array(this.frame);
    this.n = 0;
  }
  process(inputs) {
    const ch = inputs[0];
    if (!ch || ch.length === 0) return true;
    const len = ch[0].length;                     // 128 frames per quantum
    for (let i = 0; i < len; i++) {
      let s = 0;                                  // downmix to mono
      for (let c = 0; c < ch.length; c++) s += ch[c][i];
      s /= ch.length;
      s = Math.max(-1, Math.min(1, s));
      this.buf[this.n++] = s < 0 ? s * 0x8000 : s * 0x7fff;
      if (this.n === this.frame) {
        const out = this.buf; this.buf = new Int16Array(this.frame); this.n = 0;
        this.port.postMessage(out.buffer, [out.buffer]);  // transfer, zero-copy
      }
    }
    return true;
  }
}
registerProcessor('pcm16-processor', Pcm16Processor);
```

```ts
// src/renderer/audio/pcmTap.ts
export async function tapPcm16(stream: MediaStream, onChunk: (pcm: ArrayBuffer) => void, frameMs = 100) {
  const ctx = new AudioContext({ sampleRate: 16000, latencyHint: 'interactive' });
  await ctx.audioWorklet.addModule(new URL('/worklets/pcm16-processor.js', location.href).href);
  const src = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, 'pcm16-processor', {
    numberOfInputs: 1, numberOfOutputs: 0,
    processorOptions: { frameSamples: (16000 * frameMs) / 1000 },
  });
  node.port.onmessage = (e) => onChunk(e.data as ArrayBuffer);
  src.connect(node);                 // do NOT connect to ctx.destination (would play loopback back = feedback)
  return { ctx, stop: async () => { src.disconnect(); node.disconnect(); await ctx.close(); } };
}
```

If you ever need a different rate (24 kHz for OpenAI, for example), create the context at that rate. Do not hand-roll resampling.

### 3.2 VAD

**`@ricky0123/vad-web`** (Silero in onnxruntime-web) ([API docs](https://docs.vad.ricky0123.com/user-guide/api/)) **[doc]**:

- `MicVAD.new({...})` options include `getStream` (override this to return **the system-audio stream**, not just the mic), `pauseStream`/`resumeStream`, `model: "v5" | "v6" | "legacy"` (default `legacy`), `positiveSpeechThreshold` 0.3, `negativeSpeechThreshold` 0.25, `redemptionMs` 1400, `preSpeechPadMs` 800, `minSpeechMs` 400, `onSpeechStart`, `onSpeechRealStart`, `onSpeechEnd(audio: Float32Array @16 kHz)`, `onVADMisfire`, `onFrameProcessed`.
- **Electron gotcha:** `baseAssetPath` (worklet bundle + `.onnx`) and `onnxWASMBasePath` (ort `.wasm`) default to `/`. With electron-vite, copy `node_modules/@ricky0123/vad-web/dist/{vad.worklet.bundle.min.js,silero_vad_*.onnx}` and `node_modules/onnxruntime-web/dist/*.wasm` into `src/renderer/public/vad/` with `vite-plugin-static-copy`, then set both paths to `./vad/`. Under `file://` in production, use relative paths. Allow `'wasm-unsafe-eval'` in your CSP.
- One `MicVAD` instance per source. `onSpeechEnd` gives you a ready-made utterance for the Groq or whisper.cpp path. Encode it to PCM16/WAV and send.
- For the **streaming** path (Deepgram, AssemblyAI, Gemini), you do **not** need client VAD for segmentation. Still use it to (a) **skip sending silence**, which saves money because Deepgram bills per streamed second (send a keepalive instead), and (b) drive the UI indicator.

**Energy-based VAD** (RMS > noise floor × k, with a hangover of about 300 ms) is fine as a zero-dependency fallback and for the "is anyone speaking" UI. It is worse on music or keyboard noise. Silero is far more robust.

**Semantic end-of-turn** (beyond silence): **Pipecat Smart Turn v3.2**. It is a Whisper-Tiny encoder (about 8 MB int8 ONNX) that takes the last 8 s of 16 kHz audio and returns P(turn complete), across 23 languages ([HF card](https://huggingface.co/pipecat-ai/smart-turn-v3), [Pipecat ref](https://reference-server.pipecat.ai/en/stable/api/pipecat.audio.turn.smart_turn.local_smart_turn_v3.html)) **[doc]**. It can run in onnxruntime-web. It is useful with the Groq or local path, where you have no server-side turn detection.

---

## 4. STT strategies

### 4.1 Options compared (prices as of Oct 2026, one stream; double them for You + Them)

| Engine | Mode | Latency | Price | Notes |
|---|---|---|---|---|
| **Deepgram Flux** `flux-general-en` / `flux-general-multi` | WS `wss://api.deepgram.com/v2/listen` | EoT about **260 ms** (vendor claim) | **$0.0065/min** (≈$0.39/h); multi $0.0078 | **Built-in turn detection**: `EndOfTurn`, `EagerEndOfTurn`, `TurnResumed`. Params: `eot_threshold` (0.7 default), `eager_eot_threshold`, `eot_timeout_ms`. Linear16 at 16 kHz, 80 ms chunks recommended. **Mono only.** Multi covers 10 languages ([Flux quickstart](https://developers.deepgram.com/docs/flux/quickstart), [migration](https://developers.deepgram.com/docs/flux/nova-3-migration), [pricing](https://deepgram.com/pricing)). $200 free credit. |
| **Deepgram Nova-3** | WS `/v1/listen` | about 300 ms interim | $0.0048/min (≈$0.29/h); multi $0.0058 | `interim_results`, `endpointing`, `utterance_end_ms`. `language=multi` handles Hindi-English code-switching (see 04-ai-apis.md). Prices are marked "limited-time promotional". |
| **AssemblyAI Universal-Streaming** | WS v3 | about 300 ms | **$0.15/h** (cheapest streaming); U-3.6 Pro Realtime $0.45/h | Turn detection (`end_of_turn_confidence_threshold`, deprecated on newer models; `min_turn_silence`, `max_turn_silence`). $50 free ([pricing](https://www.assemblyai.com/pricing), [turn detection](https://assemblyai.com/docs/streaming/universal-streaming/turn-detection)). Used by Open-Cluely. |
| **Gemini `gemini-3.5-transcribe-live`** | Live API WS | interim plus final about 0.4 s **[3p]** | about $0.009/min **[3p]**; **free tier** (free-tier data is used for training) | 16 kHz PCM16 in 100 ms chunks, `interimInputTranscription` / `inputTranscription`, automatic, hybrid or manual VAD, VERBATIM/SMART modes, **10-minute session cap** (reconnect logic needed), 85+ languages, no diarization. Launched 26 Aug 2026 ([live-transcribe docs](https://ai.google.dev/gemini-api/docs/live-api/live-transcribe), [model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-transcribe)). Forum report of sessions going silent ([thread](https://discuss.ai.google.dev/t/gemini-3-5-transcribe-live-sessions-stay-connected-but-silently-stop-returning-transcripts/180230)). |
| **OpenAI `gpt-live-transcribe`** | Realtime WS/WebRTC | low | **$0.017/min** (≈$1/h) | No server VAD: you must send `input_audio_buffer.commit` from client VAD. 24 kHz PCM. Launched 28 Jul 2026 ([guide](https://developers.openai.com/api/docs/guides/realtime-transcription), [model](https://developers.openai.com/api/docs/models/gpt-live-transcribe)). The most expensive option. |
| **Groq `whisper-large-v3-turbo`** | REST, VAD-cut segments | segment length + about 0.3–1 s | **$0.04/h**, **minimum billed 10 s per request**; free plan of about 8 h of audio per day (see 04) | 216× real time, 12% WER; `whisper-large-v3` costs $0.111/h with 10.3% WER. Send WAV for the lowest latency ([docs](https://console.groq.com/docs/speech-to-text)). No partials. Whisper hallucinates on silence or music, so filter with `no_speech_prob` from `verbose_json`. |
| **Local whisper.cpp** | Node addon or sidecar on VAD segments | depends on GPU; `base.en` or `small` on CPU about 0.5–2 s per segment **[infer]** | free | `@fugood/whisper.node`: Windows CPU/**Vulkan**/**CUDA** variants, `transcribeData(pcm16 ArrayBuffer)`, built-in `initWhisperVad`, **also a Parakeet API** ([README](https://cdn.jsdelivr.net/npm/@fugood/whisper.node@1.1.1/README.md)). Alternatives: `whisper-cpp-node` (Vulkan, streaming VAD), `smart-whisper`, `sherpa-onnx-node` (streaming zipformer, Parakeet TDT, Silero) ([yarn](https://classic.yarnpkg.com/en/package/sherpa-onnx-node)). Run it in a **`utilityProcess`** so inference never blocks main. |

### 4.2 Trade-offs

- **(a) Streaming WS** gives the best UX: partial captions within about 300 ms and server turn detection. Cost is about $0.3–0.8 per hour for both streams. Needs reconnect and keepalive logic. Deepgram **Flux is purpose-built for exactly the "did they finish talking?" signal** that auto-answer needs.
- **(b) VAD chunks to Groq/OpenAI/Gemini REST** is the cheapest and simplest. There are no captions until the utterance ends, so latency is roughly `redemptionMs` (set it to 500–700) plus about 0.5 s. Whisper is good on Indian-accented English. Watch Groq's free rate limits (about 20 RPM). Two streams with short utterances can hit them, so batch "You" segments or use local STT for "You".
- **(c) Local whisper.cpp** is free and private and works offline, but needs a GPU for comfort and adds about 75–500 MB of model plus native-build pain. Best as the "offline mode" option.

**Default:** **Deepgram** (Flux for Them, Nova-3 for You; or Nova-3 multi for both if Hinglish matters). **Fallback 1:** Groq VAD-chunked. **Fallback 2:** local whisper.cpp. Gemini and AssemblyAI are optional plugins. This matches 04-ai-apis.md.

**Cost saver [infer]:** "You" rarely needs real time, because you only need your own words for context. Run "You" through Groq chunks or local whisper, and keep the paid streaming socket only for "Them".

### 4.3 Making it pluggable

Every engine implements one `Transcriber` interface (§6). There are two shapes of engine:

- `StreamingTranscriber`: `push(pcm16)` continuously and emit `partial` / `final` / `turn` events.
- `ChunkTranscriber`: the pipeline buffers by VAD and calls `transcribe(utterancePcm16)` → `final`.

A thin `ChunkedAdapter` wraps a `ChunkTranscriber` with a VAD (Silero in the renderer, or energy VAD in main) so that the rest of the app only ever sees the streaming `Transcriber`.

---

## 5. Detecting "they asked me a question" (auto-answer)

What existing projects do:

- **cheating-daddy** ([repo](https://github.com/sohzm/cheating-daddy), [gemini.js](https://raw.githubusercontent.com/sohzm/cheating-daddy/master/src/utils/gemini.js)). It sends system and mic audio on separate IPC channels **into one Gemini Live session**, then relies on Gemini's diarization (2 speakers: `[Interviewer]`, `[Candidate]`), `proactiveAudio`, and the system prompt. The answer fires once per turn on `inputTranscription`, guarded by `groqRequestStartedForTurn` and reset on `turnComplete`. There is no explicit question classifier: the LLM decides.
- **Open-Cluely** ([repo](https://github.com/shubhamshnd/Open-Cluely)). Dual-source AssemblyAI streaming (Host/Mic toggles). Answering is **manual** ("Ask AI" button). The prompt "identif[ies] the actual question being asked (even across fragmented … transcript messages)".
- **Cluely itself** uses Deepgram streaming (see 01-cluely.md) with an "auto" mode, plus a hotkey.

**Recommended detector for Shadow (runs in main, on the "Them" stream only):**

1. **End-of-turn.** Use Flux `EndOfTurn` (or AssemblyAI end-of-turn, Deepgram Nova `speech_final`/`UtteranceEnd`, Gemini `inputTranscription` final, or VAD `onSpeechEnd` + Smart Turn ≥ 0.5 on the chunked path). **Merge fragments:** if "Them" starts again within about 1.2 s, append to the same turn.
2. **Speculate on `EagerEndOfTurn`.** Start the classifier and LLM answer early. **Abort on `TurnResumed`** with an AbortController. Deepgram warns this adds about 50–70% more LLM calls.
3. **Heuristic gate (0 ms, free).** Treat the turn as a candidate if it contains `?`, or starts with or contains interrogatives and imperatives: `what|why|how|when|where|which|who|can you|could you|would you|do you|did you|have you|are you|is there|tell me|walk me through|explain|describe|give me an example|what's your|how would you`. Skip turns under 4 words, and fillers like "okay", "right", "mm-hmm", "can you hear me".
4. **LLM classifier (about 150–300 ms).** Use a cheap fast model (Gemini Flash-Lite, or Groq `llama-3.1-8b-instant`, see 04) in JSON mode with the **last 4–6 turns** (You + Them) as context:
   ```json
   {"is_question": true, "needs_answer": true, "question": "rewritten self-contained question", "type": "behavioral|technical|clarification|smalltalk", "confidence": 0.86}
   ```
   Trigger when `needs_answer && confidence ≥ 0.7`. Rewriting into a self-contained question fixes fragmented ASR.
5. **Guards.** Use a cooldown of about 8 s between auto-answers. Do not auto-answer if "You" started speaking within 1 s after their turn (you are already answering). Dedupe against the last answered question (similarity > 0.85). Keep a **manual hotkey** ("answer last question") and a mode toggle: Off / Suggest (show a chip) / Auto.

---

## 6. Reference architecture

```
┌──────────────── Renderer (overlay or hidden "audio" window, backgroundThrottling:false) ───────────┐
│ getUserMedia(mic, EC:'all') ──► AudioContext16k ─► AudioWorklet ─► PCM16 100ms ─┐                │
│ getDisplayMedia(loopback)  ──► AudioContext16k ─► AudioWorklet ─► PCM16 100ms ─┤ window.shadow   │
│ (optional) MicVAD x2 ─► speaking indicators / onSpeechEnd segments ────────────┘ .audio.push()   │
└───────────────────────────────────────────────────────────┬──────────────────────────────────────┘
                                              ipcRenderer.send('audio:chunk', {source, seq, pcm})
┌───────────────────────────────────────────────────────────▼──────────────────────── Main ────────┐
│ setDisplayMediaRequestHandler(loopback) · permission handlers                                    │
│ SttManager ── per source: Transcriber (Deepgram Flux | Nova-3 | AssemblyAI | Gemini | Groq | local)│
│     │  (API keys live here only; safeStorage-encrypted)                                          │
│     ▼ TranscriptSegment events                                                                   │
│ TranscriptStore (echo-dedupe You vs Them, merge fragments) ──► QuestionDetector ──► AnswerEngine │
│     │                                                                  (LLM stream)              │
└─────┼─────────────────────────────────────────────────────────────────────┼──────────────────────┘
      └── webContents.send('transcript:segment', seg) ───────────────────────┴── webContents.send('answer:delta')
```

Why STT runs in main and not in the renderer: API keys never touch the renderer, the WebSocket survives renderer reloads and HMR, and the Node `ws` library allows custom auth headers. IPC bandwidth is trivial: 16 kHz × 2 bytes = **32 KB/s per stream**. Put local whisper in a `utilityProcess` so inference cannot freeze main.

### 6.1 Shared types (`src/shared/audio.ts`)

```ts
export type SpeakerSource = 'mic' | 'system';           // UI labels: mic = "You", system = "Them"
export const SPEAKER_LABEL: Record<SpeakerSource, string> = { mic: 'You', system: 'Them' };

export interface AudioFormat { sampleRate: 16000; channels: 1; encoding: 'pcm_s16le' }

export interface AudioChunk {
  source: SpeakerSource;
  seq: number;              // monotonically increasing per source
  t0: number;               // ms, performance.timeOrigin-based capture time of first sample
  pcm: ArrayBuffer;         // Int16 LE mono @16k
}

/** Renderer-side capture abstraction (getDisplayMedia, getUserMedia, or a native sidecar shim). */
export interface AudioSource {
  readonly id: SpeakerSource;
  start(onChunk: (c: AudioChunk) => void): Promise<void>;
  stop(): Promise<void>;
  readonly isActive: boolean;
  onLevel?(cb: (rms: number) => void): void;             // for VU meter
}

export interface TranscriptWord { word: string; start: number; end: number; confidence?: number }

export interface TranscriptSegment {
  id: string;               // stable per utterance/turn; partials share an id with their final
  source: SpeakerSource;
  speaker: 'You' | 'Them';
  text: string;
  isFinal: boolean;
  startMs: number;          // relative to session start
  endMs: number;
  confidence?: number;
  words?: TranscriptWord[];
  provider: string;         // 'deepgram-flux' | 'groq-whisper' | ...
  language?: string;
}

export type TurnEvent =
  | { type: 'turn-start';  source: SpeakerSource; turnId: string }
  | { type: 'eager-end';   source: SpeakerSource; turnId: string; text: string }  // speculative
  | { type: 'turn-resumed';source: SpeakerSource; turnId: string }
  | { type: 'turn-end';    source: SpeakerSource; turnId: string; text: string };

export interface DetectedQuestion {
  turnId: string; question: string; rawText: string;
  type: 'technical' | 'behavioral' | 'clarification' | 'smalltalk' | 'other';
  confidence: number; speculative: boolean;
}
```

### 6.2 Transcriber plugin interface (`src/main/stt/types.ts`)

```ts
import { EventEmitter } from 'node:events';
import type { SpeakerSource, TranscriptSegment, TurnEvent } from '../../shared/audio';

export interface TranscriberEvents {
  segment: (s: TranscriptSegment) => void;   // partial + final
  turn: (e: TurnEvent) => void;              // only if provider supports it (Flux, AssemblyAI, Gemini)
  error: (e: Error) => void;
  status: (s: 'connecting' | 'open' | 'reconnecting' | 'closed') => void;
}

export interface TranscriberCapabilities {
  streaming: boolean;        // partials while speaking
  turnDetection: boolean;    // emits 'turn' events natively
  languages: string[];
  local: boolean;
}

export interface Transcriber {
  readonly name: string;
  readonly caps: TranscriberCapabilities;
  start(opts: { source: SpeakerSource; language?: string; keyterms?: string[] }): Promise<void>;
  push(pcm16: Buffer): void;                 // 16k mono s16le
  flush(): Promise<void>;                    // force-finalize current utterance (hotkey / pause)
  stop(): Promise<void>;
  on<K extends keyof TranscriberEvents>(ev: K, fn: TranscriberEvents[K]): this;
}

/** Utterance-level engines (Groq, OpenAI REST, gemini-3.5-transcribe, whisper.cpp). */
export interface ChunkTranscriber {
  readonly name: string;
  transcribe(pcm16: Buffer, opts: { language?: string; prompt?: string; signal?: AbortSignal }):
    Promise<{ text: string; confidence?: number; noSpeechProb?: number; words?: any[] }>;
}

export type TranscriberFactory = (cfg: SttConfig) => Transcriber;
export interface SttConfig {
  provider: 'deepgram-flux' | 'deepgram-nova3' | 'assemblyai' | 'gemini-live' | 'groq' | 'whisper-local';
  apiKey?: string; model?: string; language?: string;
}
export const registry = new Map<SttConfig['provider'], TranscriberFactory>();
```

### 6.3 Deepgram Flux transcriber (main, raw `ws`)

```ts
import WebSocket from 'ws';
import { EventEmitter } from 'node:events';

export class DeepgramFluxTranscriber extends EventEmitter implements Transcriber {
  name = 'deepgram-flux';
  caps = { streaming: true, turnDetection: true, languages: ['en'], local: false };
  private ws?: WebSocket; private source!: SpeakerSource; private keepAlive?: NodeJS.Timeout;
  constructor(private apiKey: string, private model = 'flux-general-en') { super(); }

  async start({ source }: { source: SpeakerSource }) {
    this.source = source;
    const qs = new URLSearchParams({
      model: this.model, encoding: 'linear16', sample_rate: '16000',
      eot_threshold: '0.7', eager_eot_threshold: '0.5', eot_timeout_ms: '3000',
    });
    this.ws = new WebSocket(`wss://api.deepgram.com/v2/listen?${qs}`, {
      headers: { Authorization: `Token ${this.apiKey}` },
    });
    this.ws.on('message', (raw) => this.onMessage(JSON.parse(raw.toString())));
    this.ws.on('error', (e) => this.emit('error', e));
    this.ws.on('close', () => { this.emit('status', 'closed'); /* SttManager handles backoff reconnect */ });
    await new Promise<void>((res, rej) => { this.ws!.once('open', () => res()); this.ws!.once('error', rej); });
    this.emit('status', 'open');
  }

  push(pcm: Buffer) { if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(pcm); }

  private onMessage(m: any) {
    if (m.type !== 'TurnInfo') return;
    const turnId = `${this.source}-${m.turn_index}`;
    const seg: TranscriptSegment = {
      id: turnId, source: this.source, speaker: this.source === 'mic' ? 'You' : 'Them',
      text: m.transcript, isFinal: m.event === 'EndOfTurn',
      startMs: m.audio_window_start * 1000, endMs: m.audio_window_end * 1000,
      confidence: m.end_of_turn_confidence, provider: this.name,
    };
    if (m.transcript) this.emit('segment', seg);
    switch (m.event) {
      case 'StartOfTurn':    this.emit('turn', { type: 'turn-start', source: this.source, turnId }); break;
      case 'EagerEndOfTurn': this.emit('turn', { type: 'eager-end', source: this.source, turnId, text: m.transcript }); break;
      case 'TurnResumed':    this.emit('turn', { type: 'turn-resumed', source: this.source, turnId }); break;
      case 'EndOfTurn':      this.emit('turn', { type: 'turn-end', source: this.source, turnId, text: m.transcript }); break;
    }
  }
  async flush() { /* Flux: send {"type":"Configure", ...} or rely on eot_timeout_ms */ }
  async stop() { try { this.ws?.send(JSON.stringify({ type: 'CloseStream' })); } finally { this.ws?.close(); } }
}
```

(Check the message names against the [Flux docs](https://developers.deepgram.com/docs/flux/quickstart). The `TurnInfo` shape above follows the [migration guide](https://developers.deepgram.com/docs/flux/nova-3-migration). The `CloseStream` and `Token` auth follow standard Deepgram conventions.)

### 6.4 Groq chunked transcriber (main)

```ts
import Groq, { toFile } from 'groq-sdk';

function pcm16ToWav(pcm: Buffer, rate = 16000): Buffer {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

export class GroqWhisper implements ChunkTranscriber {
  name = 'groq-whisper';
  private groq: Groq;
  constructor(apiKey: string, private model = 'whisper-large-v3-turbo') { this.groq = new Groq({ apiKey }); }
  async transcribe(pcm: Buffer, { language, prompt, signal }: { language?: string; prompt?: string; signal?: AbortSignal }) {
    const r: any = await this.groq.audio.transcriptions.create({
      file: await toFile(pcm16ToWav(pcm), 'utt.wav'),
      model: this.model, response_format: 'verbose_json', language, prompt, temperature: 0,
    }, { signal });
    const noSpeech = Math.max(0, ...(r.segments ?? []).map((s: any) => s.no_speech_prob ?? 0));
    return { text: noSpeech > 0.6 ? '' : r.text.trim(), noSpeechProb: noSpeech };  // kill silence hallucinations
  }
}
```

### 6.5 Preload + IPC

```ts
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('shadow', {
  audio: {
    start: (cfg: unknown) => ipcRenderer.invoke('audio:start', cfg),
    stop: () => ipcRenderer.invoke('audio:stop'),
    push: (source: 'mic' | 'system', seq: number, t0: number, pcm: ArrayBuffer) =>
      ipcRenderer.send('audio:chunk', { source, seq, t0, pcm: new Uint8Array(pcm) }),   // structured clone; 32 KB/s
  },
  onSegment: (cb: (s: unknown) => void) => {
    const h = (_: unknown, s: unknown) => cb(s);
    ipcRenderer.on('transcript:segment', h);
    return () => ipcRenderer.off('transcript:segment', h);
  },
  onQuestion: (cb: (q: unknown) => void) => { /* same pattern, 'question:detected' */ },
  onAnswerDelta: (cb: (d: string) => void) => { /* 'answer:delta' */ },
});
```

```ts
// src/main/stt/SttManager.ts (sketch)
ipcMain.handle('audio:start', async (e, cfg) => {
  for (const source of ['mic', 'system'] as const) {
    const t = registry.get(cfg[source].provider)!(cfg[source]);
    t.on('segment', (s) => { store.add(s); e.sender.send('transcript:segment', s); });
    t.on('turn', (ev) => source === 'system' && detector.onTurn(ev, store.recent(6)));
    t.on('error', (err) => scheduleReconnect(source, err));
    await t.start({ source, language: cfg.language });
    transcribers.set(source, t);
  }
});
ipcMain.on('audio:chunk', (_e, c: { source: SpeakerSource; pcm: Uint8Array }) =>
  transcribers.get(c.source)?.push(Buffer.from(c.pcm.buffer, c.pcm.byteOffset, c.pcm.byteLength)));
```

**Renderer start sequence:** `await shadow.audio.start(cfg)` → `getMicStream()` and `getSystemAudioStream()` → `tapPcm16(...)` for each, calling `shadow.audio.push` → `shadow.onSegment` renders the two-lane transcript (You / Them).

**Reliability checklist:**

- Reconnect the WS with exponential backoff. Buffer about 2 s of PCM while reconnecting.
- Send a Deepgram KeepAlive when VAD gates out silence.
- Rotate Gemini sessions before the 10-minute cap.
- Watch `track.onended` on the loopback track. It ends if the display source disappears, so re-acquire it.
- Store keys with `safeStorage`.
- Log chosen settings: `getSettings().echoCancellation` and the actual sample rate.

---

## 7. Suggested build order

1. Main: `installCapturePermissions()`. Renderer: two streams → `tapPcm16` → write two WAV files to disk. **Verify both lanes on Windows 11 with a YouTube video and a Meet call, on speakers and on headphones.**
2. Add `DeepgramFluxTranscriber` for both sources, then the two-lane transcript UI.
3. Add the echo-dedupe and `echoCancellation: 'all'` checks.
4. Add `QuestionDetector`: heuristics, then the LLM JSON classifier, then auto-answer with Off/Suggest/Auto modes and a hotkey.
5. Add the Groq chunked fallback (Silero VAD in the renderer → `onSpeechEnd` → `audio:utterance` IPC).
6. Optional: local whisper.cpp in a `utilityProcess`, the native process-loopback sidecar, Gemini/AssemblyAI plugins.

---

## Sources

- Electron desktopCapturer: https://www.electronjs.org/docs/latest/api/desktop-capturer
- Electron session (`setDisplayMediaRequestHandler`): https://www.electronjs.org/docs/latest/api/session
- Electron 22 (handler introduced): https://www.electronjs.org/blog/electron-22-0
- Electron schedule (45 stable 20 Oct 2026, M156): https://releases.electronjs.org/schedule
- Electron 45 alpha.2 notes: https://releases.electronjs.org/release/v45.0.0-alpha.2
- `display-capture` permission PR #52824: https://github.com/electron/electron/pull/52824
- `restrictOwnAudio` fix PR #52455: https://github.com/electron/electron/pull/52455
- macOS CoreAudio Tap regression #49607: https://github.com/electron/electron/issues/49607
- macOS loopbackWithMute ended-track #52738: https://github.com/electron/electron/issues/52738
- Loopback docs PR / audio-only discussion #47493: https://github.com/electron/electron/pull/47493
- Missing handler → NotSupportedError: https://github.com/NousResearch/hermes-agent/issues/139458
- `audio: true` vs `'loopback'` bug: https://github.com/Blueturboguy07/cue/pull/73
- electron-audio-loopback: https://github.com/alectrocute/electron-audio-loopback ; blog: https://alec.is/posts/bringing-system-audio-loopback-to-electron/
- Electron 39+ mic+speaker demo: https://github.com/chrhartm/electron-mic-speaker-loop
- MDN getDisplayMedia: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia ; Chromium audio-only rejection: https://crrev.com/c0ba18e18a3970b72a53f329e0a02da44427fd9c
- MDN echoCancellation (`all`/`remote-only`): https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints/echoCancellation
- Sokuji `echoCancellation: 'all'` probe: https://github.com/kizuna-ai-lab/sokuji/pull/614
- MS Application Loopback sample (build 20348+): https://learn.microsoft.com/en-us/samples/microsoft/windows-classic-samples/applicationloopbackaudio-sample/
- wasapi-loopback (napi-rs): https://github.com/thomas-quant/wasapi-loopback ; application-loopback: https://github.com/WerdoxDev/application-loopback ; loopback-capture: https://www.jsdelivr.com/package/npm/loopback-capture
- `wasapi` crate: https://docs.rs/crate/wasapi/latest ; cpal: https://docs.rs/crate/cpal/latest ; NAudio.Wasapi: https://www.nuget.org/packages/NAudio.Wasapi/
- tauri-plugin-system-audio (AEC3 reference design): https://docs.rs/tauri-plugin-system-audio
- Meetily capture write-up: https://instagit.com/Zackriya-Solutions/meetily/meetily-platform-specific-audio-capture-apis.md
- vad-web API: https://docs.vad.ricky0123.com/user-guide/api/
- Smart Turn v3: https://huggingface.co/pipecat-ai/smart-turn-v3 ; Pipecat: https://reference-server.pipecat.ai/en/stable/api/pipecat.audio.turn.smart_turn.local_smart_turn_v3.html
- Deepgram pricing: https://deepgram.com/pricing ; Flux quickstart: https://developers.deepgram.com/docs/flux/quickstart ; Flux migration: https://developers.deepgram.com/docs/flux/nova-3-migration
- AssemblyAI pricing: https://www.assemblyai.com/pricing ; turn detection: https://assemblyai.com/docs/streaming/universal-streaming/turn-detection
- Gemini live transcription: https://ai.google.dev/gemini-api/docs/live-api/live-transcribe ; model: https://ai.google.dev/gemini-api/docs/models/gemini-3.5-transcribe ; price estimate [3p]: https://wavespeed.ai/blog/cost-and-billing/gemini-3-5-transcribe-pricing/
- OpenAI realtime transcription: https://developers.openai.com/api/docs/guides/realtime-transcription ; gpt-live-transcribe: https://developers.openai.com/api/docs/models/gpt-live-transcribe
- Groq STT: https://console.groq.com/docs/speech-to-text
- whisper.node: https://cdn.jsdelivr.net/npm/@fugood/whisper.node@1.1.1/README.md ; whisper-cpp-node: https://cdn.jsdelivr.net/npm/whisper-cpp-node@0.2.12/README.md ; sherpa-onnx-node: https://classic.yarnpkg.com/en/package/sherpa-onnx-node
- cheating-daddy: https://github.com/sohzm/cheating-daddy ; Open-Cluely: https://github.com/shubhamshnd/Open-Cluely
