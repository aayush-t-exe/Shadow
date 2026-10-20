# Cluely Teardown (as of October 2026)

> Research for an open-source AI desktop assistant overlay (college project).
> Compiled 2026-10-21 from web research only. No Cluely code was downloaded or run.
> **How sure each claim is:** **[Official]** = Cluely's own site or docs. **[RE]** = a reverse-engineering or security write-up. **[3P]** = a third-party review (often written by a competitor, so treat it with caution). **[Inferred]** = my own reasoning from platform APIs and how clones are built.

---

## 0. TL;DR

- **What it is:** Cluely is an **Electron + React desktop app** for macOS and Windows, plus an iOS app.
  - It shows a small, movable, always-on-top, translucent **"widget" / command bar**.
  - It listens to the **microphone and system audio**, and can **take a screenshot** of the screen.
  - It sends the transcript and screenshot to cloud LLMs and returns streamed Markdown answers.
- **Main hotkey:** **Cmd/Ctrl+Enter** ("Assist") answers whatever is on screen or was just said.
- **Other hotkeys:** Cmd/Ctrl+\ shows or hides the bar. Cmd/Ctrl+←/→ moves it. Cmd/Ctrl+R clears context. **[Official]** ([docs settings](https://docs.cluely.com/feature/settings))
- **Speech-to-text:** Deepgram (`@deepgram/sdk`) streamed over WebSocket. **[RE]** ([Hacktron](https://www.hacktron.ai/blog/hacking-cluely))
- **LLMs:** GPT-4.1, then GPT-5 (Oct 2025), plus Claude models for international users (Sep 2025). **[RE + Official changelog]**
- **Hiding from screen share:**
  - Uses the OS "content protection" flag: `NSWindowSharingNone` on macOS and `WDA_EXCLUDEFROMCAPTURE` on Windows. In Electron this is `win.setContentProtection(true)`.
  - Cluely's own docs say it uses "the same technology that Zoom does" and admit it **fails on Windows 10, Windows 11 Home, and pre-2020 Macs** for full-screen shares. **[Official + Inferred]**
- **Pivot:** The product moved from "Cheat on Everything" (April 2025) to an **"AI meeting assistant / notetaker"** (Nov 2025 onward). Sales and enterprise features were added: CRM/ATS via Merge.dev, RAG knowledge base, coaching, and pre-call briefs.
- **Pricing:**
  - Free: about 5 AI responses a day.
  - Pro: $19.99/mo, or about $11.99/mo billed yearly.
  - **Pro + Undetectability: $149.99/mo**. The changelog also mentions $75/mo or $500/yr variants.
  - Mobile: about $8/week, billed separately.
- **Biggest complaints:**
  - Billing and refunds: Trustpilot score is 1.6/5.
  - Latency is 5–10 s in practice, against the advertised "300 ms".
  - Generic answers, an AI-only support bot, and security incidents.
  - The CEO admitted in March 2026 that he **lied about ARR** ($7M claimed vs $5.2M actual).

---

## 1. Company and timeline (context)

| Date | Event | Source |
|---|---|---|
| Early 2025 | Roy Lee and Neel Shanmugam (Columbia) build **Interview Coder**, a LeetCode interview-cheating tool. Both are **suspended** from Columbia. | [Wikipedia](https://en.wikipedia.org/wiki/Cluely) |
| 2025-04-20 | Cluely launches with the tagline **"Cheat on Everything"**. A viral video shows the CEO using it on a date. About 70k signups in week 1. | [Wikipedia](https://en.wikipedia.org/wiki/Cluely) |
| 2025-04-21 | $5.3M seed round (Abstract Ventures, Susa Ventures). | [Wikipedia](https://en.wikipedia.org/wiki/Cluely) |
| Late Apr 2025 | Explicit exam and interview cheating language is removed from the site. | [Wikipedia](https://en.wikipedia.org/wiki/Cluely) |
| 2025-06-20 | $15M Series A led by **a16z**. Total raised: $20.3M. | [TechCrunch](https://techcrunch.com/2026/03/05/cluely-ceo-roy-lee-admits-to-publicly-lying-about-revenue-numbers-last-year/) |
| Jun 2025 | Jack Cable reverse-engineers the app and finds system prompts and model names in the shipped code. | [X/@jackhcable](https://x.com/jackhcable/status/1936500980297932827), [AI EngineerGuide](https://aiengineerguide.com/til/cluely-system-prompt-leak/) |
| Jul 2025 | Hacktron publishes an Electron navigation + IPC vulnerability ("Turning Cluely into malware"). It was silently patched. | [Hacktron](https://www.hacktron.ai/blog/hacking-cluely) |
| Jul 2025 | Pickle releases **Glass**, an open-source clone. A plagiarism dispute follows with the author of **cheating-daddy**. | [HN](https://news.ycombinator.com/item?id=44460552) |
| 2025-08-30 | **Cluely v1.0.0**: Google Calendar, custom keybinds, multilingual support, pre-call briefs, follow-ups, auto summaries. | [Changelog](https://docs.cluely.com/changelog) |
| Oct 2025 | "Live Insights" is retired in favour of Cmd/Ctrl+Enter "Assist". The free tier is set to 5 msgs/day. GPT-5 is rolled out. | [Changelog](https://docs.cluely.com/changelog) |
| Nov 2025 | Rebrands as a meeting assistant / notetaker competing with Otter and Granola. HQ moves from San Francisco to NYC. | [Wikipedia](https://en.wikipedia.org/wiki/Cluely), [SF Standard](https://sfstandard.com/2025/11/20/san-francisco-s-controversial-startup-moving-new-york/) |
| 2025-12-10 | A new simplified **Desktop Widget** and **Cluely Mobile** (iOS) launch. | [Changelog](https://docs.cluely.com/changelog) |
| 2026-03-05 | The CEO admits the "$7M ARR" figure was false. Stripe screenshots show about $5.2M (≈$2.7M consumer + $2.5M enterprise). | [TechCrunch](https://techcrunch.com/2026/03/05/cluely-ceo-roy-lee-admits-to-publicly-lying-about-revenue-numbers-last-year/) |
| Sep 2026 | Tracxn lists a headcount of about 70. Commentary pieces describe the company as in decline. | [Tracxn](https://tracxn.com/d/companies/cluely/__Ju-PhvKyO8Kv2MD9Esgxhmh_EB15mxqSDhhJ2zxBqN0), [Medium](https://medium.com/utopian/what-happened-to-cluely-1bb671333b28) |

**Note:** The public changelog's newest entry is **2025-12-18**. There are no public 2026 changelog entries ([changelog](https://docs.cluely.com/changelog)).

---

## 2. Complete feature list

### 2.1 Desktop overlay ("widget" / "command bar")

These details come from the official docs ([Live Insights](https://docs.cluely.com/feature/liveinsights), [Settings](https://docs.cluely.com/feature/settings)).

- **Nav bar controls:**
  - **Drag handle** (six dots) to reposition the bar, including across windows.
  - **Cluely logo**, which opens or closes the dashboard.
  - **Audio toggle** to pause or resume listening.
  - **Blue "End Session" button** with an elapsed-time counter.
  - **X**, which hides the card while the session keeps running.
  - **Eye icon**, which toggles invisibility (undetectability).
- **Session-scoped visibility:** Since Sep 15 2025 the widget appears **only during a Session**, not permanently.
  - A session starts from a calendar meeting alert, the "Join" button on an upcoming meeting card, or "Start Cluely" on the dashboard.
  - It **auto-ends** when a calendar meeting ends or when a mic change is detected.
- **Mode dropdown:** Picks the active custom prompt / persona, for example "Sales".
- **Transcript toggle:** Switches between the live transcript and the insights view. In Dec 2025 the transcript moved to the dashboard to declutter the widget.
- **Default one-click actions:** "What should I say?", "Follow-up questions", "Fact check", "Who is this?" (identify the other party), and "Recap". The homepage also lists "What should I say? / Follow-up questions / Recap". ([cluely.com](https://cluely.com))
- **Ask AI bar:**
  - Type a question and press Cmd/Ctrl+Enter.
  - A **"Smart" mode toggle** (lightning icon) is aimed at coding help and uses a stronger or reasoning model. The Oct 2025 changelog mentions "visible reasoning tokens".
- **Stealth answer:** **Cmd/Ctrl+Shift+Enter** returns an answer from screen context with no typing, for example for a coding problem or spreadsheet on screen.
- **Dynamic Insights** (retired Oct 2025 as "Live Insights", but the concept persists):
  - Questions, keywords, and terms detected in the transcript appear as clickable chips under the card.
  - **Tab** answers the first chip.
- **Screenshot toggle and screenshot preview:** Added in Oct 2025.
- **Display selection:** You can choose which monitor the widget appears on.
- **Multi-device limit:** Max 2 simultaneous logins (Dec 2025).

### 2.2 Hotkeys (official defaults; all rebindable or disableable in Settings)

| Shortcut | Action |
|---|---|
| **Cmd/Ctrl + Enter** | Assist: ask the AI about the current screen, audio, or chat. With nothing typed, it infers the question from context. |
| **Cmd/Ctrl + Shift + Enter** | Stealth answer, using screen context |
| **Cmd/Ctrl + \\** | Show or hide the command bar |
| **Cmd/Ctrl + ← / →** | Move the widget left or right |
| **Cmd/Ctrl + R** | Clear session context (conversation) |
| **Tab** | Answer the first Dynamic Insight chip |
| Keybind scrolling | Scroll the answer without the mouse (Sep 2025) |

Sources: [Settings](https://docs.cluely.com/feature/settings), [Live Insights](https://docs.cluely.com/feature/liveinsights), [Changelog](https://docs.cluely.com/changelog).

Notes:
- On 2025-10-21 Cluely said Cmd/Ctrl+Enter is "undetectable".
- However, **CoderPad reportedly flags that key combo** in coding interviews ([3P summary](https://dupple.com/reviews/cluely)).
- EU keyboard-layout keybind bugs were fixed in Sep 2025.

### 2.3 Screen understanding

- Screen capture happens on demand (on Assist) through a `capture-screenshot` IPC handler that calls `captureScreen()`. **[RE]** ([Hacktron](https://www.hacktron.ai/blog/hacking-cluely))
- The image is sent to a multimodal LLM. **No local OCR is confirmed.**
- The leaked system prompt tells the model to call it "the screen", never "screenshot" or "image".
- The prompt has special formats per screen type:
  - **Code:** code first, with comments on the line after each code line, then complexity and a dry run.
  - **Math:** LaTeX, a "DOUBLE-CHECK" section, and a bold **FINAL ANSWER**.
  - **Multiple choice:** the answer first, then why each wrong option is wrong.
  - **Email:** a draft in a code block, with no clarifying questions.
  - **UI navigation:** exact click-by-click steps.
  - **Unclear screen (below 90% confidence):** a fixed "I'm not sure what information you're looking for" opener plus one labelled guess.
- Prompt sources: [x1xhlol prompt collection mirror](https://mintlify.wiki/x1xhlol/system-prompts-and-models-of-ai-tools/commercial/cluely), [gist](https://gist.github.com/Pogan99).

### 2.4 Audio: microphone and system audio transcription

- **Two streams:** microphone ("you", shown in **blue** in the transcript) and system audio ("them"). **[Official]** ([Audio debugging](https://docs.cluely.com/debugging/audio))
- **Transcription service:** Real-time transcription goes over **WebSocket** to `service.transcribe.cluely.com`. That is Cluely's proxy in front of Deepgram. **[Official domain list + RE]**
- **Native recorders on macOS:** System audio and mic monitoring use **native modules**, toggled over IPC: `mac-set-native-recorder-enabled` and `mac-set-mic-monitor-enabled`. The PCM format is **24 kHz, 16-bit, mono**. **[RE]** ([Hacktron](https://www.hacktron.ai/blog/hacking-cluely))
- **Nov 2025 "new audio system":** Built for Windows and Apple-Silicon Macs. It requires **Accessibility** permission on macOS. Other permissions are Microphone and "Screen & System Audio Recording". **[Official]** ([Changelog](https://docs.cluely.com/changelog), [Audio debugging](https://docs.cluely.com/debugging/audio))
- **Accuracy and speed claims:** "12+ languages", "95% accuracy", "300 ms". Separately, an **Audio Input Test** shows a mic level meter and a transcript preview (Dec 2025). ([cluely.com](https://cluely.com), [Changelog](https://docs.cluely.com/changelog))
- **Two language settings:** "Meeting audio language" (for transcription) and "Output language" (for answers, summaries, and the UI). A Dec 2025 bug transcribed every language as English. ([Settings](https://docs.cluely.com/feature/settings))
- **Partial (interim) transcripts:** Shown since Oct 2025.

### 2.5 Real-time suggestions

- **Assist:** Answers whatever was last asked in the conversation, or what is on screen.
- **"What should I say?" suggestions:** Improved in Oct 2025.
- **Coaching / Missed Opportunities (enterprise):**
  - Watches how reps answer prospects in real time against a custom scorecard.
  - After the call, it lists what could have been done better.
  - Admins get team ROI dashboards. ([Coaching](https://docs.cluely.com/feature/coaching))
- **Memory:**
  - During a call, past conversations with the same attendees are injected into the context.
  - A "What you last talked about" section shows deal status, promises made, and key topics. ([Blog: People Search & Memory](https://cluely.com/blog/people-search-live))

### 2.6 Before the meeting

- **Pre-call briefs:** Built from Google Calendar (the only calendar supported as of Aug 2025). A brief contains:
  - Meeting details and agenda.
  - Participant names, roles, and backgrounds, with the company researched.
  - Previous meeting history.
  - Suggested talking points and questions.
  - Sources: [Pre-call](https://docs.cluely.com/feature/precall), [Quickstart](https://docs.cluely.com/quickstart)
- **People Search:** Lookup by email from the command palette, with past-meeting context. A LinkedIn click bug was fixed, which implies LinkedIn data is used. ([Changelog](https://docs.cluely.com/changelog))
- **Meeting alerts and "Join Meeting" button:** Real-time calendar sync since Nov 2025.

### 2.7 After the meeting

Sources: [Meeting Notes](https://docs.cluely.com/feature/postcall), [Changelog](https://docs.cluely.com/changelog).

- **Activity list on the dashboard:** Each started and stopped session becomes a meeting note containing:
  - Detailed notes and key insights.
  - AI-drafted next steps and **a follow-up email**, sent via Gmail or the default mail client.
  - A full transcript with speaker identification.
- **Editable notes:** You can edit the summary inline.
- **Public share link:** You can share a note by link, with a share preview.
- **Copy transcript** and **Resume Session** (to continue a meeting later).
- **Meeting note email templates per mode:** Added Nov 2025.
- **Chat with past meetings:** Asked from the command bar. The pricing page lists "Ask AI about past meetings" in the free tier ([Pricing](https://cluely.com/pricing)).
- **Global and fuzzy search:** Across sessions.
- **CRM push (enterprise):** Pushes summaries, action items, sentiment, and engagement metrics to the CRM ([Integrations](https://docs.cluely.com/enterprise/integrations)).

### 2.8 Customisation: modes, personas, prompts, knowledge

- **"Customize Cluely":** Edit the system prompt and upload files. The free tier allows **up to 3 files** ([Settings](https://docs.cluely.com/feature/settings), [Pricing](https://cluely.com/pricing)).
- **Modes:** Named prompt presets, for example "Sales", switched from the widget dropdown. Modes are sortable and have prompt versioning and RBAC (enterprise).
- **Enterprise Knowledge Base:**
  - Accepts PDF, DOC/DOCX, TXT, MD, plus "live links" (crawled wikis and docs) and CRM/ATS data.
  - **RAG v2** (Sep 2025). Retrieval quality reportedly caps out around 1M tokens.
  - Used in Assist, live insights, notes, and briefs. ([Knowledge Base](https://docs.cluely.com/enterprise/knowledgebase))
- **Enterprise prompt engineering:** A dedicated Cluely prompt engineer writes the org's prompts, with a 1–3 day turnaround. Prompts can be assigned to teams. ([Customization Suite](https://docs.cluely.com/enterprise/customizationsuite))

### 2.9 Integrations

- **Meeting apps:** Works alongside Zoom, Google Meet, Microsoft Teams, Webex, and Slack huddles. There is **no bot**: it is a local app ([cluely.com](https://cluely.com)).
- **Calendar:** Google Calendar only.
- **Email:** Gmail, or the default mail client.
- **CRM via Merge.dev:** HubSpot, Salesforce, Pipedrive, Zoho.
- **ATS via Merge.dev:** Greenhouse, Lever, Workday, BambooHR ([Integrations](https://docs.cluely.com/enterprise/integrations)).
- **Enterprise extras:** Directory sync, role management, usage reporting, Slack support channel, Pylon chat, and a custom actions API ([llms.txt index](https://docs.cluely.com/llms.txt)).
- **Linear:** Mentioned only by a third-party review ([dupple](https://dupple.com/reviews/cluely)).

### 2.10 Platforms and requirements

- **macOS:** 10.15+, Intel or Apple Silicon, 8 GB RAM recommended.
- **Windows:** **Windows 11**, x64. Windows 10 support was partly deprecated by GPU acceleration in Nov 2025.
- Platform source: [Quickstart](https://docs.cluely.com/quickstart)
- **No Linux.**
- **iOS app ("Cluely Mobile"):** For in-person meetings and voice memos, with notes synced to desktop ([Mobile](https://cluely.com/mobile)). Some reviews claim Android exists; I could not confirm it.
- **Enterprise:** Web app at enterprise.cluely.com, plus MDM deployment docs ([MDM](https://docs.cluely.com/debugging/mdmpermissions)).

### 2.11 Languages

- **Claim:** "12+ languages including English, Chinese, Spanish" for transcription ([cluely.com](https://cluely.com)).
- **Settings:** Output language and meeting language are set separately.
- **Model routing:** International users were moved to Claude in Sep 2025, because GPT-5 was "slow for international users" ([Changelog](https://docs.cluely.com/changelog)).

---

## 3. UX details

- **Look:**
  - A slim, dark, **translucent "glass" pill / bar**, usually top-center of the screen. It expands downward into a card or panel when answering.
  - Answers render as **Markdown** (`react-markdown`, [Hacktron](https://www.hacktron.ai/blog/hacking-cluely)) with LaTeX and code blocks.
  - The window has **default padding** and **follows system light/dark theme** (Oct 2025 changelog).
  - The marketing line is "Follows your eyes": you place the bar near your camera or where you naturally look ([cluely.com](https://cluely.com)).
- **Position:** Draggable, moved with Cmd/Ctrl+←/→, and can be placed on any display.
- **Always on top, no taskbar or dock entry (when invisible):**
  - "Invisibility" hides it from screen share **and the OS taskbar**, and from Mission Control ([Settings](https://docs.cluely.com/feature/settings), [Hacktron](https://www.hacktron.ai/blog/hacking-cluely)).
  - The docs admit it **still appears in Activity Monitor / Task Manager** ([Live Insights](https://docs.cluely.com/feature/liveinsights)).
- **Focus behaviour:**
  - The Oct 2025 changelog removed "auto-popup on focus events". The goal is that the overlay never steals focus from the meeting app, so the meeting doesn't see a "window blur".
  - A fix for "macOS scrolling in invisible mode" suggests the invisible mode uses a **non-activating panel**, which has trouble receiving scroll events. **[Inferred]**
- **Triggering:**
  - Mainly by keyboard (Cmd/Ctrl+Enter) with nothing typed: it figures out the question from the last transcript lines plus the screenshot.
  - Alternatives: click a chip, or type into the Ask bar.
- **Streaming:**
  - Answers stream token by token, and reasoning tokens can be shown.
  - The changelog notes "migrated streaming to generateText for upcoming meetings". `generateText` / `streamText` are **Vercel AI SDK** function names, which strongly suggests the AI SDK is used on the backend. **[Inferred]**
- **After the meeting:**
  - The session ends automatically (calendar end or mic change) or by the End button.
  - The dashboard opens with a note being generated (made 3× faster in Sep 2025).
  - The note includes the summary, next steps, a follow-up email draft, the transcript, a share link, and "Missed Opportunities" for enterprise.
- **Onboarding:**
  - An interactive tutorial ("Learn how to use Cluely") and a permissions walkthrough (mic, screen and system audio recording, Accessibility).
  - An onboarding video was removed for being "unprompted".

---

## 4. Technical architecture (what is known and what is inferred)

### 4.1 Client

- **Electron + React (TypeScript)** desktop app. **[RE]** ([Hacktron](https://www.hacktron.ai/blog/hacking-cluely), [prathit](https://prathit.vercel.app/blog/reverse-engineering-cluely))
- **Window classes:** A main `Window` class, plus a separate **`DisplayOverlay`** window class for the overlay.
- **Preload:**
  - Uses `contextBridge` to expose `window.electron.ipcRenderer.{send,invoke,on}`.
  - As of Jul 2025 there was **no channel allowlist and no `sandbox: true`**.
  - The main window had no `will-navigate` guard, so clicking a link in an AI answer could navigate the app to an attacker page that then called the screenshot and audio IPC. Hacktron reported this, and it was silently patched.
- **Typical overlay `BrowserWindow` flags** (from clones and RE write-ups; Cluely's exact values are unconfirmed):
  - `transparent: true, frame: false, alwaysOnTop: true` (level `'screen-saver'` / `'floating'`)
  - `skipTaskbar: true, hasShadow: false, focusable: false` (or a macOS `type: 'panel'`)
  - `setVisibleOnAllWorkspaces(true, {visibleOnFullScreen: true})`
  - `setContentProtection(true)`
  - On macOS, `app.dock.hide()`.
  - Optional click-through via `setIgnoreMouseEvents(true, {forward: true})`. The clone cheating-daddy binds this to Cmd+M ([cheating-daddy](https://github.com/sohzm/cheating-daddy)).
- **Native modules:** Used for macOS audio (system audio + mic monitor). The Nov 2025 "new audio system" on Windows and Apple Silicon is probably native too.
- **Likely capture APIs:**
  - macOS 13+: **ScreenCaptureKit** audio-only stream. macOS 14.4+: **Core Audio process taps**.
  - Windows: **WASAPI loopback** (or the newer per-process loopback).
  - **[Inferred]** from the permission names "Screen & System Audio Recording" and the Microsoft/Apple API docs ([MS loopback](https://learn.microsoft.com/en-us/windows/win32/coreaudio/loopback-recording), [MS process loopback sample](https://learn.microsoft.com/en-us/samples/microsoft/windows-classic-samples/applicationloopbackaudio-sample/)).
- **Feature flags:** Served from `flags.cluely.com`. **Auto-update:** has polling and MDM handling. **GPU acceleration on Windows:** Nov 2025.
- **Network endpoints** from the official firewall allowlist ([Audio debugging](https://docs.cluely.com/debugging/audio)):
  - `platform.cluely.com`, `app.cluely.com`, `desktop.cluely.com`, `desktop.app.cluely.com`
  - `service.transcribe.cluely.com` (**wss://** real-time STT)
  - `flags.cluely.com`, `img.cluely.com` (screenshot uploads)

### 4.2 AI stack

- **STT:** Deepgram SDK. Audio is streamed over WebSocket through Cluely's own transcription proxy. The Sep 2025 changelog's "Selected a more accurate AI provider" may mean the STT or LLM vendor changed. **[RE]**
- **LLMs:**
  - **GPT-4.1** was the default, with **Claude Sonnet 3.7** as an option. The system prompt told the model **never to reveal its provider** ([Jack Cable via search summary](https://x.com/jackhcable/status/1936500980297932827)).
  - Later changelog entries: GPT-5 rollout (Oct 2025), "visible reasoning tokens", international users moved to Claude (Sep 2025), and a "Smart mode" that uses a reasoning model.
  - Pricing says Pro gets "unlimited access to the latest AI models" ([Pricing](https://cluely.com/pricing)).
- **Server-side features:** RAG (v2), web search inside answers ("Improved web search reliability", Sep 2025), prompt versioning, token usage tracking, and caching of meeting overviews and people search.
- **Backend hints:**
  - GraphQL API: from a disputed breach report.
  - Database pools and read-replicas.
  - Vercel AI SDK (`generateText`).
  - Intercom (consumer support, "Fin" bot), Pylon (enterprise support), Stripe (billing).

### 4.3 How the "invisible to screen share" trick works

Cluely only says it uses "the same technology that Zoom does" and relies on capture software "respecting OS privacy defaults" ([Undetectability](https://docs.cluely.com/feature/undetectability)). The underlying OS mechanism is well known:

- **Windows:** `SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)`.
  - Available on Windows 10 **2004 (build 19041)+**. Older builds fall back to `WDA_MONITOR`, which shows a black box.
  - The Desktop Window Manager (DWM) enforces it, so Windows Graphics Capture, BitBlt, OBS, Zoom, Teams, Meet, PrintScreen, and Game Bar all omit the window.
  - Only the owning process can set it.
  - Some DXGI or direct-GPU capture paths on certain drivers may still capture the window ([MS docs](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowdisplayaffinity), [IOActive Aug 2026](https://www.ioactive.com/signal-windows-desktop-contentprotection-bypass)).
- **macOS:** `NSWindow.sharingType = .none` (`NSWindowSharingNone`).
  - Under the legacy CGWindowList APIs this reliably hides the window.
  - Under **ScreenCaptureKit (macOS 14/15+)** results are inconsistent:
    - Windows are excluded at stream start but can reappear after the capture filter changes.
    - Zoom shows **flicker**.
    - Electron added a patch to drop protected windows from SCK full-display captures ([Apple forums](https://developer.apple.com/forums/thread/808016), [Zoom community](https://community.zoom.com/meetings-2/flickering-window-in-the-screen-capture-of-zoom-mac-desktop-client-when-nswindowsharingnone-is-set-35876), [Electron SCK patch](https://ayakael.net/mirrors/electron/commit/fd88908457a986f06e310e80499e4b2775d8ba70), [Electron issue #31787](https://github.com/electron/electron/issues/31787)).
- **Electron:** Both mechanisms are behind `win.setContentProtection(true)`. On Linux it is a no-op ([OpenCluely](https://github.com/TechyCSR/OpenCluely)).
- **Cluely's own support matrix (Sep 2025):**
  - Works when sharing a **single window** in Meet, Zoom, and Teams.
  - **Does not** work on **Windows 10, Windows 11 Home, or pre-2020 Macs** for Teams, or for full-screen shares in Zoom and Meet.
  - The app remains visible in the taskbar and Activity Monitor ([Live Insights](https://docs.cluely.com/feature/liveinsights)).
  - A fix for "undetectability on Windows 11 Home" shipped in Sep 2025.
- **Marketing language about "GPU-level hooks"** comes from competitor and third-party blogs ([Fabric](https://fabrichq.ai/blogs/how-fabric-caught-cluely-full-report-included), [interviewcoder](https://www.interviewcoder.co/blog/cluely-ai-review)). I found **no evidence** for it. The documented behaviour matches the plain OS flag.

### 4.4 Latency tricks (observed or likely)

- **Streaming:** Streaming STT shows interim results. LLM tokens stream to the UI.
- **No typing needed:** Cmd+Enter with no typed text uses the last transcript lines and a screenshot taken at that instant, so there is no round-trip to ask the user.
- **Pre-computation:** Pre-call briefs, people search, and meeting overviews are cached ahead of time and injected as context.
- **Session limits:** Context is limited to the last 24 h. The docs warn that very long transcripts slow responses.
- **Model routing:** Users are routed by region (Claude for international users) and by mode (Smart vs. fast).
- **Startup speed:** Lazy loading speeds up startup. Audio notifications are debounced (5 s).
- **Reality check:** Independent testing found **5–10 s**, sometimes up to 90 s, from a question being asked to a usable answer ([Wikipedia](https://en.wikipedia.org/wiki/Cluely), [tl;dv](https://tldv.io/blog/cluely-review/)).

---

## 5. Pricing

| Plan | Monthly | Annual | What you get |
|---|---|---|---|
| **Starter (Free)** | $0 | – | "Limited" AI responses (about **5/day** per the Oct 2025 changelog; one review says a 100-character cap), limited notetaking, custom instructions, **3 file uploads**, ask about past meetings. **No invisibility.** |
| **Pro** | **$19.99** | **$143.88/yr (≈$11.99/mo)** | Unlimited responses and notes, latest models, priority support. A 7-day trial is reported. **No invisibility.** |
| **Pro + Undetectability** | **$149.99** | **$539.88/yr (≈$44.99/mo)** | Everything in Pro plus "Completely hidden to meeting screen sharing software". |
| Undetectability plan (Oct 2025 changelog) | $75 | $500/yr | Possibly an add-on or earlier variant; prices have shifted over time. |
| **Mobile (iOS)** | ≈ **$8/week** | ≈$144/yr | Billed separately from desktop. |
| **Enterprise** | Custom (one review says ≈$200/seat/mo) | – | SSO/directory sync, RBAC, RAG KB, CRM/ATS, coaching, custom prompts. |

Sources: [Pricing page](https://cluely.com/pricing), [Changelog](https://docs.cluely.com/changelog), [Final Round AI](https://www.finalroundai.com/blog/cluely-pricing), [tl;dv](https://tldv.io/blog/cluely-review/), [dupple](https://dupple.com/reviews/cluely).

**INR:**
- **Cluely does not publish INR pricing.** Billing is in USD via Stripe, so Indian cards pay USD plus forex markup and 18% GST.
- Rough conversion at about ₹88/USD (my estimate, not official): Pro ≈ **₹1,760/mo** (≈₹12,650/yr); Pro+Undetectability ≈ **₹13,200/mo** (≈₹47,500/yr); Mobile ≈ ₹700/week.
- **Refund policy:** Reportedly 24 hours only, and requires **video proof** of a malfunction ([Final Round AI](https://www.finalroundai.com/blog/cluely-pricing)).

---

## 6. Weaknesses, complaints, privacy concerns, controversies

### Product and UX
- **Latency:** 5–10 s in practice versus the advertised 300 ms. Answers come after you need them.
- **Answer quality:** Generic or hallucinated answers when context is thin. The CEO said the product was "in a really raw state" at launch ([Wikipedia](https://en.wikipedia.org/wiki/Cluely)).
- **Transcription accuracy:** Reported at 20–80% in user reports, versus the claimed 95% ([tl;dv](https://tldv.io/blog/cluely-review/), [interviewcoder](https://www.interviewcoder.co/blog/cluely-ai-review)).
- **Patchy invisibility:** Fails on Win10, Win11 Home, older Macs, and full-screen shares. It is paywalled at $150/mo, and it appears in Task Manager / Activity Monitor.
- **Feature churn:** Live Insights was shipped, then retired. The always-on widget became session-only. Sessions are tied to Google Calendar only, and transcription stops on mic changes.
- **Windows 10 deprecated, no Linux.**
- **Unpublished free-tier limits:** Suggestions stop mid-call when you hit them.

### Billing and support
- **Trustpilot: 1.6/5** (23 reviews, about 96% 1-star; latest Oct 15, 2026) ([Trustpilot](https://www.trustpilot.com/review/cluely.com)). Complaints include:
  - Charges after cancelling.
  - No confirmation step on upgrade.
  - Monthly trial defaulting to annual billing.
  - Refunds refused.
  - AI-only support ("Fin") with no human.
  - The app auto-launching on macOS and being hard to uninstall.

### Security and privacy
- **Shipped secrets:** The full **system prompts and model choice were readable** in the shipped Electron bundle (Jun 2025, Jack Cable).
- **Hacktron vulnerability:**
  - No renderer sandbox, an unrestricted IPC bridge, and no `will-navigate` guard.
  - A malicious link in an AI answer could secretly **take screenshots and record mic and system audio**.
  - It was silently patched with no credit given ([Hacktron](https://www.hacktron.ai/blog/hacking-cluely)).
- **Disputed breach:** An alleged **breach of about 83k users** (transcripts and screenshots, via admin credentials in a public repo) is widely repeated by competitors. A competitor says it is likely fabricated. No primary confirmation exists, so treat it as **unverified** ([Final Round AI](https://www.finalroundai.com/blog/cluely-data-breach)).
- **Data policy:** All audio and screenshots go to the cloud. There is no published data-retention policy, and SOC 2/GDPR claims are questioned ([tl;dv](https://tldv.io/blog/cluely-review/)).
- **Consent:** It records other people without any bot or notice, which raises **two-party consent** issues in some jurisdictions and with employer policies.

### Ethics and company
- **Marketing:** "Cheat on Everything", the manifesto ("We want to cheat on everything… when everyone does, no one is" — [Manifesto](https://cluely.com/manifesto)), and the dating video.
- **Founders' history:** Founders suspended from Columbia.
- **Revenue lie:** The CEO admitted lying about revenue ([TechCrunch](https://techcrunch.com/2026/03/05/cluely-ceo-roy-lee-admits-to-publicly-lying-about-revenue-numbers-last-year/), [Inc.](https://www.inc.com/leila-sheridan/an-a16z-backed-startup-that-helps-people-cheat-on-job-interviews-just-got-caught-in-a-7-million-lie-the-ceo-was-sweating/91313070)).
- **Zoning violation:** A zoning violation at the SF "hacker house" preceded the move to NYC.
- **Detection arms race:** Detection tools now target Cluely by name:
  - **Truely (Validia)**, **Fair Screen** (enumerates OS windows for non-shareable or click-through overlays), and Honrly (open-source detector).
  - **Fabric:** flags consistent multi-second answer delays and LLM-style phrasing.
  - **CoderPad:** detects the Cmd+Enter combo.
  - **"Hallucination trap" questions.**
  - Sources: [HN Fair Screen](https://news.ycombinator.com/item?id=46019665), [HN detector](https://news.ycombinator.com/item?id=48583421), [HN traps](https://news.ycombinator.com/item?id=44450614), [Fabric](https://fabrichq.ai/blogs/how-fabric-caught-cluely-full-report-included)

---

## 7. Open-source landscape (what you are competing with)

| Project | Stack | Notes |
|---|---|---|
| **Pluely** | Tauri + React + Rust, about 10–16 MB | Ask and Listen modes, bring-your-own LLM/STT via a curl template, local CLIs (Ollama, Claude Code, Gemini CLI), SQLite, `tauri-nspanel`. **Went proprietary at v1** (GPL only in history), about 2.8k stars ([GitHub](https://github.com/iamsrikanthnani/pluely)). |
| **cheating-daddy** | Electron + Gemini 2.0 Flash **Live** | macOS system audio via the `SystemAudioDump` helper, Windows loopback, Linux mic only. Profiles: Interview, Sales, Meeting, Presentation, Negotiation. Click-through toggle on Cmd+M ([GitHub](https://github.com/sohzm/cheating-daddy)). |
| **Glass (Pickle)** | Electron, fork of cheating-daddy | Built in 4 days, 3k+ stars, licence and plagiarism dispute ([HN](https://news.ycombinator.com/item?id=44460552)). |
| **free-cluely** | Electron + Vite + TS | Gemini or **Ollama (local)**. Cmd+B show/hide, Cmd+H screenshot, Cmd+Enter solve, Cmd+arrows move ([GitHub](https://github.com/Prat011/free-cluely)). |
| **OpenCluely** | Electron | Focused on DSA/OA interviews; documents `setContentProtection` behaviour per OS ([GitHub](https://github.com/TechyCSR/OpenCluely)). |

**Takeaway:** "Transparent overlay + screenshot + LLM + hotkey" is now a **commodity**. Dozens of clones exist. A student project stands out through **quality, privacy, latency, and honest use cases**, not through the overlay itself.

---

## 8. Ideas that would make a student clone stand out

Gaps in Cluely, ordered roughly from high impact to low effort.

1. **Local-first and private by default:**
   - On-device STT (whisper.cpp / faster-whisper / Moonshine, or Windows' built-in speech) and an optional local LLM (Ollama / llama.cpp).
   - No account, no cloud by default, bring-your-own API key.
   - This directly answers Cluely's biggest trust problem: cloud recordings, a leaked bundle, and the breach rumours.
2. **Measured, visible latency:**
   - Show a live "time-to-first-token" and "STT lag" meter.
   - Target under 1.5 s from end of question to first token, using:
     - Streaming STT with **voice activity detection / end-of-utterance detection**.
     - **Speculative prefetch**: start the LLM call on interim transcripts and cancel or replace it when the final one arrives.
     - Small fast models first, with escalation to a big model on demand.
     - Pre-warmed connections.
   - Cluely's biggest product complaint is latency, so a benchmark table in the README makes a strong portfolio piece.
3. **Automatic question detection that really works:** Classify each transcript utterance (question / objection / jargon / action item) with a tiny local classifier. Pre-generate answers in the background so Cmd+Enter is instant.
4. **Speaker diarisation and labelled transcript:** Separate "me" (mic) from "them" (loopback) by stream, then diarise within "them". Cluely only colours "you" in blue.
5. **Ethical and consent-forward design:** A visible "AI assistant in use" consent message or auto-intro, a recording indicator, and a per-meeting opt-in. Position it for **accessibility** (hearing-impaired live captions plus translation), **students** (lecture companion), **non-native speakers** (live translation with Indian-language support: Hindi, Tamil, and others via IndicWhisper or Sarvam / AI4Bharat models), and **sales/support**. This avoids the cheating stigma and detection arms race, and is far more defensible for a college project.
6. **Live translation and subtitles overlay:** Real-time captions translated into the user's language. Cluely doesn't market this, and it is extremely useful in India.
7. **Linux support:** Cluely has none. On Linux, use PipeWire monitor sources for system audio and xdg-desktop-portal for screenshots. Be honest that content protection isn't possible there.
8. **Transparent, editable prompt "modes" as files:** Modes as YAML or Markdown in a folder, git-friendly and shareable. A community "mode gallery" covering Viva prep, DSA tutor, Sales, Doctor-patient notes, and more.
9. **Local RAG over your own notes:** Drag in PDFs, slides, or Obsidian/Notion exports, embedded locally with sqlite-vec or LanceDB. Cite the source passage in every answer, which Cluely doesn't show.
10. **Region-select screenshot and OCR fallback:** Let the user lasso part of the screen. Run local OCR (Tesseract or Windows.Media.Ocr) to cut tokens and cost, and send the image only when needed.
11. **Post-meeting outputs:** Summary, decisions, action items with owners, a follow-up email, flashcards or quiz for lectures, and export to Markdown, Notion, Google Docs, or calendar tasks. Also a searchable meeting history.
12. **Tauri or native instead of Electron:** A small binary (about 10 MB versus Electron's 150 MB+), lower RAM, and a better security posture. Turn on the sandbox, use an IPC allowlist, and guard navigation. These are lessons from the Hacktron finding.
13. **Security as a feature:** Document the threat model and add a CSP. Never ship prompts or keys in the bundle; use a local key vault (OS keychain or Credential Manager).
14. **Accessibility and UX polish:**
    - Adjustable opacity, font size, and click-through toggle.
    - "Teleprompter" mode that auto-scrolls near the webcam.
    - Keyboard-only navigation, a compact one-line "hint" mode versus a full-answer mode, and dark/light themes.
15. **Free and honest pricing:** Open source and free, with no dark-pattern billing. That alone contrasts with Cluely's 1.6/5 Trustpilot score.

---

## 9. Implementation cheat-sheet (APIs to look at, inferred from the research above)

| Concern | Windows | macOS | Linux |
|---|---|---|---|
| Hide from capture | `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` (Win10 2004+) | `NSWindow.sharingType = .none` (inconsistent with ScreenCaptureKit on 14/15+) | Not possible (no-op) |
| Electron / Tauri equivalent | `win.setContentProtection(true)` / Tauri `set_content_protected(true)` | same | – |
| System audio | WASAPI loopback / process loopback (`ActivateAudioInterfaceAsync` with `AUDIOCLIENT_ACTIVATION_TYPE_PROCESS_LOOPBACK`) | ScreenCaptureKit audio (13+) or Core Audio process taps (14.4+); Electron `desktopCapturer` / `setDisplayMediaRequestHandler` loopback | PipeWire / PulseAudio monitor source |
| Mic | WASAPI / getUserMedia | AVAudioEngine / getUserMedia | getUserMedia |
| Screenshot | Windows Graphics Capture / `desktopCapturer` | ScreenCaptureKit / `desktopCapturer` | xdg-desktop-portal |
| Overlay window | `WS_EX_TOOLWINDOW` (no taskbar), `WS_EX_TRANSPARENT \| WS_EX_LAYERED` (click-through), topmost | `NSPanel` with `.nonactivatingPanel`, level `.screenSaver`/`.floating`, `canJoinAllSpaces`, `fullScreenAuxiliary` | compositor-dependent |
| Global hotkeys | `RegisterHotKey` / Electron `globalShortcut` | Carbon hotkeys / `globalShortcut` (Accessibility permission for some key monitors) | X11 / portal |

---

## Sources (main)

- Official: [cluely.com](https://cluely.com) · [Pricing](https://cluely.com/pricing) · [Undetectability](https://cluely.com/undetectability) · [Mobile](https://cluely.com/mobile) · [Manifesto](https://cluely.com/manifesto) · [Blog: People Search & Memory](https://cluely.com/blog/people-search-live) · [Docs index](https://docs.cluely.com/llms.txt) · [Changelog](https://docs.cluely.com/changelog) · [Settings](https://docs.cluely.com/feature/settings) · [Live Insights](https://docs.cluely.com/feature/liveinsights) · [Undetectability doc](https://docs.cluely.com/feature/undetectability) · [Meeting Notes](https://docs.cluely.com/feature/postcall) · [Pre-call](https://docs.cluely.com/feature/precall) · [Coaching](https://docs.cluely.com/feature/coaching) · [Knowledge Base](https://docs.cluely.com/enterprise/knowledgebase) · [Integrations](https://docs.cluely.com/enterprise/integrations) · [Customization Suite](https://docs.cluely.com/enterprise/customizationsuite) · [Audio debugging](https://docs.cluely.com/debugging/audio) · [Quickstart](https://docs.cluely.com/quickstart)
- Reverse engineering and security: [Hacktron – Turning Cluely into Malware](https://www.hacktron.ai/blog/hacking-cluely) · [Jack Cable on X](https://x.com/jackhcable/status/1936500980297932827) · [AI EngineerGuide prompt leak](https://aiengineerguide.com/til/cluely-system-prompt-leak/) · [Leaked prompt mirror](https://mintlify.wiki/x1xhlol/system-prompts-and-models-of-ai-tools/commercial/cluely) · [prathit RE overview](https://prathit.vercel.app/blog/reverse-engineering-cluely) · [IOActive – WDA bypass](https://www.ioactive.com/signal-windows-desktop-contentprotection-bypass)
- Platform APIs: [SetWindowDisplayAffinity](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowdisplayaffinity) · [WASAPI loopback](https://learn.microsoft.com/en-us/windows/win32/coreaudio/loopback-recording) · [Process loopback sample](https://learn.microsoft.com/en-us/samples/microsoft/windows-classic-samples/applicationloopbackaudio-sample/) · [Apple SCK forum thread](https://developer.apple.com/forums/thread/808016) · [Electron #31787](https://github.com/electron/electron/issues/31787)
- News: [Wikipedia](https://en.wikipedia.org/wiki/Cluely) · [TechCrunch (Mar 2026)](https://techcrunch.com/2026/03/05/cluely-ceo-roy-lee-admits-to-publicly-lying-about-revenue-numbers-last-year/) · [SF Standard](https://sfstandard.com/2025/11/20/san-francisco-s-controversial-startup-moving-new-york/) · [Harper's](https://harpers.org/archive/2026/03/childs-play-sam-kriss-ai-startup-roy-lee/) · [Tracxn](https://tracxn.com/d/companies/cluely/__Ju-PhvKyO8Kv2MD9Esgxhmh_EB15mxqSDhhJ2zxBqN0)
- Reviews (mostly competitors; caution): [Trustpilot](https://www.trustpilot.com/review/cluely.com) · [tl;dv](https://tldv.io/blog/cluely-review/) · [Final Round AI pricing](https://www.finalroundai.com/blog/cluely-pricing) · [Final Round AI breach](https://www.finalroundai.com/blog/cluely-data-breach) · [Interview Coder](https://www.interviewcoder.co/blog/cluely-ai-review) · [dupple](https://dupple.com/reviews/cluely) · [Fabric detection report](https://fabrichq.ai/blogs/how-fabric-caught-cluely-full-report-included)
- Clones: [Pluely](https://github.com/iamsrikanthnani/pluely) · [cheating-daddy](https://github.com/sohzm/cheating-daddy) · [free-cluely](https://github.com/Prat011/free-cluely) · [OpenCluely](https://github.com/TechyCSR/OpenCluely) · [HN: Glass relicensing](https://news.ycombinator.com/item?id=44460552)
