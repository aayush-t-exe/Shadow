# 07 — AI Pipeline Design for Shadow

Researched 2026-10-21. Covers the multi-provider layer, prompts (screenshot, debug, live listening), streaming markdown rendering, and API key storage. Free-tier pricing and model picks are covered in a separate file.

---

## 0. TL;DR decisions

| Area | Decision |
|---|---|
| Provider layer | **Vercel AI SDK v7 (`ai@7`) core, run only in the Electron main process.** One `getModel(settings)` factory picks one of 6 providers. Don't use `@ai-sdk/react`/`useChat`, because Shadow streams over IPC, not HTTP. |
| Fallback | Write a ~60-line "OpenAI-compatible" escape hatch (`@ai-sdk/openai-compatible`) so any new base URL works without new code. |
| Streaming to UI | Main → renderer through `webContents.send('ai:chunk', {id, delta})`, batched every ~30 ms. Cancel with `AbortController` keyed by request id. |
| Output format | **Markdown with fixed `##` headings, not JSON.** It streams cleanly, every model (including small Ollama models) can do it, and the UI can still split it by heading. |
| Live mode | Gate → triage → answer. A cheap heuristic gate first, then a fast model call that returns `{isQuestion, question, kind}` as JSON, then a streamed answer that opens with "Say this" talking points. Older transcript is folded into a rolling summary. |
| Rendering | **`streamdown@2` + `@streamdown/code` (Shiki 4).** It is built for partial markdown, highlights code with Shiki, and has a copy button. Fall back to react-markdown 10 + remark-gfm + a custom code block if you want zero Tailwind. |
| Secrets | `safeStorage.encryptStringAsync` (DPAPI on Windows), stored as base64 in `electron-store@12`. Keys never reach the renderer: it only sees `hasKey: boolean` and a masked last 4 characters. |

---

## 1. Multi-provider abstraction

### 1.1 Current package versions (npm registry, 2026-10-21)

| Package | Version | Notes |
|---|---|---|
| `ai` | 7.0.147 | ESM-only, **Node ≥ 22**, peer `zod ^3.25.76 \|\| ^4.1.8` |
| `@ai-sdk/google` | 4.0.101 | v7 renamed `createGoogleGenerativeAI` to **`createGoogle`** (the old name is a deprecated alias) |
| `@ai-sdk/groq` | 4.0.66 | `createGroq` |
| `@ai-sdk/openai` | 4.0.98 | `createOpenAI`; `openai(id)` uses the Responses API |
| `@ai-sdk/anthropic` | 4.0.84 | `createAnthropic` |
| `@ai-sdk/openai-compatible` | 3.0.74 | `createOpenAICompatible({ name, baseURL, apiKey })` |
| `@openrouter/ai-sdk-provider` | 3.1.0 | official, from the OpenRouter team; peer `ai ^7`; `createOpenRouter`, `openrouter.chat(id)` |
| `ai-sdk-ollama` | 4.5.1 | community package (jagreehal), built on the official `ollama` JS client; peer `ai ^7.0.137`. The AI SDK docs recommend it for tool reliability. |
| `ollama-ai-provider-v2` | 4.0.1 | community package (nordwestt), plain HTTP; peer `ai ^7`; default base URL `http://localhost:11434/api` |
| `electron` | 44.9.2 (stable), which bundles **Node 24.22** | satisfies AI SDK's Node ≥ 22 |
| `electron-vite` | 6.0.0 | |
| `electron-store` | 12.0.0 | ESM-only, needs Electron ≥ 35 |
| `streamdown` / `@streamdown/code` | 2.7.1 / 2.0.0 | `@streamdown/code` depends on `shiki ^4.4` |
| `react-markdown` / `remark-gfm` | 10.1.0 / 4.0.1 | |
| `shiki` | 4.5.0 | streaming helper is now `@shikijs/stream` (it used to be `shiki-stream`) |

Sources:
- https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0
- https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text
- https://ai-sdk.dev/providers/community-providers/ollama
- https://ai-sdk.dev/providers/community-providers/openrouter
- https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai
- https://releases.electronjs.org/releases.json

### 1.2 AI SDK v7 changes that will bite you (from the migration guide)

- `system` becomes **`instructions`**. `system` still works as a deprecated alias. System messages inside `messages` are **rejected by default** unless you set `allowSystemInMessages: true`.
- `fullStream` becomes **`stream`**, and `onFinish` becomes **`onEnd`**. `onChunk` now receives *every* part type, so check `chunk.type`.
- The image part `{type:'image', image}` is deprecated. Use **`{ type: 'file', mediaType: 'image/png', data }`** (`data` can be a Buffer, Uint8Array, base64 string, or URL).
- **ESM-only.** Set `"type": "module"` in package.json, or let electron-vite bundle the main process. Electron has supported ESM in main since v28. A **sandboxed preload must stay CommonJS**, and electron-vite handles that.
- `usage` now totals all steps. Shadow doesn't use tools, so this doesn't matter here.
- Use `generateText({ output: Output.object({ schema }) })` for structured JSON (live-mode triage). The result is in `.output`.
- New timeout knobs: `timeout: { totalMs, stepMs, chunkMs }`. `chunkMs` is a stall detector, which is great for a hung Ollama server.
- Retries: `maxRetries` (default **2**) covers failures *before* the stream starts. `streamRetries` (default 0) covers provider errors *after* streaming began. Text already streamed can't be retracted, so keep `streamRetries: 0` and show "retry" in the UI instead.
- Anthropic gotcha (from Anthropic's docs): Claude 4.7+ models return **400 on `temperature < 1`** and on any `top_p` other than the default. **Never send `temperature`/`topP` by default.** Make them per-provider opt-in.

### 1.3 AI SDK vs thin custom adapter

| | Vercel AI SDK v7 | Custom adapter (`openai` SDK + base URLs) |
|---|---|---|
| Coverage | Native packages for Google, Groq, OpenAI, Anthropic, plus official OpenRouter and two community Ollama providers | Gemini (`https://generativelanguage.googleapis.com/v1beta/openai/`, still **beta**, unknown params silently ignored), Groq (`https://api.groq.com/openai/v1`), OpenRouter (`https://openrouter.ai/api/v1`), Ollama (`http://localhost:11434/v1`), OpenAI. Anthropic's compat layer (`https://api.anthropic.com/v1/`) is "**not considered a long-term or production-ready solution**", has no prompt caching, and doesn't return thinking. |
| Images | One `file` part shape, converted per provider | `image_url` data URIs work on all of the above, but each has its own quirks |
| Streaming | `textStream` / `stream` with typed parts, `onError`, `onAbort` | You parse SSE deltas yourself (the `openai` SDK does this) |
| Abort | `abortSignal`, `onAbort`, `abort` stream part | `signal` option, works fine |
| Errors | Normalized: `StreamProviderError` (`statusCode`, `isRetryable`), `APICallError`, `RetryError` | Each provider's error JSON is different |
| Retries | Built in (`maxRetries`) | Write your own backoff |
| Bundle and complexity | ~6 packages, ESM, Node 22 | 1 package |
| Learning value for a college project | High, since it's the industry-standard abstraction | High, since you learn the raw protocol |

**Recommendation:** use the AI SDK. The abstraction is free, error and abort handling are normalized, and native Anthropic and Gemini avoid the "beta compat layer" problems. Keep `@ai-sdk/openai-compatible` as a "Custom (OpenAI-compatible)" seventh provider so users can add LM Studio, DeepSeek, and similar services with only a base URL. This is the same idea Pluely uses with its curl templates (`src/config/ai-providers.constants.ts`), but type-safe.

**Main process vs renderer:** run all model calls in **main**. Reasons:
1. API keys never leave main (§5).
2. There is no CORS. Calling Anthropic from a browser needs the `anthropic-dangerous-direct-browser-access` header, which is exactly what Pluely's renderer-side curl template does. Ollama blocks browser origins unless the user sets `OLLAMA_ORIGINS`.
3. Screenshots are already captured in main (`desktopCapturer`/`screenshot-desktop`), so they don't need to cross IPC as large base64 strings.
4. The SDK needs Node ≥ 22, and Electron 44 main has Node 24.

### 1.4 Code sketch — provider factory (main)

```ts
// src/main/ai/providers.ts
import type { LanguageModel } from 'ai';
import { createGoogle } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createOllama } from 'ai-sdk-ollama';           // or 'ollama-ai-provider-v2'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { getApiKey } from '../secrets';

export type ProviderId = 'gemini' | 'groq' | 'openai' | 'anthropic' | 'openrouter' | 'ollama' | 'custom';

export interface ModelChoice {
  provider: ProviderId;
  modelId: string;          // user-editable text box + suggestions
  baseURL?: string;         // ollama/custom
  vision: boolean;          // capability flag (from a static table or user toggle)
}

export async function getModel(c: ModelChoice): Promise<LanguageModel> {
  const apiKey = c.provider === 'ollama' ? undefined : await getApiKey(c.provider);
  if (c.provider !== 'ollama' && !apiKey) throw new ShadowError('NO_KEY', `Add a ${c.provider} API key in Settings`);
  switch (c.provider) {
    case 'gemini':     return createGoogle({ apiKey })(c.modelId);
    case 'groq':       return createGroq({ apiKey })(c.modelId);
    case 'openai':     return createOpenAI({ apiKey })(c.modelId);
    case 'anthropic':  return createAnthropic({ apiKey })(c.modelId);
    case 'openrouter': return createOpenRouter({
                         apiKey,
                         headers: { 'HTTP-Referer': 'https://github.com/<you>/shadow', 'X-Title': 'Shadow' },
                       }).chat(c.modelId);
    case 'ollama':     return createOllama({ baseURL: c.baseURL ?? 'http://127.0.0.1:11434' })(c.modelId);
    case 'custom':     return createOpenAICompatible({ name: 'custom', baseURL: c.baseURL!, apiKey })(c.modelId);
  }
}

export class ShadowError extends Error {
  constructor(public code: 'NO_KEY' | 'RATE_LIMIT' | 'AUTH' | 'NO_VISION' | 'NETWORK' | 'OLLAMA_DOWN' | 'UNKNOWN', msg: string) { super(msg); }
}
```

### 1.5 Code sketch — streaming request with images, abort, errors (main)

```ts
// src/main/ai/run.ts
import { streamText, StreamProviderError, APICallError, RetryError } from 'ai';
import { BrowserWindow, ipcMain } from 'electron';
import { getModel, ShadowError, type ModelChoice } from './providers';

const inflight = new Map<string, AbortController>();

export async function runStream(win: BrowserWindow, id: string, opts: {
  model: ModelChoice; instructions: string; userText: string; images?: Buffer[]; history?: any[];
}) {
  const ac = new AbortController();
  inflight.set(id, ac);
  const send = (ch: string, payload: unknown) => !win.isDestroyed() && win.webContents.send(ch, { id, ...payload as object });

  // batch deltas → fewer IPC messages, smoother React renders
  let buf = ''; const flush = () => { if (buf) { send('ai:chunk', { delta: buf }); buf = ''; } };
  const timer = setInterval(flush, 30);

  try {
    if (opts.images?.length && !opts.model.vision) throw new ShadowError('NO_VISION', 'Selected model cannot read images');
    const result = streamText({
      model: await getModel(opts.model),
      instructions: opts.instructions,            // v7 name for `system`
      messages: [
        ...(opts.history ?? []),
        { role: 'user', content: [
          { type: 'text', text: opts.userText },
          ...(opts.images ?? []).map(png => ({ type: 'file' as const, mediaType: 'image/png', data: png })),
        ] },
      ],
      maxOutputTokens: 4096,
      maxRetries: 2,                               // pre-stream 429/5xx retries (SDK backoff)
      abortSignal: ac.signal,
      timeout: { chunkMs: 30_000 },                // stalled-stream guard (Ollama cold start: raise)
    });

    for await (const part of result.stream) {      // `stream` (v7), not deprecated `fullStream`
      if (part.type === 'text-delta') buf += part.text;
      else if (part.type === 'error') throw part.error;
      else if (part.type === 'abort') break;
    }
    flush();
    send('ai:done', { usage: await result.usage.catch(() => null) });
  } catch (err) {
    flush();
    if (ac.signal.aborted) send('ai:done', { aborted: true });
    else send('ai:error', toUserError(err, opts.model));
  } finally {
    clearInterval(timer); inflight.delete(id);
  }
}

ipcMain.on('ai:cancel', (e, id: string) => inflight.get(id)?.abort());

function toUserError(err: unknown, m: ModelChoice) {
  if (err instanceof ShadowError) return { code: err.code, message: err.message };
  const e = RetryError.isInstance(err) ? err.lastError : err;
  const status = (APICallError.isInstance(e) || StreamProviderError.isInstance(e)) ? e.statusCode : undefined;
  if (status === 401 || status === 403) return { code: 'AUTH', message: `${m.provider}: invalid API key` };
  if (status === 429) return { code: 'RATE_LIMIT', message: `${m.provider} rate limit hit. Wait or switch provider.`,
                               retryAfter: APICallError.isInstance(e) ? e.responseHeaders?.['retry-after'] : undefined };
  if (m.provider === 'ollama' && /ECONNREFUSED|fetch failed/i.test(String(e))) return { code: 'OLLAMA_DOWN', message: 'Ollama is not running (start `ollama serve`).' };
  return { code: 'UNKNOWN', message: String((e as Error)?.message ?? e) };
}
```

**Rate limits (free tiers):** the SDK's built-in retry is enough before the stream starts. On a final 429, show a toast with **"Switch to <next provider>"** that uses a user-ordered fallback list from settings (for example Gemini → Groq → OpenRouter free model → Ollama). Don't auto-retry silently across providers, because the user should know which model answered. Show `provider · model` in the answer header.

**Non-vision models (many Groq/Ollama text models):** use a two-stage pipeline, which is what interview-coder does. Stage 1 sends the screenshots to a vision model with an EXTRACT prompt (§2.4) and gets back problem text. Stage 2 sends that text to the chosen text model. Expose "Vision model for extraction" as its own setting.

### 1.6 Preload bridge (renderer side, no raw ipcRenderer)

```ts
// src/preload/index.ts  (CommonJS output, sandbox: true, contextIsolation: true)
import { contextBridge, ipcRenderer } from 'electron';
const on = (ch: string) => (cb: (p: any) => void) => {
  const h = (_: unknown, p: any) => cb(p); ipcRenderer.on(ch, h); return () => ipcRenderer.removeListener(ch, h);
};
contextBridge.exposeInMainWorld('shadow', {
  solveScreenshots: (req: { language: 'python' | 'java'; mode: 'solve' | 'debug' }) => ipcRenderer.invoke('ai:solve', req), // returns id
  cancel: (id: string) => ipcRenderer.send('ai:cancel', id),
  onChunk: on('ai:chunk'), onDone: on('ai:done'), onError: on('ai:error'),
  settings: { get: () => ipcRenderer.invoke('settings:get'), set: (p: unknown) => ipcRenderer.invoke('settings:set', p) },
  keys: { set: (provider: string, key: string) => ipcRenderer.invoke('keys:set', provider, key),
          status: () => ipcRenderer.invoke('keys:status'),          // {gemini:{hasKey,last4},...}
          test: (provider: string) => ipcRenderer.invoke('keys:test', provider) },
});
```

---

## 2. Prompt design — screenshot mode

### 2.1 What the open-source tools do

| Tool | Prompt approach | Lessons |
|---|---|---|
| **interview-coder** (j4wg open fork, `electron/ProcessingHelper.ts`) https://raw.githubusercontent.com/j4wg/interview-coder-withoupaywall-opensource/main/electron/ProcessingHelper.ts | Two stages. (1) "You are a coding challenge interpreter… Return JSON with problem_statement, constraints, example_input, example_output." (2) A text prompt asking for "1. Code 2. Your Thoughts 3. Time complexity… (at least 2 sentences) 4. Space complexity". The response is then **regex-parsed** (`/Time complexity:?\s*…/`) with hard-coded fallback text. Debug mode sends screenshots plus problem statement and requires `### Issues Identified / ### Specific Improvements and Corrections / ### Optimizations / ### Explanation of Changes Needed / ### Key Points`. | The two-stage extraction is useful for non-vision models. Regex-parsing free text is brittle (its fallback even inserts a fake "O(n) hashmap" explanation). Shadow uses fixed markdown headings and renders them as-is. Its debug headings are a good starting point. |
| **free-cluely** (`electron/LLMHelper.ts`) https://raw.githubusercontent.com/Prat011/free-cluely/master/electron/LLMHelper.ts | One generic "Wingman AI" system prompt, with JSON output for problem, solution, and debug (`Return ONLY the JSON object, without any markdown`) and `JSON.parse` after stripping code fences. | JSON output can't be streamed or rendered progressively and breaks easily on small models. Avoid it for answers. |
| **Glass** (pickle-com/glass. The original repo now 404s; read via forks such as `Jonxjdong/glass-fork`, `src/features/common/prompts/promptTemplates.js`) | Prompt profiles (`interview`, `pickle_glass`, `sales`, `leetcode`…) built from `intro / formatRequirements / searchUsage / content / outputInstructions`. `pickle_glass` has a **decision hierarchy**: 1) RECENT_QUESTION_DETECTED → answer, 2) PROPER_NOUN_DEFINITION, 3) SCREEN_PROBLEM_SOLVER, 4) FALLBACK "Not sure what you need help with". For coding: "START with fully commented, line-by-line code… Then: markdown section with … complexity, dry runs". It has rules against inventing facts. Its summary service re-analyzes every 5 transcript turns using the last N turns plus the previous analysis. | The decision hierarchy and the "infer intent from garbled text" rule carry straight into Shadow's live mode, and so does the "rolling previous analysis" idea. Composing prompts from blocks makes Python/Java and length switches easy. |
| **Pluely** (Tauri, `src/lib/response-settings.constants.ts`, `src/config/ai-providers.constants.ts`) | Default prompt is just "You are a helpful AI assistant. Be concise…". It appends **response-length** blocks (Short = "2-4 sentences… strict requirement", Medium, Auto) and **language** blocks ("Respond in Spanish"). Providers are curl templates with `{{API_KEY}} {{MODEL}} {{SYSTEM_PROMPT}} {{TEXT}} {{IMAGE}}`. | Composable suffix blocks ("length" and "language") work well. Copy that for the Python/Java and verbosity toggles. |

### 2.2 Design principles for Shadow's prompts

1. **Fixed `##` headings in a fixed order.** The UI can collapse sections and jump to "Code" without parsing JSON. Code goes early so the user gets value before the stream ends.
2. **Language is a hard parameter**, injected as `{{LANGUAGE}}` with language-specific rules (Python 3 type hints and stdlib only; Java 17+, `class Solution` or `public class Main`).
3. **Match the platform's signature.** If a LeetCode-style stub is visible, keep that exact method signature. If it's stdin/stdout (HackerRank/Codeforces), write a full program with fast I/O.
4. **Uncertainty.** If the screenshot is cut off or unreadable, the model says what's missing and states its assumption instead of hallucinating.
5. **One code block per answer** (plus optional brute-force block), tagged with the language for Shiki.
6. **Composable blocks:** `BASE + LANGUAGE_RULES[lang] + MODE (solve|debug) + VERBOSITY`. Keep it under ~800 tokens so small Ollama models still follow it.
7. Ask for **plain ASCII complexity notation** (`O(n log n)`), and don't assume LaTeX is rendered.

### 2.3 FINAL PROMPT — `SOLVE` (system / `instructions`)

```text
You are Shadow, an expert competitive programmer and patient teacher. The user sends one or more screenshots of a coding problem (LeetCode, HackerRank, Codeforces, an online assessment, or a code editor). Solve it in {{LANGUAGE}}.

READ THE SCREENSHOTS CAREFULLY
- Combine all screenshots; they may be parts of one long problem (scrolled) in order.
- Extract: the task, input/output format, constraints, examples, and any function signature or starter code shown.
- If a starter signature is visible, keep its exact name, parameters, and return type. Otherwise, if input is read from stdin, write a complete runnable program.
- If text is cut off or unreadable, say exactly what is missing in one line, make the most reasonable assumption, and continue. Never invent constraints that are not implied.
- If the screenshot is not a coding problem (e.g., an MCQ, SQL, or a theory question), answer it directly and skip irrelevant sections.

OUTPUT FORMAT — markdown, exactly these sections in this order, no preamble:

## Problem
2–3 sentences restating the task in your own words, plus key constraints (e.g., n ≤ 1e5).

## Approach
- Name the pattern (e.g., "sliding window", "BFS on grid", "DP over prefixes").
- 3–6 bullets of intuition: why it works, and the key insight that beats brute force.
- If constraints are small enough that brute force passes, say so.

## Code
One fenced code block tagged ```{{LANGUAGE_TAG}}. Clean, optimal, ready to paste and submit. Short comments only at non-obvious lines.

## Complexity
- **Time:** O(...) — one sentence why.
- **Space:** O(...) — one sentence why (exclude output unless significant).

## Edge Cases
3–6 bullets of edge cases the code handles (empty input, single element, duplicates, negatives, overflow, disconnected graph, etc.).

## Dry Run
Trace the first example from the problem (or a tiny one you choose) step by step in a compact table or numbered list, ending with the output and confirming it matches the expected output.

RULES
- Prefer the optimal solution that fits the constraints. If the optimal one is much harder, give it but mention the simpler alternative in one line under Approach.
- Never claim you ran the code.
- Use plain-text Big-O (O(n log n)), not LaTeX.
- Be concise: no filler, no repeated explanations, no closing summary.

{{LANGUAGE_RULES}}
{{VERBOSITY}}
```

**`LANGUAGE_RULES.python`**
```text
PYTHON RULES
- Python 3.11+, standard library only (collections, heapq, bisect, itertools, functools, math).
- LeetCode style: `class Solution:` with the given method and type hints (`List[int]` from typing if the stub uses it).
- Stdin style: read with `sys.stdin.buffer.read().split()` or `sys.stdin.readline` for speed; wrap in `def main():` and call it.
- Avoid deep recursion; if recursion depth may exceed ~1000, use an iterative approach or `sys.setrecursionlimit` with a note.
- Use `//` for integer division; Python ints don't overflow, so don't add overflow handling.
```

**`LANGUAGE_RULES.java`**
```text
JAVA RULES
- Java 17+. Include all needed imports (`import java.util.*;` etc.).
- LeetCode style: `class Solution { ... }` with the exact given method signature; no main method unless the stub has one.
- Stdin style: `public class Main` with `main`, fast input via `BufferedReader`/`StreamTokenizer` or a small FastReader, output via `StringBuilder`/`PrintWriter`.
- Watch overflow: use `long` when sums/products can exceed 2^31-1, and say so in Edge Cases.
- Use `ArrayDeque` (not `Stack`/`LinkedList`) for stacks/queues; `PriorityQueue` with explicit comparators; `Integer.compare` instead of subtraction in comparators.
- Generic collections must use boxed types (`List<Integer>`); mention autoboxing cost only if relevant.
```

**`VERBOSITY` blocks:** `concise` = "Keep Approach to ≤3 bullets, Edge Cases to ≤3 bullets, Dry Run to ≤5 steps." `detailed` = "Also add a '## Alternative' section with the brute-force idea and its complexity after Complexity."

**User message text** that goes with the images:
```text
Solve the problem in these {{N}} screenshot(s) in {{LANGUAGE}}.{{EXTRA_USER_NOTE}}
```

### 2.4 FINAL PROMPT — `EXTRACT` (stage 1 for non-vision answer models)

```text
You transcribe coding problems from screenshots. Output ONLY the problem as clean markdown, with no solution or commentary:

## Title
## Statement
## Input / Output Format
## Constraints
## Examples   (verbatim, in fenced blocks)
## Starter Code   (verbatim in a fenced block with its language, or "none")

Merge multiple screenshots in order and remove duplicate overlapping text. Mark unreadable parts as [unreadable]. Preserve math exactly (write 10^5, not 105).
```
Stage 2 then sends the `SOLVE` prompt, with the user text set to "Solve this problem in {{LANGUAGE}}:\n\n{{EXTRACTED_MARKDOWN}}".

### 2.5 FINAL PROMPT — `DEBUG` follow-up mode

Trigger: the user has already got a solution, then takes 1–4 extra screenshots (failing test, error trace, wrong answer, TLE, or their own edited code) and presses "Debug". Send the **previous conversation** (previous user turn without images, to save tokens, plus the previous assistant answer) and then the new screenshots.

```text
You are Shadow in DEBUG mode. Earlier in this conversation you (or the user) produced a solution in {{LANGUAGE}}. The new screenshots show what happened next: a compiler/runtime error, a failing test case, Wrong Answer, Time/Memory Limit Exceeded, or the user's modified code.

Steps (think silently, output only the result):
1. Identify which code is being run: the user's code in the screenshot if visible, otherwise the previous solution.
2. Find the root cause. For a failing test, trace that input to the first divergence. For TLE/MLE, compare complexity with the constraints. For errors, map the message/line number to the cause.

OUTPUT FORMAT — markdown, exactly these sections, no preamble:

## Diagnosis
One or two sentences: the root cause, and the line or construct responsible.

## Fix
- Bullets of the specific changes (what → why).

## Corrected Code
The FULL corrected solution in one ```{{LANGUAGE_TAG}} block (not a diff), keeping the original signature. Mark changed lines with a trailing comment `# FIX` (Python) or `// FIX` (Java).

## Why It Failed On This Test
A short trace of the failing input through the old logic vs the fixed logic (≤6 steps).

## Complexity
Time and space of the corrected code. Note if they changed.

## Also Check
≤3 bullets of other inputs likely to break, if any.

RULES
- If the screenshots show the code is already correct (e.g., the judge expects a different output format), say so and fix only the I/O.
- If the cause cannot be determined from the screenshots, state what extra information is needed (e.g., "screenshot the full stack trace") and give the most likely fix.
- Do not rewrite with a different algorithm unless the current one cannot meet the constraints (TLE); if you do, say why in Diagnosis.

{{LANGUAGE_RULES}}
```

### 2.6 Follow-up chat (free text)

After an answer the user can type "explain step 2", "make it O(1) space", or "convert to Java". Keep the conversation history and use this short system prompt:

```text
You are Shadow. Continue helping with the coding problem above. Answer the user's follow-up directly and briefly. If code changes, output the full updated code block in {{LANGUAGE}} (tag ```{{LANGUAGE_TAG}}). Keep the same section headings only if the user asks for a full re-solve.
```

"Convert to Java/Python" is just a follow-up with `{{LANGUAGE}}` swapped, so it doesn't need a new screenshot.

---

## 3. Live-listening mode

### 3.1 Pipeline

```
STT (final segments, speaker label "Interviewer"/"Me" or "Them"/"Me")
   │ append to TranscriptStore {id, speaker, text, t}
   ▼
[Gate] local, free, instant:
   - only on FINAL (not interim) segments, after ≥700 ms silence / end-of-utterance
   - speaker ≠ "Me" (configurable: answer only the other side)
   - text length ≥ 4 words
   - heuristics score: ends with "?", starts with wh-word/"can you/could you/how would/explain/
     tell me/walk me through/what's the difference/implement/write/design/optimize/complexity"
   - cooldown: no triage within 2 s of the last one; skip if same as last answered question (normalized hash)
   ▼ (score ≥ 1 OR user presses "Answer now" hotkey → skip triage)
[Triage] fast cheap model, generateText + Output.object (≤150 output tokens, timeout 4 s)
   → {isQuestion, needsAnswer, question, kind, confidence}
   ▼ if needsAnswer && confidence ≥ 0.6
[Answer] streamText with LIVE_ANSWER prompt + rolling summary + recent window
   ▼
[Summarizer] background: when verbatim window > budget, fold oldest turns into rolling summary
```

Why a separate triage call: the answer model may be slow (Claude/Opus/large Ollama), and you don't want a full answer for every "okay, sounds good". The triage model should be the fastest one available (a Groq Llama or Gemini Flash-Lite class model, per the pricing file). If the user has only one provider, use the same model with `maxOutputTokens: 150`. Always offer the manual hotkey, since false negatives are worse than an extra click.

### 3.2 FINAL PROMPT — `TRIAGE` (system)

```text
You monitor a live technical conversation (usually a coding interview or viva) for the user, who is labeled "Me". Decide whether the LATEST utterance from the other speaker contains a question or request that the user should answer now.

Return JSON only, matching the schema:
{
  "needsAnswer": boolean,        // true if the user is expected to respond with substance
  "question": string,            // the question rewritten as one clear, self-contained sentence (resolve "it", "that" using context); "" if none
  "kind": "coding" | "conceptual" | "system_design" | "behavioral" | "clarification" | "other",
  "language": "python" | "java" | null,   // only if explicitly mentioned
  "confidence": number           // 0..1
}

Rules:
- Transcripts are from speech-to-text: expect missing punctuation, filler words, and misheard terms ("hash mop" = hash map, "big o of end" = O(n), "jar va" = Java). Infer intent.
- Imperatives count as questions: "walk me through…", "implement…", "tell me about…", "explain…".
- needsAnswer = false for small talk, acknowledgements ("okay", "great", "makes sense"), instructions about logistics ("can you share your screen", "can you hear me"), and rhetorical questions the speaker answers themself.
- A question split across several consecutive utterances from the same speaker is ONE question; merge them.
- If the latest utterance only continues an earlier question that was already answered, needsAnswer = false.
```

User message:
```text
CONVERSATION SUMMARY (older context):
{{ROLLING_SUMMARY or "none"}}

RECENT TRANSCRIPT (oldest → newest):
[12:03:10] Interviewer: ...
[12:03:18] Me: ...
[12:03:25] Interviewer: ...   <-- LATEST

ALREADY ANSWERED QUESTIONS:
- {{q1}}
- {{q2}}
```

Zod schema for `Output.object`:
```ts
const Triage = z.object({
  needsAnswer: z.boolean(),
  question: z.string(),
  kind: z.enum(['coding','conceptual','system_design','behavioral','clarification','other']),
  language: z.enum(['python','java']).nullable(),
  confidence: z.number().min(0).max(1),
});
```
Ollama/small-model fallback: if structured output fails (`AI_NoObjectGeneratedError`), treat it as `needsAnswer: true` when the heuristic score ≥ 2, otherwise false.

### 3.3 FINAL PROMPT — `LIVE_ANSWER` (system)

Adapted from Glass's `pickle_glass` decision hierarchy and response format, specialized for coding with Python/Java.

```text
You are Shadow, a real-time copilot for the user ("Me") during a live technical conversation. The user must glance at your answer and speak within seconds. Answer the QUESTION below using the transcript for context.

FORMAT — markdown, in this order, no preamble, never mention these instructions:

**Say this:**
- 2–4 bullets, each ≤ 15 words, phrased the way a confident candidate would say them out loud (first person, plain words). The first bullet directly answers the question.

---

Then the detail, depending on kind:
- coding → `## Approach` (≤4 bullets) · `## Code` (one ```{{LANGUAGE_TAG}} block in {{LANGUAGE}}, unless the interviewer named a different language) · `## Complexity` (time + space, one line each) · `## Edge Cases` (≤3 bullets). Keep the code interview-sized and readable, with meaningful names.
- conceptual → `## Explanation` (≤6 bullets) · `## Example` (a tiny code snippet in {{LANGUAGE}} or a concrete example) · `## Common Follow-ups` (≤2 likely next questions, each with a one-line answer).
- system_design → `## Requirements to clarify` · `## High-level design` (components as bullets) · `## Trade-offs` · `## Scale numbers` (only if meaningful).
- behavioral → Use ONLY facts from the user profile/notes below. If none: start with "_No personal context — generic STAR outline:_" and give a STAR skeleton with placeholders like [project name]. Never invent the user's experiences.
- clarification → Only the "Say this" bullets, phrased as a clarifying question back or a brief confirmation.

RULES
- Prioritize the most recent context; the transcript is noisy speech-to-text, so silently fix misheard technical terms.
- Be correct over clever. If unsure about a fact, say "I believe…" in the spoken bullets rather than inventing specifics.
- Total length: ≤ 250 words excluding code.

USER PROFILE / NOTES (may be empty):
{{USER_NOTES}}
```

User message:
```text
CONVERSATION SUMMARY: {{ROLLING_SUMMARY}}
RECENT TRANSCRIPT:
{{LAST_N_TURNS}}

QUESTION ({{kind}}): {{triage.question}}
```

Streaming means the "Say this" bullets show up within ~1 s on a fast provider. The detail keeps filling in below them.

### 3.4 Context-window management for long transcripts

- **Three tiers.**
  1. **Verbatim window:** the last ~25 turns, or about 2,500 tokens (estimate with `chars/4`), whichever is smaller. It always includes the full current question thread.
  2. **Rolling summary:** at most ~400 tokens, rewritten (not appended) by a cheap model whenever turns are evicted from the window. Batch it, for example when ≥10 turns overflow or every 3 minutes, so it isn't one call per turn.
  3. **Answered-questions log:** the last 10 questions (one line each), used by triage to dedupe.
- **The summarizer never blocks answering.** It runs on its own queue. If it's still running, use the previous summary.
- Glass's summary service does something similar: it re-analyzes every 5 turns from the last N turns and feeds the *previous analysis* back into the prompt, so it builds on it instead of starting fresh.
- **Coding-problem pinning.** When the interviewer states a coding problem, the triage output with `kind:"coding"` gets pinned as `CURRENT PROBLEM` in all later prompts until a new coding question arrives. Follow-ups like "can you optimize it?" then still work after the original problem has dropped out of the verbatim window.
- Persist sessions (SQLite or JSON) only if the user enables "save sessions". The default is in-memory only, for privacy.

**FINAL PROMPT — `SUMMARIZE` (system):**
```text
You maintain a running summary of a technical conversation for an assistant that answers questions in real time. Merge the PREVIOUS SUMMARY with the NEW TURNS into one updated summary of at most 200 words:
- Context: who is talking, the role/company/topic if stated.
- Current problem (verbatim key details: input/output, constraints) if a coding problem is active.
- Questions asked so far and the gist of the user's answers (one line each, newest last).
- Facts the user stated about themself (projects, skills), exactly as said.
Drop small talk. Do not add anything not in the text. Output plain text bullets only.
```

```ts
// src/main/live/context.ts (sketch)
const VERBATIM_TOKENS = 2500, est = (s: string) => Math.ceil(s.length / 4);
export function buildWindow(turns: Turn[]) {
  const out: Turn[] = []; let tok = 0;
  for (let i = turns.length - 1; i >= 0 && out.length < 25; i--) {
    tok += est(turns[i].text); if (tok > VERBATIM_TOKENS) break; out.unshift(turns[i]);
  }
  return out;  // evicted = turns before out[0] → queue for summarizer
}
```

---

## 4. Rendering streaming answers in React

### 4.1 The problem
On every chunk the markdown is incomplete: an unclosed ```` ``` ````, half a `**bold`, or half a table. react-markdown re-parses the whole string each time, so an unterminated fence makes everything after it render as code. A highlighter that re-tokenizes the whole block on every chunk wastes CPU and flickers.

### 4.2 Options

| Option | Partial-markdown handling | Highlighting | Copy button | Verdict |
|---|---|---|---|---|
| **streamdown 2.7** (Vercel) + `@streamdown/code` | Built in: the `remend` preprocessor closes unterminated bold, links, and code fences (`parseIncompleteMarkdown`). "Code block shells render immediately with plain text content, then syntax colors are applied when highlighting resolves." | Shiki 4, languages lazy-loaded, token caching, dual light/dark themes (`shikiTheme={['github-light','github-dark']}`) | Built in. **Disabled while `isAnimating`**. Configure with `controls={{ code: { copy: true, download: false } }}`. Line numbers on by default (`lineNumbers={false}`). | **Use this.** It's a drop-in react-markdown replacement, has `remark-gfm` by default, and includes `rehype-sanitize` + `rehype-harden`. It also has `caret="block"` for a typing cursor. |
| react-markdown 10 + remark-gfm 4 + custom `code` component | Wrap content with `remend(text)` (standalone package, 1.4.0) before passing it in | `rehype-highlight` (highlight.js 11.12, synchronous, cheap, fine for partial code) or Shiki via `codeToHtml` (async, so debounce it) | Write your own (`navigator.clipboard.writeText`) | Good if you don't use Tailwind or want full control |
| `@shikijs/stream` (`ShikiStreamRenderer`, `CodeToTokenTransformStream`) | Only highlights code; it doesn't do markdown | Incremental tokens with `allowRecalls`, so there's no full re-tokenize | — | Overkill unless code blocks are huge |
| highlight.js vs Prism vs Shiki | — | Shiki uses VS Code TextMate grammars, which gives the best Java/Python accuracy, but it is async and heavier (WASM regex or JS engine). highlight.js and Prism are sync and small, with lower fidelity. | — | Shiki through streamdown, which already handles the async part |

Sources:
- https://github.com/vercel/streamdown
- https://streamdown.ai/en/docs/code-blocks
- https://streamdown.ai/docs/configuration
- https://shiki.style/packages/stream

### 4.3 Code sketch

```tsx
// src/renderer/components/Answer.tsx
import { Streamdown } from 'streamdown';
import { code } from '@streamdown/code';
import 'streamdown/styles.css';

export function Answer({ text, streaming }: { text: string; streaming: boolean }) {
  return (
    <Streamdown
      plugins={{ code }}
      isAnimating={streaming}
      parseIncompleteMarkdown
      caret={streaming ? 'block' : undefined}
      shikiTheme={['github-light', 'github-dark']}
      controls={{ code: { copy: true, download: false }, table: false }}
      lineNumbers={false}
    >
      {text}
    </Streamdown>
  );
}
```
Tailwind v4 (`src/renderer/index.css`):
```css
@import "tailwindcss";
@source "../../node_modules/streamdown/dist/*.js";
@source "../../node_modules/@streamdown/code/dist/*.js";
```
Streamdown's components rely on shadcn-style CSS variables (`--background`, `--border`, `--radius`). Define them on `:root` and `.dark` if you don't use shadcn.

**State hook:** accumulate chunks in a `useRef` string and flush to state with `requestAnimationFrame`. This, together with the 30 ms batching in main, keeps it at ≤60 renders/s.

```ts
function useAnswerStream() {
  const [text, setText] = useState(''); const [streaming, setStreaming] = useState(false);
  const buf = useRef(''); const raf = useRef(0); const idRef = useRef<string>();
  useEffect(() => {
    const offC = window.shadow.onChunk(({ id, delta }) => {
      if (id !== idRef.current) return;
      buf.current += delta;
      if (!raf.current) raf.current = requestAnimationFrame(() => { raf.current = 0; setText(buf.current); });
    });
    const offD = window.shadow.onDone(({ id }) => id === idRef.current && setStreaming(false));
    const offE = window.shadow.onError(({ id }) => id === idRef.current && setStreaming(false));
    return () => { offC(); offD(); offE(); };
  }, []);
  const start = async (req: any) => { buf.current = ''; setText(''); setStreaming(true); idRef.current = await window.shadow.solveScreenshots(req); };
  const cancel = () => idRef.current && window.shadow.cancel(idRef.current);
  return { text, streaming, start, cancel };
}
```
Extras that matter in an overlay:
- A "Copy code" action that grabs the **last** ```` ```python/java ```` block with a regex and is bound to a global hotkey. It works even while streaming (streamdown disables its own button during streaming).
- A header showing `provider · model · 3.2 s · 812 tok`.

---

## 5. API keys and settings

### 5.1 Electron `safeStorage` (Windows = DPAPI)
From https://www.electronjs.org/docs/latest/api/safe-storage:
- `isEncryptionAvailable()` returns true on Windows once the app is `ready`.
- Async API: `isAsyncEncryptionAvailable(): Promise<boolean>`, `encryptStringAsync(str): Promise<Buffer>`, `decryptStringAsync(buf): Promise<{ shouldReEncrypt, result }>`. The docs recommend async because "the synchronous API may be deprecated in a future version of Electron."
- Windows threat model: data is protected from **other OS users**, but "**not from other apps running in the same userspace**". That's fine for a student app, and much better than plaintext. Mention it honestly in the project report.
- `electron-store`'s `encryptionKey` is **obfuscation only** (the key is shipped in the app). Don't count it as security.
- electron-store 12 is ESM-only, needs Electron ≥ 35, writes `config.json` in `app.getPath('userData')`, and rewrites the whole file on every change. That's fine for settings. Its `migrations` option has "known bugs" the author won't fix, so version settings yourself.

### 5.2 Code sketch

```ts
// src/main/secrets.ts
import { app, safeStorage } from 'electron';
import Store from 'electron-store';

type Encrypted = Partial<Record<string, string>>; // provider → base64(ciphertext)
const vault = new Store<{ keys: Encrypted }>({ name: 'vault', defaults: { keys: {} } });

export async function setApiKey(provider: string, key: string) {
  await app.whenReady();
  if (!(await safeStorage.isAsyncEncryptionAvailable())) throw new Error('OS encryption unavailable');
  const enc = await safeStorage.encryptStringAsync(key.trim());
  vault.set(`keys.${provider}`, enc.toString('base64'));
}

export async function getApiKey(provider: string): Promise<string | undefined> {
  const b64 = vault.get(`keys.${provider}`); if (!b64) return;
  const { result, shouldReEncrypt } = await safeStorage.decryptStringAsync(Buffer.from(b64, 'base64'));
  if (shouldReEncrypt) await setApiKey(provider, result);
  return result;
}

export function keyStatus() {   // the ONLY thing the renderer ever sees
  const keys = vault.get('keys');
  return Object.fromEntries(Object.keys(keys).map(p => [p, { hasKey: true }]));
}
export function deleteApiKey(provider: string) { vault.delete(`keys.${provider}` as any); }
```

```ts
// src/main/settings.ts
import Store from 'electron-store';
export interface Settings {
  schemaVersion: 1;
  language: 'python' | 'java';
  verbosity: 'concise' | 'detailed';
  answer: ModelChoice;              // e.g. {provider:'gemini', modelId:'…', vision:true}
  extractor?: ModelChoice;          // vision model for 2-stage
  triage?: ModelChoice;             // fast model for live mode
  fallbackOrder: ProviderId[];
  ollamaBaseURL: string;            // default http://127.0.0.1:11434
  live: { answerSpeaker: 'them' | 'anyone'; autoAnswer: boolean; minConfidence: number };
  userNotes: string;                // résumé bullets for behavioral answers
}
export const settings = new Store<Settings>({ name: 'settings', defaults: { /* … */ } as Settings /*, schema: {...} */ });
```

```ts
// src/main/ipc.ts — validate sender, never return secrets
import { ipcMain } from 'electron';
const trusted = (e: Electron.IpcMainInvokeEvent) => new URL(e.senderFrame!.url).protocol in { 'file:': 1, 'app:': 1 } || e.senderFrame!.url.startsWith(process.env.ELECTRON_RENDERER_URL ?? '\0');
ipcMain.handle('keys:set', async (e, provider: string, key: string) => { if (!trusted(e)) throw 0; await setApiKey(provider, key); return keyStatus(); });
ipcMain.handle('keys:status', (e) => trusted(e) ? keyStatus() : {});
ipcMain.handle('keys:test', async (e, provider) => { /* tiny generateText "ping" with maxOutputTokens:1, return ok/err code */ });
ipcMain.handle('settings:get', (e) => trusted(e) ? settings.store : null);
ipcMain.handle('settings:set', (e, patch) => { if (!trusted(e)) throw 0; /* zod-validate patch */ settings.set(patch); return settings.store; });
```

**BrowserWindow hardening**, following the Electron security checklist (https://www.electronjs.org/docs/latest/tutorial/security):
- `webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, preload }`.
- A strict CSP in `index.html`: `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'`. The renderer makes **no** network calls, so `connect-src 'self'` is enough.
- Block `will-navigate` and use `setWindowOpenHandler(() => ({action:'deny'}))`.
- Validate the IPC sender (item 17).
- Don't expose raw `ipcRenderer.on` (item 20). The preload above exposes per-channel wrappers only.
- The key input field in Settings is write-only. After saving, show `•••• (saved)`, plus "Test" and "Delete" buttons. Never send the key back to the renderer.
- Never log request headers. Strip keys from error messages before sending them to the renderer.

---

## 6. Suggested file layout

```
src/main/ai/providers.ts      getModel() factory, capability table
src/main/ai/run.ts            runStream(), cancel map, error mapping
src/main/ai/prompts.ts        SOLVE, EXTRACT, DEBUG, FOLLOWUP, TRIAGE, LIVE_ANSWER, SUMMARIZE, LANGUAGE_RULES, VERBOSITY
src/main/live/{gate,triage,context,summarizer}.ts
src/main/secrets.ts           safeStorage + vault store
src/main/settings.ts          electron-store + zod schema
src/preload/index.ts          contextBridge API (CJS)
src/renderer/components/Answer.tsx  Streamdown
```

Note for the project report: present Shadow as a study and practice tool. The SOLVE and DEBUG prompts deliberately include intuition, edge cases, and dry runs so the user learns from each answer.

## 7. Source URLs
- AI SDK v7 migration: https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0
- streamText reference: https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text
- Error handling: https://ai-sdk.dev/docs/ai-sdk-core/error-handling
- Settings (retries/timeout): https://ai-sdk.dev/docs/ai-sdk-core/settings
- Structured output: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
- Google provider: https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai
- Ollama community providers: https://ai-sdk.dev/providers/community-providers/ollama
- OpenRouter provider: https://ai-sdk.dev/providers/community-providers/openrouter
- Gemini OpenAI compat (beta): https://ai.google.dev/gemini-api/docs/openai
- Anthropic OpenAI compat (not production-ready; temperature/top_p rules): https://platform.claude.com/docs/en/api/openai-sdk
- interview-coder prompts: https://github.com/j4wg/interview-coder-withoupaywall-opensource/blob/main/electron/ProcessingHelper.ts
- free-cluely prompts: https://github.com/Prat011/free-cluely/blob/master/electron/LLMHelper.ts
- Glass prompt templates (fork): https://github.com/Jonxjdong/glass-fork/blob/main/src/features/common/prompts/promptTemplates.js and `src/features/listen/summary/summaryService.js`
- Pluely: https://github.com/iamsrikanthnani/pluely (`src/lib/response-settings.constants.ts`, `src/config/ai-providers.constants.ts`)
- Streamdown: https://github.com/vercel/streamdown · https://streamdown.ai/en/docs/code-blocks · https://streamdown.ai/docs/configuration
- Shiki streaming: https://shiki.style/packages/stream
- Electron safeStorage: https://www.electronjs.org/docs/latest/api/safe-storage
- Electron security checklist: https://www.electronjs.org/docs/latest/tutorial/security
- electron-store: https://github.com/sindresorhus/electron-store
- Electron releases (Node versions): https://releases.electronjs.org/releases.json
