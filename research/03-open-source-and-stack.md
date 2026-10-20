# 03 — Open-Source Landscape & Recommended Stack (Windows 11)

_Research date: 2026-10-21. Star counts and last-push dates come from the GitHub REST API (`api.github.com/repos/...`) on this date unless marked otherwise. Feature claims come from each project's README. None of the code was cloned or run._

---

## 1. TL;DR

- **Stack:** **Electron + electron-vite + React + TypeScript + Tailwind**, packaged as an NSIS installer with **electron-builder**. Electron is the only stack where all five hard requirements on Windows are first-party JS APIs:
  - transparent always-on-top window
  - global hotkeys
  - screenshots
  - hiding from screen share
  - **system-audio loopback** (`audio: 'loopback'`)
- **Where to look first:** read **free-cluely** (Apache-2.0, TS/React/Vite/Electron, small codebase) for the overlay, hotkey and screenshot patterns. Read **cheating-daddy** (`src/utils/renderer.js`) for how Windows loopback and mic audio are captured and streamed as PCM. cheating-daddy is GPL-3.0, so learn the pattern and don't copy the code unless your project is also GPL.
- **LLM layer:** default to **Gemini**, because it has a free tier, is multimodal (screenshot + text) and has a Live audio API. Add one **OpenAI-compatible** client so that **Groq, Ollama, OpenRouter and OpenAI** work with just a base-URL and key change.
- **Why not Tauri:** it is great (Pluely proves it, at about 10 MB), but system-audio capture on Windows means writing **Rust** (`wasapi`/`cpal`). That is a big extra learning curve for a student.
- **Why not PyQt:** doable, but the UI looks worse, streaming Markdown/code rendering is harder, and PyInstaller packaging tends to trigger antivirus warnings.

---

## 2. Comparison table

| Project | Stars / forks | Last push | Stack | LLM providers | Audio capture | Screen capture | License | Windows quality |
|---|---|---|---|---|---|---|---|---|
| **Glass** — pickle-com/glass | ~7.3–7.6k / ~1.1k (last known, OSSInsight/SourcePulse) | **Repo returns 404 as of 2026-10-21.** SourcePulse marked it "Inactive", with the last commit about 11 months ago | Electron (JS) + Python and native deps in the build; fork of cheating-daddy | OpenAI, Gemini, Claude, Ollama | Real-time mic + system audio, STT engines | Screen "watching" | GPL-3.0 (OSSInsight) | **Windows was "beta"**; build needs VS Build Tools. Treat it as unavailable/abandoned |
| **cheating-daddy** — sohzm/cheating-daddy | 5,633 / 977 | 2026-07-23 | Electron (JS, Electron Forge, plain web components) | Gemini 2.0 Flash **Live** (main); newer `localai.js`/`cloud.js` utils suggest more | **Windows: `getDisplayMedia` loopback** → 24 kHz mono PCM16, 0.1 s chunks → IPC. macOS: SystemAudioDump binary. Mic via `getUserMedia` (modes: speaker_only / mic_only / both) | `getDisplayMedia` stream → hidden `<video>` → canvas → JPEG (max 1280 px wide), on demand (Ctrl+Enter) | GPL-3.0 | Good. README: "use latest macOS and Windows". Click-through toggle (Ctrl+M), profiles (Interview / Sales / Meeting…) |
| **interview-coder** — ibttf/interview-coder | 4,446 / 703 | 2025-09-23 | Electron + TS (releases only; **no source** in repo) | OpenAI | — | Screenshot hotkeys | none | Binaries only. Not useful as a code reference |
| **Natively** — Natively-AI-assistant/natively-cluely-ai-assistant | 3,035 / 639 | **2026-10-20** (most active) | Electron 43, React 19, Vite 7, TS, Tailwind; **Rust native audio (napi)**; SQLite + sqlite-vec | Gemini (default), OpenAI, Claude, Groq, NVIDIA NIM, OpenRouter, LiteLLM, Ollama/LocalAI, any OpenAI-compatible | Separate system-audio + mic channels ("fully supported on macOS and Windows"); STT: local Whisper / Moonshine / Parakeet or Deepgram, Soniox, Groq, OpenAI, Azure… | One-shortcut screenshot, multi-screenshot, cropper | **Source-available "Personal Use" licence**, not OSI open source. Commercial use needs permission | Very good. Dedicated Windows maintainer, DirectML, "stealth typing". v2.9.2 fixed a focus-stealing cropper. Large codebase (4k+ commits) — too big to learn from first |
| **Pluely** — iamsrikanthnani/pluely | 2,752 / 544 | 2026-09-21 | **Tauri v2** (Rust) + React + TS + Tailwind + shadcn; SQLite | Free tier: bring your own provider via curl template (OpenAI, Claude, Gemini, Grok…), local CLIs, Ollama; Pro: 200+ hosted models | Rust: **`cpal` + `wasapi`** on Windows (PulseAudio on Linux); "mic and system audio live" | **`xcap`** crate, region select | GPL-3.0 on GitHub, but **README says v1+ is proprietary/closed binaries**. Only the older history is GPL | Good. .msi/.exe, 9–16 MB installer, hidden from capture and taskbar |
| **interview-coder-withoupaywall-opensource** — j4wg | 1,996 / 655 | 2025-08-09 (stale) | Electron + React + TS + Vite + Tailwind + Radix | OpenAI (GPT-4o), Gemini "tested" | **None** (no audio) | Ctrl+H screenshot queue (max 2), Ctrl+Enter to solve | AGPL-3.0 per README (GitHub: NOASSERTION) | OK. `stealth-run.bat`, `npm run package-win`. Clean "screenshot → solve" reference |
| **free-cluely** — Prat011/free-cluely | 1,691 / 462 | 2026-04-07 | **Electron 33 + React 18 + TS + Vite 5 + Tailwind**; `screenshot-desktop`, `sharp`, `tesseract.js`; electron-builder (NSIS + portable) | Gemini (2.0 Flash), Ollama (local) | Audio file/recording transcription (no clear loopback) | **`screenshot-desktop`** (Ctrl+H); auto-deletes screenshots | Apache-2.0 (README also says ISC) | "Now works on Windows 10/11". Fixes for port mismatch and focus. Close button doesn't quit (use Ctrl+Q). **Best small, readable reference** |
| **OpenCluely** — TechyCSR/OpenCluely | 1,116 / 258 | 2026-07-29 | Electron (plain JS/HTML) + Tailwind; Python venv for local Whisper | Gemini only (OpenAI, Anthropic and local planned) | **Mic only** (local Whisper or Azure Speech, VAD) | Ctrl+Shift+S → straight to Gemini vision; multi-monitor, area capture | Apache-2.0 (README says MIT) | Prebuilt NSIS .exe. Uses `WDA_EXCLUDEFROMCAPTURE`. Setup needs Git Bash/WSL |
| **Open-Cluely** — shubhamshnd/Open-Cluely | 183 / 66 | 2026-09-24 | Electron (JS) | Gemini (multi-key failover) | **System audio + mic** dual source; **AssemblyAI** streaming STT (Vosk doc present) | Hides the window, waits 300 ms, then captures; `setContentProtection` | none listed | **Windows-first** (portable x64 build). Has a phone companion on port 7823 — binds to 0.0.0.0, so it's a security risk |
| **Ghostbar** — rbc33/Ghostbar | 110 | 2026-07-31 | Swift (macOS only) | Ollama, OpenAI, Claude | — | — | — | **No Windows** |
| **electron-audio-loopback** — alectrocute (library) | 120 | — | Electron plugin | — | Loopback for Electron 31–38 on macOS 12.3+/Win10+/Linux Pulse. **Not needed on Electron ≥ 39** | — | MIT | Useful only if you are stuck on an old Electron |

**Takeaways**
- Nearly every active Windows-capable project is **Electron**. The exception is Pluely (Tauri + Rust audio).
- **Gemini** is the default provider almost everywhere: it is cheap/free, accepts screenshots natively and has a Live audio API. The more mature projects layer on **OpenAI-compatible** endpoints for Groq, Ollama and OpenRouter.
- On Windows, **system audio** is done either with Chromium loopback through `getDisplayMedia` (cheating-daddy, likely Open-Cluely) or with native WASAPI (Pluely in Rust, Natively in Rust).
- Watch the licences. Most are GPL/AGPL, or "source-available". **free-cluely and OpenCluely are Apache-2.0**, so they are the safest to borrow code from.

---

## 3. Framework comparison for a Windows 11 overlay

| Requirement | Electron | Tauri v2 | Python (PySide6/PyQt6) |
|---|---|---|---|
| Transparent, frameless, always-on-top | `new BrowserWindow({ transparent:true, frame:false, alwaysOnTop:true })`, `setAlwaysOnTop(true,'screen-saver')` | `transparent`, `decorations:false`, `alwaysOnTop` in config (WebView2). Reports of unwanted shadow/border on Win10/11 | `FramelessWindowHint \| WindowStaysOnTopHint \| Tool` + `WA_TranslucentBackground` |
| Click-through | `setIgnoreMouseEvents(true, { forward:true })` | `setIgnoreCursorEvents(true)` | `WA_TransparentForMouseEvents` / `WindowTransparentForInput` |
| Hide from screen share | `setContentProtection(true)` → `WDA_EXCLUDEFROMCAPTURE` (fully excluded on Win10 2004+) | `setContentProtected(true)` | `ctypes.windll.user32.SetWindowDisplayAffinity(hwnd, 0x11)` |
| Global hotkeys | `globalShortcut.register()` (built in) | `tauri-plugin-global-shortcut` | `keyboard` / `pynput` (low-level hooks; may trip antivirus) |
| Screenshot | `desktopCapturer.getSources({types:['screen'], thumbnailSize})` or `screenshot-desktop` (npm, MIT, multi-monitor, no extra deps on Windows) | `xcap` crate (Rust) | `mss` (fast) / `PIL.ImageGrab` |
| Mic | `navigator.mediaDevices.getUserMedia({audio:true})` in the renderer | Web `getUserMedia` in WebView2, or `cpal` in Rust | `sounddevice` / `pyaudio` |
| **System audio (loopback)** | **Built in**: main process `session.setDisplayMediaRequestHandler(cb => cb({ video: screenSource, audio: 'loopback' }))` + renderer `getDisplayMedia({ audio:true, video:true })`, then drop the video track. Docs list loopback as **Windows-supported** | Must write **Rust** with the `wasapi` crate (as Pluely does). No first-party plugin | `PyAudioWPatch` (WASAPI loopback) or `soundcard` — easy |
| Rendering streamed Markdown/code | Excellent (React + react-markdown + highlight.js / shiki) | Excellent (same web UI) | Painful (QTextBrowser is limited; QWebEngine is heavy) |
| Bundle size | ~90–150 MB installer | ~10 MB | ~60–150 MB (PyInstaller) |
| Learning curve for a student | **Lowest** if you know JS/React. One language end to end | Rust for anything native (audio!) | Lowest if you only know Python, but the UI work is harder |
| Reference projects | 8+ (above) | Pluely | Few or none notable |
| Packaging gotchas | electron-builder NSIS; unsigned → SmartScreen | `tauri build` → MSI/NSIS; needs WebView2 (preinstalled on Win11) | PyInstaller one-file exes often flagged by antivirus |

**Verdict:** **Electron** is the easiest and best for a demo. Everything you need is a documented JS API, there are many working examples, and the UI can look polished quickly. Choose Tauri only if a tiny binary or learning Rust is itself a goal. Choose PyQt only if the team cannot write JS/TS.

---

## 4. Key Electron building blocks (Windows)

```ts
// main: overlay window
const win = new BrowserWindow({
  width: 520, height: 640, x, y,
  transparent: true, frame: false, resizable: false,
  alwaysOnTop: true, skipTaskbar: true, hasShadow: false,
  show: false, focusable: true,
  backgroundColor: '#00000000',
  webPreferences: { preload, contextIsolation: true, nodeIntegration: false, sandbox: true },
});
win.setAlwaysOnTop(true, 'screen-saver');   // above taskbar
win.setContentProtection(settings.stealth);  // make toggleable!
win.once('ready-to-show', () => win.showInactive()); // don't steal focus

// click-through except where UI is
win.setIgnoreMouseEvents(true, { forward: true }); // renderer toggles on mouseenter/leave of panels

// hotkeys
globalShortcut.register('CommandOrControl+Shift+Space', toggleOverlay);
globalShortcut.register('CommandOrControl+Shift+S', captureAndAsk);
app.on('will-quit', () => globalShortcut.unregisterAll());

// system audio (loopback) – Windows
session.defaultSession.setDisplayMediaRequestHandler(async (_req, cb) => {
  const [src] = await desktopCapturer.getSources({ types: ['screen'] });
  cb({ video: src, audio: 'loopback' });
});
```

```ts
// renderer: loopback + mic → 16 kHz PCM for STT
const sys = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
sys.getVideoTracks().forEach(t => t.stop());            // keep audio only
const mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true } });
// AudioContext({ sampleRate: 16000 }) + AudioWorklet → Int16 chunks (~100 ms) → IPC/WebSocket to STT
```

Libraries:
- **Screenshots:** `screenshot-desktop` (MIT) or built-in `desktopCapturer`
- **Image downscaling:** `sharp`
- **LLM clients:** `@google/genai` and `openai` (one SDK covers OpenAI, Groq, Ollama and OpenRouter through `baseURL`)
- **Rendering:** `react-markdown` + `rehype-highlight`
- **Settings:** `electron-store` or a JSON file in `app.getPath('userData')`
- **API keys:** `safeStorage`

Pattern notes:
- **Screenshots:** cheating-daddy grabs a frame from the stream (video → canvas → JPEG at q=0.6–0.85, max 1280 px wide). That is cheap and makes the image small for LLM tokens.
- **Speech-to-text:** stream the PCM chunks to a realtime STT service: Gemini Live, Deepgram, AssemblyAI, or Groq Whisper in short chunks. Keep **mic and system audio as separate channels** so the transcript can label "Me" and "Them". Natively and Open-Cluely both do this.

---

## 5. Windows 11 gotchas

**Transparency & window**
- Transparent windows **can't be resized** (`resizable:true` may break them). Instead, resize programmatically with `setBounds`.
- Transparency **turns off while DevTools is open**. Debug with a detached DevTools window (`openDevTools({mode:'detach'})`).
- You can't click through transparent pixels by default. Use `setIgnoreMouseEvents(true,{forward:true})` and flip it to `false` while the cursor is over an interactive panel.
- Always set `backgroundColor: '#00000000'` and a transparent `html, body` background, or you'll get a white flash.
- Fake the "glass" look with a semi-opaque CSS background. CSS `backdrop-filter` doesn't blur what's behind the OS window.

**Focus stealing**
- Show the overlay with `showInactive()` so the user's Zoom/IDE keeps focus.
- **Global shortcuts work without focus.** Design the core flow (capture → answer) to be hotkey-only.
- For typing into the overlay, call `win.focus()` on demand and give focus back afterwards (hide/blur). `focusable:false` stops all focus but also disables text inputs, so toggle it rather than hard-coding it.
- Windows can drop topmost status after Win+D, taskbar clicks or exclusive-fullscreen apps. Re-call `setAlwaysOnTop(true,'screen-saver')` on `show`/`blur`/display changes. Exclusive-fullscreen games/apps will still cover it.

**Global shortcuts**
- `globalShortcut.register` returns `false` (silently) if another app owns the combination. Check the return value and show it in the settings UI.
- Avoid single-modifier combinations that collide with common apps (Ctrl+H = browser history, Ctrl+B = bold). Prefer **Ctrl+Shift+…** or **Alt+…**. Win+… combinations are reserved by the OS.

**DPI scaling & multi-monitor**
- Electron positions windows in **DIPs**, but screenshots are in **physical pixels**. Multiply by `display.scaleFactor` (125% / 150% are common on laptops) when cropping or mapping regions. Pass `thumbnailSize: { width: bounds.width*scaleFactor, height: bounds.height*scaleFactor }` to `desktopCapturer`, or you get a 150×150 thumbnail by default.
- Capture the monitor the user is looking at: `screen.getDisplayNearestPoint(screen.getCursorScreenPoint())`, then match `source.display_id === String(display.id)`. With `screenshot-desktop`, use `listDisplays()` + the `{ screen: id }` option.
- With mixed-DPI monitors, dragging the overlay between screens can resize it unexpectedly. Re-apply the bounds on the `display-metrics-changed` event.
- Recompute the position when monitors are plugged or unplugged (the `display-added` / `display-removed` events).

**Content protection (important for demos!)**
- `setContentProtection(true)` makes the overlay **invisible in your own screen recordings, OBS, Teams/Zoom/Meet shares and screenshots** (Win10 2004+). That is great for "stealth", but **during a project demo over a projector or screen share nobody will see it**. Make it a toggle and turn it **off** for demos.
- It also means your own screenshot hotkey won't capture the overlay, which is good.

**Audio**
- Loopback captures **everything** the PC plays, including any text-to-speech you add. Keep mic and system audio as separate streams.
- Echo cancellation should be ON for the mic and OFF for loopback (cheating-daddy turns it on for both; that's not ideal).
- Microphone access depends on Windows Settings → Privacy & security → Microphone → "Let desktop apps access your microphone". Handle `NotAllowedError` with a helpful message.
- Bluetooth headsets switch to the low-quality "hands-free" profile when the mic opens, which hurts STT accuracy. Recommend a wired or laptop mic.

**Packaging (electron-builder)**
- **Installers:** target `nsis` (installer) and optionally `portable`. Set `requestedExecutionLevel: asInvoker` (free-cluely does) and provide an `.ico` icon.
- **SmartScreen:** unsigned apps trigger "Windows protected your PC". For a college project, tell users to click More info → Run anyway, or sign with Azure Trusted Signing or a code-signing certificate.
- **Native modules** (`sharp`, any napi addon) must match Electron's ABI. Use `electron-builder install-app-deps` / `@electron/rebuild`, and `asarUnpack` for native `.node` binaries. free-cluely rebuilds sharp in `postinstall`.
- **Antivirus:** apps that hide from capture, register global hotkeys and record audio can be flagged as malware. Expect it, and document it in the README.
- **API keys:** never ship them in the renderer bundle. Keep them in the main process and encrypt them with `safeStorage`. Let users bring their own key.

**Ethics/positioning:** many of these projects are marketed for cheating in interviews or exams, and Glass/Cluely-style tools are banned by most interview processes. For a college project, frame and demo it as a **meeting/lecture/study copilot** (live notes, "explain what's on my screen", action items). That reads much better to evaluators and recruiters.

---

## 6. Recommended project structure (Electron + Vite + React + TS)

Scaffold with **electron-vite**: `npm create @quick-start/electron@latest ai-overlay -- --template react-ts`. It needs Node 20.19+ or 22.12+. It gives one `electron.vite.config.ts` with `main` / `preload` / `renderer` sections, HMR for the renderer and hot-reload for main. Use the current stable Electron (44.x as of Oct 2026; ≥ 39 needed for native macOS loopback, any recent version for Windows).

```
ai-overlay/
├─ electron.vite.config.ts
├─ electron-builder.yml           # nsis + portable, icon, asarUnpack
├─ package.json
├─ resources/                     # icon.ico, tray icon
├─ src/
│  ├─ shared/                     # types & IPC channel names used by all 3 layers
│  │  ├─ ipc.ts                   # export const IPC = { CAPTURE: 'capture', ASK: 'ask', ... }
│  │  └─ types.ts                 # Message, ProviderConfig, TranscriptChunk...
│  ├─ main/                       # Node/Electron process
│  │  ├─ index.ts                 # app lifecycle, single-instance lock
│  │  ├─ windows/overlay.ts       # BrowserWindow factory, show/hide, topmost, content protection
│  │  ├─ shortcuts.ts             # globalShortcut registry + conflict reporting
│  │  ├─ capture/screenshot.ts    # desktopCapturer / screenshot-desktop, DPI + monitor logic
│  │  ├─ capture/audio.ts         # setDisplayMediaRequestHandler (loopback)
│  │  ├─ llm/
│  │  │  ├─ provider.ts           # interface LLMProvider { stream(messages, images) }
│  │  │  ├─ gemini.ts             # @google/genai
│  │  │  └─ openaiCompat.ts       # OpenAI / Groq / Ollama / OpenRouter via baseURL
│  │  ├─ stt/                     # gemini-live.ts | deepgram.ts | groq-whisper.ts
│  │  ├─ ipc.ts                   # ipcMain.handle(...) wiring
│  │  └─ settings.ts              # electron-store + safeStorage for keys
│  ├─ preload/
│  │  ├─ index.ts                 # contextBridge.exposeInMainWorld('api', {...})
│  │  └─ index.d.ts               # window.api typings for the renderer
│  └─ renderer/
│     ├─ index.html
│     └─ src/
│        ├─ main.tsx, App.tsx
│        ├─ components/           # OverlayPanel, AnswerView (markdown), Transcript, Settings
│        ├─ hooks/                # useAudioCapture (AudioWorklet → PCM), useStream, useHotkeys
│        ├─ audio/pcm-worklet.ts  # Float32 → Int16 16kHz downsampler
│        ├─ store/                # zustand state
│        └─ styles/               # tailwind
└─ README.md
```

Rules of thumb:
- **Keep secrets and network calls in `main`.** The renderer only talks to `window.api.*` through typed IPC.
- **Keep `contextIsolation:true` and `nodeIntegration:false`.** Most reference repos skip this; you don't have to.
- **Hide providers behind one `LLMProvider` interface.** Switching between Gemini, Groq and Ollama is then a settings dropdown, which demos well.
- **Suggested MVP order:**
  1. Overlay + hotkey toggle
  2. Screenshot → Gemini answer streaming
  3. Mic transcription
  4. Loopback ("them") transcription + auto-suggest
  5. Settings, provider switch, stealth toggle
  6. NSIS installer

---

## 7. Sources

- free-cluely — https://github.com/Prat011/free-cluely · https://raw.githubusercontent.com/Prat011/free-cluely/master/package.json
- Pluely — https://github.com/iamsrikanthnani/pluely · Cargo.toml: https://raw.githubusercontent.com/iamsrikanthnani/pluely/master/src-tauri/Cargo.toml
- Glass (pickle-com) — https://github.com/pickle-com/glass (404 on 2026-10-21) · https://ossinsight.io/analyze/pickle-com/glass · https://www.sourcepulse.org/projects/11033013
- cheating-daddy — https://github.com/sohzm/cheating-daddy · https://raw.githubusercontent.com/sohzm/cheating-daddy/master/src/utils/renderer.js
- interview-coder (original, binaries only) — https://github.com/ibttf/interview-coder
- interview-coder open-source fork — https://github.com/j4wg/interview-coder-withoupaywall-opensource
- Natively — https://github.com/Natively-AI-assistant/natively-cluely-ai-assistant (formerly evinjohnn/natively-cluely-ai-assistant)
- OpenCluely — https://github.com/TechyCSR/OpenCluely
- Open-Cluely — https://github.com/shubhamshnd/Open-Cluely
- GitHub topic list — https://github.com/topics/open-source-cluely
- electron-audio-loopback — https://github.com/alectrocute/electron-audio-loopback
- screenshot-desktop — https://github.com/bencevans/screenshot-desktop
- Electron docs: desktopCapturer — https://www.electronjs.org/docs/latest/api/desktop-capturer ; session.setDisplayMediaRequestHandler — https://www.electronjs.org/docs/latest/api/session ; BrowserWindow (setContentProtection, setIgnoreMouseEvents, setAlwaysOnTop, showInactive) — https://www.electronjs.org/docs/latest/api/browser-window ; transparent-window limits — https://www.electronjs.org/docs/latest/tutorial/custom-window-styles
- electron-vite — https://electron-vite.org/guide/
- Electron release status (44.x stable, Oct 2026) — https://community.chocolatey.org/packages/electron/44.6.0 · https://isitpatched.com/eol/electron
- Roundup (low authority) — https://www.shadecoder.com/blogs/10-best-free-open-source-cluely-alternatives-(2026-guide)
