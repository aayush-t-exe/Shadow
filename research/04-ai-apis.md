# 04 - AI APIs: cheapest / free options for the overlay assistant

Researched: **2026-10-21** (web research only; nothing was executed).
Scope: Windows 11 Electron overlay that (a) reads the screen, (b) transcribes live speech, (c) streams AI answers. Budget: about zero. User in India.

> **Important caveat on numbers.** Several providers no longer publish free-tier quotas. Google says to check AI Studio for your project, and Groq's docs table is labelled "Developer plan base limits". Numbers marked *(3rd-party)* or *(forum)* are not official. Before relying on any of them, check these live pages:
> - Gemini: https://aistudio.google.com/rate-limit (per project, RPD resets at midnight Pacific)
> - Groq: https://console.groq.com/settings/limits
> - OpenRouter: https://openrouter.ai/docs/api/reference/limits

---

## 1. Vision-capable LLM APIs with free tiers

### Comparison table

| Provider | Free model(s) with image input (exact ID) | Free limits (as found) | Audio in? | Card needed? | India OK? | Notes |
|---|---|---|---|---|---|---|
| **Google Gemini API (AI Studio key)** | `gemini-3.5-flash-lite` (stable), `gemini-3.8-flash` (stable, GA 2026-09-02), `gemini-3.1-flash-lite`, `gemini-3-flash-preview`, `gemma-4` | Not published by Google. Forum (2026-09-03): **3.8 Flash = 20 RPD**, **Flash-Lite = 500 RPD**. Older 3rd-party figures of 5-15 RPM are outdated. Check AI Studio. | **Yes**: text, image, video, audio and PDF in one call. 1M-token input, 65K output. | No card for the free tier (a card or billing is only needed to move to paid Tier 1, minimum $5 prepay). The $300 GCP trial credit **cannot** be used for Gemini API since March 2026. | Yes, India is listed in the available regions. | Free-tier prompts **are used to improve Google products**, so don't send sensitive screens. Gemini 2.5 models are now "limited to past active users", so don't build on 2.5 IDs. |
| **Gemini Live API** (real-time audio/video) | `gemini-3.8-live`, `gemini-3.8-live-extended-thinking`, `gemini-3.1-flash-live-preview` (legacy), `gemini-2.5-flash-native-audio-preview-12-2025` | Free of charge on the free tier. Concurrent-session cap not published (often cited as 3 per project, from 3rd-party sources). | Audio in as 16-bit PCM at 16 kHz. Images in as JPEG, up to 1 fps. Output is audio (24 kHz) plus optional text transcripts. | No | Yes | Sessions: **audio-only 15 min, audio+video 2 min** (extend with session resumption). Context is 128K for native-audio models and 32K for others. Use ephemeral tokens for client-side connections. |
| **Groq** | `qwen/qwen3.8-27b` (vision: up to 3 images per request, about 2,048 tokens each, 20 MB URL request limit). `meta-models/muse-spark-open` is limited preview only. | Free plan *(sample, BenchLM read 2026-10-16)*: **30 RPM, 1,000 RPD, 8K TPM, 200K TPD** for qwen3.8-27b and gpt-oss-120b/20b | No (LLM). Whisper is separate. | No card is documented for the Free plan | Yes, it's a global API | Very fast tokens/s, so it's a good fallback. The 8K TPM cap means about 3 screenshots per minute. Limits apply per organization. |
| **OpenRouter** `:free` models | `openrouter/free` (router that can filter for image-capable free models). Seen recently: `minimax/minimax-m3.1-flash:free` (multimodal, 1M ctx). The free list changes weekly. | **20 RPM; 50 RPD** if you've bought fewer than 10 credits all-time, **1,000 RPD** at 10 or more credits ($10 one-time) | Depends on model | No | Yes | Unstable: free models come and go. Treat it as a tertiary fallback only. OpenAI-compatible API. |
| **Cerebras** | `qwen-3.8-27b` (vision: 2 images per request, 10 MiB payload) | Free Trial: 5 RPM, 30K uncached TPM, 1M tokens/day | No | **A verified payment method is required** to activate ($5 credit, expires in 30 days) | Card needed | Not truly free for this user. Skip. |
| **Mistral (Experiment plan)** | Mistral vision models (pixtral / mistral-small/medium); confirm IDs in the console | *(3rd-party)* 500K TPM, 1B tokens/month. Request rate unclear (about 1 RPS or 2 RPM is reported). | Voxtral (STT) exists; not verified on free plan | **No card. Phone verification**, one number per plan. | Yes | Requests may be used for training. Fine as a backup; the official limits page wasn't reachable (404). |
| **GitHub Models** | n/a | **Retired on 2026-07-30.** The API, playground and catalog are gone. | n/a | n/a | n/a | Do not use. |
| **Cloudflare Workers AI** | `@cf/meta/llama-3.2-11b-vision-instruct`, `@cf/meta/llama-4-scout-17b-16e-instruct`, `@cf/mistralai/mistral-small-3.1-24b-instruct`, plus a `qwen3.8-27b` slug (confirm the exact `@cf/` ID on the model page) | **10,000 neurons/day free** (resets 00:00 UTC). llama-3.2-11b-vision costs 4,410 neurons per 1M input tokens and 61,493 per 1M output tokens, so roughly 150K output tokens/day free. | Has ASR: `whisper-large-v3-turbo` (46.63 neurons per audio minute, so **about 214 free minutes/day**), plus Deepgram `nova-3` and `flux` | No (free plan) | Yes | Needs a Cloudflare account and an account ID plus token. Its REST API is slower than Groq's. |

### Takeaways
- **Gemini is the only free tier that takes screenshots and audio natively in one request, has a 1M context, and has a real-time Live API.** The catch is low, opaque RPD on the newest models, so use **Flash-Lite** as the workhorse and save `gemini-3.8-flash` for an explicit "think harder" button.
- **Groq `qwen/qwen3.8-27b`** is the best free vision fallback (fast, 1K RPD).
- A per-provider 429 handler with automatic failover is mandatory. Free quotas will be hit.

---

## 2. Speech-to-text

| Option | Model ID | Free allowance | Streaming? | Latency / quality | Notes |
|---|---|---|---|---|---|
| **Deepgram** | `nova-3` (also `flux` for English with turn detection) | **$200 credit, no card, no expiry** ("available until you use it up"). Nova-3 streaming is $0.0048/min (promo price), so about **41,000 min (about 690 h)**. | **Yes, true WebSocket streaming with interim results.** Up to 150 concurrent WSS streams on PAYG. | Sub-second partial results. Strong English. Nova-3 Multilingual is $0.0058/min. | The most robust live option. The credit is finite but very large for a student project. |
| **Gemini Transcribe Live** | `gemini-3.5-transcribe-live` | Free of charge on the free tier (quota not published) | **Yes**, through the Live API (`ai.live.connect`). Gives interim and final transcripts. | Shipped 2026-08-26. Input is 16 kHz mono PCM16 in about 100 ms chunks. Auto language detection with code-switching (useful for Hinglish). Custom vocabulary up to 1,000 terms. | **10-minute session cap**, so reconnect or rotate. No diarization or timestamps *(3rd-party)*. Free-tier data is used for training. |
| **Gemini audio in `generateContent`** | any Flash / Flash-Lite | Counts against LLM RPD | No (batch) | 32 tokens per second of audio. Up to 20 MB inline. | Useful for "answer what was just said" without a separate STT pass, but RPD is too low for continuous transcription. |
| **Groq Whisper** | `whisper-large-v3-turbo` ($0.04/h paid), `whisper-large-v3` | **20 RPM, 2,000 RPD, 7,200 audio-sec/hour, 28,800 audio-sec/day (8 h/day)** (docs table; check your console). 25 MB per file on the free tier. | **No.** File upload only, so chunk 3-10 s segments (VAD-cut). Minimum billed length is 10 s. | Very fast turnaround. Pseudo-live latency is about 1-2 s after each chunk. | `groq-sdk` → `client.audio.transcriptions.create({model, file})`. Good free fallback. |
| **AssemblyAI** | `universal-streaming-english` / `universal-streaming-multilingual` ($0.15/h), `universal-3-6-pro` ($0.45/h) | **$50 credit, no card**, so about 330 h of universal-streaming | Yes | Good | Free tier is limited to **5 new streams per minute**. Billing is by connection time, so close sockets when idle. |
| **Cloudflare Workers AI** | `@cf/openai/whisper-large-v3-turbo`, `@cf/deepgram/nova-3` | About 214 min/day of whisper-turbo from 10K neurons/day | Batch (chunked) | OK | A secondary free fallback. |
| **Web Speech API in Electron** | `webkitSpeechRecognition` | n/a | n/a | **Does not work.** | Chromium's implementation calls Google's speech servers using API keys that only official Google Chrome builds ship. In Electron it fails with `error: "network"`. Long-standing reports exist (W3C list in 2018; vxtron's workaround launches real Chrome). No Electron fix was found. **Do not plan around it.** |
| **whisper.cpp (local)** | `ggml-base.en`, `ggml-small.en`, `large-v3-turbo` | Free, offline | `whisper-stream` example (about 0.5 s step, needs SDL2). Has VAD via `--vad` plus Silero. Windows builds with MSVC or MinGW, and Vulkan GPU is optional. | RAM: tiny about 273 MB, base about 388 MB, small about 852 MB, medium about 2.1 GB, large about 3.9 GB. CPU *(3rd-party, hardware unspecified)*: base.en about 7x real time, small.en about 4x. Expect about 1-3 s lag with base.en on a 4-8 core laptop CPU (estimate). | The best offline STT for a student laptop. Ship `base.en` and run it as a sidecar process. |
| **faster-whisper (local, Python)** | `small`, `large-v3-turbo` (CTranslate2) | Free | Chunked | README: `small` int8 on an i7-12700K (8 threads) took 1m42s for the benchmark clip (about 13 min of audio), so about 7.5x real time, using 1.5 GB RAM | Needs a Python sidecar. Heavier to ship than whisper.cpp. |
| **Vosk (local)** | `vosk-model-small-en-us-0.15` (40 MB, WER 9.85 on LibriSpeech), `vosk-model-small-en-in-0.4` (36 MB, **WER 49** on NPTEL) | Free | True streaming with very low CPU (about 300 MB RAM) | Accuracy is much worse than Whisper, especially for Indian English | Only as a last-resort, ultra-light offline option. |

**System audio capture (needed for "transcribe the other speaker"):** Electron's `session.setDisplayMediaRequestHandler` accepts `audio: 'loopback'` (or `'loopbackWithMute'`), which captures system audio **on Windows only**. Mix it with the mic stream (getUserMedia), downsample to 16 kHz PCM16 in an AudioWorklet, then send it to the STT.

---

## 3. Local vision LLMs (Ollama)

| Model tag | Download | Input | Notes |
|---|---|---|---|
| `qwen3-vl:2b` | 1.9 GB | text+image, 256K ctx | Needs Ollama ≥ 0.12.7. The only realistic option on 8 GB RAM, CPU-only. |
| `qwen3-vl:4b` | 3.3 GB | text+image | The best quality/size trade-off for 16 GB laptops. |
| `qwen3-vl:8b` | 6.2 GB | text+image | Needs a GPU with about 8 GB VRAM (or 16 GB+ RAM and patience). |
| `gemma4:e2b` / `gemma4:e4b` | 4.6-7.5 GB / 6.6-9.5 GB | text+image (+audio per model card) | Successor to gemma3. |
| `qwen2.5vl:7b` | about 6.0 GB (Q4_K_M) | text+image | Superseded by qwen3-vl. |
| `llama3.2-vision:11b` | 7.8 GB | text+image | Needs about 12-16 GB. Weaker on captions and hallucinates more in comparisons. Superseded. |
| `gemma3:4b` | about 3 GB at Q4 | text+image | Superseded by gemma4. |

**CPU-only reality (estimate; no authoritative x86 benchmarks found):** on a typical 8-16 GB, 4-8 core student laptop with no dGPU, a 2-4B VLM will take **about 5-30 s to encode a screenshot** plus **a few tokens/s** to generate. That's fine as an *offline fallback* but not for "real-time". For comparison, an M4 Pro GPU runs qwen2.5vl 7B at about 50 tok/s. Recommendation: offer Ollama as an optional "offline mode", but don't make it the default.

---

## 4. Local OCR fallback: Tesseract.js

- `npm i tesseract.js` (v7, needs Node ≥ 16). It runs in Node or Electron (community example: Balearica/tesseract.js-electron). It supports 100+ languages (`eng`, `hin`, ...).
- API: `const worker = await createWorker('eng'); const { data } = await worker.recognize(pngBuffer); await worker.terminate();`. Reuse one worker across captures.
- Use it to (a) answer from **text only** with a cheap text model when vision quota runs out, and (b) **cut tokens** by sending OCR text instead of a full screenshot when the screen is mostly text (code, MCQs, documents).
- Language data downloads on first use. Bundle `eng.traineddata` for offline use.

---

## 5. Recommended default stack

### LLM (screen and question answering)
| Role | Provider / model ID | npm package |
|---|---|---|
| **Primary** | Gemini `gemini-3.5-flash-lite` (stable; image+audio+text in; about 500 RPD reported) | `@google/genai` (pin `<3.0.0`; Node ≥ 20) |
| "Deep answer" button | Gemini `gemini-3.8-flash` (about 20 RPD on free, so use it sparingly; thinking `low`) | `@google/genai` |
| **Fallback 1** (on 429 or 5xx) | Groq `qwen/qwen3.8-27b` (vision, 30 RPM / 1K RPD) | `groq-sdk` |
| Fallback 2 | OpenRouter `openrouter/free` (or a pinned `:free` vision model) | `openai` (baseURL `https://openrouter.ai/api/v1`) |
| Offline | Ollama `qwen3-vl:4b` (or `:2b` on 8 GB RAM), plus Tesseract.js OCR → text model | `ollama` npm or plain REST at `http://localhost:11434`, plus `tesseract.js` |

Optional simplification: Gemini also exposes an OpenAI-compatible endpoint (`https://generativelanguage.googleapis.com/v1beta/openai/`, with image_url data-URLs and `stream: true`). That lets one `openai` client cover Gemini, Groq (`https://api.groq.com/openai/v1`), OpenRouter and Ollama (`http://localhost:11434/v1`), with only the baseURL and model swapped.

### STT
| Role | Choice |
|---|---|
| **Primary (live)** | **Deepgram `nova-3` streaming over WebSocket** ($200 free credit, no card; interim results; robust). Use `nova-3` with `language=multi` for Hinglish. npm: `@deepgram/sdk` (check the current major version on npm). |
| Free-forever alternative | **Gemini `gemini-3.5-transcribe-live`** through `ai.live.connect` (same Google key; rotate the session before the 10-min cap) |
| Fallback | Groq `whisper-large-v3-turbo`, VAD-chunked 5-10 s clips (8 h of audio/day free) |
| Offline | whisper.cpp `ggml-base.en` sidecar (`whisper-stream` / server example) |

### Streaming code shape (main process; keep API keys out of the renderer)

```ts
// Gemini — primary
import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const stream = await ai.models.generateContentStream({
  model: 'gemini-3.5-flash-lite',
  contents: [{ role: 'user', parts: [
    { inlineData: { mimeType: 'image/jpeg', data: screenshotBase64 } },
    { text: `Transcript so far:\n${transcript}\n\nQuestion: ${q}` },
  ]}],
  config: { systemInstruction: SYSTEM_PROMPT, maxOutputTokens: 1024 },
});
for await (const chunk of stream) win.webContents.send('ai:delta', chunk.text ?? '');

// Groq — fallback (OpenAI-style)
import Groq from 'groq-sdk';
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const s = await groq.chat.completions.create({
  model: 'qwen/qwen3.8-27b', stream: true,
  messages: [{ role: 'user', content: [
    { type: 'text', text: q },
    { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${screenshotBase64}` } },
  ]}],
});
for await (const c of s) win.webContents.send('ai:delta', c.choices[0]?.delta?.content ?? '');
```

Token-saving tips: downscale screenshots to about 1280 px on the long edge and send them as JPEG at quality 70-80. Gemini bills 258 tokens per 768x768 tile, so a 960x540 image is 6 tiles, about 1.5K tokens. Send only the active window or a user-selected region. Prefer OCR text when the screen is mostly text.

---

## Sources (accessed 2026-10-21)
- Gemini pricing (updated 2026-10-19): https://ai.google.dev/gemini-api/docs/pricing
- Gemini rate limits (updated 2026-10-15): https://ai.google.dev/gemini-api/docs/rate-limits
- Gemini models list (updated 2026-10-19): https://ai.google.dev/gemini-api/docs/models
- gemini-3.5-flash-lite: https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite
- gemini-3.8-flash: https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash
- Billing / tiers (updated 2026-09-28): https://ai.google.dev/gemini-api/docs/billing
- Available regions (updated 2026-04-28): https://ai.google.dev/gemini-api/docs/available-regions
- Live API (updated 2026-10-06): https://ai.google.dev/gemini-api/docs/live and https://ai.google.dev/gemini-api/docs/live-api/capabilities
- Live transcription (updated 2026-08-26): https://ai.google.dev/gemini-api/docs/live-api/live-transcribe
- Ephemeral tokens: https://ai.google.dev/gemini-api/docs/ephemeral-tokens
- Audio understanding: https://ai.google.dev/gemini-api/docs/audio
- Image understanding: https://ai.google.dev/gemini-api/docs/image-understanding
- OpenAI compatibility: https://ai.google.dev/gemini-api/docs/openai
- SDKs: https://ai.google.dev/gemini-api/docs/libraries and https://github.com/googleapis/js-genai
- Forum, 3.8 Flash at 20 RPD (2026-09-03): https://discuss.ai.google.dev/t/gemini-3-8-flash-free-tier-20-rpd-is-too-limited-for-practical-evaluation/180609
- Free-tier overview (3rd-party, 2026-09-30): https://yingtu.ai/en/blog/google-gemini-api-free-tier-limits-2026
- Live session limits forum: https://discuss.ai.google.dev/t/official-concurrent-session-rps-limits-for-gemini-live-api-where-are-they-documented/174664
- Groq rate limits: https://console.groq.com/docs/rate-limits ; Groq free plan snapshot (BenchLM, read 2026-10-16): https://benchlm.ai/md/free-tier/groq.md
- Groq vision: https://console.groq.com/docs/vision ; Groq STT: https://console.groq.com/docs/speech-to-text ; SDK: https://github.com/groq/groq-typescript
- OpenRouter limits: https://openrouter.ai/docs/api/reference/limits ; free router: https://openrouter.ai/openrouter/free
- Cerebras rate limits: https://inference-docs.cerebras.ai/support/rate-limits
- GitHub Models retirement: https://docs.github.com/en/github-models/use-github-models/prototyping-with-ai-models
- Cloudflare Workers AI pricing (updated 2026-10-20): https://developers.cloudflare.com/workers-ai/platform/pricing/ ; models: https://developers.cloudflare.com/workers-ai/models/
- Mistral Experiment plan: https://docs.mistral.ai/getting-started/quickstarts/studio/activate-and-generate-api-key ; https://freellm.net/providers/mistral-ai
- Deepgram pricing: https://deepgram.com/pricing
- AssemblyAI pricing: https://www.assemblyai.com/pricing
- Web Speech in Electron: https://github.com/dtinth/vxtron/blob/master/README.md ; https://lists.w3.org/Archives/Public/public-speech-api/2018Feb/0000.html
- Electron loopback audio: https://www.electronjs.org/docs/latest/api/session
- whisper.cpp: https://github.com/ggml-org/whisper.cpp ; faster-whisper: https://github.com/SYSTRAN/faster-whisper ; CPU speed (3rd-party): https://openwhispr.com/it/blog/whisper-model-sizes-explained
- Vosk models: https://alphacephei.com/vosk/models
- Ollama: https://ollama.com/library/qwen3-vl ; https://ollama.com/library/gemma4 ; local VLM overview: https://localaimaster.com/blog/best-local-vision-models
- Tesseract.js: https://github.com/naptha/tesseract.js
