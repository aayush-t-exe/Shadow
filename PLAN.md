# Shadow — Build Plan

> **Status (Oct 2026):** M0–M5 are done and tested on real problems, and v0.1.0 ships as a
> Windows installer. What's left is tracked in the README's roadmap.

An open-source AI desktop copilot for Windows 11. It looks at your screen and listens to a
conversation (mic + system audio), detects coding questions, and streams back answers in
**Python** or **Java**. College project; deliberately built *without* screen-share
invisibility (see "Non-goals").

Research backing every decision lives in [`research/`](research/):

| File | Topic |
|---|---|
| 01-cluely.md | Cluely features, architecture, pricing, weaknesses |
| 02-interview-coder.md | Interview Coder workflow, hotkeys, source teardown |
| 03-open-source-and-stack.md | 11 open-source clones compared, stack choice |
| 04-ai-apis.md | Free/cheap LLM + STT providers usable from India |
| 05-cluely-ui-design.md | Visual design teardown + Shadow design tokens |
| 06-audio-pipeline.md | Mic + system-audio capture and live STT on Windows |
| 07-ai-pipeline.md | Multi-provider layer, prompts, rendering, key storage |

---

## 1. Stack (decided)

| Layer | Choice | Why |
|---|---|---|
| Shell | Electron (latest stable) + electron-vite | Every active Windows-capable clone uses it; built-in system-audio loopback |
| UI | React + TypeScript + Tailwind | Fast to build, streaming-friendly |
| AI | Vercel AI SDK v7 (`ai`, `@ai-sdk/*`) in **main process only** | One interface for Gemini, Groq, OpenAI, Anthropic, OpenRouter, Ollama, custom |
| Markdown | `streamdown` + Shiki | Handles half-finished markdown while streaming |
| STT | Deepgram Flux/Nova-3 (default), Groq Whisper (free), whisper.cpp (offline) | Pluggable `Transcriber` interface |
| Settings | `electron-store` + `safeStorage` (DPAPI) for keys | Keys never reach the renderer |
| Tests | Vitest (unit) + Playwright for Electron (e2e) | Interview Coder had zero tests |
| Package | electron-builder → NSIS installer | |

## 2. Architecture

```
┌──────────────── Renderer (sandboxed, no Node) ───────────────┐
│  Overlay bar · Answer panel · Transcript · Settings window   │
│  AudioWorklet: mic + loopback → 16 kHz PCM16 frames          │
└───────────────▲─────────────── typed IPC (preload) ──────────┘
                │  only whitelisted channels, sender validated
┌───────────────┴──────────────── Main process ────────────────┐
│ WindowManager  Hotkeys  ScreenshotService  SettingsStore      │
│ AIRouter ─ providers (gemini, groq, openai, anthropic, …)     │
│ STTManager ─ transcribers (deepgram, groq-whisper, local)     │
│ QuestionDetector ─ heuristics → cheap LLM classifier          │
│ SessionStore ─ transcript, screenshots, answers, export       │
└──────────────────────────────────────────────────────────────┘
```

Security posture (a lesson from Cluely's 2025 IPC vulnerability): `contextIsolation`,
`sandbox: true`, strict CSP, no `shell.openExternal` on AI-generated links without
confirmation, every IPC handler validates its sender.

## 3. Features by milestone

**M0 — Skeleton.** Scaffold, secure window setup, glass overlay bar, global hotkeys,
tray icon, settings window, encrypted key storage.

**M1 — Screenshot → answer.** Capture the monitor under the cursor (DPI-correct),
screenshot queue (up to 4), multi-provider streaming answer with the structured format:
Problem · Approach · Code · Complexity · Edge cases · Dry run. Cancel actually aborts.
Copy-last-code hotkey. Python/Java switch.

**M2 — Follow-ups & debug.** Chat box with context ("optimize it", "why O(n)?"), debug
mode with extra screenshots (diagnosis + corrected code with changed lines marked),
provider fallback on rate-limit.

**M3 — Audio capture.** Mic ("You") + system loopback ("Them") as separate streams,
level meters, echo handling, device picker.

**M4 — Live transcription.** Deepgram streaming (Flux for Them, Nova-3 for You),
Groq Whisper fallback on VAD-cut chunks, live transcript view.

**M5 — Auto-answer.** End-of-turn → heuristic gate → LLM classifier → streamed answer
(talking points first, then code). Cooldown, dedupe, pinned problem context, manual
"Answer now" hotkey.

**M6 — Polish & standout features.** Latency meter (STT ms / first-token ms), session
history + Markdown export, onboarding flow, local/offline mode (whisper.cpp + Ollama),
tests, installer.

**M7 — Submission kit.** README, architecture diagram, demo script, project report.

## 4. Non-goals

- **No hide-from-screen-share / anti-proctoring features.** Shadow is a visible
  assistant; the professor has to see it to grade it.
- No calendar/CRM integrations, no mobile app.
