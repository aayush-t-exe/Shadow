# 05 — Cluely UI / Interaction Design Teardown and a Design Spec for "Shadow"

Scope: visual and interaction design only. Features and pricing are in `01-cluely.md`.
Researched 2026-10-21. Sources are listed at the end (S1–S20) and cited inline as [S#].

**How reliable each kind of evidence is:**
- **Measured.** Values copied from Cluely's own marketing-site hero mock, which is live React/Tailwind markup of the overlay [S1], and from Glass by Pickle, an open-source clone that copies Cluely's v1 header closely [S8–S14]. These are exact CSS values.
- **Observed.** Read from official Cluely doc screenshots [S3–S5] and third-party screenshots of the current app [S6]. Sizes are estimates of about ±2 px.
- **Inferred.** Where neither source shows something, the text says so.

---

## 0. Cluely's UI has gone through three versions

| Era | Command bar contents | Panel |
|---|---|---|
| **v1 (Apr–Aug 2025)**: the "cheat on everything" launch. Glass and free-cluely copy this one. | One dark pill at top-center with `[Listen] [Ask ⌘ ↵] [Show/Hide ⌘ \] [⚙]` | A separate "AI Response" card below the pill and a "Live insights / Show Transcript" card |
| **v2 (Sep–Nov 2025)** [S3][S4] | `⠿ (drag)` · `[logo] Not listening / Listening [audio toggle] [■ End]` · `✕` | A large glass card with an eye or incognito toggle, a Mode dropdown, "Show Transcript", the answer, action chips, and an input bar with `Tab`, `Get Answer ⌘⇧↵` and `Submit ↵` |
| **v3 (Dec 2025 → now)**: "simplified widget… one click AI help" [S2][S6] | A small pill: `[logo] [⌃ Hide] [■]` | One rounded panel: user bubble on the right, answer, a row of 4 text-chips (`✦ Assist · What should I say? · Follow-up questions · ↻ Recap`), and an input bar reading "Ask about your screen or conversation, or ⌘ ↵ for Assist" |

Shadow should take **v1's simple top pill** (easy to build, clear hotkey hints) and **v3's panel styling** (the most refined version).

---

## 1. Layout

### 1.1 Command bar (the "pill")
- **Position:** horizontally centered on the primary display's work area, **21 px below the top edge** (Glass: `x = (workArea.width − 353)/2`, `y = workArea.y + 21`) [S12]. Cluely's docs say it can be moved with Cmd/Ctrl + ←/→ or dragged to another monitor, and v2 had a 6-dot drag handle [S3][S4].
- **Size, v1 (Glass):** **353 × 47 px** window. The pill is `height: 47px`, `border-radius: 9000px`, `padding: 2px 10px 2px 13px`, `width: max-content` [S8][S12].
- **Size, v3 (Cluely site):** `rounded-full px-3 py-1.5`, `gap-1`. It contains a 32 px logo, a 32 px "Hide" pill button and a 32 px circular stop button, so it is **about 44 px tall** [S1].
- **Controls in v1, left to right** [S8]:
  1. **Listen** button, 78×26 px. Its label changes `Listen` → `Stop` (red tint) → `Done` (white). While it toggles it shows a loading-dots state.
  2. **Ask** label with keycaps `⌘ ↵`, or `Ctrl ↵` on Windows.
  3. **Show/Hide** label with keycaps `⌘ \`.
  4. **Settings** gear, 16 px icon in a round button. **Hovering** it opens the settings popover.
- **Controls in v2:** drag handle (round, separate), logo (opens the dashboard), status text "Not listening"/"Listening", a **toggle switch whose knob holds the mic-off or waveform icon**, a `■ End` pill, and a separate round `✕` (hide) [S3][S4].
- **Controls in v3:** logo, `⌃ Hide` pill (chevron-up icon and text), `■` stop-session circle [S1][S6].

### 1.2 Response panel (Ask / Assist)
- **Placement:** directly below the pill with an **8 px gap**, horizontally centered on the pill and clamped 8 px inside the work area. If there is less than 400 px of space below, it opens **above** the pill instead [S11].
- **Width:** Glass Ask window is **600 px** and Listen is 400 px [S12]. On the Cluely site the panel is `md:w-120` (480 px) [S1]. v2 doc screenshots show about 460 px at 1×.
- **Height:** grows with content (Glass caps at 700 px, re-measuring each animation frame) [S9]. The scrollable body is `max-h-[150px]` in the site mock and `max-height: 400px` in Glass.
- **Structure in v3** [S1][S6]:
  ```
  ┌ panel (rounded-2xl, 16px) ─────────────────────────────┐
  │ p-4 pb-2                                                │
  │                              [user bubble, right] ◢     │
  │                              "Sent with screenshot 🖼"   │
  │ answer text (12–13 px, line-height 1.6, #EDEEF2)        │
  │ ✦ Assist · ✎ What should I say? · ▭ Follow-up · ↻ Recap │  ← text chips separated by 3 px dots
  │ px-3 pb-3                                               │
  │ ┌ input (rounded-xl, 0.5px border) ──────────────────┐  │
  │ │ Ask about your screen or conversation, or ⌘ ↵ for… │  │
  │ │ [⚡ Smart]  [⋯]                              (➤)    │  │
  │ └────────────────────────────────────────────────────┘  │
  └─────────────────────────────────────────────────────────┘
  ```
- A round **"scroll to bottom ↓"** button floats at the bottom-right of the answer when it overflows [S6].
- Under each answer: `💡 Tell Me More` / `Elaborate` and `⧉ Copy` as small text actions [S4][S5].

### 1.3 Transcript / Live view
- **v1 (Glass):** a 400 px card with a top bar (`min-height 32px`, `padding 6px 16px`, hairline bottom border). On the left: "Live insights", or "<App> is Listening 00:42" in transcript mode. On the right: a "Show Transcript"/"Show Insights" toggle and a copy button [S10]. If both Ask and Listen are open, **Listen sits to the left of Ask**, 8 px apart [S11].
- **Transcript bubbles (Glass):** **me** = `rgba(0,122,255,.8)` right-aligned. **them** = `rgba(255,255,255,.1)` left-aligned. 13 px text, line-height 1.5, `padding 8px 12px`, radius 12 px with a 4 px tail corner, max-width 80%. The empty state is *"Waiting for speech..."* in 12 px italic at 60% white [S13].
- **v2 (Cluely):** "Show Transcript" text toggle at the card's top-right. Below the card, dynamic-insight chips are detected live, and `Tab` answers the first one [S3][S4].
- **v3:** the transcript moved to the dashboard window. The overlay keeps "real-time audio level visualization and transcript preview" [S2].
- **Recording widget (Cluely site):** large `00:00` timer, 36–42 px, semibold, `tabular-nums`, 60% white. Under it, a `size-1.5` **red-400 dot with `animate-pulse`** and "Recording". Under that, a **waveform of 6 px-wide rounded-full bars** (`h-24`, bar colour `rgba(255,255,255,.33)`, height driven by level) [S1].

### 1.4 Settings
- **v1 (Glass):** a **240 px wide** popover, max height 400. It is right-aligned to the pill and appears **5 px below it**. It opens on gear hover and hides 200 ms after the mouse leaves [S12][S11].
  - **Styling:** background `rgba(20,20,20,.8)`, radius 12, outline `0.5px rgba(255,255,255,.2)`, padding 12, 11 px text.
  - **Sections:** title and account; API key; models; a **shortcut list with keycaps** (Show/Hide, Ask Anything, Scroll Up/Down) and an "Edit Shortcuts" button; presets; Automatic Updates; `← Move` / `Move →`; Invisibility toggle; `Logout` / `Quit` (danger red `rgba(255,59,48,…)`) [S14].
- **v3 (Cluely):** a **quick menu** (about 220 px, dark glass, radius 16) that opens from the input bar. Rows [S6]:
  - `🕶 Undetectability [switch]`
  - `💬 Show/Hide Chat ⌘ \`
  - `Hide Chat Also Hides Widget [switch]`
  - `✦ Auto-Answer ⌘ ↵`
  - `↑ Move Cluely ⌘ ARROWS`
  - `↑ Scroll Chat ⇧ ⌘ ↑ ↓`
  - `↙ Collapse Chat ⌘ R`

  The full settings live in a separate normal dashboard window. Its sections are Invisibility, Output language, Meeting audio language, Change display, Disable auto launch, Version, and Logout/Quit [S3].

---

## 2. Visual tokens (measured)

### 2.1 Surfaces
| Element | Cluely (site mock, v3) [S1] | Glass clone (v1) [S8–S10] |
|---|---|---|
| Pill background | `hsla(252,10%,10%,0.8)` (cool near-black, faint violet) | `rgba(0,0,0,0.6)` |
| Panel background | `linear-gradient(180deg, hsla(252,10%,10%,.75) 0%, hsla(252,10%,10%,.8) 100%)` | `rgba(0,0,0,0.6)` plus a `::before` of `rgba(0,0,0,.15)` blurred 10 px |
| Hairline / border | `box-shadow: 0 0 0 1px rgba(207,226,255,.24), 0 -0.5px 0 0 rgba(255,255,255,.8)`, which is a cool ring plus a **bright top-edge highlight**. The panel also has `border-white/25`. | `::after` gradient border `linear-gradient(169deg, rgba(255,255,255,.17), rgba(255,255,255,.08) 50%, rgba(255,255,255,.17))`, 1 px, masked. Or `outline: .5px rgba(255,255,255,.3); outline-offset:-1px` |
| Radius | pill `9999px`; panel `16px` (rounded-2xl); input `12px` (rounded-xl); chips `9999px` | pill `9000px`; panels `12px`; keycaps `13%` (about 2–3 px) |
| Shadow | none beyond the rings (the window has `hasShadow:false`) | `0 8px 32px rgba(0,0,0,.3)` on a blurred pseudo-layer |
| Backdrop blur | `backdrop-blur-lg` (16 px) on site decoration only. The panel relies on **opacity, not blur**. | `backdrop-filter: blur(1px)` effectively off. The header blur is commented out. |
| Scrollbar | 4 px, thumb `#fff3`, hover `#ffffff59`, radius full, transparent track | 6 px, track `rgba(255,255,255,.05)`, thumb `.2`/`.3` |

**Why blur is mostly missing:** in Electron, CSS `backdrop-filter` only blurs the window's *own* web contents. It cannot blur other apps behind a transparent window [S16]. Cluely and Glass get the "glass" look from an **80% dark tint plus a bright top hairline**. Real desktop blur on Windows 11 needs `setBackgroundMaterial('acrylic')`, which requires Win11 22H2+ and draws a DWM backdrop [S15].

### 2.2 Controls
- **Pill buttons (Cluely v3):** `h-8` (32 px), `px-3`, `text-xs font-medium`. Background `linear-gradient(180deg,#2E3039 0%,#272A31 100%)` with an **inset top highlight** `shadow-[0_0.7px_0_0_#AFB3C4_inset]`. Hover is `scale(1.05)`. Icons are `#B2B3BA` [S1].
- **Primary / send / user-bubble (Cluely):** `linear-gradient(180deg,#0544A9 0%,#022C70 100%)` with `box-shadow: 0 0 0 .5px #0C44A1, 0 -1px 0 0 #022C70 inset, 0 .5px 0 0 #81B6FF inset`, which reads as a deep-blue "jelly" button. The send button is 24→28 px round, `transition-transform 160ms ease-out`, hover `scale(1.03)`, active `scale(.97)` [S1]. In the doc screenshots the `Submit ↵` button uses the same blue [S4][S5].
- **User bubble:** `rounded-xl rounded-br-sm` (12 px with a 2 px tail), `px-2.5 py-1.5`, 12 px white text, `max-w-72` (288 px), right-aligned [S1].
- **Action chips (v3):** text-only buttons, `rounded-full py-2 pr-2 pl-1.5`, 12 px, icon 14 px in `#B2B3BA`, label `#EDEEF2`. They are separated by **3 px dots in `#898B91`**. Hover gives a background of `#EDEEF2` at 10%, `75ms ease-out`, and the icon turns `#EDEEF2` over `150ms` [S1].
- **Chips (v2):** outlined pills of about 36 px with a 1 px `white/25` border, icon plus label [S4].
- **Toggle chip "⚡ Smart":** `h-[26px]`, rounded-full, 1 px `white/15` border, text `white/40`. Hover changes the border to `white/25` and the text to `#EDEEF2`, `150ms` [S1].
- **Input bar:** border `0.5px rgba(155,155,155,.4)` with a top highlight `0 -1px 0 0 rgba(255,255,255,.25)`, inner shadow `inset 0 2px 20px -1px rgba(0,0,0,.05)`, 13 px text, placeholder `white/60` [S1].
- **Glass v1:** Listen button 78×26 with a 14% white fill (18% on hover). Stop state `rgba(215,0,0,.5)`. Done state `rgba(255,255,255,.6)` with black text. Header action items are 26 px tall, `padding 0 8px`, radius 6, gap 9, hover `rgba(255,255,255,.1)`. Labels are 12 px/500 white [S8].

### 2.3 Typography
- **Cluely site and app:** `--font-sans: Geist, ui-sans-serif, system-ui` (the site also loads Inter). The app screenshots look like Inter/SF [S1][S4]. Body text in the overlay is **12–13 px with line-height 1.6** and text colour `#EDEEF2`.
  - Secondary text: `#B2B3BA`.
  - Tertiary text and dots: `#898B91`.
  - Meta text ("Sent with screenshot"): 10–12 px at `white/50`.
- **Glass:** `'Helvetica Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto`.
  - Labels 12–13 px/500, body 14 px/1.6, settings 11 px.
  - `user-select:none` everywhere except answer text [S8][S9].
- **Mono:** `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas` [S1]. Glass uses Monaco/Menlo at 11–13 px.

### 2.4 Icons
Cluely's site mock uses **Lucide**: `sparkles` (Assist), `wand-sparkles` (What should I say?), `message-square` (Follow-up), `refresh-cw` (Recap), `zap` (Smart), `ellipsis`, `chevron-down`/`chevron-up` (Hide), and `square` filled white (stop). Sizes are 14 px (`size-3.5`) in chips and 16 px in the pill [S1]. Glass uses custom 12–16 px SVGs [S8].

### 2.5 Markdown and code (Glass is the only exact source) [S9]
| Element | Style |
|---|---|
| Headings | `rgba(255,255,255,.95)`, weight 600, margin `16px 0 8px` |
| Paragraphs | margin `8px 0`, colour `.9` |
| Lists | `padding-left 20px`, `li` margin `4px 0` |
| Inline code | `rgba(255,255,255,.1)` background, `padding 2px 6px`, radius 4, mono 13 px |
| Code blocks | `rgba(0,0,0,.4)` background, radius 8, padding 12, 1 px `rgba(255,255,255,.1)` border, mono 11 px, `overflow-x:auto` |
| Syntax colours | Dracula-like: keyword `#ff79c6`, string `#f1fa8c`, comment `#6272a4`, number `#bd93f9`, function `#50fa7b`, variable `#8be9fd`, built-in `#ffb86c`. Rendered with highlight.js `github-dark`. |
| Blockquote | 3 px left border `white/.3` |
| Per-line copy | button 20×20 at `left:-32px`, fades in on hover over 150 ms; "copied" is green `rgba(40,167,69,.3)` for 1500 ms |

Cluely's changelog adds that it enforces "pretty formatting for LaTeX and code responses, in addition to consistent copy-paste options" and supports markdown LaTeX [S2].

### 2.6 Light and dark
The overlay is **always dark**: every screenshot from v1 to v3 shows a dark tint over any wallpaper. The **dashboard** follows the system light/dark setting (changelog, Oct 2025) [S2]. The site ships light and dark favicon and wordmark variants [S1].

---

## 3. States and motion

| State | Cluely | Glass (exact) |
|---|---|---|
| **Idle** | Pill only. v2 shows "Not listening" with the switch off and a mic-slash icon [S3]. | Pill only: "Listen" |
| **Listening** | v2 shows "Listening" with the switch on (waveform icon on the knob) and an `■ End` button that carries elapsed time [S4][S3]. The site shows a red pulsing 6 px dot, "Recording", a timer and a live bar waveform [S1]. v3 has "real-time audio level visualization" [S2]. | Button turns red "Stop". The panel title is "<App> is Listening mm:ss". |
| **Toggling** | — | Three 6 px white dots, `pulse 1.4s ease-in-out infinite`, delays −0.32 s / −0.16 s / 0 [S8] |
| **Thinking** | "Cluely now shows you what it's thinking as it prepares responses" (Oct 2025) [S2]. The user bubble shows "Sent with screenshot" with a hover preview [S2][S6]. | Header text "analyzing screen..." then "thinking..." after 1500 ms, with a 150 ms fade between. Three 8 px dots, `pulse 1.5s ease-in-out infinite`, staggered 0/0.2/0.4 s, keyframe `opacity .3 scale .8 → opacity 1 scale 1.2 @40%` [S9] |
| **Streaming** | The site mock reveals the answer **word by word**: each word is a `<span>` that starts at opacity 0 and fades in. Message groups enter from `translateY(20px)`, opacity 0 [S1]. | Incremental markdown (`smd.js`) is fed only the new text slice. highlight.js runs once per finished block. The window height is re-measured every animation frame [S9]. |
| **Error** | Not documented publicly. | Not specially styled. |
| **Done (session)** | `■ End` / "Finish" goes to the dashboard notes [S5]. | "Done" white button [S8] |

### 3.1 Show/hide and panel motion (exact values)
- **Panel open (Cluely site):** `origin-top transition-all duration-100 ease-out`. The hero entrance is `translateY(200px) scale(.7)` → identity [S1].
- **Glass `slideDown` (show), 350 ms, `cubic-bezier(0.34, 1.56, 0.64, 1)`, a springy overshoot** [S9]:
  - 0%: `translateY(-150%) scale(.85)`, opacity 0, blur 2 px
  - 65%: `-5%`, scale .99
  - 85%: `+2%`, scale 1.005
  - 100%: rest position
- **Glass `slideUp` (hide), 300 ms, `cubic-bezier(0.4, 0, 0.6, 1)`.** It runs the same path in reverse and ends at `-150%`, scale .85, blur 2 px.
- **Glass window-level animation:** an extra layer on top of the CSS keyframes.
  - The Ask window fades in from **y−20 px** and the Listen window from **x−50 px**.
  - These use window opacity: fade 250 ms, move 300 ms, `easeOutCubic`, stepped about every 8 ms [S12][S17].
- **Hover:** buttons go `scale(1.05)` (Cluely). Backgrounds change over 0.15 s ease (Glass). Press is `translateY(1px)` (Glass) or `scale(.97)` (Cluely) [S1][S14].
- **Moving the window:** a Ctrl+arrow step is **80 px** (Glass) and is clamped to the work area. It animates with `easeOutCubic` over 300 ms [S11][S17]. Cluely v2 also has a 6-dot drag handle, and its changelog mentions a "default padding and safe area" for moving [S2].
- **Click-through:** Electron transparent windows do **not** click through by default [S16]. Glass offers a `Ctrl+M` "toggleClickThrough" keybind and uses `setIgnoreMouseEvents(true,{forward:true})` [S11][S15]. `forward:true` keeps hover events working on Windows and macOS.

---

## 4. Hotkeys and keycap style
- **Cluely defaults** [S3][S2][S6]:

  | Action | Shortcut |
  |---|---|
  | Assist / Ask | `Ctrl/⌘ + Enter`, customisable since Oct 2025 |
  | Quick or "stealth" answer | `Ctrl/⌘ + Shift + Enter` |
  | Show/hide | `Ctrl/⌘ + \` |
  | Clear or collapse | `Ctrl/⌘ + R` |
  | Move | `Ctrl/⌘ + arrows` |
  | Scroll chat | `Ctrl/⌘ + Shift + ↑/↓` |
  | Answer first insight | `Tab` |

- **Glass defaults (Windows)** [S18]: `Ctrl+\` show/hide, `Ctrl+Enter` ask, `Ctrl+M` click-through, `Ctrl+Shift+S` screenshot, `Ctrl+[`/`]` previous/next response, `Ctrl+Shift+↑/↓` scroll, `Ctrl+arrows` move.
- **Keycap styles:**
  - **Cluely site:** `h-[22px] w-5` (20×22) `rounded-md` (6 px), `border border-white/20`, `bg-gradient-to-b from-black/10 to-black/15`, mono 10 px at `white/50`, shown inline in placeholder text ("…or ⌘ ↵ for Assist") [S1].
  - **Cluely app quick menu:** light-grey filled caps of about 22×22, radius 6, dark glyphs, with wider caps for words such as `ARROWS` [S6].
  - **Glass:** 18×18, `rgba(255,255,255,.1)`, radius 13%, 12 px. Accelerator strings are split on `+` and mapped to symbols (`Cmd→⌘ Ctrl→⌃ Alt→⌥ Shift→⇧ Enter→↵`), and `\` is drawn as a custom SVG slash [S8].
  - **On Windows, render words, not mac glyphs:** `Ctrl`, `Shift`, `Alt`, `↵`, `\`.

---

## 5. Design spec for **Shadow**
This spec takes inspiration from Cluely without copying it. Shadow has its own name, its own mark (a simple half-moon or eclipse glyph, not Cluely's), its own accent (cool indigo-violet instead of Cluely's deep navy blue), and slightly different geometry.

### 5.1 Tokens (`:root`)
```css
:root {
  /* surfaces – cool near-black, opacity does the "glass" */
  --sh-surface:          hsla(240, 12%, 9%, 0.82);   /* pill + panel */
  --sh-surface-top:      hsla(240, 12%, 11%, 0.78);  /* panel gradient start */
  --sh-surface-raised:   linear-gradient(180deg, #2C2E38 0%, #24262E 100%); /* buttons in pill */
  --sh-surface-input:    rgba(0, 0, 0, 0.22);
  --sh-surface-hover:    rgba(237, 238, 242, 0.08);
  --sh-surface-press:    rgba(237, 238, 242, 0.14);
  --sh-scrim-code:       rgba(0, 0, 0, 0.38);

  /* lines */
  --sh-ring:             0 0 0 1px rgba(200, 210, 255, 0.18);
  --sh-highlight-top:    0 -0.5px 0 0 rgba(255, 255, 255, 0.55);   /* lit top edge */
  --sh-hairline:         rgba(255, 255, 255, 0.10);                 /* dividers */
  --sh-border-input:     rgba(160, 160, 175, 0.35);
  --sh-btn-inset:        inset 0 0.7px 0 0 rgba(175, 180, 200, 0.9);

  /* text */
  --sh-text:             #ECEDF1;
  --sh-text-2:           #B3B4BC;
  --sh-text-3:           #8A8C94;
  --sh-text-placeholder: rgba(255, 255, 255, 0.55);

  /* accent (Shadow indigo) + status */
  --sh-accent:           #6D5EF5;
  --sh-accent-grad:      linear-gradient(180deg, #5B4BE8 0%, #3B2FB0 100%);
  --sh-accent-ring:      0 0 0 0.5px #4C3FD0, inset 0 0.5px 0 0 #A89FFF, inset 0 -1px 0 0 #2E2490;
  --sh-live:             #F87171;   /* recording dot */
  --sh-success:          #34D399;
  --sh-danger-bg:        rgba(255, 69, 58, 0.12);
  --sh-danger-text:      #FF6B61;
  --sh-transcript-me:    rgba(109, 94, 245, 0.75);
  --sh-transcript-them:  rgba(255, 255, 255, 0.08);

  /* radii */
  --sh-r-pill: 9999px; --sh-r-panel: 18px; --sh-r-input: 12px;
  --sh-r-bubble: 12px; --sh-r-tail: 3px; --sh-r-code: 8px; --sh-r-key: 5px;

  /* type */
  --sh-font: "Inter Variable", "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif;
  --sh-mono: "Cascadia Code", "JetBrains Mono", Consolas, ui-monospace, monospace;
  --sh-fs-meta: 10.5px; --sh-fs-label: 12px; --sh-fs-body: 13px; --sh-fs-code: 12px;
  --sh-lh-body: 1.6; --sh-fw-regular: 400; --sh-fw-medium: 500; --sh-fw-semibold: 600;

  /* spacing / sizes */
  --sh-pill-h: 44px; --sh-pill-pad: 6px; --sh-btn-h: 32px; --sh-gap: 6px;
  --sh-panel-w: 520px; --sh-panel-pad: 16px; --sh-panel-gap: 8px; --sh-top-offset: 20px;
  --sh-key-h: 20px; --sh-key-minw: 20px; --sh-icon: 16px; --sh-icon-sm: 14px;

  /* motion */
  --sh-ease-out:    cubic-bezier(0.23, 1, 0.32, 1);
  --sh-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --sh-ease-in:     cubic-bezier(0.4, 0, 0.6, 1);
  --sh-dur-hover: 120ms; --sh-dur-press: 90ms; --sh-dur-panel-in: 280ms;
  --sh-dur-panel-out: 180ms; --sh-dur-content: 200ms; --sh-dur-word: 140ms;
}
@media (prefers-reduced-motion: reduce) {
  :root { --sh-dur-panel-in: 0ms; --sh-dur-panel-out: 0ms; --sh-dur-word: 0ms; }
}
```
**Notes on these tokens:**
- The tint is a little more opaque than Cluely's (0.82 vs 0.75–0.8) because Windows has no system blur behind transparent windows. This keeps text readable over busy windows.
- Keep the overlay **always dark**. Only the separate Settings/History window should follow the system theme.

### 5.2 Components
| Component | Spec |
|---|---|
| `CommandPill` | Height 44, `--sh-surface` with `--sh-ring` and `--sh-highlight-top`, `drag` region, padding 6, gap 6. Contents: `Logo(28)` · `ListenToggle` · `ActionHint("Ask", [Ctrl,↵])` · `ActionHint("Hide", [Ctrl,\])` · `IconButton(⋯ / settings)`. |
| `ListenToggle` | 32 px pill button. States: idle (mic icon, "Listen"); live (red dot with pulse, `mm:ss` in tabular nums, 5-bar mini waveform); stopping (3 dots). |
| `ActionHint` | 32 px ghost button: label 12/500 plus a `Keycap` group. Hover uses `--sh-surface-hover`. Click does the same action as the hotkey. |
| `Keycap` | Min 20×20, padding 0 5, radius 5, 1 px `white/18` border, `linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.04))`, 10.5 px medium, `--sh-text-2`. Windows labels: `Ctrl`, `Shift`, `Alt`, `↵`, `\`, `↑↓←→`. |
| `IconButton` | 32 round, `--sh-surface-raised` with `--sh-btn-inset`. Hover `scale(1.04)`, press `scale(.96)`. |
| `ResponsePanel` | `--sh-panel-w` 520 (min 380, max 720). Radius 18, `--sh-surface-top`→`--sh-surface` gradient, ring and top highlight, padding 16/16/8. Header row: status label ("Thinking…", "Answer") on the left; `Copy`, `Collapse` (Ctrl+R) and `✕` on the right. |
| `UserBubble` | Right-aligned, `--sh-accent-grad` with `--sh-accent-ring`, radius 12 with a 3 px bottom-right corner, 12 px text, max-width 300. Optional "📷 with screenshot" meta line at 10.5 px `--sh-text-3`, which shows a thumbnail preview on hover. |
| `AnswerBody` | Markdown at 13/1.6 `--sh-text`, selectable. Headings 600 weight, 14/13 px. Code blocks use `--sh-scrim-code`, radius 8, 1 px hairline, a `lang · Copy` bar at the top, Shiki or highlight.js `github-dark-dimmed`. Inline code `white/10`, radius 4. Tables use hairline rows. KaTeX for math. |
| `ChipRow` | Text chips (no fill until hover), 14 px Lucide icon in `--sh-text-2`, label `--sh-text`, separated by 3 px `--sh-text-3` dots. Suggested set: `Sparkles` Assist · `MessageCircleQuestion` What next? · `ListChecks` Follow-ups · `RotateCcw` Recap. `Ctrl+1…4` triggers them. |
| `AskInput` | Radius 12, `--sh-surface-input`, 0.5 px `--sh-border-input` with a `white/.2` top highlight. The placeholder includes inline keycaps: "Ask about your screen or call, or [Ctrl][↵] to assist". Footer: `[⚡ Deep]` toggle chip, `[📷 Screen]` toggle, `(➤)` 28 px accent send button. |
| `TranscriptPane` | 400 px card (left of the panel, or a tab). Rows rather than bubbles: a speaker label at 10.5 px uppercase `--sh-text-3`, then 13 px text. "You" lines get a 2 px left bar in `--sh-accent`, which is distinct from Cluely and Glass bubbles. The live partial line is italic at 60% white. Auto-scroll pauses when the user scrolls up and a "↓ Live" pill appears. |
| `QuickMenu` | 240 px popover, radius 14. Rows are 34 px with icon, label and a keycap or switch on the right: Click-through, Hide from capture, Move, Scroll, Clear, Settings…, Quit. |
| `Toast/ErrorBanner` | Inside the panel at the top, 32 px, `--sh-danger-bg`, `--sh-danger-text`, with a `Retry` ghost button. |

### 5.3 Wireframes (ASCII, 1× px)

**Idle.** A 44 px pill, 20 px from the top, centered.
```
                ╭──────────────────────────────────────────────────────────╮
                │ ◐  (🎙 Listen)  Ask [Ctrl][↵]   Hide [Ctrl][\]   ( ⋯ ) │
                ╰──────────────────────────────────────────────────────────╯
```
**Listening.**
```
                ╭──────────────────────────────────────────────────────────╮
                │ ◐  (● 02:14 ▁▃▅▂▆)  Ask [Ctrl][↵]   Hide [Ctrl][\]  ( ⋯ )│
                ╰──────────────────────────────────────────────────────────╯
                  ● = --sh-live, opacity pulse 1.2s; bars = audio RMS, 60fps
```
**Thinking.** The panel slides in 8 px below the pill.
```
 ╭────────────────────────────────────────────────────────────╮
 │ ◌ Reading screen…                          ⧉   ⌃R   ✕       │
 │                                  ╭─────────────────────────╮│
 │                                  │ What should I say next? ││  ← accent bubble
 │                                  ╰────────────────────────◢╯│
 │                                      📷 with screenshot      │
 │  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒                                  │  ← shimmer skeleton, 2 lines
 │  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒                                           │
 │ ╭──────────────────────────────────────────────────────────╮│
 │ │ Ask about your screen or call, or [Ctrl][↵] to assist    ││
 │ │ [⚡ Deep] [📷 Screen]                              (➤)   ││
 │ ╰──────────────────────────────────────────────────────────╯│
 ╰────────────────────────────────────────────────────────────╯
```
**Streaming or answered.**
```
 ╭────────────────────────────────────────────────────────────╮
 │ Answer                                      ⧉   ⌃R   ✕       │
 │                                  ╭─────────────────────────╮│
 │                                  │ Explain this error      ││
 │                                  ╰────────────────────────◢╯│
 │ The stack trace shows a null `userId` being passed to…▌     │  ← caret blinks while streaming
 │ ┌ ts ─────────────────────────────────────────── Copy ┐     │
 │ │ if (!userId) throw new Error("missing userId");    │     │
 │ └────────────────────────────────────────────────────┘     │
 │ ✦ Assist · ? What next · ☰ Follow-ups · ↺ Recap      (↓)    │
 │ ╭──────────────────────────────────────────────────────────╮│
 │ │ Ask a follow-up…                                   (➤)   ││
 │ ╰──────────────────────────────────────────────────────────╯│
 ╰────────────────────────────────────────────────────────────╯
```
**Listening with transcript.** The transcript sits left of the answer, 8 px gap.
```
 ╭ Transcript ───────── 02:14 ⧉ ╮ ╭ Answer ──────────────────────────╮
 │ THEM                          │ │ • They're asking about scaling… │
 │ How would you shard this?     │ │ • Mention consistent hashing…   │
 │ YOU                           │ │                                 │
 ││ I'd start by partitioning…   │ │ ✦ Assist · ? What next · ↺ Recap│
 │ THEM                          │ │ ╭─────────────────────────────╮ │
 │ and what about hot keys_      │ │ │ Ask…                  (➤)   │ │
 │                    (↓ Live)   │ │ ╰─────────────────────────────╯ │
 ╰───────────────────────────────╯ ╰─────────────────────────────────╯
```
**Error.**
```
 ╭────────────────────────────────────────────────────────────╮
 │ ⚠ Couldn't reach the model (401 – check API key)  [Retry]  │  ← --sh-danger-bg strip
 │ …previous content stays visible…                            │
 ╰────────────────────────────────────────────────────────────╯
```
**Hidden.** Nothing is drawn. The window stays alive with `opacity 0` and click-through so `Ctrl+\` restores it instantly.

### 5.4 Motion spec
| Interaction | Animation |
|---|---|
| Pill show | `translateY(-12px) scale(.96)`, opacity 0 → rest. 280 ms `--sh-ease-spring`. Add `filter: blur(2px→0)` for the first 60% only. |
| Pill hide | rest → `translateY(-10px) scale(.97)`, opacity 0. 180 ms `--sh-ease-in`. Then `setIgnoreMouseEvents(true)`. |
| Panel open | `transform-origin: top center`, `translateY(-8px) scale(.98)`, opacity 0 → rest. 240 ms `--sh-ease-out`. Height changes animate in CSS (`grid-template-rows: 0fr→1fr`, 200 ms) rather than resizing the window every frame. Resize the BrowserWindow once to its max height and keep the empty area click-through. |
| Panel close | opacity → 0 and `translateY(-6px)`, 160 ms `--sh-ease-in` |
| Streaming text | Append tokens. Fade each new word span from opacity 0 → 1 over 140 ms, no movement. Show a blinking caret (1 s steps) while streaming. Auto-scroll only if the user is within 24 px of the bottom. |
| Thinking | A 2-line skeleton shimmer (linear-gradient sweep, 1.4 s linear infinite) plus a status label that cross-fades: "Reading screen…" → "Thinking…", 150 ms fade |
| Listening dot | `opacity 1 → .35 → 1`, 1.2 s ease-in-out infinite. Waveform: 5 bars, 3 px wide with a 2 px gap, height = clamp(RMS) and smoothed (analyser `smoothingTimeConstant .8`). |
| Hover / press | Background 120 ms ease-out. Icon buttons `scale(1.04)` on hover and `.96` on press (90 ms). Chips show a background tint only. |
| Move (`Ctrl+arrows`) | 80 px step, clamped 8 px inside the work area. Animate window bounds over 220 ms with easeOutCubic (requestAnimationFrame in main via `setBounds`; or snap instantly if it looks janky on Windows). |
| Copy feedback | Icon swaps to a check: opacity and scale .5→1, 200 ms. Reverts after 1.5 s. |
| Reduced motion | Disable transforms. Keep 0–100 ms opacity fades only. |

### 5.5 Window and Windows 11 behaviour (Electron)
- **One frameless window for pill and panels** (simpler than Glass's multiple child windows):
  ```
  transparent: true, frame: false, backgroundColor: '#00000000', hasShadow: false,
  alwaysOnTop: true ('screen-saver' level), skipTaskbar: true, resizable: false, focusable: true
  ```
  Size it to about 760×720 and anchor it top-center at y = workArea.y + 20.
- **Click-through:** call `win.setIgnoreMouseEvents(true, { forward: true })` by default. In the renderer, switch it to `false` on `mouseenter` of any `[data-interactive]` element and back to `true` on `mouseleave`. This makes the transparent area click through to apps underneath, which is the Cluely feel [S15]. Add a "lock click-through" hotkey (Glass uses `Ctrl+M`).
- **Real blur is optional:** use `win.setBackgroundMaterial('acrylic')` on Win11 22H2+ [S15]. It blurs the *whole rectangular window*, so it only suits a tightly sized window and loses the pill's rounded shape. **Default to the tinted look and offer Acrylic as an experimental toggle.**
- **Capture visibility:** `setContentProtection(true)` makes Windows exclude the window from capture (`WDA_EXCLUDEFROMCAPTURE`) [S15]. For a college project, expose it as a clearly labelled setting, off by default, and document it honestly.
- **Hotkeys (`globalShortcut`, Windows labels):**

  | Action | Shortcut |
  |---|---|
  | Show/hide | `Ctrl+\` |
  | Ask/assist | `Ctrl+Enter` |
  | Quick answer, no typing | `Ctrl+Shift+Enter` |
  | Listen toggle | `Ctrl+Shift+L` |
  | Click-through lock | `Ctrl+Shift+M` |
  | Move | `Ctrl+Alt+arrows` |
  | Scroll answer | `Ctrl+Shift+↑/↓` |
  | Clear / collapse | `Ctrl+Shift+R` |
  | Chips | `Ctrl+1…4` |

  Do **not** register `Ctrl+R` or `Ctrl+arrows` globally on Windows. They break browser reload and word-jumping in editors.

---

## Sources
- [S1] Cluely homepage, live hero overlay mock (Tailwind classes and inline styles read from the page HTML): https://cluely.com, and its CSS bundle https://cluely.com/_next/static/css/e0f47fde64bf82ef.css
- [S2] Cluely changelog: https://docs.cluely.com/changelog.md
- [S3] Cluely docs, Settings (shortcuts, invisibility, move): https://docs.cluely.com/feature/settings.md (mirror https://cluely.mintlify.app/feature/settings)
- [S4] Cluely docs, Live Insights (nav bar anatomy and screenshots): https://docs.cluely.com/feature/liveinsights.md
  - https://mintcdn.com/cluely/CIUEoHdBRzV0QVr8/images/LiveInsightWidgetGuide.png
  - https://mintcdn.com/cluely/CIUEoHdBRzV0QVr8/images/LiveInsightswithModesCard.png
  - https://mintcdn.com/cluely/GRU8T6AGqxOXTC8w/images/ToggleInvisibility.png
- [S5] Cluely Quickstart screenshot: https://mintcdn.com/cluely/88LHYnVxgEi46QIN/images/liveinsights.webp. Undetectability doc: https://docs.cluely.com/feature/undetectability.md
- [S6] FavTutor, "What Is Cluely AI?" (current widget screenshots: Assist answer and quick menu): https://favtutor.com/what-is-cluely-ai/
- [S7] CoPilot Interview, "How does Cluely work": https://copilotinterview.com/blog/how-does-cluely-work
- [S8] Glass (fork of pickle-com/glass, whose original repo now returns 404), MainHeader.js: https://raw.githubusercontent.com/mickaelleclercq/glass/main/src/ui/app/MainHeader.js
- [S9] Glass AskView.js: https://raw.githubusercontent.com/mickaelleclercq/glass/main/src/ui/ask/AskView.js
- [S10] Glass ListenView.js: https://raw.githubusercontent.com/mickaelleclercq/glass/main/src/ui/listen/ListenView.js
- [S11] Glass windowLayoutManager.js: https://raw.githubusercontent.com/mickaelleclercq/glass/main/src/window/windowLayoutManager.js
- [S12] Glass windowManager.js: https://raw.githubusercontent.com/mickaelleclercq/glass/main/src/window/windowManager.js
- [S13] Glass SttView.js: https://raw.githubusercontent.com/mickaelleclercq/glass/main/src/ui/listen/stt/SttView.js
- [S14] Glass SettingsView.js: https://raw.githubusercontent.com/mickaelleclercq/glass/main/src/ui/settings/SettingsView.js
- [S15] Electron BrowserWindow API (`setBackgroundMaterial`, `setIgnoreMouseEvents`, `setContentProtection`): https://www.electronjs.org/docs/latest/api/browser-window
- [S16] Electron custom window styles, transparent-window limitations: https://www.electronjs.org/docs/latest/tutorial/custom-window-styles
- [S17] Glass smoothMovementManager.js: https://raw.githubusercontent.com/mickaelleclercq/glass/main/src/window/smoothMovementManager.js
- [S18] Glass shortcutsService.js: https://raw.githubusercontent.com/mickaelleclercq/glass/main/src/features/shortcuts/shortcutsService.js
- [S19] free-cluely (Prat011), liquid-glass CSS and command bar: https://github.com/Prat011/free-cluely, https://raw.githubusercontent.com/Prat011/free-cluely/master/src/index.css, https://raw.githubusercontent.com/Prat011/free-cluely/master/src/components/Queue/QueueCommands.tsx
  - Its look: white 25% liquid glass, `blur(16px) saturate(180%)`, a 32 px bar, and `bg-white/10 rounded-md` keycaps. This is a *different*, lighter aesthetic than Cluely's.
- [S20] Pluely (Tauri, shadcn/ui): https://github.com/iamsrikanthnani/pluely, overlay window 600×54 in `src-tauri/tauri.conf.json`. Shortcuts: https://docs.pluely.com/docs/guides/overlay-shortcuts
