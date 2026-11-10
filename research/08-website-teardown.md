# 08 — Website teardown: cluely.com and interviewcoder.co

Captured 2026-11-10 with curl only (no headless browser). I read the HTML, CSS and JS bundles statically. Raw downloads, outlines and scan outputs are in
`C:\Users\aayus\AppData\Local\Temp\claude\17a290732bf5a72f\7a2d8903-17dc-4bfd-bba5-a095d63eb4ce\scratchpad\teardown\{cluely,interviewcoder}\`
(`outline.txt` = page text in order, `hero_tags.txt` = hero DOM with classes, `css_scan.txt` = tokens/keyframes, `motion_scan.txt` = framer-motion props).

Values below come straight from the code unless marked **(guess)**. I haven't seen either site rendered, so check layout and visual impressions against the screenshots the other process takes.

---

## 1. cluely.com

### 1.1 Stack
| Item | Finding |
|---|---|
| Framework | **Next.js App Router** (`/_next/static/chunks/app/(website)/page-*.js`, route groups `(website)` and `(funnel)`), React, **Tailwind v4** (oklch palette vars, `@property --tw-*`), shadcn/ui tokens (`--background`, `--primary`… as HSL triplets) |
| Motion | **framer-motion / motion** (whileInView ×14, motion values, `animate()` imperative calls). CSS keyframes for the hero headline. No GSAP, no Lenis, no Lottie. `rive.wasm` / `@rive-app` string present in a shared chunk; I didn't confirm whether the home page uses it |
| UI libs | Radix (accordion FAQ), **vaul** drawer ("Get the desktop app" opens a drawer), number-flow CSS vars (`--number-flow-mask-*`, likely the animated pricing numbers) |
| Analytics | PostHog, Sentry, gtag, Intercom, Delve cookie-consent (`cdn.delve.co`) |
| Hero video | `/videos/home/hero-v2/pro-res-hevc-safari.mp4` (**9.74 MB**, HEVC, served to Safari) + `/videos/home/hero-v2/pro-res-vp9-chrome.webm` (**0.81 MB**, VP9). The HEVC/VP9 pair is the standard recipe for **video with an alpha channel** (transparent video composited over a DOM desktop). The alpha is my **(guess)** from the naming and codec pairing |
| Images | PNG/JPG sources served through `/_next/image` (re-encoded to WebP/AVIF by Accept header). Wallpaper loaded twice: `q=10` blurred copy as glow + `q=100` sharp copy |
| Weight (home) | HTML 229 KB (36 KB gz). **31 JS files, 1.22 MB raw / ~389 KB gz** (+112 KB nomodule polyfills). CSS 3 files 310 KB raw / 48 KB gz (whole-site Tailwind). 3 preloaded woff2. 43 `<img>`, 1 `<video>`, 91 `<script>` tags |

### 1.2 Fonts (all self-hosted through `next/font`)
- **Geist** 400/500/600: default sans (`--font-sans: var(--font-geist)`), used for body and all section headings.
- **EB Garamond** 400 (rendered `font-medium`): only for the **hero H1** (`style="font-family:var(--font-eb-garamond)"`). Serif display over a sans system is the signature move.
- **forma** (custom woff2, preloaded): pricing-page H1 (`font-forma`).
- Inter: loaded by a funnel-route CSS file, not the main site.
- No `clamp()` anywhere. Sizes step at breakpoints:
  - Hero H1: `text-[56px] lg:text-[80px]`, `leading-[96%]`, `tracking-[-1px]`, white, `max-w-[360px] lg:max-w-[560px]`.
  - Hero subhead (H2): Geist 500, `lg:text-[19px]`, `leading-[140%]`, `tracking-[-0.02em]`, white, with a 5-layer near-invisible text-shadow for legibility on the sky image.
  - Section H2: Geist 500, `text-3xl lg:text-5xl xl:text-[56px]` (30→48→56 px), `leading-[1.25]`, `tracking-[-1.28px]`, **gradient text** `from-[#19191D] to-[#626275]` with `bg-clip-text`.
  - Card H3: `text-[26px] lg:text-28` (28 px), `leading-tight`, `tracking-[-0.5px]`.
  - Body/sub copy: `text-base md:text-lg`, `leading-relaxed`, colour `#8C929D`.
  - CTA band H3: 20→28 px, `-tracking-[0.04em]`.
  - Utility scale: `tracking-2` = -0.02em, `tracking-4` = -0.04em. Custom text sizes `text-14…text-36` in px steps.

### 1.3 Colour tokens
- **Page**: white (`--background: 0 0% 100%`), foreground `#040406`.
- **Hero**: `.hero-v2` = sky/cloud bitmap `/images/pages/home/background{,@2x,@4x}.png` sized `max(100vw,100rem)`, faded into white with `radial-gradient(87.76% 87.72% at 50% 9.2%, #fff0 41.36%, #fff 71.93%)`. Mobile (≤768px) swaps the image for `radial-gradient(187.39% 86.87% at 50% 13.13%, #4a8fdd 23.39%, #4a8fdd00 100%)`.
- **Primary blue**: `--primary: 217 91% 60%` (≈ #3B82F6). Brand button fills:
  - `.primary-fill`: `radial-gradient(179.05% 132.83% at 46.18% -23.44%, #1562df, #0c26a8)` + hairline `0 0 0 .678px #0c44a1`, `inset 0 .678px #81b6ff` top highlight, glow `0 9px 27.9px #6b6de7c4`, plus a 5-layer long soft drop shadow.
  - `.purple-gradient-button` ("Get the desktop app"): `radial-gradient(… #fff9 → #fff0)` overlay-blended on `radial-gradient(114.65% … at 9.73% 17.27%, #1e82e0, #1c38ea)`, shadow `20px 20px 24px #94acf366, inset -3px -3px 4px #bfe5fb66, inset 4px 4px 4px #131ae41a`, radius 12 px, `transition: transform .16s ease-out`. Over it sits `.blurred-border` (a 3 px gradient border `#ffffff80→#fff0` drawn with mask-composite exclude, opacity .45, blurred 1px) plus a noise PNG overlay at opacity .3.
- **Neutrals / surfaces**: footer & cards `#DDE2EE` ("secondary-blue"). `.card-styles` = `radial-gradient(92.09% 126.39% at 50% 100%, #dde2ee 58.91%, #bbc5dd 100%)`, radius 24 px. Light neumorphic shadows such as `-18px -9px 32.9px #ffffff80, … 15px 15px 39.3px #b2c2dd, inset 2px 2px 1.4px #ffffff8f`.
- **Overlay ("Cluely window") in hero** (the most relevant part for Shadow):
  - Panel: `background: linear-gradient(180deg, hsla(252,10%,10%,0.75), hsla(252,10%,10%,0.8))`, `border: 1px solid rgba(255,255,255,.25)`, `box-shadow: 0 0 0 1px rgba(207,226,255,.24), 0 -0.5px 0 0 rgba(255,255,255,.8)` (top specular edge), radius 16 px. **No backdrop-filter on the panel itself**: it is a dark tint, not blur.
  - Pill toolbar above it: `hsla(252,10%,10%,.8)`, same ring. Buttons `linear-gradient(180deg,#2E3039,#272A31)` + `inset 0 .7px 0 #AFB3C4`.
  - User bubble: `linear-gradient(180deg,#0544a9,#022c70)`, `0 0 0 .5px #0c44a1, inset 0 -1px #022c70, inset 0 .5px #81b6ff`, `rounded-xl rounded-br-sm`.
  - AI text `#edeef2` 12 px, `leading-[1.6]`. Muted icons `#b2b3ba`, dot separators `#898b91`.
  - Input: `border .5px solid rgba(155,155,155,.4)`, `box-shadow 0 -1px 0 rgba(255,255,255,.25)`. Keycaps `⌘ ↵` as tiny bordered boxes (`border-white/20`, `from-black/10 to-black/15`, mono 9–10 px).
  - Custom scrollbar `.cluely-scrollbar { scrollbar-color:#fff3 transparent }`.
- **Glass where it exists**: macOS dock in the hero mock = `bg-white/10 border-white/10 backdrop-blur-lg` (16 px). Other blur utilities in CSS: 4/8/12/16/24/64 px, `blur(7.206px)`, `blur(3px)`.
- Hero video mask: `.hero-video-mask` = `linear-gradient(#0000 10%, #000 15%)` ∩ `radial-gradient(43.44% 165.87% at 50% -19.87%, #000 0 90%, #0000)`.

### 1.4 Motion (exact values)
**Hero entrance timeline** (all on load, from `chunks_8063`, `chunks_4361`):
| t (s) | Element | Animation |
|---|---|---|
| 0.0–0.4 | H1 words | CSS `hero-word-rise`: `translateY(1.25em) → none`, **0.55s `cubic-bezier(0.22,1,0.36,1)`**, stagger **0.1s/word**. Each word sits in an `overflow-hidden` span with `pb-[0.22em] -mb-[0.22em]` so descenders aren't clipped (a mask reveal) |
| 1.0 | gradient hairline `<hr>` (w-96, white 0→30%→0) | CSS `hero-fade-up` (opacity 0, translateY 8px → none) **0.5s ease-out** |
| 1.2 | subhead | same `hero-fade-up` 0.5s ease-out |
| 1.3 | CTA row | framer spring **stiffness 490, damping 130**, y 16→0 (very overdamped, no bounce) |
| 1.5 | Desktop mock (wallpaper + menubar) | `opacity 0, z:100, y:200 → 0` inside `perspective-midrange` (800px). z: spring **400/120 mass 3**; y: spring **200/40** |
| 1.8 | Dock icons | variants `z:350 → 0`, spring **400/120**, `staggerChildren .1` (icons "fall" toward the screen) |
| 2.1 | Transparent hero video `.play()` | on end it jumps to `currentTime = 1.5` and replays (intro plays once, then loops only the tail) |
| 3.0 | Overlay panel | y 200→0 spring **350/55 mass 3.5**; scale .7→1 spring **400/60**; opacity 0→1 0.2s. On complete it becomes **draggable** (md+, `dragConstraintsRef`) |
| 3.5 | "What should I say?" bubble | opacity/y 20→0, 0.4s |
| 4.0 | AI answer **streams word by word** | each `#stream-text-N` span fades opacity 0→1 over **1s**, next word every **10 ms** via `setTimeout` (a fast cascading fade, not a typewriter) |
| loop | CTA shimmer | 54×153 px shimmer PNG slides `x: 0 → parentWidth+64` in **0.6s ease [.77,0,.175,1]**, `repeat: Infinity, repeatDelay: 6` |
| loop | "desktop campaign" CTA pulse | `@keyframes desktop-campaign-cta-pulse` scale 1 → 1.065 (9%) → 1.035 (16%) → 1 (24%), **3s ease-in-out infinite** (a double "heartbeat" then rest) |

`@media (prefers-reduced-motion: reduce)` disables `.hero-fade-up, .hero-word-rise`. That rule only covers the CSS animations; the framer springs aren't gated **(guess: no `useReducedMotion` seen)**.

**Scroll reveals** (shared preset `d = {initial:{opacity:0,y:20}, whileInView:{opacity:1,y:0}, viewport:{once:true, margin:"-50px"}}`):
- Headings/paragraphs: duration **0.5s**, delays 0.1 / 0.15 / 0.2. Stat rows stagger 0.25 / 0.35 / 0.45.
- Big cards: `initial {y:40, opacity:0}`, spring **stiffness 400, damping 30**, delay .1/.2, `viewport {once, amount:.2}`.
- Undetectability section (`chunks_3709`): eases `[.4,0,0,1]`, `[.2,0,0,1]` (list items `delay .3 + .15*i`, 0.5s), `[.5,0,0,1]`; scale .8→1 0.5s; duration .333s.
- **"Invisible to screen share" before/after slider that plays itself** when 50% in view: `clipPath inset(0 70% 0 0)` → `inset(0 30% 0 0)` → `inset(0 50% 0 0)`, handle `left` 30%→70%→50%, **1s each, ease [.5,0,0,1]**, 0.2s pause. Then the user can drag it.
- "Keypress ping": a `#4984FD` 1px border animates `inset: -8px → -3px → -8px`, opacity `0→1→0`, 0.5s easeOut (a focus-ring pulse around a key/button).
- Accordion: `accordion-down/up` 0.2s ease-out (Radix height var).
- Utility keyframes present but not confirmed on home: `marquee` translateX 0→-50% **20s linear infinite**, `logos` same **60s**.
- Hover: App Store button `hover:scale-[1.02]` + bigger shadow. Overlay send button `duration-[160ms] ease-out hover:scale-[1.03] active:scale-[0.97]`. Pill buttons `hover:scale-105`. Spring-ish CSS ease `cubic-bezier(.34,1.56,.64,1)` (overshoot) with `duration-[333ms]` on some UI.
- `useScroll()` exists only in a shared/blog chunk (reading progress **(guess)**). No scroll-linked parallax on home.

### 1.5 Page flow (home, top → bottom)
**Nav** (absolute, transparent over hero): wordmark · Undetectability (`/#undetectability`) · Mobile · Blog · "Download on the App Store" badge · **Get the desktop app** (gradient button → vaul drawer) · burger on mobile.

1. **Hero**: H1 "**#1 Undetectable AI for Meetings**". Sub: "Cluely takes perfect meeting notes and gives real-time answers, all while completely undetectable". CTAs: App Store badge (black gradient) + "Get the desktop app". Below: full macOS desktop mock (wallpaper, menu bar, dock) with a transparent video and the live DOM Cluely overlay streaming a DCF-model answer.
   - **Clever:** H1/H2 can be overridden with `?headerText=…&subheaderText=…` query params (`useLayoutEffect` reads `URLSearchParams`), so each ad campaign gets a matching headline without a new page.
2. **"How Cluely helps during a meeting"**: two step cards: "Cluely listens in to the conversation / It picks up the context of your meeting in real time…" (with a 00:00 Recording UI) and "When you need help, Cluely assists you instantly / Hit Cmd/Ctrl + Enter…" (overlay UI with "Viewed screen" answer).
3. **"Instant meeting notes"**: "The easiest way to get beautiful, shareable meeting notes." Mobile / tablet / desktop screenshots swapped per breakpoint inside a `.card-styles` gradient card.
4. **"Undetectable in every way"** (`#undetectability`): "Suite of features to use Cluely without a trace." Bento of four:
   - **Doesn't join meetings**: fake participants list "Meeting participants (4) / No bots detected".
   - **Invisible to screen share**: self-playing before/after slider ("Visible to you" vs "Invisible to others").
   - **Follows your eyes**: draggable window over 4 coloured wallpaper cards (blue/pink/purple/dark), arrow keycaps.
   - **Compatible with every tool**: Zoom, Slack, Webex, Teams, Meet.
5. **"Real-time transcription"**: three stat rows: **12+** Languages · **300 ms** Response time ("Test us against any other competitor") · **95%** Transcription accuracy. Transcript screenshot.
6. **FAQ**: 6 questions (Why real-time vs a regular notetaker? / Who is Cluely for? / Is Cluely free? / How is it undetectable? / Languages & apps? / Support?).
7. **CTA band**: "Meeting AI that helps during the call, not after. Try Cluely on your next meeting today." App Store badge + ⌘ and ↵ keycap images (pressed/unpressed PNG pairs, so it animates a key press **(guess)**).
8. **Footer** (`#DDE2EE`): Product (Download, Pricing, Undetectability, Careers) · Resources (Mobile *New*, Blog, Manifesto, Press, Bug Bounty) · Compare (vs Otter, vs Granola, Otter alternatives, What is an AI notetaker; SEO pages) · Support (Privacy, Terms, Help Center, Contact, **"All systems operational"** live status link to PagerDuty). Socials: X, Discord, Instagram, GitHub.

**Social proof**: almost none on the home page. No logos, testimonials or user counts. Proof is product-led (live UI demo + stats 12+/300ms/95% + "#1" claim).

**Pricing** (`/pricing`): H1 "Start [app icon inline] for free." in `forma`, with Desktop/Mobile and Monthly/Annually toggles. Three tiers: **Starter Free** (limited AI responses/notes) · **Pro $19.99/mo** · **Pro + Undetectability $149.99/mo** (undetectability is the paid upsell). Comparison table below. Title tag mentions "Pro from $11.99/mo" (annual).
**Download** (`/download`): "Download the Cluely desktop app", direct `.exe`/`.dmg` links from `api.v2.cluely.com/desktop-download/{win,mac}/latest`, plus system requirements (Win 11 x64, macOS 10.15+, 500 MB, 8 GB RAM).

### 1.6 Hero demo technique
A layered composite, not a screen recording:
1. Wallpaper bitmap (plus a blurred q=10 copy behind it as glow), rounded 13 px, aspect 1.7.
2. DOM macOS menu bar (`bg-black/10`) and **DOM dock** (`backdrop-blur-lg`, icons spring in on Z).
3. Transparent video (alpha HEVC/VP9) of the meeting content.
4. **Real DOM Cluely overlay** on top: toolbar pill, chat bubble, word-streamed answer, quick actions (Assist · What should I say? · Follow-up questions · Recap), input with ⌘↵ hint, "Smart" model chip. It springs up, then becomes **draggable**, so visitors can move the "undetectable" window themselves.
Everything enters in 3D (`perspective: 800px`, translateZ) over ~4 s.

### 1.7 Signature vs cheap
- **Signature**: serif-italic-feel EB Garamond hero over a sky photo, then a switch to cool grey-blue Geist UI. Per-word masked rise. The real-DOM overlay that streams and can be dragged. A self-playing before/after slider. Gradient-clipped grey headings. Very heavy, carefully layered button shadows (Figma-exported multi-layer shadows with values like `11.6667px`).
- **Cheap/dark patterns**: `cluely_pro_trial_countdown_start_ms` in localStorage drives a **fake 10-minute "pro trial" countdown that silently resets to 10:00 once under 2 minutes**, plus a 900s countdown after email entry. Fake urgency. Figma-precision shadow values (`-2.81px 26.495px 7.627px`) bloat the CSS. A 310 KB stylesheet for one page. The HEVC hero is 9.7 MB for Safari users.

---

## 2. interviewcoder.co

### 2.1 Stack
| Item | Finding |
|---|---|
| Framework | **Next.js App Router** + **React streaming SSR**. Every section below the hero ships as a `<template id="B:n">` Suspense boundary with a pulsing skeleton (`animate-pulse bg-gray-800/20`, fixed heights 300–800 px) that's swapped in later |
| CSS | Tailwind v4 + shadcn-style tokens. Some styled-jsx (`jsx-…` classes on sub-pages) |
| Motion | **framer-motion** (whileInView ×22). **GSAP core + CSSPlugin + Draggable** in shared chunks (`chunks_3320`, `chunks_0b0944fb`), with ScrollTrigger string present. I found no GSAP call on home components, so it's probably used on other pages **(guess)**. No Lenis/Lottie/Rive |
| Analytics/other | PostHog, Sentry, Vercel Analytics, Meta Pixel, Intercom, Stripe. Videos and offer-letter images come from **Supabase Storage signed URLs** (`api.interviewcoder.co/storage/v1/object/sign/...`) |
| Hero video | `animation.mp4` **48.6 MB** (!), `autoPlay muted loop playsInline preload="metadata"`, poster `hero-video-thumbnail.webp` (88 KB), CSS-masked by `frame.webp` (**1.56 MB**) with `filter: blur(.5px)` |
| Other video | Amazon "200k/yr SWE job" demo video (h264 1080p), one `.mp4` per interview-type tab (System Design etc.) |
| Images | SVG icons/logos, PNG testimonial screenshots (1200w), PNG/WebP glow (`proof-glow.png` 722 KB **and** `proof-glow.webp` 230 KB, one per side), JPG |
| Weight (home) | HTML **517 KB** (92 KB gz). **48 JS files referenced, 2.15 MB raw / ~676 KB gz** (+polyfills). CSS 4 files 285 KB / 43 KB gz. **165 `<img>`**, 4 `<video>`, 65 `<script>`. 6 font families |

### 2.2 Fonts (`next/font`)
- **Inter**: body (`<body class="__className_d8ebd1">`), `--font-sans: Inter`, feature setting `"cv11"`.
- **Geist**: hero H1 + subhead + buttons (`__className_8eaea4`).
- **Geist Mono**: eyebrow pills and micro labels, uppercase 10–12 px, `letter-spacing -0.01em` or `0.05em`, `text-white/70`.
- Also loaded: **Chivo Mono, Fragment Mono, Switzer** (variables on body; usage outside home unclear). Six families is heavy.
- Hero H1: Geist **600**, `text-[47px] leading-[55px]` → `md:52/56` → `lg:text-[85px] leading-[90px]`, `letter-spacing:-0.04em`, `capitalize`, white, with a **yellow full stop** in "No**.** 1".
- Hero sub: Geist 500, 13–14 px, `leading-[24px]`, `text-white/70`, `max-w-[481px]`.
- Section H2: `text-[32px] md:text-[48px] lg:text-[64px]`, `font-medium`, `leading-[1]`, `tracking-[-0.03em]`. Feature H3: `22/28px`, `tracking-[-0.02em]`, `leading-[1]`.
- Some `clamp()` in the site CSS (e.g. `clamp(70px,15vw,97px)`, `clamp(35px,6vw,41px)`), probably sub-pages **(guess)**. The home page uses breakpoint steps.

### 2.3 Colour tokens
- Background **#121212** (sections) and `#000` (`--background: 0 0% 0%`, `.hero-gradient{background:#000}`). Text white, secondary `white/70`.
- **Accent: gold-yellow `#EFC83A`** (buttons, dot indicators, the "." in the H1). Token `--primary: 60 100% 50%` / `--color-primary:#ff0`. Gold gradients `linear-gradient(#efb63a,#efcc3a)`, `(#eac332,#eaaf14)`, `(#ffd833,#ffd83300)`. Glows `0 0 20px #ffff004d`, `0 18px 40px #efcc3a73`, `0 8px 24px #efcc3a80`, `0 2px 40px 10px #ffff000d`.
- **Rotating-border effect** **(guess)**: `conic-gradient(from 90deg, #ff0 0, #0000 50%, #ff0 100%)` and `#e6e619` variant.
- Borders/surfaces: pill `#191919` with border `#1E1E1E`. Dot halo `rgba(239,200,58,.06)`.
- Glass: `.frosted-glass { backdrop-filter: blur(8px); background:#1a1a1acc }`, `supports-backdrop-filter:bg-zinc-900/80`.
- Hero side glows: `proof-glow` images at opacity .8, left half normal and right half `scaleX(-1)` (a mirrored warm light leak).
- Ambient: `radial-gradient(circle at 30% 20%, #efcc3a26, #0000 50%)` + `radial-gradient(circle at 70% 80%, #3b82f61a, #0000 50%)`.

### 2.4 Motion
- **Section wrapper**: each lazy section is a `motion.section` with variant `fade` (opacity 0→1), `slide` (y 15→0) or `scale` (.98→1). Home uses **fade, duration 0.3s, ease `[.25,.1,.25,1]`** (= CSS `ease`), `viewport {once:true, amount:.1}`.
- Primitives (`chunks_1793`): FadeIn 0.4s; FadeUp y 20→0 **0.5s**; ScaleIn .9→1 **0.6s ease [.25,.4,.25,1]**, `margin:"-10%"`; Stagger container `staggerChildren .03, delayChildren .05`, children y 12→0 **0.3s**.
- CSS keyframes:
  - `fadeInUp` translateY(100px)→0, **0.8s ease-in-out** (+0.3s delayed variant).
  - `fadeInScale` .95→1 **0.2s cubic-bezier(.16,1,.3,1)** (expo-out).
  - `modalEnter` scale .98 + y 5px **0.15s cubic-bezier(.16,1,.3,1)**.
  - `slideInFromLeft/Right` 0.4s ease-out. `shake` ±5px 0.2s ×2 (error).
  - **`screenshare` 8s ease-in-out infinite**: scale 1 → **scale(2) translate(-25%,25%)** at 40–60% → back. It zooms into a corner of a screen-share still to show "nothing is there" on the undetectability cards (the clever bit).
- Buttons: `transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]`. Default Tailwind `.15s cubic-bezier(.4,0,.2,1)`.
- Deep-link helper: on load it reads `#hash` or `?section=` and polls for the lazily mounted section with backoff `min(100·1.3^n, 500) ms` (max 15 tries), then `scrollIntoView` and re-checks after 600 ms. This is a workaround for their own streaming skeletons.
- No smooth-scroll library, no scroll-linked animation, no typing effect.

### 2.5 Page flow (home)
**Nav**: logo · Proof (`/#proof-section`) · Pricing (`/#pricing`) · Help (`/help`) · How it works (`/still_working`) · **Leaked Questions** *NEW* (`/questions`) · Login · **Download for free** (yellow).

1. **Hero** (#121212 + mirrored gold glows): eyebrow pill (yellow dot + Geist Mono caps) "**Used by 150,000+ candidates hired at Top Companies**". H1 "**The No. 1 Undetectable AI For Interviews**". Sub: "20+ of the best undetectability features in the planet, tested every single day against every single interview software for 100% undetectability". CTAs: **Get for Windows** / **Get for Mac** (yellow pill, black circle icon, 46 px tall) + "NO credit card needed". Then the big framed demo video.
2. **"How we're undetectable"** (eyebrow "How it works"): 4 cards: Invisible on dock (*NEW*) · Invisible in activity monitor · Completely click through · 100% Invisible to Screen-Recording (SVG illustrations).
3. **"The Proof Is in the Comparison"**: "Compare side-by-side and find out why InterviewCoder stays invisible where others fail." 10-row feature matrix (Supports Audio, Invisible in Dock, Invisible to Screen Share, Tray, Activity Monitor, Click-through, Hasn't Been Caught, Price, Undetectable by Browser, Real Proof) with ⓘ tooltips. IC is all ✓, and competitors (UltraCode, LockedIn, AIApply) appear as **blurred logos** with ✗s. "(click to demo)".
4. **"Trusted by 150,000+ candidates"**: "From landing internships to staff roles at FAANG, Big Tech, Quant firms, and beyond." 13 testimonial cards (mostly "Anonymous User" + company, each with a screenshot of a post), then logos Google/Meta/Amazon/Netflix/Spotify "and more…". CTA "Download for free" → `#download`.
5. **"InterviewCoder working on real Interviews"** (eyebrow "Interview Coder In Action"): "Works seamlessly in real interviews across engineering, product, data, and more." Demo video "Landing a 200k/yr SWE job at Amazon…" + "Watch full video". Logo row Amazon, Snowflake, Oracle, Citadel, Roblox, IBM, Capital One, Tagged.
6. **"Works Across Every Interview Type"**: tabs System Design · Behavioral · Full Stack · AI/ML · Consulting · Data Analyst · Trading · PM · Other, each with its own video.
7. **"10,000+ Candidates cracked Job Offers by using Interview Coder"** (eyebrow "Proven Results"): offer-letter gallery, "Cracked $174k/yr job at Adobe…" … "$234k/yr at Snowflake", each with "View offer" + "View more" (items duplicated, so probably a looping carousel **(guess)**).
8. **Pricing** "Simple and transparent pricing that works for you": **Free Download $0/forever** · **Monthly Pro $299/month** (struck-through $499) · **Lifetime Pro $799 one-time** (struck-through $1598). Anchor pricing with fake "original price".
9. **"Undetectable. Tested daily across every interview app."** (eyebrow "Reliability Standard"): status-page-style rows 001–009 (Teams, Zoom, Meet, Chime, Webex, Lark, HackerRank, CoderPad, Codility), each "Last updated Nhrs ago · Undetectable · 100% Uptime" with green bar. Then "and almost all the interview softwares…" + Learn more → `/still_working`.
10. **FAQ** "Got questions? We've got answers": founder's email with a Copy button. 13 Qs, several SEO-bait ("What's the best AI interview assistant for software engineers in 2025?").
11. **Final CTA** (eyebrow "Take the Next Step"): "Ready to Pass Any SWE Interviews with 100% Undetectable AI?" + Windows/Mac buttons.
12. **Footer**: blurb, socials (X, Instagram, TikTok, YouTube, LinkedIn, Reddit), "Become an Affiliate, Earn 30% commission". Link columns: Product, Legal, Interview Preparation (17 SEO landing pages), Alternatives & Comparisons (7 "X alternative" pages), Resources/Company (salaries, resume template, merch, affiliate, etc.).

Sub-pages: `/pricing` → **404** (pricing lives at `/#pricing`). `/still_working` is a long-form explainer by Roy Lee ("How Interview Coder is Still Undetectable": browser sandbox diagrams). `/help` is a docs-style help centre with ⌘K search and sections Getting Started, Basic Checks, Language Configuration, Undetectability, plus troubleshooting ("Shows when I share screen").

### 2.6 Hero demo technique
A **single pre-rendered MP4** (48.6 MB) inside a decorative device/frame silhouette applied as a **CSS mask image** (`mask: url(frame.webp) center/cover`), with 24/32 px radius and a 0.5 px blur to soften compression. There's no DOM-built overlay, and the "glass panel" only appears inside the video.

### 2.7 Signature vs cheap
- **Signature**: one loud accent (gold `#EFC83A`) on near-black. Mono eyebrow pills with a glowing dot. The "tested daily" status board as a trust device. The `screenshare` zoom loop. Competitor comparison with blurred rival logos. Proof-heavy page (offer letters with salaries).
- **Cheap/heavy**: 48.6 MB hero video and a 1.56 MB mask PNG-in-WebP. 517 KB HTML. 165 images. Six font families. Skeleton-then-fade on every section (content pops in, which looks janky and hurts SEO crawl of text). Anonymous testimonials, fake strike-through prices, SEO-farm footer, keyword-stuffed FAQ, generic Tailwind-default easing everywhere.

---

## 3. Web search notes
- No Awwwards/Godly/Land-book entry found for either site. **SaaSFrame** has teardown pages for Cluely's [landing page](https://www.saasframe.io/examples/cluely-landing-page), [pricing page](https://www.saasframe.io/examples/cluely-pricing-page) and [enterprise page](https://www.saasframe.io/examples/cluely-enterprise-page), describing "clean lines, generous whitespace… subtle animated icons and micro-interactions".
- Cluely's April 2025 "cheat on everything" launch video (Roy Lee using it on a date) reportedly drove ~70k sign-ups in a week. a16z led a $15M round in June 2025, and that announcement was reportedly its biggest web-traffic day. Since then the positioning moved to meeting notes, which matches the current site's "meeting AI" copy. Sources: [Wikipedia](https://en.wikipedia.org/wiki/Cluely), [TechCrunch](https://techcrunch.com/2025/06/20/cluely-a-startup-that-helps-cheat-on-everything-raises-15m-from-a16z), [Postbeam GTM breakdown](https://www.postbeam.ai/blog/how-cluely-grows).
- Interview Coder's early site was famous for a giant grey "F*ck LeetCode" headline ([NBC](https://www.nbcnewyork.com/news/business/money-report/meet-the-21-year-old-helping-coders-use-ai-to-cheat-in-google-and-other-tech-job-interviews/6178911/)). The app was built with Electron + React + Vercel + OpenAI. "Interview Coder 2.0" was pushed through paid press releases (Nov 2025 – Jan 2026: audio, lifetime pricing) ([newsfile](https://www.newsfilecorp.com/release/276383)). There's also a freelance [landing-page redesign concept on Contra](https://contra.com/p/gEFB23rZ-interview-coder-landing-page-redesign), which isn't confirmed as the live site.

---

## 4. Patterns worth taking for Shadow
1. **Build the overlay demo in DOM, not video** (Cluely). A real glass panel that springs in, streams the answer word by word (opacity fade 1s per word, ~10–40 ms cadence) and can be **dragged** costs a few KB and is the product itself. For Shadow, script the actual loop: screenshot flash → hotkey keycaps press → panel springs up → explanation streams with a code block.
2. **Choreograph the hero as a timeline** (~0–4 s): masked word rise (0.55s, `cubic-bezier(.22,1,.36,1)`, 0.1s stagger) → sub (0.5s) → CTA → desktop mock on Z → overlay. Use heavily damped springs (e.g. 350/55 mass 3.5) for big surfaces so nothing bounces.
3. **One display face with character against a neutral UI sans** (EB Garamond over Geist). Shadow could pair a serif or variable display with Geist/Inter UI text. Keep heading tracking tight (-0.02 to -0.04em, leading 0.96–1.0).
4. **Panel material recipe**: dark tint `hsla(252,10%,10%,.75–.8)` + 1px `white/25` border + `0 0 0 1px rgba(207,226,255,.24)` ring + `0 -0.5px 0 rgba(255,255,255,.8)` top highlight. Add a real `backdrop-filter: blur(16–24px)` for Shadow's "glass", which Cluely only does on the dock.
5. **Self-playing demos that become interactive**: Cluely's before/after slider auto-sweeps 70→30→50% then hands control to the user. For Shadow: "what you see vs what screen-share sees", or "lecture audio → transcript".
6. **Keycap visuals** for the hotkey (pressed/unpressed states, ⌘↵ hints inside the input). Shadow is hotkey-driven, so show `Ctrl+Shift+…` keys pressing.
7. **Mono eyebrow pills with a single glowing dot** and a single loud accent colour (IC). This is cheap and reads well on dark.
8. **Status/reliability board as proof** (IC's "tested daily" rows). For an OSS tool: GitHub stars, latest release, CI badge, "works on Windows 10/11" rows. Link a live status or release feed like Cluely's footer "All systems operational".
9. **Campaign headlines via query params** (`?headerText=`). Trivial, and useful for Reddit/Twitter launch posts aimed at different audiences (coding vs lectures).
10. **`prefers-reduced-motion`** guard on hero keyframes (Cluely does this for CSS animations only; Shadow should also gate the springs).

## 5. Patterns to avoid
1. **Huge hero videos** (IC 48.6 MB, Cluely 9.7 MB HEVC). If you need video, keep it under ~1–2 MB WebM/MP4, lazy-loaded, poster first.
2. **Skeleton-then-fade for every section** (IC). It causes pop-in, layout guesswork and weak SEO. Ship static HTML.
3. **Fake urgency and fake anchors**: Cluely's self-resetting 10-minute trial countdown, IC's struck-through "original" prices, anonymous testimonials, "Hasn't been caught" claims. Shadow is free and OSS, and honesty is its differentiator.
4. **Font sprawl** (IC loads 6 families). Two families max.
5. **Whole-app Tailwind CSS on a marketing page** (~300 KB raw each) and 1.2–2.1 MB of JS for what is mostly static content. Target <100 KB JS for Shadow's site. Plain CSS keyframes + a small spring lib, or a few GSAP tweens, is enough.
6. **Figma-export shadow soup** (`-2.81px 26.495px 7.627px …`, 5–9 layer shadows). Define 3–4 elevation tokens instead.
7. **SEO-farm footers / keyword-stuffed FAQs** (IC). They make the page look cheap.
8. **"Undetectable/cheating" framing** that both sites lead with. Shadow should lead with learning ("understand the answer") to stay credible with students and avoid the backlash Cluely got.
