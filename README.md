# Shadow

An open-source AI desktop copilot for Windows. Shadow floats over your screen as a slim glass
bar: press a hotkey and it reads the coding problem on your screen and streams back an
explained solution in **Python** or **Java**, from the AI provider of your choice.

Built as a college project to explore how tools like Cluely and Interview Coder work, without
their $20–$299/month price tags: bring your own (free) API key, or run a model locally.

> **Status:** screenshot → answer, debug mode and follow-up chat work. Live listening
> (mic + system audio transcription with auto-answer) is in progress. See [PLAN.md](PLAN.md).

## Features

- **Screenshot → solution.** `Ctrl+Shift+Enter` captures the monitor under your cursor and
  streams an answer with fixed sections: Problem, Approach, Code, Complexity, Edge Cases, Dry Run.
- **Debug mode.** After a solution, screenshot the failing test or error and press
  `Ctrl+Shift+D` for a diagnosis and the corrected code, with changed lines marked `# FIX`.
- **Follow-up chat.** "Why O(n)?", "optimize the space", "convert to Java". The conversation is kept.
- **Seven AI providers.** Google Gemini (free tier), Groq, OpenRouter, OpenAI, Anthropic Claude,
  local Ollama, or any OpenAI-compatible server. "Fetch models" lists what your key can use, and
  models that can't read images get screenshots transcribed by a vision model first.
- **Latency meter.** Every answer shows provider, model, time to first token and total time.
- **Click-through overlay.** Only the visible controls catch the mouse; everything else clicks
  through to the app underneath.

## Hotkeys

| Action | Keys |
|---|---|
| Show / hide | `Ctrl+Shift+Space` |
| Take screenshot (queue up to 4) | `Ctrl+Shift+S` |
| Solve (or debug, if an answer exists and new shots are queued) | `Ctrl+Shift+Enter` |
| Debug with new screenshots | `Ctrl+Shift+D` |
| Copy last code block | `Ctrl+Shift+C` |
| New session | `Ctrl+Shift+R` |
| Move overlay | `Ctrl+Alt+Arrows`, or drag the ⠿ handle |

## Getting started

Requires Windows 10/11 and Node.js 22+.

```bash
git clone https://github.com/aayush-t-exe/shadow.git
cd shadow
npm install
npm run dev
```

Then click the ⚙ in Shadow's bar, paste a free Gemini key from
[Google AI Studio](https://aistudio.google.com/apikey) under **API keys**, and press **Test**.

Other scripts: `npm test` (unit tests), `npm run typecheck`, `npm run build`.

## How it works

```
Renderer (sandboxed React UI)  ──typed IPC──▶  Main process (Node)
  overlay bar, answer panel,                     hotkeys, screenshots, session state,
  settings window                                AI SDK → 7 providers, encrypted key vault
```

- **All AI calls run in the main process.** API keys never reach the UI; the settings page only
  ever learns "saved ••••abcd".
- **Keys are encrypted** with Windows DPAPI via Electron's `safeStorage`.
- **Hardened renderer:** `sandbox`, `contextIsolation`, a strict Content Security Policy, no
  navigation or pop-ups, and every IPC call validates its sender and its arguments (zod).
- **Streaming:** tokens are batched every 30 ms in main and rendered with Streamdown + Shiki,
  which repairs half-finished markdown while it streams.

The [`research/`](research/) folder has the teardown of Cluely and Interview Coder, a survey of
11 open-source alternatives, provider pricing, the audio pipeline design and the prompt design
that the code is based on.

## What Shadow deliberately doesn't do

Shadow does not hide itself from screen sharing, recording or proctoring software. It's a
visible study assistant, not a way to get help in interviews or exams without others knowing.

## License

MIT
