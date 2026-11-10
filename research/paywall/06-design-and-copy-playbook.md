# 06 · Paywall design and copy playbook for Shadow Cloud

Written 10 Nov 2026. Scope: the screens, words and motion that turn a free Shadow user into a Shadow Cloud payer, inside a dark glass overlay that floats over other apps, with checkout in the browser and a `shadow://` link back.

Skills applied: conversion-builder (objection map), emil-design-eng and apple-design (motion, materials, polish), saas-productivity (motion budget for a work tool), humanizer and website-taste copy rules (no em dashes, no "not X but Y", truth only, Hinglish where it is natural). Taste source: `C:\Users\aayus\.claude\skills\app-taste\references\taste.md`.

Placeholders: prices, free-answer counts and refund terms are not decided yet. They appear as `[₹149]`, `[10 free answers]`, `[7-day refund]`. Swap in the real numbers from the pricing doc before shipping. Anything marked **[CONFIRM]** needs Aayush's decision.

---

## 0. The short version

1. **Charge for a 30-day pass, paid once by UPI, that does not renew on its own.** A student's biggest fear at the paywall is being charged again (Blinkist's research found "forgetting to cancel" was the top hesitation, and a paywall that only answered that fear lifted trial starts 23%). A non-renewing pass removes that fear entirely and gives the visual system its object: a ticket. If a subscription is offered at all, make it the second option.
2. **The paywall only appears when the user asked for something it gates**: pressing the solve hotkey with zero free answers left, or clicking Listen. Plus one card on first launch. Never on a timer, never twice for the same placement in a day.
3. **The free path is always on the paywall.** Shadow is MIT-licensed and works with a free Gemini key. "Use my own key instead" sits under every paid CTA. This is honest, it is what keeps the paywall clear of CCPA's "forced action", and it makes the paid option feel like a choice.
4. **Decide in the overlay, pay in the browser, come back by link or by polling.** The overlay card shows one plan, one price and one gold button. The browser does the payment (UPI QR first, since the user is on a PC and their UPI app is on their phone). The overlay waits, polls the server, and also accepts `shadow://` as a shortcut.
5. **Visual: one glowing gold pass on deep night glass.** A die-cut ticket with notches and a perforation line, gold foil edge, the Shadow orb embossed on it. Before purchase it is an unpunched pass; after purchase it is punched, dated and numbered, and lives in Settings as the license. No confetti, no inflated 3D coin, no white plan cards.
6. **Motion is spent once.** The pass arrives with one 420 ms entrance and one foil sheen. Everything a user touches more than a few times a day (the meter, the hotkey, the pill) does not animate.

---

## 1. Anatomy of a high-converting paywall

Each element, what the research says works, and the Shadow spec. Shadow's paywall is a compact card (about 440 px wide, the same width as the existing `.welcome` card), so every element has to earn its row.

| Element | What works and why | Shadow spec |
| --- | --- | --- |
| **Context line** (what triggered it) | Paywalls that name the moment convert better than generic ones. Superwall reports personalised paywalls beat generic ones by 15%+; Grammarly's goal-aware paywall lifted upgrades 10%+. Screensdesign: show the paywall "when the user can connect payment to a concrete plan, feature, content, or usage limit." | A small text-2 line above the headline: "That was your 10th free answer" or "Listen is part of Shadow Cloud". Never generic "Go Pro". |
| **Hero object** | A single object gives the eye a resting point and carries the brand. Image changes alone "rarely yield huge lifts" (RevenueCat), so the hero is there for trust and identity; it is not the conversion engine. | The gold pass (section 5). Max 120 px tall in the overlay so price and CTA stay above the fold of a 620 px panel. |
| **Headline** | Plain outcome beats cleverness ("clarity trumps creativity every time", RevenueCat). Use the user's own words for the benefit. | One line, 15 to 17 px, 600 weight. States what happens or what they get. Drafts in section 4. |
| **Subhead** | Answers the first objection right away. Blinkist's winning variant spent its words on the charge-again fear and mentioned no features. | One or two lines, text-2. For Shadow it usually carries "paid once, doesn't renew". |
| **Value list** | Benefits over features (Superwall). On small surfaces bullets beat tables (Stormy's read of 4,500 tests). NN/g: state differences between options explicitly; users won't infer them. | Three rows at most, each a concrete thing Shadow does that free ChatGPT doesn't: "Reads the problem on your screen with one hotkey", "No API key to set up", "Listen: explains questions from a lecture as they're asked". Icons in text-3, no checkmark emoji. |
| **Plan picker** | 1 to 3 options with a clear winner (Superwall). Presentation matters more than value framing (RevenueCat/Mojo). A plan picker on a tiny surface adds a decision; a single plan removes one. | Single plan by default (30-day pass). If a second plan exists (semester pass), show it as a quiet text link "or [₹599] for 5 months" under the price, both always visible. No carousel. |
| **Price display** | NN/g: price is users' number-one information need; hiding it sends them elsewhere. Show the full recurring price next to the billing period (Screensdesign). Monthly-equivalent and per-day framing help in price-sensitive markets (Mojo saw it work in Brazil and Mexico) as long as the full price stays dominant. Baymard: 40% abandon over extra costs, 12% because they couldn't see the total up front. | "[₹149]" at 24 px tabular figures, then "for 30 days · paid once · GST included". Per-day reframe ("about ₹5 a day") only in the subhead, never bigger than the real price. The browser checkout shows exactly the same number. |
| **CTA** | NN/g: vague labels like "Get Started" stop users; labels should say exactly what happens next. Screensdesign: the button should match the selected option. Tinder-style "Continue" softens the ask but hides it; for a student worried about money, say the price. | Gold button, full width: "Get the 30-day pass · ₹149". After click it becomes "Opening checkout…" for at most 1 s. Secondary text button under it: "Use my own key instead". |
| **Reassurance line** | Placed directly under the CTA, where the doubt peaks. Blinkist's trial timeline and reminder promise cut complaints 55%. Baymard: 19% abandon from distrust of the site with card details. | One line, 12 px, text-2 (not text-3; see contrast in section 5): "UPI or card on Razorpay. Doesn't renew. [7-day refund] if it doesn't work for you." **[CONFIRM]** processor and refund terms. |
| **Restore / sign in** | Required on every mobile paywall; on desktop it doubles as "I already paid on another PC". Must be readable at reading speed (Screensdesign). | Bottom-left text link: "Already paid? Sign in". Opens browser sign-in, returns by the same round trip as checkout. |
| **Close** | Visible from the first frame. Screensdesign: "Delayed dismissal encourages accidental purchase attempts and abandonment." Rootd saw 5x revenue after making the paywall dismissible (via Stormy). Closing must return the user to the task that triggered it. | 32 × 32 px X at top-right (the current `btn-sm` 26 px is too small for a money screen), labelled "Close" for screen readers, Esc closes. Closing keeps the queued screenshot in the strip. |
| **Legal and terms** | Required, but should not be the hero. Hiding them behind asterisks triggers distrust (Blinkist case: fine print and asterisks read as "TV ad tricks"). | No asterisks anywhere. A "Terms · Privacy · Refunds" link row lives on the browser checkout page, not in the overlay. |

**Conversion-builder summary**

- **Hero:** Headline "That was your 10th free answer." Subhead "A 30-day pass is ₹149, paid once with UPI. It won't renew on its own." CTA "Get the 30-day pass · ₹149".
- **Objection order at the paywall:** (1) Will this charge me again? → subhead. (2) Is it worth ₹149 when ChatGPT is free? → value list. (3) Is paying safe? → reassurance line and the browser hand-off. (4) What if it fails on my problem? → refund line and the free answers they already used. (5) Will I get in trouble at college? → Settings "About Shadow Cloud" and the website FAQ, not the overlay card.
- **Proof placement:** the strongest proof is their own usage ("10 problems explained this week") on the limit card itself. Real GitHub stars and a dated download count go on the browser checkout page, where the trust doubt peaks.
- **Section to cut:** the feature comparison table. It does not fit 440 px and Shadow's real choice is two-way (own key vs Cloud), which a single line says better.
- **#1 conversion killer:** the round trip. A student who pays by UPI on their phone and comes back to an overlay that still says "Out of answers" will assume the money is gone. Fix: a waiting state that polls the server and updates by itself within seconds, plus a visible "I've paid" recheck and a support line with what to send (section 3).

---

## 2. Pattern catalog

Eighteen patterns. "Overlay fit" means: does it work inside Shadow's floating glass card, over someone else's app, at about 440 to 580 px wide?

| # | Pattern | When it fits | Risks | Overlay fit |
| --- | --- | --- | --- | --- |
| 1 | **Credit meter inside the product** ("7 of 10 free answers left") | Any usage-metered free tier. Zapier's case shows an overfilled usage bar makes the loss concrete; Bloomberg's metered paywall uses a progress bar to track free articles. | Turns into nagging if it is always on screen. Anxiety if shown from answer 1. | **Yes.** Show it in the response panel header meta after each answer, only from the 5th answer on. Draw it as a strip of small ticket stubs (section 5). Never in the pill. |
| 2 | **Limit-reached card** ("You've used 10/10") | The moment the user tries to use a gated action with nothing left. Highest-intent placement in the product. | Losing the user's work. Showing it before they press the key. | **Yes, primary trigger.** Fires on the solve hotkey with zero answers. Keeps the screenshot queued; after payment, offers "Solve this one now". |
| 3 | **Feature-locked inline upsell** | A paid feature has a visible entry point (Listen). | Locking a feature without letting people see what it does. | **Yes.** Clicking Listen opens a small card anchored to the Listen button (origin-aware, scales from the button). Offer "See a sample" that shows a 3-line canned transcript and answer, labelled as an example. |
| 4 | **Single-plan hero** | One clear offer, price-sensitive buyer, small surface. | Users who want a longer plan can't find it. | **Yes, default.** One pass, one price, one button. |
| 5 | **Two-plan picker with a highlighted default** | When a longer plan (semester pass) exists and saves real money. Mojo hid monthly behind "View all plans" and grew yearly; Superwall: annual plans often add 10 to 30% LTV. | Hiding the cheaper plan drifts into CCPA "interface interference". Decoy plans that exist only to anchor. | **Partial.** Second plan as a visible text link, never hidden behind a click, never a decoy. |
| 6 | **Trial timeline** (Blinkist style) | Any trial or renewing plan. Blinkist: +23% trial starts, -55% complaints, push opt-in 6% → 74%. | Feels long on a small card. | **Yes, adapted.** Shadow has no time-trial, so it becomes a "pass timeline" in three dots: Today: pay once · Day 27: we remind you · Day 30: pass ends, nothing charged. Use it on the browser checkout page and in Settings; in the overlay compress it to the reassurance line. |
| 7 | **Reminder promise** | Any renewal or expiry. | Promising a reminder and not sending it. | **Yes.** Shadow shows an in-overlay note 3 days before expiry and sends an email. RBI already makes banks send a pre-debit alert 24 h before any mandate debit; say so if a subscription is offered. |
| 8 | **Personalised paywall** (uses their own data) | When usage tells a story. Grammarly +10%; Superwall +15%. | Creepy if it quotes private content. | **Yes, light.** "10 problems explained since Monday." Counts only, never the problem text. |
| 9 | **Soft paywall with the free path visible** | Freemium and open-source products. | Some users always pick free. That's fine for Shadow. | **Yes, required.** "Use my own key instead" on every paid card. |
| 10 | **Before/after or sample answer** | When the paid output is hard to imagine. | Video loops in an overlay pull attention from the user's own work; fake samples. | **Partial.** A static, labelled sample answer for Listen. No autoplay video in the overlay. A 6-second demo GIF is fine on the website and checkout page. |
| 11 | **Comparison table** (Free vs Pro) | Many features differ, wide screen (Hevy). | Overwhelming on small surfaces (Stormy). | **No in the overlay; yes in Settings** as a two-column "Your own key / Shadow Cloud" block. |
| 12 | **Testimonials wall** | Plenty of real, attributable quotes. | Invented or paraphrased quotes are a CCPA and trust problem. Clutter. | **No in the overlay.** One real quote, verbatim, with permission, on the checkout page once it exists. |
| 13 | **Social-proof counter** ("Used by 2,000 students") | Only with a real, dated number. | Inflated or undated numbers. | **Partial.** Real GitHub stars or a dated download count on the checkout page. |
| 14 | **Plan carousel** | Several visually distinct tiers on mobile. | Hides prices off-screen; extra interaction. | **No.** |
| 15 | **Discount on exit / one-time offer after dismissal** | Mobile apps with large trial volumes (Bend, Pushscroll). Superwall says abandoner offers convert 25%+, but at Mojo exit discounts underperformed other discounts. | Trains users to close the first offer; contradicts the first price; usually comes with fake scarcity; can read as nagging. | **No.** If students need a lower price, make it the permanent price. |
| 16 | **Countdown / "offer ends in 09:59"** | A real, dated sale (Diwali, semester start). | CCPA "false urgency" when the clock resets or the deal isn't actually limited. | **No by default.** Only for a real sale with a fixed end date shown as a date, never a ticking clock. |
| 17 | **Reverse trial** (full Cloud for a few days, then back to free) | When the paid feature needs time to be felt. | Downgrade feels like a loss; easy to confuse with an auto-charge. | **Partial.** The free answers already do this job. Keep it as "your first [10] answers run on Shadow Cloud". |
| 18 | **Success / receipt moment** (peak-end) | Every purchase. Zapier: end on a benefit-focused peak and confirm what happens next. | Confetti and "Awesome!" clutter (Aayush dislikes it). | **Yes.** The pass gets punched and dated; one line says what to do next; the queued screenshot is offered for solving. |

Rejected outright for Shadow: hard paywall on first launch, paywall on a timer, "spin to win" (Superwall lists it as a test idea; it is exactly the game-show clutter in the taste file), pulsing CTA loops.

---

## 3. Desktop and in-product specifics

### 3.1 How desktop tools place the paywall

| Product | Where the decision happens | Where payment happens | Activation | Source confidence |
| --- | --- | --- | --- | --- |
| Cursor | In the editor: when the usage pool runs out, the error offers three choices: switch model, upgrade, or pay for extra usage. | Browser (cursor.com account). | Account sign-in; entitlement syncs. | Usage behaviour from a third-party guide (Verdent) and forum threads. |
| Notion | In-app: usage visible under Settings → Upgrade plan; multi-member free workspaces get a block "trial" and API writes fail with 403 past the limit. | In-app billing settings / web. | Account. | Notion API docs and help center. |
| Raycast | Pro features shown in the app; marketing page offers "Start Free Trial". Student discount 50% by application form. | raycast.com. | Account sign-in. | raycast.com/pro. Exact in-app upgrade flow not documented publicly. |
| CleanShot X | Website purchase. | Paddle checkout (web). | License key emailed by Paddle; License Manager to re-send; activating on a new Mac deactivates the old one automatically. | cleanshot.com pricing and FAQ. |
| Setapp apps | Setapp catalogue. | Setapp subscription. | The app checks the Setapp subscription; no per-app key. | Setapp listing plus a user review. Verify with Setapp docs. |
| ChatGPT desktop, Linear | In-app plan prompt when a limit or paid feature is hit. | Web billing. | Account. | General observation; not verified in this round. Do not quote specifics without checking. |

Three placements, and what each is for:

- **In-app modal or card:** the moment of decision. Fast, in context, keeps the task. Every product above uses it for the trigger.
- **Separate window (Shadow's Settings window):** the place to read. Plan details, the pass, renewal date, cancel, device list, receipts, the comparison block. Users go here on purpose, so it can be longer.
- **Browser:** the place to pay. Users trust the address bar and the processor's page; saved UPI handles and cards live there; it keeps payment code and PCI scope out of the Electron app.

**Recommendation for Shadow:** decide in the overlay, read in Settings, pay in the browser. Never put the payment form in the overlay: it is always on top, it may be over a screen share, and a payment field in a frameless floating window looks like phishing.

### 3.2 The round trip, step by step

```
Overlay card                Browser                         Server
─────────────               ───────                         ──────
[Get the 30-day pass] ──►  opens checkout URL with a       creates checkout session
                           one-time session id             bound to this install id
Card switches to
"Waiting for payment"       UPI QR first (scan with phone),
 · polls /status every 3 s  UPI ID, then card
 · listens for shadow://
 · "I've paid" = poll now
                            Success page:                   webhook (payment captured)
                            "Payment received."             marks pass active
                            [Open Shadow] button  ──────►   (source of truth)
                            + activation code fallback
Card: pass punched ◄──────  (deep link or next poll, whichever comes first)
"Shadow Cloud is on."
[Solve this one now]
```

Rules:

1. **The webhook is the source of truth, the deep link is a shortcut.** Stripe and Razorpay both send a server-side event when payment completes; the browser redirect can be closed, blocked or never clicked. The overlay unlocks when the server says so, whether it learns that from the deep link or from polling.
2. **The browser cannot auto-open the app.** Browsers block deep links that fire without a click (Hopp's write-up: Safari showed an error). The success page shows an **Open Shadow** button the user clicks, and Chrome/Edge will still ask "Open Shadow?" the first time. Polling means the overlay usually updates before the user even clicks.
3. **Waiting state copy** (overlay card, replaces the plan view):
   - Title: "Finish paying in your browser"
   - Body: "This card updates on its own once the payment goes through. UPI can take a minute."
   - Buttons: "I've paid" (forces a status check), "Reopen checkout", "Cancel".
   - A slim indeterminate bar using the existing `shimmer` keyframe. No spinner that loops slower than 1 s per turn.
4. **Time-outs that keep trust.** After 10 minutes with no payment: "We haven't seen a payment yet. If money left your account, it will show up here within a few minutes. Still stuck? Email [support@…] with the UPI reference number." Keep polling in the background for 30 more minutes at a slower rate. Persist the pending session id so the state survives a restart.
5. **Fallback code.** The success page also shows a short activation code ("SHDW-7K2Q-9MPX") and the line "If Shadow didn't update, paste this in Settings → Shadow Cloud." Maple (Tauri) shows its copy fallback about 3 seconds after the deep link attempt; do the same.
6. **Preserve the task.** If a screenshot was queued when the limit hit, the success card leads with "Solve this one now" (Screensdesign: closing or paying should never destroy user intent).
7. **Electron notes for whoever builds it** (no code changed here): register the scheme with `app.setAsDefaultProtocolClient('shadow')`; on Windows the URL arrives in `argv` through the `second-instance` event, so the single-instance lock matters; validate every `shadow://` payload against the server and never trust a token in the URL by itself.

### 3.3 Sign-in, restore and devices

- **Account-based, email first.** A pass belongs to an email, not a key file. Sign-in opens the browser (Google or an emailed code) and returns the same way as checkout.
- **"Already paid? Sign in"** is the restore button. Put it on every paywall card and in Settings.
- **Devices:** allow two PCs per pass **[CONFIRM]**. Show them in Settings as "This PC · Aayush-Laptop" with a "Remove" link. Copy CleanShot's kind move: activating on a third PC asks "Move your pass to this PC?" and frees the oldest, instead of blocking.
- **The pass is the license view.** Settings → Shadow Cloud shows the punched pass with the email, pass number and "Valid till 14 Dec 2026". That one object answers "am I paid up?" at a glance.

### 3.4 Payment page (browser) essentials

- Same night-and-gold look, same price string as the overlay, GST included. Any change between the two is CCPA drip pricing.
- **UPI QR first** on desktop: the user's UPI app is on their phone, so a QR is the shortest path. UPI ID entry second, cards third.
- No site navigation on the checkout page (Zapier case: removing header and footer links can lift conversion 28%).
- The pass timeline (Today · Day 27 reminder · Day 30 ends) under the price.

---

## 4. Copy

### 4.1 Student objections and the answers

Voice rules applied: plain, specific, first person where it fits (Aayush is a real person, and "I built this" is a trust asset), no em dashes, no "not X but Y", no exclamation marks, every claim true.

| # | Objection (what they're thinking) | Answer copy | Where it lives |
| --- | --- | --- | --- |
| 1 | **"Is it worth it?"** | "₹149 for 30 days. That's about ₹5 a day, and you've already seen what it does on 10 of your own problems." | Limit card subhead; checkout page. |
| 2 | **"Can't I just use ChatGPT for free?"** | "You can, and Shadow's free mode still works with your own Gemini key. Shadow Cloud is for when you'd rather not copy-paste the problem or set up a key: press one hotkey and the explanation appears on top of your editor." | Settings comparison block; website FAQ. Never attack ChatGPT by name in the overlay. Note: many Indian students got ChatGPT Go free for 12 months from 4 Nov 2025, so that offer is ending for many of them right about now. Don't build copy around it; just don't pretend free alternatives don't exist. |
| 3 | **"Will it charge me again?"** | Pass: "Paid once. It won't renew on its own. We'll remind you 3 days before it ends." Subscription (if offered): "Renews on 14 Dec for ₹149. Your UPI app alerts you a day before every renewal, and you can cancel in Shadow's Settings in two clicks." | Directly under the CTA. Repeated on the checkout page and in the confirmation email. |
| 4 | **"Is UPI safe here?"** | "You pay on Razorpay's page in your browser and approve it in your own UPI app. Shadow never sees your UPI PIN or card number." **[CONFIRM]** processor. | Reassurance line; checkout page header. |
| 5 | **"What if it doesn't work on my problem?"** | "Your first 10 answers are free, so try it on your real problems first. If Shadow Cloud doesn't work for you in the first 7 days, email me and I'll refund you." **[CONFIRM]** refund policy. | Limit card reassurance line; FAQ. |
| 6 | **"Is this allowed in my college?"** | "Shadow is for practising and understanding. It stays visible on screen shares and recordings and doesn't hide from anyone. Don't use it in exams or graded tests, and check your college's rules on AI help for assignments." | Settings → About; website FAQ; checkout page footer. Keep this off the paywall card itself; raising it at the moment of purchase plants a doubt most users didn't have. Never claim it's "undetectable". |
| 7 | **"Who's behind this? Will it vanish next month?"** | "I'm Aayush, a CS student in India. I built Shadow and it's open source. If Shadow Cloud ever shuts down, unused days are refunded and the free key mode keeps working." **[CONFIRM]** | Checkout page; FAQ. |
| 8 | **"What happens to my screenshots?"** | "Screenshots go to the AI model to get your answer and aren't kept after that." **[CONFIRM]** actual retention. | Settings; FAQ; privacy page. |

### 4.2 Headline, subhead and CTA sets by trigger moment

Three sets per moment, in plain English and in Hinglish (Roman script, the way students text). Each set is written to be read in about 3 seconds.

#### A. First launch (no key yet, free answers available)

The goal here is the first answer, not the sale. The paid product is introduced as the default way to get answers, with the free key path next to it.

| | English | Hinglish |
| --- | --- | --- |
| A1 | **Your first 10 answers are on me.** · No key, no card. Open a coding problem and press Ctrl+Shift+Enter. · CTA: **Start with 10 free answers** | **Pehle 10 answers free hain.** · Na key chahiye, na card. Koi coding problem kholo aur Ctrl+Shift+Enter dabao. · CTA: **10 free answers se shuru karo** |
| A2 | **Skip the API key setup.** · Shadow Cloud answers without a key. 10 answers free, then ₹149 for 30 days. · CTA: **Use Shadow Cloud** · secondary: I have my own key | **API key ka jhanjhat chhodo.** · Shadow Cloud bina key ke chalta hai. 10 answers free, phir ₹149 mein 30 din. · CTA: **Shadow Cloud use karo** · secondary: Meri apni key hai |
| A3 | **Stuck on a problem? Press one key.** · Shadow reads the problem on your screen and explains the solution step by step. The first 10 are free. · CTA: **Try it on a problem** | **Problem pe atke ho? Bas ek key dabao.** · Shadow screen pe likhi problem padhta hai aur step by step samjhata hai. Pehle 10 free. · CTA: **Ek problem pe try karo** |

#### B. Out of free answers (fires on the solve hotkey)

Highest intent. The screenshot they just took is waiting. Lead with what they got, then the price, then the no-renew promise.

| | English | Hinglish |
| --- | --- | --- |
| B1 | **That was your 10th free answer.** · A 30-day pass is ₹149, paid once with UPI. It won't renew on its own. · CTA: **Get the 30-day pass · ₹149** · secondary: Use my own key instead | **Tumhare 10 free answers ho gaye.** · 30 din ka pass ₹149 ka hai, UPI se ek baar pay karo. Apne aap renew nahi hoga. · CTA: **30-day pass lo · ₹149** · secondary: Apni key use karunga |
| B2 | **10 problems explained. Keep going?** · Your screenshot is saved. Get a pass and Shadow solves it right away. · CTA: **Unlock and solve this one** | **10 problems samajh liye. Aage chalein?** · Tumhara screenshot save hai. Pass lete hi Shadow isko solve kar dega. · CTA: **Unlock karke solve karo** |
| B3 | **Free answers used up.** · Keep going for about ₹5 a day, or add your own free Gemini key and use Shadow at no cost. · CTA: **Continue for ₹149** · secondary: Add my own key | **Free answers khatam.** · Roz ka lagbhag ₹5, ya apni free Gemini key daalo aur free mein chalate raho. · CTA: **₹149 mein continue karo** · secondary: Apni key daalo |

Recommended to ship first: B1 (answers the charge-again fear in the subhead, which is what Blinkist's winning variant did). Test B2 against it.

#### C. Listen locked (fires on clicking Listen without Cloud)

The user hasn't seen Listen work yet, so the copy has to describe the output. Offer a labelled sample.

| | English | Hinglish |
| --- | --- | --- |
| C1 | **Listen is part of Shadow Cloud.** · It transcribes a lecture or practice video and explains each question in two or three lines. · CTA: **Unlock Listen** · secondary: See a sample | **Listen, Shadow Cloud ka hissa hai.** · Lecture ya practice video ko likhta jaata hai aur har question do-teen line mein samjhata hai. · CTA: **Listen unlock karo** · secondary: Sample dekho |
| C2 | **Catch every question in the lecture.** · Shadow writes down what's said and explains questions as they come up. Included in the 30-day pass. · CTA: **Get the pass and start listening** | **Lecture ka koi question miss mat karo.** · Jo bola ja raha hai Shadow likhta jaata hai, aur question aate hi samjhata hai. 30-day pass mein included. · CTA: **Pass lo, sunna shuru karo** |
| C3 | **Listen needs Shadow Cloud.** · Live transcription costs more to run than a screenshot, so it's paid. Your screenshot answers stay free with your own key. · CTA: **Unlock Listen · ₹149** | **Listen ke liye Shadow Cloud chahiye.** · Live transcription chalane ka kharcha screenshot se zyada hai, isliye ye paid hai. Apni key se screenshot answers free hi rahenge. · CTA: **Listen unlock karo · ₹149** |

C3 is the most honest and a good bet with students: a plain reason for a price reads as fair. Check that the reason is true before using it **[CONFIRM]**.

#### D. Renewal (3 days before the pass ends, shown once, dismissible)

Equal visual weight for "renew" and "let it end". This is the moment where trust is either banked or spent.

| | English | Hinglish |
| --- | --- | --- |
| D1 | **Your pass ends on 14 Dec.** · You used it for 46 answers this month. Renew for another 30 days, or let it end. Nothing is charged unless you choose. · CTA: **Renew for 30 days · ₹149** · secondary: Let it end | **Tumhara pass 14 Dec ko khatam hoga.** · Is mahine 46 answers liye. Aur 30 din chahiye toh renew karo, warna rehne do. Bina pooche kuch charge nahi hoga. · CTA: **30 din renew karo · ₹149** · secondary: Rehne do |
| D2 (subscription) | **Shadow Cloud renews on 14 Dec for ₹149.** · Your UPI app will remind you a day before too. Cancel here if you'd rather not. · CTA: **Keep Shadow Cloud** · secondary: **Cancel renewal** (same size) | **Shadow Cloud 14 Dec ko ₹149 mein renew hoga.** · Ek din pehle UPI app bhi yaad dilayega. Nahi chahiye toh yahin cancel karo. · CTA: **Shadow Cloud rakho** · secondary: **Renewal cancel karo** |
| D3 | **3 days left on your pass.** · Renew now and the new 30 days start when this pass ends, so you don't lose a day. · CTA: **Renew early** | **Pass mein 3 din bache hain.** · Abhi renew karoge toh naye 30 din is pass ke baad shuru honge. Ek din bhi waste nahi hoga. · CTA: **Abhi renew karo** |

#### E. Supporting strings

| Moment | English | Hinglish |
| --- | --- | --- |
| Meter at 5 left | 5 free answers left | 5 free answers bache hain |
| Meter at 1 left | Last free answer | Aakhri free answer |
| Opening checkout | Opening checkout in your browser… | Browser mein checkout khul raha hai… |
| Waiting | Finish paying in your browser. This card updates on its own. | Browser mein payment poora karo. Ye card apne aap update ho jayega. |
| Success | **Shadow Cloud is on.** Valid till 14 Dec. · CTA: Solve this one now | **Shadow Cloud chalu hai.** 14 Dec tak valid. · CTA: Isko abhi solve karo |
| Payment failed | The payment didn't go through, and no money was taken. Try again or use another UPI app. | Payment nahi hua, aur koi paisa nahi kata. Dobara try karo ya doosra UPI app use karo. |
| Pass expired | Your pass ended on 14 Dec. Your own-key mode still works. | Tumhara pass 14 Dec ko khatam ho gaya. Apni key wala mode abhi bhi chalta hai. |

Check before writing "no money was taken": only show it when the processor confirms the payment failed, not when status is unknown. For unknown status use the waiting copy.

---

## 5. Visual direction

### 5.1 What exists today

From `src/renderer/src/styles/base.css` and `overlay/overlay.css`:

- Surface `hsla(240,12%,9%,0.93)` with a cool 1 px ring `rgba(200,210,255,0.18)` and a lit top edge. No real backdrop blur (Windows can't blur behind a transparent window), so the glass is an opaque tint plus edge light.
- Text `#ecedf1 / #b3b4bc / #8a8c94`. Accent indigo `#6d5ef5`, gradient `#5b4be8 → #3b2fb0`. Live red `#f87171`, success `#34d399`.
- Radii 18 / 12 / 5. Segoe UI Variable, Cascadia Code.
- Easing: `--sh-ease-out cubic-bezier(0.23,1,0.32,1)`, a spring-ish overshoot curve, and an ease-in.
- Panels enter with `panel-in` 240 ms (translateY -8 px, scale 0.98). The pill enters with a 280 ms overshoot and a 2 px blur.

This is already "premium night". What it lacks is the one glowing object and a money colour.

### 5.2 How the two taste groups translate

| Taste group | Translation inside the overlay | What not to do |
| --- | --- | --- |
| **A. Premium night + one glowing object** (CRED, District, Zomato Gold, Opal, Jar) | Keep the existing night glass. Add one gold object (the pass) with a soft warm glow behind it. Gold appears in exactly two places on the paywall: the pass and the pay button. Indigo stays the product colour (solve, ask, answer bubbles). Gold means money and membership, matching Zomato Gold and Jar. | Gold sprinkled on icons, borders and text. A second glowing object. Gradients on the whole card. |
| **B. Loud colour + coupons as physical tickets** (Wadiz, StyleKorean, BookMyShow) | The pass is a die-cut ticket: semicircle notches, a perforation line, a tear-off stub with the price, chunky tight type, a mono serial number. The free-answer meter is a strip of small stubs. Loud colour is spent only on the success moment: the pass flips from gunmetal-and-gold to a full gold face when punched. | A full loud-colour paywall. It would fight the user's own screen behind the overlay; Shadow floats over VS Code and LeetCode, so restraint wins. |

Rejected, per the taste file: white plan cards with one accent ("AI slop"), a mascot or cartoon student, an inflated 3D coin or clay gift box, confetti and "Awesome!" screens, usage charts.

### 5.3 The one glowing object: the Shadow Pass

Candidates considered:

| Object | For | Against | Verdict |
| --- | --- | --- | --- |
| **Glowing pass / ticket** | Fits a time-bound, paid-once product; combines both taste groups; becomes the license view after purchase; cheap to draw in CSS/SVG crisply. | Must be drawn well or it looks like a coupon app. | **Pick.** |
| Credit coin | Wolt's 3D coin was liked; maps to "answers as credits". | Coins drift into inflated-3D territory fast; suggests per-answer pricing, which students fear. | Use only as a tiny glyph if per-answer top-ups ever ship. |
| Shadow orb | Brand mark; CRED's credit-score orb was a ★. | Abstract; says nothing about paying. | Emboss it on the pass instead. |

**Pass anatomy** (overlay size about 300 × 112 px; Settings size 420 × 156 px):

```
 ┌──────────────────────────────────────────┬─────────────┐
 │  ◉  SHADOW CLOUD                          ┊   ₹149      │
 │     30-DAY PASS                           ┊   paid once │
 │                                           ┊             │
 │  No key needed · Screenshot + Listen      ┊  № ______   │
 └──────────────────────────────────────────┴─────────────┘
  notch ◖ at top and bottom of the ┊ perforation line ◗
```

- **Body:** gunmetal-to-night gradient `#23242c → #15151b`, 1 px gold foil edge (`linear-gradient(135deg, #f7d27a, #a8782a 40%, #f7d27a 60%, #8a5e1c)` as a border-image or a masked pseudo-element), inner top highlight like the existing `--sh-highlight-top`.
- **Notches:** two 10 px radius semicircles cut with a CSS `mask` (radial-gradient holes) at 72% of the width, top and bottom. The perforation is a 1 px dashed line in `rgba(247,210,122,0.35)`.
- **Type:** "SHADOW CLOUD" 11 px 600 letter-spacing 0.14em in gold; "30-DAY PASS" in Segoe UI Variable Display 22 px 700, tracking -0.02em, text colour. Price on the stub in 24 px tabular figures.
- **Orb:** the existing Shadow logo at 28 px, embossed (inner shadow plus a faint gold rim).
- **Glow:** a blurred ellipse behind the pass, `radial-gradient(closest-side, rgba(245,198,107,0.28), transparent)`, 160% of the pass width, sitting 8 px lower so light seems to come off the bottom edge. This is the "one glowing object" light.
- **Serial:** before purchase "№ ______" (an empty slot). After purchase the real pass number in Cascadia Code, the email, and "Valid till 14 Dec 2026". Never a fake number.
- **Punched state:** a 14 px hole punched through the stub (mask), the face fills with a soft gold gradient, and the dark text sits on gold. This is the only moment the paywall uses loud colour.
- **Build:** CSS plus inline SVG, so it stays sharp at every Windows scale factor. A real 3D render (Blender, gold/gunmetal materials) can replace it later for the website; never a Fluent emoji or a generated "inflated" render.

**The meter as stubs:** in the response panel header meta, from 5 left: five 8 × 12 px rounded stubs with a tiny notch, filled `--sh-text-3` for remaining, outline-only for used. At 1 left, the last stub takes a gold outline. That is the only gold before the paywall.

### 5.4 Layout of the limit card (440 px)

```
┌ 440 ─────────────────────────────────────────── [×] ┐
│ That was your 10th free answer          (12px, t-2)  │
│                                                       │
│        ╭───────── glowing gold pass ─────────╮       │
│        ╰─────────────────────────────────────╯       │
│                                                       │
│ Keep going with a 30-day pass          (16px, 600)   │
│ ₹149 · paid once with UPI · won't renew  (12.5, t-2) │
│                                                       │
│  ⌁ Reads the problem on your screen, one hotkey      │
│  ⌁ No API key to set up                              │
│  ⌁ Listen explains questions from a lecture          │
│                                                       │
│ [ Get the 30-day pass · ₹149 ]   ← gold, full width  │
│        Use my own key instead     ← text button      │
│                                                       │
│ Razorpay · UPI or card · 7-day refund                │
│ Already paid? Sign in                                │
└───────────────────────────────────────────────────────┘
```

### 5.5 Proposed tokens (additions only)

```css
:root {
  --sh-gold: #f5c66b;            /* pass type, focus ring on paid UI */
  --sh-gold-hi: #f7d27a;
  --sh-gold-deep: #a8782a;
  --sh-gold-grad: linear-gradient(180deg, #f7d27a 0%, #d9a648 100%); /* pay button */
  --sh-gold-ink: #1d1608;        /* text on gold */
  --sh-gold-glow: radial-gradient(closest-side, rgba(245, 198, 107, 0.28), transparent);
  --sh-pass-body: linear-gradient(160deg, #23242c 0%, #15151b 100%);
  --sh-surface-paywall: hsla(240, 12%, 9%, 0.97); /* more opaque than --sh-surface for money text */
  --sh-ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
}
```

### 5.6 Motion specs

The motion budget follows Emil's frequency rule and the productivity-tool rule ("motion exists to give feedback and keep spatial awareness, never to entertain or delay"). The paywall is a rare event, so it may have one moment of delight; the meter and the hotkey are frequent, so they get none.

| What | Animates? | Spec | Why |
| --- | --- | --- | --- |
| Limit card enter | Yes | Reuse `panel-in`: 240 ms `--sh-ease-out`, translateY(-8px) scale(0.98) → 0, opacity 0 → 1. Origin top center. | Matches every other Shadow panel (spatial consistency). |
| Listen-locked card enter | Yes | 200 ms `--sh-ease-out`, scale(0.96) → 1, opacity, `transform-origin` at the Listen button. | Anchored popover grows from its trigger. |
| Pass arrival | Yes, once per card | Starts 60 ms after the card. 420 ms `--sh-ease-out`: translateY(6px) rotateX(10deg) → 0, opacity 0 → 1, with `perspective: 600px` on the parent. Glow fades in over the same 420 ms. | First-time, rare: delight is allowed here. |
| Foil sheen | Yes, once | 900 ms linear, starts at 380 ms: a 30° white-to-transparent band (`opacity 0.35`) slides across the gold edge via `background-position`. Never loops. | Says "gold" without a shimmering loop. Looping shine is the cheap version. |
| Pointer tilt on pass | Optional | Max 4°, spring `stiffness 150, damping 18` (critically damped feel, no bounce), only inside `@media (hover: hover) and (pointer: fine)` and not under reduced motion. Resets on pointer leave in 300 ms. | Decorative, so a spring is right; small so it doesn't distract. Cut it if it costs any frame time. |
| CTA press | Yes | Existing `.btn:active` scale(0.97), 90 ms. | Instant press feedback. |
| CTA → "Opening checkout…" | Yes | Label crossfade 160 ms with `filter: blur(2px)` at the midpoint. Width fixed so the button doesn't jump. | Blur hides the two-label overlap. |
| Plan switch (if two plans) | Yes | Selection ring moves 200 ms `--sh-ease-in-out`. Price digits swap with a 120 ms opacity crossfade. | On-screen movement uses ease-in-out. |
| Waiting state | Yes | Indeterminate bar with the existing `shimmer` (1.4 s linear). | Status indicator. Avoid slow oscillations near one cycle per 5 s (Apple accessibility guidance). |
| Success punch | Yes, once | Hole appears with scale(1.15) → 1 over 180 ms `--sh-ease-out`; 60 ms later the face fills gold over 300 ms; glow brightens from 0.28 to 0.4 alpha over 400 ms. No confetti, no sound by default. | One causal, physical moment: the ticket gets punched. |
| Card exit | Yes | 150 ms, opacity → 0, translateY(-4px). Exit faster than enter. | System responding, so it's quick. |
| Meter stub decrement | **No** | Count updates instantly; the used stub switches to outline with a 120 ms opacity change at most. | Happens after a hotkey, many times a day. |
| Price numbers | **No** | Never count up or tick. | Numbers must read as fixed and honest. |
| CTA idle | **No** | No pulse, glow loop or wobble. | RevenueCat claims animated elements lift conversion 12 to 18% but cites no test; a pulsing pay button over the user's code is nagging. |
| Close button, legal line, restore link | **No** | Static. | Exits and terms must be calm and findable. |
| Command pill | **No changes** | Never add paywall motion to the pill. | Used hundreds of times a day. |

**Reduced motion.** `base.css` currently sets every animation and transition to 0.01 ms under `prefers-reduced-motion`. That is safe, but Apple and Emil both recommend keeping gentle opacity changes. For the paywall: no rotateX, no tilt, no sheen, no scale; card and pass fade in over 150 ms; the punch becomes an instant swap to the gold face with a 150 ms fade. If the global rule stays as is, everything still works, it just appears instantly.

### 5.7 Accessibility

**Contrast** (computed against the surface, including the worst case where the 93% surface sits over a white web page, which lightens it to about `#252528`):

| Pair | Ratio, dark page behind | Ratio, white page behind | Use |
| --- | --- | --- | --- |
| `--sh-text #ecedf1` on surface | about 16:1 | about 12:1 | Headline, price |
| `--sh-text-2 #b3b4bc` | about 9:1 | about 7.5:1 | Subhead, **reassurance line, legal text** |
| `--sh-text-3 #8a8c94` | about 5.5:1 | about 4.6:1 | Context line only. Too close to the 4.5 limit for money text. |
| `--sh-gold #f5c66b` | about 11:1 | about 9:1 | Pass type, focus ring |
| `--sh-gold-ink #1d1608` on gold button | above 10:1 | same | CTA label |
| White on the indigo gradient (top stop) | about 5.8:1 | same | Existing primary buttons |

So: reassurance, price terms and restore links use text-2, never text-3. Use `--sh-surface-paywall` (0.97 opacity) for the card so a bright page behind doesn't wash out the price.

**Keyboard and focus.**

- The overlay is click-through outside `data-interactive` regions. When a paywall card opens from a hotkey, the overlay window has to take focus so Tab and Esc work; give it back when the card closes. If the window can't be focused (the overlay sometimes avoids stealing focus from the user's editor), the card must at least be fully usable by mouse and offer the same actions in Settings.
- Focus order: CTA first (it gets initial focus), then "Use my own key instead", then plan link, then "Already paid? Sign in", then Close. Esc closes from anywhere.
- **Never bind Enter globally to pay.** The user may have been typing in their editor a second ago. Enter only activates the focused button.
- Focus ring: 2 px `--sh-gold` outline, 2 px offset, on all paywall controls.
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` the headline, `aria-describedby` the price line. The price reads in full: "149 rupees for 30 days, paid once, does not renew."
- The pass is decorative before purchase (`aria-hidden="true"`); after purchase, its text (email, pass number, valid till) is real text, selectable and readable by screen readers.
- Minimum sizes: interactive targets 32 px tall; fine print at least 12 px (the overlay currently uses 10.5 to 11 px in places, too small for terms).
- `prefers-contrast: more`: make the card fully opaque and add a 1 px `rgba(255,255,255,0.4)` border.

---

## 6. Anti-patterns and dark patterns to avoid

### 6.1 India's CCPA dark-pattern guidelines (notified 30 Nov 2023)

The Guidelines for Prevention and Regulation of Dark Patterns, 2023 list 13 practices in Annexure 1 and apply to any platform systematically offering goods or services in India, plus advertisers and sellers. CCPA has applied them in enforcement, and on 5 June 2025 advised e-commerce platforms to self-audit within three months. A one-person app is still covered.

| CCPA pattern | What it would look like in Shadow | Rule for Shadow |
| --- | --- | --- |
| **False urgency** | "Only 3 passes left at ₹149", a countdown that resets, "200 students bought today" that isn't true. | No countdowns. Sales only with a real end date shown as a date. No stock or popularity claims without real data. |
| **Basket sneaking** | Pre-ticked "Add 2 extra devices ₹49" or a donation at checkout. | Nothing pre-ticked, ever. The checkout total equals the pass price. |
| **Confirm shaming** | Secondary button "No thanks, I'll stay stuck" or "I don't care about my grades". | Secondary actions are neutral: "Use my own key instead", "Let it end", "Close". |
| **Forced action** | Requiring an account or phone number to use the free key mode; making the user buy to keep their screenshot. | Free mode needs no account. Closing the paywall keeps the screenshot. Email only when buying. |
| **Subscription trap** | Cancel only by emailing support; payment details required for the free answers; cancel button buried. | If a subscription exists: cancel in Settings in two clicks, same weight as "Keep". No card or UPI needed for free answers. |
| **Interface interference** | A tiny grey "Use my own key" next to a big gold button; hiding the cheaper plan behind "View all plans"; making Close hard to see. | The free path is a real, readable button (text-2 or brighter, 32 px target). All plans visible. Close visible from the first frame. |
| **Bait and switch** | Promoting "Free" on the website and then requiring payment on first use; advertising Listen as included and then locking it. | Website says "Free with your own key. Shadow Cloud from ₹149." exactly as the app does. |
| **Drip pricing** | ₹149 in the app, ₹175.82 in the browser after GST or a "convenience fee". | Show the GST-inclusive price everywhere. Processor fees are Shadow's cost. |
| **Disguised advertisement** | A "student review" card that is actually Shadow's own copy. | Every quote is real, verbatim, attributed, used with permission. Samples are labelled "Example". |
| **Nagging** | The paywall reappearing every launch, every few minutes, or after it was dismissed without the user doing anything. CCPA's own illustration is an upgrade prompt that keeps coming back after dismissal. | Paywalls only on user action (the gated hotkey or button), plus first launch once and the renewal note once. Dismissal is remembered per placement. No paywall popups on a timer. |
| **Trick question** | "Uncheck to not stop auto-renew". | Plain positive options. One question per control. |
| **SaaS billing** | A pass that quietly converts to a subscription; renewing without notice. | Passes never renew. If a subscription is added, the renewal note (D2) shows 3 days before, plus email, plus the RBI-mandated pre-debit alert from the bank. |
| **Rogue malware** | Fake "your key is compromised" alerts to push Cloud. | Never use fear or fake warnings. Key errors say exactly what failed. |

Related rules that touch the flow:

- **RBI e-mandate framework (UPI AutoPay and cards):** after a one-time authorisation, recurring debits up to ₹15,000 run without OTP, and the bank or provider must send a pre-debit alert at least 24 hours before each debit with merchant, amount and date, including an opt-out. A ₹149 subscription falls inside this, so "your UPI app will remind you a day before" is true for subscriptions. For a one-time pass there is no mandate at all, which is the simpler promise.
- **DPDP Act:** consent obligations for personal data start 13 May 2027. Ask only for the email, and explain why.

### 6.2 Design and copy anti-patterns (not illegal, still bad)

| Anti-pattern | Why it hurts Shadow |
| --- | --- |
| Paywall before the first answer | The user hasn't felt the value. Superwall's advice: trigger shortly after the "aha" moment. Shadow's aha is the first streamed explanation. |
| Exit-intent discount | Teaches users to close the first offer, contradicts the first price (Screensdesign), and underperformed at Mojo. |
| Pulsing or glowing CTA loop | Motion over someone else's work, many times a day. Reads as nagging and as cheap. |
| "Continue" as the pay button label | Hides that money is involved. Students who later notice the charge feel tricked. Name the price. |
| Asterisks and fine print | Blinkist's losing variant used them; they trigger distrust learned from TV ads. |
| Feature table in the overlay | Too wide, too much reading over the user's code. Put it in Settings. |
| Confetti, "Awesome!", reward wheels | The taste file's game-show clutter. The punched pass is the celebration. |
| Inflated 3D coins, clay gifts, mascots | The taste file's cheap-3D and cartoon rejections. |
| White plan cards with one accent colour | The "AI slop" look Aayush rejected; also blinding over a dark editor. |
| Usage charts ("your study stats") | Chart dashboards were rejected; a count of stubs says enough. |
| "Undetectable", "invisible to proctors", or any exam framing | False (Shadow is visible on screen share) and an integrity risk for students and for Shadow's name. Cluely-style positioning would also attract the users most likely to request refunds and chargebacks. |
| Restore buried or missing | Users who paid on another PC think they've been charged twice. |
| Auto-redirect from browser to `shadow://` | Browsers block it; the user sees an error page after paying. Use a click plus polling. |
| Fake "students online now", fake reviews, invented counts | Illegal under CCPA (false urgency, disguised ads) and against Aayush's truth-only copy rule. |

---

## 7. Build checklist

- [ ] Paywall only on: first launch (once), solve hotkey at zero answers, Listen click, renewal note (once, 3 days before).
- [ ] Free path ("Use my own key instead") on every paid card.
- [ ] Price identical in overlay, Settings, browser, email and receipt, GST included.
- [ ] Close visible from frame 0, 32 px, Esc works, task preserved.
- [ ] Waiting state polls; "I've paid" rechecks; activation code fallback; 10-minute time-out copy with support email.
- [ ] Webhook is the source of truth; `shadow://` payloads validated server-side.
- [ ] Pass renders sharp at 100%, 125%, 150%, 200% Windows scaling; tested over a white page and a dark IDE.
- [ ] Reduced motion: no transforms, fades only. Contrast: money text uses text-2 or brighter.
- [ ] Every number, quote and claim has a source. **[CONFIRM]** list: price, free-answer count, refund window, payment processor, device limit, screenshot retention, shutdown policy, Listen cost reason.

---

## Sources

Paywall research and patterns
- Superwall, best practices: https://api.superwall.me/blog/superwall-best-practices-winning-paywall-strategies-and-experiments-to
- Superwall, web checkout post-checkout redirecting (redeem mode, "Activating…" loading state, result copy): https://superwall.com/docs/ios/guides/web-checkout/post-checkout-redirecting
- Superwall template gallery: https://superwall.com/features/template-gallery
- RevenueCat, paywalls study guide (index of guides): https://www.revenuecat.com/blog/growth/paywalls-study-guide
- RevenueCat, essential guide to mobile paywalls (Mojo, Avast, monthly-equivalent framing, trial stats): https://www.revenuecat.com/blog/growth/guide-to-mobile-paywalls-subscription-apps/
- RevenueCat, 5 overlooked paywall improvements: https://www.revenuecat.com/blog/growth/paywall-conversion-boosters/
- RevenueCat, Blinkist-style timeline paywall: https://www.revenuecat.com/blog/engineering/how-to-build-a-blinkist-style-paywall-using-revenuecat-webhooks-and-zapier
- Stormy AI, lessons from 4,500 paywall A/B tests (secondary source): https://stormy.ai/blog/how-to-design-a-high-converting-mobile-app-paywall-lessons-from-4500-ab-tests
- Screensdesign, 16 paywall examples 2026: https://screensdesign.com/articles/mobile-app-paywall-design-examples-2026/
- Screensdesign, close button and dismissal examples: https://screensdesign.com/articles/mobile-app-paywall-close-button-examples/
- Paywall Screens (paywallscreens) on Product Hunt: https://www.producthunt.com/products/paywall-screens
- Nami, 20 types of mobile app paywalls: https://www.namiml.com/blog/20-types-of-mobile-app-paywalls
- Refero, paywall examples (Bloomberg metered meter): https://refero.design/p/paywall-examples/
- Mobbin (pattern library; no public paywall article found): https://mobbin.com/mcp

Case studies
- Growth.Design, Blinkist trial paywall (+23%, -55% complaints): https://growth.design/case-studies/trial-paywall-challenge
- Growth.Design, 9 ways to boost SaaS revenue with a better upgrade UX (Zapier): https://growth.design/case-studies/zapier-upgrade
- Growth.Design, Tinder monetization: https://growth.design/case-studies/tinder-monetization
- Growth.Design, Adobe trial UX: https://growth.design/case-studies/adobe-trial-ux

Usability research
- NN/g, State the price: https://www.nngroup.com/articles/show-price/
- NN/g, How to display taxes, fees and shipping charges: https://www.nngroup.com/articles/ecommerce-taxes-fees/
- NN/g, Explicitly state the difference between options (2024): https://www.nngroup.com/articles/explicit-differences/
- NN/g, "Get Started" stops users (2017): https://www.nngroup.com/articles/get-started/
- Baymard, cart abandonment rate and reasons (70.22% average; 40% extra costs; 19% distrust; 18% account creation; 12% total not visible): https://baymard.com/lists/cart-abandonment-rate
- Baymard, reduce cart abandonment: https://baymard.com/blog/reduce-cart-abandonment

Desktop apps and deep links
- Raycast Pro (price, trial credits, student discount): https://www.raycast.com/pro
- CleanShot X pricing and FAQ (license key, License Manager, auto-deactivation): https://cleanshot.com/pricing · https://cleanshot.com/faq
- Setapp CleanShot listing: https://setapp.com/apps/cleanshot%20
- Notion API, workspace block limits: https://developers.notion.com/reference/workspace-block-limits
- Notion help, upgrade or downgrade: https://Notion.com/help/upgrade-or-downgrade-your-plan
- Cursor usage limits (third-party guide): https://www.verdent.ai/de/guides/cursor-usage-limits-explained
- Cursor forum, usage limits: https://forum.cursor.com/t/cursor-pro-usage-limits-and-user-frustration/120023
- Hopp, deep linking for desktop apps (browser blocks auto deep links; require a click): https://www.gethopp.app/blog/deep-linking
- Stripe, payment links and universal-link return for digital goods: https://docs.stripe.com/mobile/digital-goods/payment-links
- Qonversion, web funnel redemption: https://documentation.qonversion.io/docs/web-funnel-redemption

India: regulation and market
- CCPA dark pattern guidelines overview (13 patterns, illustrations, enforcement, June 2025 advisory): https://www.legal500.com/intelligence/india/consumer-protection/ccpas-guidelines-on-dark-patterns-an-overview
- Inc42, list of 13 dark patterns: https://inc42.com/buzz/govt-issues-list-of-13-dark-patterns-plaguing-ecommerce-websites
- Deloitte summary of the guidelines (PDF): https://www2.deloitte.com/content/dam/Deloitte/in/Documents/tax/in-tax-gbt-the-guidelines-for-prevention-and-regulation-of-dark-patterns-noexp.pdf
- Business Today, RBI e-mandate framework 2026 (₹15,000 OTP-free, 24 h pre-debit alert): https://www.businesstoday.in/personal-finance/news/story/rbi-caps-recurring-payments-at-rs15000-without-otp-under-new-e-mandate-framework-526759-2026-04-21
- Business Standard, ChatGPT Go free for one year in India: https://www.business-standard.com/technology/tech-news/openai-offers-chatgpt-go-free-for-one-year-in-india-125102800612_1.html

Internal
- Shadow tokens: `src/renderer/src/styles/base.css`, `src/renderer/src/overlay/overlay.css`; first-run card: `src/renderer/src/overlay/Welcome.tsx`; README note "Shadow is always visible".
- Taste: `C:\Users\aayus\.claude\skills\app-taste\references\taste.md`; copy rules: `C:\Users\aayus\.claude\skills\website-taste\references\copy-voice.md`.
