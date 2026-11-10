# 04 — Shadow's user journey, aha moments and paywall trigger points

> Researched 2026-11-10 by reading the Shadow codebase (working tree, including uncommitted changes), README, PLAN, ARCHITECTURE and `research/01–07`.
> Line numbers refer to the working tree on that date. Costs marked *(est.)* are my estimates, with the assumptions written out. Check them against live price pages before setting prices.
> Scope: where a Shadow Cloud paywall belongs in *this* UI, and why. Pricing levels are out of scope and are left as ₹X.

---

## 0. Read these first: three findings that change the plan

1. **Shadow has almost no users yet.** On 2026-11-10 the GitHub API reports **0 stars and 0 forks**, and the only release (v0.1.0, 2026-10-20) has **3 downloads** of `Shadow-Setup.exe`. There is no install base to convert. For the next few months, Shadow Cloud's first job is **activation**: it removes the API-key step, which is the biggest drop-off in the funnel (§1). Its second job is revenue. Design the free tier as an acquisition feature that also happens to end in a paywall.
2. **There is an uncommitted change that hides the overlay from screen capture.** `src/main/windows.ts:45-53` adds `protectFromCapture()`, which calls `win.setContentProtection(true)` at `:78`, `:86` and `:129`, and `src/main/screenshots.ts` calls it again after each capture. This is the exact `WDA_EXCLUDEFROMCAPTURE` mechanism behind Cluely's "Undetectability" tier (`research/01-cluely.md:22-24`). It contradicts README:125 ("It doesn't hide from screen sharing or recording"), ARCHITECTURE ("Shadow deliberately doesn't hide itself") and PLAN's non-goals. For a paid product this matters in three ways:
   - Merchants of record and payment gateways review what you sell. A screen-reading overlay from the Cluely and Interview Coder lineage that hides from screen share is a plausible reason to be rejected or frozen.
   - It drags Shadow back into the cheating category the positioning is meant to avoid (§3).
   - It breaks support: a user can't screen-share or screenshot the paywall or a receipt to ask for help.
   **Recommendation: don't ship it.** If a privacy reason exists ("keep my notes off a shared screen"), make it an off-by-default, clearly labelled toggle, and leave it out of paid marketing entirely.
3. **No telemetry, no auto-updater, no deep-link handler.** `electron-builder.yml` has `publish: null` and no `protocols` entry. Nothing calls `setAsDefaultProtocolClient`, `autoUpdater` or `setLoginItemSettings`. Consequences:
   - The Cloud server will be the **only** source of funnel data.
   - Paywall thresholds and copy should be **server-driven**, because you can't push a client update to people who installed an earlier build.
   - `shadow://` still needs wiring. On Windows the URL arrives through the `second-instance` handler at `src/main/index.ts:13`, which today only calls `showOverlay`.

---

## 1. Current user journey map (BYOK, as shipped)

Drop-off figures are judgement calls. There is no data to measure them yet (finding 3).

| # | Step | What happens (code) | Friction | Drop-off risk |
|---|---|---|---|---|
| 1 | **Discover** | README hero says "Free · No account · Bring a free Gemini key" (README:28). The value story is at README:37-39. | "Bring a key" in the first line tells non-technical visitors that this is a developer tool. | Medium. Self-selects for technical users, who are the people *least* likely to pay for no-key convenience (§3). |
| 2 | **Download** | `Shadow-Setup.exe` from GitHub Releases (README:24, electron-builder.yml `artifactName`). | The browser warns about an uncommon download ("not commonly downloaded" / Keep) before Windows does. | Medium |
| 3 | **SmartScreen** | The app is unsigned, so Windows shows "Windows protected your PC" → **More info → Run anyway** (README:86). | Two hidden clicks behind a scary warning. | **High** for non-technical students, roughly 30–50% *(est.)*. Paid-mode users are exactly the people who balk here. Code signing is a prerequisite for selling. |
| 4 | **Install + first launch** | One-click NSIS, `runAfterFinish: true` (electron-builder.yml). The overlay opens without taking focus at top-centre, 960×780, transparent, click-through (`windows.ts:55-87`), with the spring-in pill (`overlay.css:17-35`). | No window, no taskbar entry (`skipTaskbar`, `windows.ts:71`). Users can wonder whether it opened at all. There's no login item, so after a reboot Shadow is gone until it's relaunched from the Start menu. | Medium |
| 5 | **Welcome card** | Shown while the selected provider has no key (`Welcome.tsx:25-27`). It promises "Three steps to your first answer. It's free." (`:47`), then: get key, paste in Settings, press the hotkey (`:50-67`). | Closing the card with ✕ writes `shadow.welcomeDismissed` to localStorage (`:29-36`), so it **never comes back, even with no key saved**. | Medium |
| 6 | **Get a Gemini key** | "Get key" opens `aistudio.google.com/apikey` in the browser (`Welcome.tsx:53`, `shared/providers.ts:125`). | Context switch to the browser, Google sign-in, accepting AI Studio terms, creating the key, copying it. School-managed or under-18 Google accounts may be blocked from AI Studio *(unverified, worth checking)*. | **Highest. Probably the single largest drop.** |
| 7 | **Paste the key** | "Settings" opens a separate 820×680 window (`windows.ts:150-171`). The **API keys** card is the fourth card down (`SettingsApp.tsx:268-277`), under Answer model, Backup model and an optional Screenshot reader card. It lists **seven** key rows: six AI providers plus Deepgram. | Three windows involved (overlay, browser, settings), scrolling, choice overload, and no "test this key" button on the row. Test lives in the Answer model card (`:105-115`). | High |
| 8 | **First answer** | Ctrl+Shift+Enter → `smartAnswer()` (`session.ts:111-118`) → auto-screenshot if nothing is queued (`:171`) → the panel opens on `answerStart` (`store.ts:73-81`) → "Reading screen…" → streamed answer. The meta line shows the model and first-token time (`ResponsePanel.tsx:125-132`). | Hotkey clash with another app (toast, `index.ts:29-34`). No coding problem on screen at that moment. Free-tier 429s produce a "waiting and retrying" toast (`main/ai/providers.ts:42-47`). If the welcome card was dismissed and no key is saved, `NO_KEY` shows "Add a Google Gemini API key in Settings." with an **Open settings** button (`ResponsePanel.tsx:42-51`, `main/ai/providers.ts:17-21`). | Medium |
| 9 | **Try Listen** | Ctrl+Shift+L or the Listen button → `startListening()` throws "Add a Deepgram API key in Settings to use live listening." when there's no key (`live/listen.ts:119-123`). The overlay shows it as a **2.4-second toast with no button** (`listening.ts:21-25` → `store.ts:47,53-65`; `Toast.tsx:7` isn't `data-interactive`). | A *second* sign-up (Deepgram console), a second key, and back to Settings. The only hint disappears in 2.4 s. Then there's a mic permission and the "use headphones" caveat (`SettingsApp.tsx:281-284`). | **Very high.** Most BYOK users will never reach Listen. |
| 10 | **Repeat use** | Tray icon plus Ctrl+Shift+Space (`tray.ts`). Sessions aren't saved (roadmap, README:157). | No auto-start, no history, no updates, nothing that brings the user back. Retention depends entirely on the user remembering the hotkey. | High (silent churn) |

**Time to first answer today:** about 1 minute to install and get past SmartScreen, plus 2–6 minutes for the key and Settings, plus about 5 s for the answer. That's **4–8 minutes for a motivated user** *(est.)*, and many never finish step 6–7. Listen adds another 3–5 minutes and a second account.

---

## 2. The aha moments

1. **"It read my screen."** (Primary.) You press one key on a LeetCode or GFG problem and a structured explanation streams in: Problem → Approach → Code → Complexity → Edge cases → Dry run (`research/07-ai-pipeline.md` §2.3). It keeps the problem's own function signature, and you never leave the page. This is the moment that sells the product.
2. **"It remembers."** You ask "why O(n)?" or "show me in Java" in the Ask box and it answers about the same problem (`session.ts:191-195`, with text-only history at `:281-286`). This is the tutor moment, and the follow-ups are cheap (no images).
3. **"It heard the question."** (Secondary, and the costly one.) You play a lecture or mock-interview video, press Ctrl+Shift+L, and see a two-speaker transcript (`TranscriptPane.tsx`) with a short answer appearing automatically when a question is asked, in Hinglish if that's the language used (`live/autoAnswer.ts`, ARCHITECTURE "Live listening").
4. **"It speaks my language."** A Hinglish question gets a Hinglish answer (README:72-76). This is a differentiator, not a standalone aha.

**How fast with Cloud and no key:**

- Install, then press Ctrl+Shift+Enter: the first token arrives in about 2–6 s. The aha takes **about 60–90 s after install** *(est.)* instead of 4–8 minutes, and the drop-prone steps 6–7 disappear.
- Listen goes from "second account plus key" to **one keypress**. This is the biggest *relative* gain anywhere in the journey.
- **The catch:** aha #1 needs a coding problem on screen. Someone launching for the first time is often not looking at one. Add a **"Try it on a sample problem"** button on the welcome card. It plays a pre-recorded stream of a real answer, costs ₹0 and doesn't use a credit, so the user sees the format in about 10 s. Then prompt them to "Now open any problem and press Ctrl+Shift+Enter" for the real aha on their own screen.

---

## 3. Who pays, against what, and the most fatal assumption

### 3.1 Customer microscope

1. **The one person:** A third-year B.Tech CS student at a tier-2 or tier-3 Indian engineering college, on a Windows laptop, working through LeetCode and GFG problems at night in the 4–8 weeks before campus placement online assessments. The trigger moment: they've read the editorial for a medium problem twice, pasted it into ChatGPT, have code that passes, and still can't explain *why* it works. The OA is in two weeks.
   *Why this segment and not "students":* placement season is the only time an Indian student's study problem has a **deadline and stakes**, which is what turns convenience into willingness to pay. First-years using Listen on lectures care less, will pay less, and cost the most to serve (§4).
2. **The job:** When I'm stuck on a practice problem during placement prep, I want to understand why the solution works without leaving the problem page, so I can solve the next problem like it on my own in the OA.
3. **Three dimensions**
   - *Functional:* a correct, explained solution to the exact problem on screen, in the language they practise in (Python or Java), with complexity and a dry run.
   - *Emotional:* stop feeling behind and stupid at 1 a.m., and get to "okay, I actually get it."
   - *Social:* be the one in the hostel who has cracked DSA, and never be seen as someone who cheats. A visible tool supports that; a hidden one undermines it (finding 2).
4. **What they'd stop using:** the ChatGPT or Gemini tab with screenshot-paste and repeated "explain simpler" prompts, plus scrubbing through a Striver or NeetCode editorial video. *For Cloud specifically,* it's Shadow's own free BYOK mode.
5. **The struggling moment:** mid-problem, late at night, a free tier stalls ("Google Gemini's free per-minute limit was reached…", `main/ai/providers.ts:46`) or the key setup fails, with the OA a week away.

### 3.2 Positioning forge

1. **Competitive alternative:** alt-tab to a free ChatGPT or Gemini tab, paste a screenshot and type "explain this". It's free, already a habit, and in India often a free Pro tier through telecom or student offers (Jio–Gemini Pro, Airtel–Perplexity Pro, ChatGPT Go promos; *check which are still live in Nov 2026*). For Cloud versus Shadow Free, the alternative is a **free Gemini key** (~500 requests/day on Flash-Lite per `research/04-ai-apis.md:17`). GitHub Copilot through the Student Pack is a weaker alternative: it lives in the editor, not on the problem page in the browser, and explains code rather than teaching an approach.
2. **Category:** "a one-key DSA tutor that sits on top of your practice page." Not "AI assistant", where ChatGPT wins, and not "interview copilot", which is the cheating category.
3. **Unique wedge:** one keypress from stuck to an explanation of *the exact problem on screen*, in a teach-me format, with no tab switch and no prompt to write. **Cloud adds:** it works the moment you install it, with no key, no Google console and no rate-limit stalls in the middle of a problem.
4. **For / not for**
   - *For:* Windows CS students grinding many problems a night for placements, OAs and labs.
   - *Not for (turn away):* anyone who wants it during a live proctored test or interview, Mac users, and people who want a general chatbot.
5. **One-liner:** "Shadow helps Indian CS students preparing for placements understand any coding problem on their screen with one hotkey, without copy-pasting into ChatGPT and writing prompts. Shadow Cloud makes it work the moment you install it, with no API key."
6. **Clarity test:** "Press one key on a LeetCode problem and it explains the solution step by step, right on top of the page." This passes: a stranger knows what's being sold.

### 3.3 Idea executioner

1. **The bet:** Students who experience Shadow's one-key explanation will value "no setup, no limits" enough to pay ₹X, even though the same answers are free with a two-minute key or a ChatGPT tab.
2. **Riskiest assumption:** *a student who has felt the aha will pay money rather than spend two minutes getting a free Gemini key.* The product's own free path is its strongest competitor, and the people who currently find Shadow (GitHub, unsigned exe) are exactly the people who will take that path. The precondition is distribution: 3 downloads can't test anything, so the test has to bring its own traffic.
3. **Cheapest kill test (one week, under ₹2,000, no build):**
   - **Arm A, in person:** during placement-prep week, sit with 15 classmates outside your own friend group and install Shadow with *your* Gemini key on their laptops. Let them use it for one evening on their own problem lists. Next day, offer "keep it working for 30 days, no setup: ₹X by UPI now." Count UPI payments, not "yes I would".
   - **Arm B, remote:** a 30-second screen recording (hotkey → streamed explanation on a LeetCode medium), posted in 5–10 college placement WhatsApp and Telegram groups and r/developersIndia. Link it to a one-page pre-order: Razorpay Payment Page or a UPI QR with a form, "Shadow Cloud founding pass, ₹X, ships in 3 weeks, full refund if it doesn't", next to a "Download free (bring your own key)" link. Record clicks on each.
4. **What a "no" looks like:** fewer than 3 of 15 in-person users pay *and* fewer than 5 paid pre-orders (or under 1% of pre-order page visitors). Then stop building Cloud billing, keep BYOK, and spend the effort on distribution and signing. If people *choose the free download over the pre-order by 20:1 or more*, that confirms BYOK eats Cloud. In that case, the starter pack is worth building purely as activation, but not as a business.
5. **Verdict: TEST FIRST.** The paywall design below is cheap to get right on paper but costly to build (server, auth, billing, deep link, signing), and the assumption it rests on hasn't been tested once.

---

## 4. Cost model behind the free/paid line *(est.)*

Every Cloud request costs Aayush money. These are the units the line has to be drawn around.

| Unit | What drives it (code) | Assumptions | ≈ Cost |
|---|---|---|---|
| **Solve / debug** | Screenshot up to 2560 px wide (`screenshots.ts`) plus system prompt plus up to 8,192 output tokens (`session.ts:254`). Up to 4 shots (`:29`). | About 3K input / 2K output tokens (output includes low "thinking"). Flash-Lite-class price of $0.10–0.25 per 1M input and $0.40–1.50 per 1M output; a Flash-class model is about 2× that. | **$0.001–0.004 → ₹0.1–0.35**; up to about ₹0.7 on a Flash-class model |
| **Follow-up** | Text only; history grows (`session.ts:281-286`) | 2–5K input / about 700 output | **₹0.05–0.15** |
| **Live answer** | Up to 25 turns / 10K characters of transcript (`listen.ts:160`) plus a screenshot when triggered by hotkey (`session.ts:114`), plus **a classifier call per candidate question** (`autoAnswer.ts:68-93`, max 300 output tokens) | About 4K input / 600 output, plus a classifier at about 1.5K input / 150 output | **₹0.1–0.4 per answer** |
| **Listen time** | **Two** Deepgram Flux streams, You and Them (`credit.ts:4-7`: $0.0065/min/stream, "an hour costs about $0.78"). `pushAudio` sends every frame, including silence (`listen.ts:147-149`). | ₹88 per USD | **≈ ₹69 per hour** (₹1.15/min); ₹34/hour with one stream |

**What this means:**
- **One hour of Listen costs about the same as 200–700 solves.** Listen is the cost centre; solves are nearly free.
- Ten free solves cost Aayush **₹1–4 per install**, which is cheap enough to give away without a sign-up.
- Ten free minutes of Listen cost **₹6–12** (one or two streams). That's affordable once, but not as a daily allowance.
- **Cheap cost cuts before launch:**
  - Default Cloud Listen to **"Them" only** for lectures and videos, which halves the cost. The mic stream mostly matters for "reading a problem aloud".
  - Stop streaming silence to Deepgram, with a client VAD or by pausing after N seconds of quiet.
  - Run the classifier on the cheapest model.
  - Cap screenshots at 1280–1600 px for Cloud (`research/04-ai-apis.md:129`).
- Cloud runs on paid Gemini terms, so **prompts aren't used for training**, unlike the free tier (`research/04-ai-apis.md:17`). That's a genuine secondary selling point for Cloud.

---

## 5. Where to draw the free/paid line

| Option | Conversion upside | Cost and abuse exposure | Fit with Shadow |
|---|---|---|---|
| **(a) N free Cloud answers, no sign-up, then paywall** | Strongest activation: the aha arrives about 60 s after install. One clear decision moment. Feels like a gift, not a trial. | Bounded per device (N × ₹0.1–0.35). Can be farmed by reinstalling, but farming is slower than getting a free key (§7). | **Excellent.** It deletes funnel steps 6–7. |
| **(b) Reverse trial** (full Cloud Pro, including Listen, for 7 days, then downgrade) | Shows Listen, the costly feature that's hard to discover. Loss aversion at downgrade. | Needs an account to enforce *time*. A heavy Listen user can cost ₹200+ in a week. A calendar trial often expires unused, because students install in bursts. | Medium. Use the idea (include Listen in the gift) but meter by **usage**, not days. |
| **(c) Listen paid-only** | Matches cost exactly, since Listen is where the money goes. A clean "pro feature" story. | Lowest cost. | Partly right. Hiding Listen completely means nobody discovers aha #3. Give a **one-time taste of minutes**, then gate it. |
| **(d) Daily free Cloud quota** (Cluely-style, about 5/day per `research/01-cluely.md` §5) | Builds a habit and repeat visits. | Spends money every day on users who never decide. Light users never hit it, and heavy users switch to BYOK, which gives about 100× more for free. | **Poor.** It duplicates what a free Gemini key already gives, at Aayush's expense. BYOK *is* the daily free tier. |
| **(e1) BYOK free forever and visible** | Some users choose the free path instead of paying. | Free users cost ₹0; the provider pays. It's the best anti-abuse measure there is (§7). | **Required.** MIT licence, README promises (README:28, 39, 44-45). A fork that strips the paywall would appear the day it's hidden, as happened with Interview Coder (`research/02-interview-coder.md` §5). |
| **(e2) BYOK hidden behind "Advanced"** | Pushes a few more people to Cloud in the short term. | — | **Don't.** It breaks trust with exactly the open-source and dev audience that currently finds Shadow, and invites the "open-source bait-and-switch" story Cluely's reviews are full of. |

### Recommendation: a "starter pack" that combines (a), (c) and (e1)

- **On first launch, with no sign-up:** a device-bound **starter pack**, for example **20 answers + 10 Listen minutes** (Them-only). It's a reverse trial measured in usage, not days. Worst-case cost per install is about ₹2–7 for answers plus ₹6–12 for Listen if used fully *(est.)*. Follow-ups cost ⅓ of a credit or are free inside the current problem (see T5).
- **When it runs out:** a single paywall card with **two honest exits**:
  - **Get Shadow Cloud.** Prepaid packs suit this model best (UPI-friendly, no recurring mandate, and usage maps straight to cost), but a subscription works with the same card.
  - **Use my own free key (about 2 min).** BYOK stays fully visible, as the secondary button.
- **No daily free Cloud quota.** BYOK is the free daily tier, and it costs nothing.
- **Listen stays metered in Cloud plans** (minutes), never "unlimited", because it's the cost centre.
- **Why this beats the alternatives on both axes:**
  - *Cost:* capped per device, with nothing recurring for non-payers.
  - *Conversion:* the wall lands at the moment of highest felt value. By then the user has had 15–20 real answers *on their own problems*, which fits a placement-season grinding session that runs out in one or two nights.
- **Server-driven:** N, the Listen minutes and all copy should come from the server, because the client can't be updated (finding 3).

---

## 6. Every trigger point, in this UI

Intensity scale: **silent meta** < **toast** (2.4 s, not clickable) < **inline row** (inside an existing panel, clickable) < **card** (a panel-sized block with buttons) < **browser** (checkout).

| # | Trigger | What the user is doing | Intensity | Where (code anchor) | Copy angle |
|---|---|---|---|---|---|
| T1 | **First launch** | Just installed, curious, probably not on a problem yet | **Card**, with no price on it | Replace the 3-step `Welcome.tsx:50-67` with a "starter pack" welcome | *Gift and zero setup:* "20 free answers, no key, no sign-up. Open a coding problem and press Ctrl Shift ↵." Buttons: **[Try a sample problem]** (canned, free) · small link "Have a Gemini key? Use it instead". |
| T2 | **Each Cloud answer** | Reading the answer | **Silent meta** | Append to the panel meta line `ResponsePanel.tsx:129-131`: "Shadow Cloud · 14 free left" | *Transparency*, so the wall isn't a surprise. |
| T3 | **Low balance** (5 left, 1 left; 3 Listen minutes left) | Mid-session | **Toast** once at each threshold, plus a **chip** in the pill | Toast via `showToast` (`store.ts:53`). The chip goes beside the logo in `CommandPill.tsx:22-24` and **only appears when low**, because the 44 px pill is already full (`overlay.css:17-25`). | *Heads-up, not pressure:* "5 free answers left". The chip reads "5 left" with an accent dot. Clicking it opens T5's card early. |
| T4 | **The answer that exhausts the pack** | Mid-problem | **None.** Let it finish. | `session.ts` `ask()` | Never cut off an answer that's already streaming. |
| T5 | **Hotkey or Solve with 0 credits** (the main paywall) | Pressed Ctrl+Shift+Enter on a new problem, mid-task | **Card inside the response panel**, in place of the answer | Render in `TurnView` where errors go (`ResponsePanel.tsx:42-51`). The panel auto-opens on `answerStart` (`store.ts:73-81`). **Keep the captured screenshot** (today `session.ts:173-175` empties the queue before the request) so the answer **runs automatically when the user returns** with a purchase or a key. | *Continuity:* "Your problem is saved. Pick how to keep going and it'll answer straight away." **[Get Shadow Cloud · from ₹X]** (primary) · **[Use my own free key]** (secondary) · "A free key takes about 2 minutes." **Grace rule:** follow-ups on the *current* problem keep working (text-only, ~₹0.1), so a user is never stranded halfway through understanding something. The wall lands on the next *new* Solve. |
| T6 | **Listen start with 0 minutes** | Lecture or video about to start or already playing | **Card in the transcript slot** (not a toast) | Replace the toast at `listening.ts:21-25`. Today's toast-only error vanishes in 2.4 s with no action. | *Don't miss the lecture:* "Listen minutes used up. Get more, or add your own free Deepgram key." Same two buttons. |
| T7 | **Listen runs out mid-lecture** | Lecture playing, user possibly away from the keyboard | **Inline banner**, then a soft stop | Use the existing warning row in `TranscriptPane.tsx:29-34` (`listen.warning`) at 3 minutes and 1 minute left. At 0, finish the current turn (Flux `ForceEndTurn`), stop, **keep the transcript on screen**, and show T6's buttons. | *Calm:* "Listen paused. Your free minutes are used. The transcript so far stays here." Never a modal, and never an abrupt cut mid-sentence. |
| T8 | **Auto-answer while out of credits** | Not asking for anything | **Nothing.** At most, one line in the transcript banner. | Gate in `autoAnswer.ts` `consider()` (`:96`) | A paywall that pops up when the user didn't press anything feels like spam. |
| T9 | **BYOK user hits a free-tier 429 or 5 s stall** | Mid-problem, frustrated | **Inline row** with a button | The 429 toast (`main/ai/providers.ts:42-47`), the `RATE_LIMIT` error (`errors.ts:27`) and the hedge status "is slow right now" (`session.ts:260-264`) | *No waiting:* "Gemini's free limit is full for a minute. **[Answer this with Shadow Cloud]**". **This is the best upsell for existing BYOK users, because it appears at their struggling moment (§3.1-5).** |
| T10 | **BYOK user without a Deepgram key presses Listen** | Wants Listen right now | **Card** (same as T6) | `listen.ts:119-123` | *Skip the second sign-up:* "Listen works instantly with Shadow Cloud, or add a free Deepgram key." |
| T11 | **Settings** | Deliberately managing the app | **Account card** at the top | A new "Shadow Cloud" card above "Answer model" (`SettingsApp.tsx:233`) showing plan, credits, **Buy / Manage**, **Restore purchase / Sign in**. Rename the keys card to "Use your own keys (free)". Next to the Deepgram **Check credit** row (`:187-211`), Cloud shows its own minutes left. | *Account and status*, with no sales pressure. |
| T12 | **Tray menu** | Right-click on the tray icon | **Menu item** | `tray.ts` template | "Shadow Cloud: 12 answers left · Get more…" |
| T13 | **Return from checkout** | Back from the browser | **Toast**, then the pending answer streams | Deep link or polling (§8) | *Payoff:* "Shadow Cloud is on, answering your problem now." The best moment for a "tell a friend" link later, never now. |

**Do-nots:**
- No paywall on app launch after the first one.
- No modal that blocks the pill or the hotkeys.
- Never open the browser automatically. Only a button click opens it.
- Don't use the red error styling (`.error`, `overlay.css:366-377`) for "out of credits". It isn't an error, so use the accent palette.
- Don't use "Unlimited" if fair-use caps exist. Cluely's billing reputation (1.6/5 Trustpilot, `research/01-cluely.md` §6) is the warning.

---

## 7. Constraints the overlay imposes, and where the paywall renders

**The constraints, from the code:**
- **Click-through:** only elements marked `data-interactive` capture the mouse. Main polls the cursor every 40 ms against the reported rectangles (`useClickThrough.ts`, `windows.ts:106-122`). Any paywall element without the attribute lets clicks fall through to LeetCode underneath. The current `Toast` has no `data-interactive` (`Toast.tsx:7`), so **toasts can never hold buttons**.
- **Never takes focus:** `showInactive()` (`windows.ts:85,127`), always-on-top at `screen-saver` level (`:80`). Payment fields typed into an unfocused, always-on-top, transparent window are fragile and feel untrustworthy.
- **Fixed footprint:** the window is 960×780 (`windows.ts:5-6`). The pill is 44 px tall and already holds 7 controls plus a segmented switch (`CommandPill.tsx`). The panel is 580 px wide with a max height of 620 (`overlay.css:241-250`). The welcome card is 440 px wide (`:414-420`).
- **Hardening:** navigation and pop-ups are blocked, and `https` links open in the real browser (`windows.ts:23-35`). That's correct, and it means checkout pages *can't* run inside the overlay without weakening security.
- **Content protection** (uncommitted, finding 2): if it ships, users can't screenshot the paywall or share it for support.
- **The user is mid-task, maybe mid-lecture.** Anything that steals focus or covers the video costs Shadow its welcome.

**Where each part renders:**

| Part | Surface | Why |
|---|---|---|
| **Decision** (the value framing plus two buttons) | **The overlay, inside the response panel or transcript slot**, as a card styled like `.welcome` / `.panel` | That's where the user is when they hit the wall. The panel already auto-opens on a hotkey. No new window to find or focus. |
| **Transaction** (pay) | **The real browser**, opened by a button click (`shell.openExternal` behind a server-issued checkout URL) | UPI intent and QR, 3-D Secure OTP redirects and wallet pop-ups all need a real browser. Users see the URL bar and padlock. The gateway's own checkout stays intact. The overlay's navigation lock stays. |
| **Return** | `shadow://` deep link **plus** polling | Browsers show an "Open Shadow?" prompt that people cancel. While a checkout is open, poll the server for the entitlement (every 3 s for 10 minutes) and add a "I've paid, refresh" link. Run the saved problem as soon as the entitlement arrives. |
| **Account management** (plan, restore, receipts, manage keys) | **The Settings window** (T11) | It's a normal, focusable 820×680 window. That's the right place for sign-in and restore, not for the moment of need. |
| **A new dedicated window?** | **No** | It would steal focus mid-lecture, add a third surface, and duplicate what the browser does better. |

**Visual language for the paywall card** (from `styles/base.css:7-48` and `overlay.css`):
- **Surface:** always dark glass, `--sh-surface hsla(240,12%,9%,0.93)`, with the ring and top highlight (`.glass`).
- **Shape and type:** 18 px panel radius, Segoe UI Variable at 12–13 px body and 15 px title (`.welcome-title h2`).
- **Primary button:** the accent gradient `#5b4be8 → #3b2fb0` with `--sh-accent-ring`, pill-shaped at 32 px (`.btn-primary`). The secondary button uses `.btn-raised`.
- **Motion:** `panel-in` (240 ms ease-out).
- **Colour rules:** red `--sh-live` is reserved for recording, and danger red for errors. Out-of-credits uses accent violet. The credits chip borrows the `.segmented` and `.key` look (rgba(0,0,0,0.3), 1 px hairline, 11.5 px text).

```
┌──────────────────────────── panel 580px ────────────────────────────┐
│ Answer · Shadow Cloud · 0 free left                         ⧉ ↺ ✕  │
├─────────────────────────────────────────────────────────────────────┤
│                                   ┌───────────────────────────┐     │
│                                   │ Solve this problem         │     │
│                                   └──────── 🖼 with 1 screenshot│     │
│  ◐  You've used your 20 free answers                                │
│     Your problem is saved. Pick how to keep going and it'll         │
│     answer straight away.                                           │
│                                                                     │
│     [ ✦ Get Shadow Cloud · from ₹X ]   [ Use my own free key ]      │
│     A free Gemini key takes about 2 minutes. Shadow stays free.     │
├─────────────────────────────────────────────────────────────────────┤
│  Ask a follow-up about the last problem (still free)            ↑   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. Abuse risks for a free Cloud tier, and mitigations

**Risks:**
1. **Reinstall farming.** Uninstalling keeps app data (`deleteAppDataOnUninstall: false`), but deleting `%APPDATA%\Shadow` resets anything stored on the client.
2. **The client is open source (MIT).** Anyone can edit it to send random device IDs. **The server must be the only authority on credits.**
3. **Using the endpoint as a free LLM API.** If the server accepts arbitrary prompts, it becomes a free proxy for Gemini on Aayush's bill. *This is the costliest risk.*
4. **Listen farming.** Listen is the expensive unit (about ₹1.15/min).
5. **Shared IPs.** Hostel and campus NAT and mobile CGNAT put hundreds of real students behind one IP, so IP-based limits punish real users.

**Baseline (non-negotiable, no conversion cost):**
- The server builds the prompt: the client sends `{mode, screenshots, text}` and never instructions.
- Cap input image size and count, cap output tokens, and keep per-device rate limits (requests per minute).
- A **global daily spend cap** on free-tier usage, with a kill switch. When it trips, free answers pause with "Free answers are busy right now. Use your own key or Shadow Cloud."
- Free-tier Listen is Them-only and silence-gated.

| Mitigation | Stops | Conversion cost | Money and ops cost | Use it? |
|---|---|---|---|---|
| **Device ID**: hash of Windows `MachineGuid` (`HKLM\SOFTWARE\Microsoft\Cryptography\MachineGuid`) plus a server-issued signed token | Casual reinstall farming. It survives app reinstall and only resets on a Windows reinstall. | **None** (invisible) | Free | **Yes, for the starter pack.** Disclose it. README:124 says Shadow "collects nothing", which needs an honest Cloud carve-out. A modified client can spoof it, so pair it with a server-side limit on new-device grants per IP *subnet per hour*, set loosely because of campus NAT. |
| **Email or Google sign-in** (browser OAuth → deep link) | Most multi-account farming. Normalise Gmail dots and `+tags`, and block disposable domains. | Moderate. Roughly 10–25% of people drop at a sign-in step *(est., industry rule of thumb)*. Google sign-in is the cheapest form for Indian students, who all have a Google account. | Free (Google OAuth, magic links) | **Yes, but only at purchase**, where it's needed anyway for restore and receipts, or to unlock a *bonus* ("sign in for 10 more free answers"). **Not before the first answer.** |
| **Phone OTP** | Hard multi-account farming (one SIM per KYC'd person) | High. It feels invasive for a study tool, and OTP delivery is unreliable on DND numbers. | About ₹0.15–0.30 per SMS plus DLT template registration in India *(est.)* | **No for the free tier.** It costs more friction than the ₹2–7 it protects. Only consider it if the free tier ever includes hours of Listen. |
| **Requiring a payment method for the trial** | Nearly all farming | Very high. Students often have no card, and UPI Autopay mandates feel like a trap. | Gateway fees | **No.** |

**The key point:**
- A farmer who reinstalls and spoofs to win another 20 answers gains about ₹2–7 of value.
- The same person can get **about 500 free answers a day** by pasting a free Gemini key.
- So keeping BYOK free and visible *is* the main anti-abuse measure: the rational freeloader picks BYOK, which costs Aayush ₹0.
- Spend real effort only on (3), the open-proxy risk, and on the Listen meter.

---

## 9. Summary of recommendations

1. **Before any paywall work:** drop the uncommitted `setContentProtection` change. Get code signing, or at least plan for it. Run the one-week kill test (§3.3).
2. **Free/paid line:** a device-bound, no-sign-up **starter pack** (about 20 answers + 10 Them-only Listen minutes), then a two-exit paywall: **Get Shadow Cloud** or **Use my own free key**. BYOK stays free and visible. No daily Cloud quota. Listen is always metered.
3. **The main paywall** is a card *inside the response panel* at T5, which keeps the user's screenshot and resumes the answer after purchase. Follow-ups on the current problem stay free. The **best upsell for existing users** is T9, on a free-tier 429 or stall.
4. **Rendering:** the decision happens in the overlay, payment in the browser, the return through `shadow://` with polling as a fallback, and account management in Settings. No new window.
5. **Abuse:** the server builds prompts and holds all credits, with a device-ID starter pack and a global spend cap. Sign-in only at purchase. No phone OTP.
6. **Instrument the server** from day one: `device_registered → first_answer → answers_used → wall_seen → checkout_opened → paid | byok_chosen`. Make thresholds and copy remotely tunable, because there is no auto-updater.
