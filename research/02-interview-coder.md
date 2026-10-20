# 02 — Interview Coder: Teardown

> Researched 2026-10-21. Sources: the official site, the open-source community fork's source code (read through raw.githubusercontent.com), press releases, Electron docs, and third-party reviews. **"Verified in code"** marks facts confirmed by reading the source files. Marketing claims are marked as unverified.

---

## 0. TL;DR

- **What it is:** an always-on-top, frameless, transparent Electron overlay. You take screenshots of a coding problem with a hotkey, and a vision LLM returns the code, your "thoughts", and time/space complexity. If the code fails, you take more screenshots of the errors and it returns a debug analysis.
- **Who built it:** Chungin "Roy" Lee and Neel Shanmugam, while at Columbia. The app ID is `com.chunginlee.interviewcoder` and electron-builder publishes to `ibttf/interview-coder`. The founders went on to start **Cluely** (rebrand/pivot in April 2025).
- **Open source vs paid:** `github.com/ibttf/interview-coder` now has 1 commit, holds only a README, and is used to ship releases. The source was public early on, and the community keeps an **AGPL-3.0 fork with the paywall stripped out**: `j4wg/interview-coder-withoupaywall-opensource` (it was `greeneu/...` and now redirects). The fork has about 2.0k stars and 655 forks. This teardown is based on that fork.
- **Stack (verified in code):** Electron 29, React 18, TypeScript, Vite 6 with `vite-plugin-electron`, Tailwind, Radix UI, TanStack React Query, `screenshot-desktop`, `react-syntax-highlighter`, and the OpenAI, Anthropic and Gemini (REST) SDKs.
- **Paid product (2026):** a free download that cannot use the AI, Monthly Pro at **$299/mo** (1,000 credits), and Lifetime at **$799**. Version 2.0 (December 2025) added **audio transcription** of the interviewer and claims more than 20 stealth features. Purchases are non-refundable.

---

## 1. Features and exact user workflow

### Feature list (open-source fork)
| Feature | Details (verified in code unless noted) |
|---|---|
| Overlay window | Frameless, transparent, always-on-top (`screen-saver` level), skips the taskbar, visible on all workspaces and over full-screen apps |
| Screenshot capture | Full screen through `screenshot-desktop`, with a PowerShell `CopyFromScreen` fallback on Windows. The overlay hides itself during the capture |
| Screenshot queue | `MAX_SCREENSHOTS = 5` in code (the README says "up to 2"). When full, the oldest file is evicted (FIFO) and deleted |
| Two queues | `screenshotQueue`, used in the "queue" view, and `extraScreenshotQueue`, used in the "solutions"/"debug" views for debugging |
| Problem extraction | Vision LLM call #1 turns the images into JSON `{problem_statement, constraints, example_input, example_output}` |
| Solution generation | LLM call #2 (text only, built from the extracted JSON) returns code, thoughts, and time/space complexity |
| Debug mode | LLM call #3 sends the original and extra screenshots and returns issues, fixes, optimizations, and the changed code |
| Multi-provider | OpenAI (gpt-4o / gpt-4o-mini), Gemini (1.5 Pro / 2.0 Flash), Anthropic (Claude 3.7 Sonnet / 3.5 Sonnet / 3 Opus). The model can be set separately for each stage |
| Languages | Python, JavaScript, Java, Go, C++, Swift, Kotlin, Ruby, SQL, R, C# |
| Window controls | Move with keyboard arrows (60 px per step), opacity 0.1–1.0, zoom, show/hide toggle |
| Code display | Prism `react-syntax-highlighter` with the Dracula theme, line numbers, and a Copy button |
| Settings | Provider cards, API key (masked preview), three model dropdowns, a shortcut cheat sheet, and "get a key" links |
| Cancel/reset | Ctrl+R aborts requests (only Gemini really aborts; see bugs), clears both queues, and returns to the queue view |

### Paid product extras (vendor claims, not verified)
Audio capture and live transcription of the interviewer (2.0), system-design, behavioral and other interview types, "fine-tuned models", hiding from the Dock, Activity Monitor and system tray with a disguised process name, a click-through overlay that doesn't change focus, and support claims for Zoom, Teams, Meet, Chime, Webex, Lark, HackerRank, CoderPad and Codility.
Sources: https://www.interviewcoder.co/ , https://www.newsfilecorp.com/release/276383

### Exact workflow (state machine)
```
            Ctrl+H (repeat, up to 5)              Ctrl+Enter
[QUEUE view] ──────────────► screenshotQueue ───────────────► processScreenshots()
   ▲                                                            │
   │                                    emit INITIAL_START → renderer setView("solutions")
   │                                    LLM#1 extract (images) → emit PROBLEM_EXTRACTED {problem JSON}
   │                                    LLM#2 solve (text)    → emit SOLUTION_SUCCESS {code, thoughts, time, space}
   │                                                            ▼
   │                                                  [SOLUTIONS view]
   │                     Ctrl+H (now goes to extraScreenshotQueue: error output, failing tests, your edited code)
   │                     Ctrl+Enter → emit DEBUG_START
   │                                    LLM#3 debug (main + extra images) → emit DEBUG_SUCCESS {code, debug_analysis, thoughts}
   │                                                            ▼
   │                                                  [DEBUG view]  ("What I Changed", "Original Code", "Analysis & Improvements")
   └──────────── Ctrl+R (cancel + clear queues + reset-view) ◄──┘
```
1. Launch. The window starts hidden in "stealth" mode; press Ctrl/Cmd+B to show it. On first run a Welcome screen asks for an API key.
2. **Ctrl+H** captures. The main process hides the window (sets opacity to 0 and ignores the mouse), waits 300 ms (500 ms on Windows), captures the full screen as a PNG into `userData/screenshots/<uuid>.png`, shows the window again, and sends `screenshot-taken` with a base64 preview to the renderer.
3. **Ctrl+L** deletes the last screenshot. **Ctrl+Enter** processes. Progress messages arrive on the `processing-status` channel at 20/40/60/100%.
4. The Solutions view shows these sections in order: Problem Statement (with "Extracting problem statement..." while loading), "My Thoughts" as bullets, Solution code with a Copy button, and Complexity.
5. For debugging, take more screenshots (they go to the extra queue) and press Ctrl+Enter again. The Debug view renders the result.
6. **Ctrl+R** starts a new problem.

---

## 2. Global hotkeys and window behavior

### Hotkey table (verified in `electron/shortcuts.ts`; all use `CommandOrControl`)
| Hotkey | Action | Implementation |
|---|---|---|
| Ctrl/Cmd + **H** | Take screenshot | `takeScreenshot()` → `getImagePreview()` → `webContents.send("screenshot-taken", {path, preview})` |
| Ctrl/Cmd + **Enter** | Process screenshots (solve, or debug when in the solutions view) | `processingHelper.processScreenshots()` |
| Ctrl/Cmd + **R** | Reset / new problem | `cancelOngoingRequests()`, `clearQueues()`, `setView("queue")`, sends `reset-view` and `reset` |
| Ctrl/Cmd + **B** | Toggle visibility | `toggleMainWindow()` (opacity 0 plus click-through, not a real hide) |
| Ctrl/Cmd + **← → ↑ ↓** | Move window | ±60 px; can go up to half the width off screen horizontally and two-thirds of the height off screen vertically |
| Ctrl/Cmd + **[** | Decrease opacity | `adjustOpacity(-0.1)`, clamped to 0.1–1.0 and saved to config |
| Ctrl/Cmd + **]** | Increase opacity | `adjustOpacity(+0.1)` |
| Ctrl/Cmd + **-** | Zoom out | `webContents.setZoomLevel(z - 0.5)` |
| Ctrl/Cmd + **0** | Reset zoom | `setZoomLevel(0)` |
| Ctrl/Cmd + **=** | Zoom in | `setZoomLevel(z + 0.5)` |
| Ctrl/Cmd + **L** | Delete last screenshot | sends `delete-last-screenshot` to the renderer |
| Ctrl/Cmd + **Q** | Quit | `app.quit()` |

Notes: `globalShortcut.unregisterAll()` runs on `will-quit`. The return values of `register()` are never checked, so a silent conflict goes unnoticed. These shortcuts **override OS and app defaults while the app runs**: Cmd+H is macOS "Hide", Cmd+Q quits other apps, Ctrl+R is browser refresh, and Ctrl+L is the browser address bar. That is a real usability problem.
(Another fork, `phulelouch/open-interview-coder`, uses Ctrl/Cmd+Shift+A, S, P and Shift+arrows instead, which avoids those conflicts.)

### BrowserWindow configuration (verified in `electron/main.ts`)
```ts
new BrowserWindow({
  width: 800, height: 600, minWidth: 750, minHeight: 550, x: currentX, y: 50,
  alwaysOnTop: true, frame: false, transparent: true, hasShadow: false,
  backgroundColor: "#00000000", titleBarStyle: "hidden",
  skipTaskbar: true, fullscreenable: false, focusable: true, movable: true,
  enableLargerThanScreen: true, type: "panel", paintWhenInitiallyHidden: true,
  webPreferences: { nodeIntegration: false, contextIsolation: true, preload, scrollBounce: true }
})
win.setContentProtection(true)
win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
win.setAlwaysOnTop(true, "screen-saver", 1)
// macOS: setHiddenInMissionControl(true), setWindowButtonVisibility(false), setSkipTaskbar(true), setHasShadow(false)
win.webContents.setBackgroundThrottling(false); win.webContents.setFrameRate(60)
```
- **Hide/show:** `hideMainWindow()` saves the bounds, calls `setIgnoreMouseEvents(true, {forward:true})` (click-through), and sets `setOpacity(0)`. `showMainWindow()` restores the bounds, calls `setIgnoreMouseEvents(false)`, re-applies always-on-top and content protection, then runs `setOpacity(0)` → `showInactive()` (no focus steal) → `setOpacity(1)`. The window is never `hide()`-n; it just becomes invisible and click-through.
- **Auto-sizing:** the renderer uses `ResizeObserver` and `MutationObserver` on the content and sends `update-content-dimensions`. `setWindowDimensions` caps the width at 50% of the work area.
- **Click-through only applies while hidden.** When visible, the overlay captures the mouse. Scrolling the solution is done with the keyboard (the UI hints "use arrow keys to scroll").

---

## 3. Architecture

### Repo structure (`j4wg/interview-coder-withoupaywall-opensource`, main branch)
```
.github/workflows/ci.yml, codeql.yml
assets/icons/{mac/icon.icns, win/icon.ico}
build/entitlements.mac.plist
electron/                      # MAIN PROCESS (compiled to dist-electron/)
  main.ts                      # window creation, state object, show/hide/move, app lifecycle, protocol, single-instance
  preload.ts                   # contextBridge → window.electronAPI (invoke + event subscriptions)
  ipcHandlers.ts               # ipcMain.handle(...) for all channels
  shortcuts.ts                 # ShortcutsHelper: globalShortcut registrations
  ScreenshotHelper.ts          # capture, queues, previews, deletion
  ProcessingHelper.ts          # LLM calls (OpenAI / Gemini / Anthropic), prompts, parsing, abort
  ConfigHelper.ts              # config.json in userData, key validation, model allowlists (EventEmitter)
  autoUpdater.ts               # electron-updater
  store.ts                     # electron-store
src/                           # RENDERER (React + Vite)
  main.tsx, App.tsx, index.css
  _pages/ Queue.tsx, Solutions.tsx, Debug.tsx, SubscribedApp.tsx, SubscribePage.tsx (paywall leftover)
  components/
    Header/Header.tsx
    Queue/ QueueCommands.tsx, ScreenshotItem.tsx, ScreenshotQueue.tsx
    Solutions/SolutionCommands.tsx
    Settings/SettingsDialog.tsx
    shared/LanguageSelector.tsx
    ui/ button, card, dialog, input, toast (shadcn-style)
    UpdateNotification.tsx, WelcomeScreen.tsx
  contexts/toast.tsx
  lib/ supabase.ts (leftover), utils.ts
  types/ electron.d.ts, global.d.ts, index.tsx, screenshots.ts
  utils/platform.ts
renderer/                      # unused CRA boilerplate leftover
index.html, vite.config.ts, tailwind.config.js, postcss.config.js
tsconfig.json, tsconfig.electron.json, tsconfig.node.json, eslint.config.mjs
stealth-run.bat / stealth-run.sh / invisible_launcher.vbs   # build + launch scripts
cleanup-for-github.{bat,sh}, config.js, env.d.ts
package.json (name interview-coder-v1, v1.0.19), bun.lockb, package-lock.json
CHANGES.md, CONTRIBUTING.md, LICENSE (AGPL-3.0), LICENSE-SHORT, README.md
```
Source: https://api.github.com/repos/j4wg/interview-coder-withoupaywall-opensource/git/trees/main?recursive=1

### Tech stack (from `package.json`)
- **Runtime/build:** electron ^29.1.4, vite ^6.2.5, vite-plugin-electron, electron-builder ^24 (macOS dmg/zip for x64 and arm64 with notarization, Windows NSIS, Linux AppImage), and a custom protocol `interview-coder://`. The `dev` script runs `tsc -w`, Vite on port 54321, and Electron together through `concurrently`.
- **UI:** React 18, Tailwind 3, Radix (dialog, toast, label, slot), lucide-react, class-variance-authority/clsx/tailwind-merge, react-syntax-highlighter, react-code-blocks, react-router-dom.
- **State:** `@tanstack/react-query` v5, used as a **client-side cache** rather than for fetching. The keys are `screenshots`, `problem_statement`, `solution` and `new_solution`. The view is local `useState<"queue"|"solutions"|"debug">`, mirrored by `state.view` in main.
- **Main-process deps:** `screenshot-desktop`, `openai` ^4, `@anthropic-ai/sdk` ^0.39, `axios` (Gemini REST), `electron-store`, `electron-updater`, `electron-log`, `dotenv`, `uuid`, `diff` (installed but unused), and `@supabase/supabase-js` (left over from the paywall).

### IPC design
- **Main is the source of truth** for the view, the queues and `problemInfo`. The renderer is a thin view that reacts to pushed events.
- **Renderer → main** uses `ipcRenderer.invoke` on these channels: `get-screenshots`, `delete-screenshot`, `delete-last-screenshot`, `trigger-screenshot`, `trigger-process-screenshots`, `trigger-reset`, `toggle-window`, `trigger-move-{left,right,up,down}`, `update-content-dimensions`, `get-config`, `update-config`, `check-api-key`, `validate-api-key`, `open-settings-portal`, `openExternal`, `start-update`, `install-update`, `decrement-credits`, `clear-store`. The hotkeys and the clickable buttons call the same actions.
- **Main → renderer** uses `webContents.send` with these events: `screenshot-taken`, `reset-view`, `reset`, `initial-start`, `problem-extracted`, `solution-success`, `solution-error`, `debug-start`, `debug-success`, `debug-error`, `processing-no-screenshots`, `api-key-invalid`, `processing-status`, `show-settings-dialog`, `update-available`, `update-downloaded`, `credits-updated`, plus paywall leftovers (`out-of-credits`, `procesing-unauthorized` [sic], `subscription-updated`).
- **Preload:** `contextBridge.exposeInMainWorld("electronAPI", {...})`. Each `on*` method returns an unsubscribe function. `contextIsolation: true` and `nodeIntegration: false`.
- **Dependency injection:** `ProcessingHelper`, `ScreenshotHelper` and `ShortcutsHelper` receive a `deps` object of getters, setters and callbacks from `main.ts`, so they stay decoupled from the global state.

### Screenshot capture
- `screenshot-desktop` (`screenshot({format:"png"})`) on macOS and Linux. Windows tries `screenshot({filename})` first, then a PowerShell script that loops over every `Screen` and calls `Graphics.CopyFromScreen`.
- **Full screen only.** There is no region selection and no window targeting. On multi-monitor setups the behavior depends on the library (an open issue, #99, asks for dual-monitor support).
- The overlay hides itself before capture, so it never appears in its own screenshots.
- Files live in `userData/screenshots` and `userData/extra_screenshots`, and both folders are wiped at startup.

### How images reach the LLM
`fs.readFileSync(path).toString("base64")` is sent inline in each provider's format:
- OpenAI: `{type:"image_url", image_url:{url:"data:image/png;base64,..."}}` inside the chat-completions `messages`.
- Anthropic: `{type:"image", source:{type:"base64", media_type:"image/png", data}}`.
- Gemini: `{inlineData:{mimeType:"image/png", data}}` POSTed to `generateContent`.
- Every call uses `temperature: 0.2` and `max_tokens: 4000`. The OpenAI and Anthropic clients have a 60 s timeout with 2 retries. **There is no streaming**: the user waits for the full response.

### Models (code defaults and allowlists)
| Provider | Default | Allowed (sanitized by ConfigHelper) |
|---|---|---|
| Gemini (**default provider**) | gemini-2.0-flash | gemini-1.5-pro, gemini-2.0-flash |
| OpenAI | gpt-4o | gpt-4o, gpt-4o-mini |
| Anthropic | claude-3-7-sonnet-20250219 | claude-3-7-sonnet-20250219, claude-3-5-sonnet-20241022, claude-3-opus-20240229 |

The allowlist is hard-coded, so newer models are rejected and replaced with the default (open issues #142 and #130).

### Prompts (summarized from `ProcessingHelper.ts`)
1. **Extraction** (vision). System: *"You are a coding challenge interpreter..."*. It asks the model to analyze the screenshots and return **only JSON** with `problem_statement, constraints, example_input, example_output`. The user message says "Extract the coding problem details from these screenshots" and gives the preferred language.
2. **Solution** (text only, built from the extracted JSON and the language). System: *"You are an expert coding interview assistant. Provide clear, optimal solutions with detailed explanations."* The user prompt asks for: (1) **Code**, a clean optimized implementation; (2) **Your Thoughts**, the key insights and reasoning; (3) **Time complexity** O(X) with at least 2 sentences; (4) **Space complexity** O(X) with at least 2 sentences. Solutions should be "efficient, well-commented, and handle edge cases."
3. **Debug** (vision, original plus extra screenshots). The system prompt asks for markdown with fixed headers: `### Issues Identified`, `### Specific Improvements and Corrections`, `### Optimizations`, `### Explanation of Changes Needed`, `### Key Points`, and fenced code blocks with language tags.
Gemini and Anthropic fold the system text into a single user prompt.

### Response parsing
- **Extraction:** strips the ```` ```json ```` fences, then `JSON.parse`. On failure it shows the error "Failed to parse problem information".
- **Solution:** regex-based.
  - Code is the **first** fenced block (`/```(?:\w+)?\s*([\s\S]*?)```/`); if there is none, the whole response is used.
  - Thoughts are the text after "Thoughts:", "Key Insights:", "Reasoning:" or "Approach:", split into bullets.
  - Complexity is matched on "Time complexity:" and "Space complexity:", with `O(n) - ` prepended when no O() is found.
  - The output is `{code, thoughts[], time_complexity, space_complexity}`.
- **Debug:** code is the first fenced block. Up to 5 bullets become `thoughts`. `debug_analysis` is the full markdown, rendered by **hand-rolled string parsing** (no markdown library). Complexity is set to "N/A - Debug mode".
- This parsing is fragile. Structured outputs, JSON mode or tool calling would be more robust.

### Settings and API key handling
- The config is `config.json` in `userData`: `%APPDATA%\interview-coder-v1\config.json` on Windows, `~/Library/Application Support/interview-coder-v1/config.json` on macOS. The fields are `{apiKey, apiProvider, extractionModel, solutionModel, debuggingModel, language, opacity}`.
- **The key is stored in plaintext** (no `safeStorage` or keychain).
- **Format checks:** OpenAI keys must match `^sk-[a-zA-Z0-9]{32,}$`; Anthropic keys must match `^sk-ant-[a-zA-Z0-9]{32,}$`; Gemini keys only need 10 or more characters.
- **Live test:** only OpenAI's key is tested live (`models.list()`). Gemini and Anthropic keys only get the format/length check.
- `ConfigHelper` extends `EventEmitter`. A `config-updated` event re-initializes the AI clients.
- Saving settings reloads the window after 1.5 s.
- A `.env` file is bundled through `extraResources`, which is risky if it holds secrets.

---

## 4. Hiding from screen sharing and the taskbar/dock (documented APIs only)

| Goal | API used | Platform behavior (Electron docs) |
|---|---|---|
| Exclude from screen capture | `win.setContentProtection(true)` | **Windows:** `SetWindowDisplayAffinity` with `WDA_EXCLUDEFROMCAPTURE` (Windows 10 2004+). The window is left out of captures, and the change takes effect at the next composition. **macOS:** `NSWindow.sharingType = NSWindowSharingNone`. Electron's docs warn that *"newer Mac applications that use ScreenCaptureKit will capture your window despite setContentProtection(true)"* |
| No taskbar entry | `skipTaskbar: true` / `setSkipTaskbar(true)` | Windows and macOS |
| Hidden in Mission Control | `setHiddenInMissionControl(true)` | macOS |
| Float over everything | `setAlwaysOnTop(true, "screen-saver", 1)`, `setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true})`, `type:"panel"` | The `screen-saver` level sits above most windows; `visibleOnFullScreen` keeps it above full-screen apps on macOS |
| Don't steal focus | `showInactive()` | So the browser or meeting app doesn't fire blur or focus-change events |
| Click-through | `setIgnoreMouseEvents(true, {forward:true})` | Used while hidden |
| No window chrome or shadow | `frame:false, transparent:true, hasShadow:false` | |

- **Not in the OSS code:** `app.dock.hide()`, process-name disguising, and hiding from Activity Monitor or Task Manager. These are claimed only by the paid 2.0 product.
- **What the OSS README itself admits:** the window shows up in Zoom 6.1.6 and later and in macOS Cmd+Shift+5 recording. It stays hidden from browser-based recording, Discord, and macOS Cmd+Shift+3/4.
- **Open issues:** #88 "VISIBLE IN SCREEN SHARING" and #90 "IC is not invisible (proof attached)".
- An old Electron issue (#19880) is still open about macOS `desktopCapturer` ignoring protection.

Sources: https://www.electronjs.org/docs/latest/api/browser-window , https://github.com/electron/electron/issues/19880

---

## 5. Pricing and the open-source vs paid story
- **Official (interviewcoder.co, 2026):**
  - **Free download** at $0, but the AI features need a subscription. Reviewers describe it as a "compatibility preview".
  - **Monthly Pro** at **$299/mo** (struck-through from $499), with 1,000 credits per month.
  - **Lifetime Pro** at **$799** (struck-through from $1,598).
  - Refund terms: **"all purchases are non-refundable"** (per PracHub's reading of the refund page).
  - Affiliate program pays 30%.
  - The site claims more than 150k users and more than 10k offers; both are unverified.
- **History:**
  - Built by Roy Lee and Neel Shanmugam at Columbia. Lee said he used it in an Amazon interview, after which Amazon rescinded his offer.
  - Columbia put him on probation, then suspended him for one year, over sharing disciplinary materials.
  - In April 2025 the founders rebranded and pivoted to **Cluely**, which raised a $5.3M seed and a $15M Series A from a16z.
  - Interview Coder continues as a separate paid product (v2.0 in December 2025, adding audio). The contact listed is abdulla@interviewcoder.com.
  - Source: https://en.wikipedia.org/wiki/Roy_Lee_(entrepreneur)
- **Open source:**
  - The original `ibttf/interview-coder` repo was public with the source. It used Supabase for auth and credits and Stripe-style subscriptions.
  - It is now a release-only repo: 1 commit, README only, about 4.4k stars and 700 forks.
  - The community fork `j4wg/interview-coder-withoupaywall-opensource` (AGPL-3.0) **removed Supabase, login and the subscription**, and added local `ConfigHelper`, BYO-key, multi-provider support, a model picker, and a working language persistence (see `CHANGES.md`).
  - It is "a small, non-profit, community-driven project".
  - Because of the AGPL, **any derivative must also be AGPL**, including network use. Keep that in mind before copying code into a student project: re-implement it, or license your project AGPL too.

---

## 6. Known bugs, limitations and complaints
**From reading the code:**
1. **Cancel doesn't cancel OpenAI or Anthropic calls.** Only Gemini's axios request gets the `AbortController` signal.
2. **Error routing:**
   - `API_KEY_INVALID` only fires if the error text contains "API Key", "OpenAI" or "Gemini". Anthropic key errors fall through to a generic error.
   - The 401/429 checks read `error.response.status`, but the OpenAI SDK exposes `error.status`.
3. `updateConfig` checks `startsWith('sk-')` before `'sk-ant-'`, so **Anthropic keys get auto-detected as OpenAI**.
4. `showMainWindow()` hard-codes opacity to 1, which **loses the user's saved opacity** after each toggle or screenshot.
5. `MAX_SCREENSHOTS` is 5 in code but the README says 2. On Windows, the "fallback" capture path throws instead of returning a placeholder.
6. Listener leaks and duplicates:
   - `onDebugSuccess` cleanup passes a new arrow function, so the original listener is never removed.
   - The reset handler is registered three times in `SubscribedApp`.
   - Effects re-subscribe on every tooltip or view change.
7. A 500 ms fallback timer forces the window to 800×600, which can override the measured size.
8. `setWindowOpenHandler` returns `allow` for any non-allowlisted URL, and `set-initial-credits` interpolates into `executeJavaScript`. Both are minor security smells.
9. The leftovers are dead code: the Supabase lib, `SubscribePage`, credits fixed at 999, the unused CRA `renderer/` folder, and the unused `diff` dependency.
10. There are no tests, and the open "good first issue" tickets cover lint, type-check and CI debt.
11. Other limitations:
    - Hard-coded model allowlists, so newer models can't be used without editing the code.
    - No streaming.
    - Full-screen capture only, with no region crop.
    - The API key is stored in plaintext.
    - Fragile regex parsing.
    - No markdown renderer.

**From GitHub issues (j4wg fork):**
- Visible in screen sharing (#88, #90).
- Toggle broken on Ubuntu 24.04 (#84).
- Fails to launch on macOS or Sonoma (#97, #114).
- `write EIO` crash (#92).
- "Failed to create directory" (#107).
- Quota errors (#91).
- Requests for new Gemini, Groq and Copilot models (#142, #95, #110).
- Dual-monitor support (#99), voice commands (#103), a configurable prompt language (#137), and brute-force → optimized multi-approach output (#73, with 11 comments).

**From reviews and press (paid product):**
- $299/mo pricing.
- No refunds, and the AI can't be tried before paying.
- Reported reliability problems and suspected detection.
- Interviewers' follow-up questions expose the candidate.
- Platforms such as HackerRank (Desktop App Mode, tab and paste tracking, plagiarism checks), CoderPad (playback, focus-loss tracking, AI follow-ups) and CodeSignal (Suspicion Score) catch the *behavior*, not the window.
- Source: https://prachub.com/resources/interview-coder-review-2026-pricing-detection-risks-and-ethical-alternatives

**General platform limitation:** on macOS, ScreenCaptureKit-based recorders capture "protected" windows anyway.

---

## 7. Ideas for a student version that stands out
Pitch it as an **open study and productivity copilot overlay** (practice mode, lecture and documentation helper, accessibility). Don't pitch it as an interview-cheating tool: that framing gets students and colleges in trouble and is what got Interview Coder's founder disciplined. Treat content protection as a *privacy* feature, for example keeping your notes off a shared screen.

**Engineering upgrades over Interview Coder:**
1. **Region or window capture.** Use a drag-to-select snip, or `desktopCapturer` per window, plus per-monitor selection. This also fixes the dual-monitor request.
2. **Streaming responses**, so tokens render live, with a **real AbortController on every provider**.
3. **Structured output** through JSON schema, tool calling, or Zod-validated parsing instead of regex. Render with `react-markdown` and Shiki.
4. **Provider-agnostic layer**: OpenRouter, Ollama or LM Studio for **local, offline, free** models, and a model list fetched dynamically instead of hard-coded.
5. **Secure key storage** with Electron `safeStorage` or the OS keychain.
6. **Configurable hotkeys** with conflict detection, checking the `globalShortcut.register` return value. Avoid hijacking Cmd+H, Cmd+Q, Ctrl+R and Ctrl+L.
7. **Lighter runtime**: consider **Tauri** (Pluely is about 10 MB versus about 150 MB for Electron).
8. **Tests and CI** with Vitest and Playwright for Electron, which the reference project lacks.

**Feature ideas:**
- **Socratic / "hint ladder" mode:** hint, then approach, then pseudocode, then full code. Make it a learning tool that pushes back.
- **Multi-approach output:** brute force, then optimized, then optimal, with complexities side by side. Issue #73 is the most-discussed request.
- **Run and verify loop:** execute the generated code against the extracted examples in a sandbox (Piston or Judge0) and show pass/fail before displaying it.
- **Code diff in debug mode** using the `diff` library the reference project installed but never used.
- **Voice in, voice out:** Whisper or Deepgram mic transcription for "explain this" questions, with push-to-talk.
- **Session history and spaced repetition:** save solved problems locally (SQLite), tag them by pattern (two pointers, DP, and so on), and generate review flashcards.
- **Context beyond coding:** summarize a lecture slide, explain a stack trace from a screenshot, OCR math problems to LaTeX, translate on screen.
- **Mock-interviewer mode:** the AI *asks* follow-up questions about your solution, the opposite of a cheating tool.
- **Accessibility:** high-contrast and dyslexia-friendly fonts, a screen-reader-friendly mode, adjustable font zoom.
- **Plugin or prompt-pack system:** user-editable prompt templates per mode, kept as files in the repo.
- **Privacy dashboard:** show exactly what was sent to which API, add local PII redaction before upload, and track cost per request.
- **Cross-platform polish:** Linux Wayland support (which Interview Coder breaks on), and per-OS documentation of what content protection can and can't do.

---

## Sources
- Original repo (release-only): https://github.com/ibttf/interview-coder
- OSS fork: https://github.com/j4wg/interview-coder-withoupaywall-opensource (formerly greeneu/...)
  - Source files read:
    - `electron/main.ts`, `shortcuts.ts`, `ScreenshotHelper.ts`, `ProcessingHelper.ts`, `preload.ts`, `ipcHandlers.ts`, `ConfigHelper.ts`
    - `src/_pages/Solutions.tsx`, `Debug.tsx`, `SubscribedApp.tsx`
    - `src/components/Settings/SettingsDialog.tsx`, `shared/LanguageSelector.tsx`
    - `package.json`, `README.md`, `CHANGES.md`
  - Raw base URL: `https://raw.githubusercontent.com/j4wg/interview-coder-withoupaywall-opensource/main/...`
- Fork issues: https://github.com/j4wg/interview-coder-withoupaywall-opensource/issues
- Alternative fork: https://github.com/phulelouch/open-interview-coder
- Official site: https://www.interviewcoder.co/ ; help: https://www.interviewcoder.co/help
- Interview Coder 2.0 press: https://www.newsfilecorp.com/release/276383
- Review (competitor-written, biased): https://prachub.com/resources/interview-coder-review-2026-pricing-detection-risks-and-ethical-alternatives
- Founder history: https://en.wikipedia.org/wiki/Roy_Lee_(entrepreneur)
- Electron BrowserWindow docs: https://www.electronjs.org/docs/latest/api/browser-window
- Electron content-protection issue: https://github.com/electron/electron/issues/19880
- Open-source alternatives: Pluely (Tauri) https://hn.svelte.dev/item/44949395 ; OpenCluely https://github.com/topics/open-source-cluely
