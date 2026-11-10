# 00 · Shadow Cloud paywall strategy (synthesis)

Written 2026-11-10 from the six reports in this folder (01–06) and the paywall taste gallery on the Desktop.
Where the reports disagreed, the decision and the reason are noted. Numbers marked *(est.)* are estimates
that need a real measurement before launch.

---

## 1. The honest headline

1. **The paywall isn't the bottleneck yet. Getting users is.** Shadow has 0 GitHub stars and 3 downloads of v0.1.0 (04 §0).
   Even a great paywall converts 1–3% of active free users in India (03 §1.2, 01). Shadow Cloud's first job is
   to **remove the API-key step**, which cuts time-to-first-answer from about 4–8 minutes to about 60 seconds (04 §2).
   Revenue comes second.
2. **Test before building the full system.** All three skills applied in 04 (customer-microscope, positioning-forge,
   idea-executioner) reach the same verdict: the most fatal assumption is that students who love Shadow will pay rather than spend
   2 minutes getting a free key. Cheapest test: one week with ~15 classmates on a Razorpay **payment link**,
   with a hand-issued pass. Kill line: fewer than 2 of 15 pay.
3. **Don't ship screen-capture hiding.** The uncommitted `setContentProtection(true)` in `src/main/windows.ts` and
   `src/main/screenshots.ts` contradicts the README and makes Shadow look like a cheating tool. That is the most plausible
   reason a payment gateway would reject or freeze the account (03 TL;DR 7, 04 §0).

## 2. What to sell

**Free forever:** bring-your-own-key, fully visible. It is the free daily tier, it costs Aayush ₹0, and it is the best
protection against people farming free Cloud credits (04 §5). Hiding it would start an "open-source bait-and-switch" story and invite a fork.

**Free once, no sign-up:** a device-bound **starter pack of 20 answers + 10 Listen minutes**.
- Answers run on the cheaper `gemini-3.1-flash-lite` with `minimal` thinking (05 §6).
- Listen runs on the system-audio ("Them") stream only, which halves Deepgram cost (05).
- Worst case is about ₹4 + ₹9 ≈ **₹13 per install** *(est.)*.
- *Resolved:* the reports proposed 10–25 answers and 10–30 Listen minutes. 20 + 10 sits in the middle: enough answers for a
  placement-season night, while capping Listen, the cost centre.

**Paid: prepaid passes, one-time UPI, nothing auto-renews.** Reasons:
- UPI Autopay mandates fail or get declined most of the time (01, 03).
- Students are being auto-charged ₹399 by ChatGPT Go free years right now (02, 03).
- Prepaid passes avoid most subscription law in India, the EU and the US (03 §5).

| Offer | Gets you | Net after Razorpay | Margin at full use | Where it shows |
|---|---|---|---|---|
| ₹49 · 7-day Sprint | 50 answers | ₹47.8 | ~55% | Paywall, option 2 |
| **₹99 · 30-day Pass** ★ | 100 answers | ₹96.7 | ~56% | **Paywall, pre-selected** |
| ₹99 · Listen 30 | 30 Listen minutes, valid 90 days | ₹96.7 | ~50% | Listen paywall, add-on in Settings |
| ₹399 · 90-day Season | 100 answers / 30 days + 60 Listen min | ₹389.6 | ~42% | Settings only, at first |

- **Two options on the paywall, with the longer one pre-selected** (01: the usual winner; decoy third plans mostly don't hold up when retested).
- *Resolved:* report 06 used a ₹149 placeholder. 03 and 05 both show ₹149–₹299 sits too close to ₹399 AI plans and
  loses money once Listen is included, so **₹99** is the hero.
- Never say "unlimited". Every plan has a **hidden server-side spending limit** at about 85% of net revenue that switches to the cheaper
  model before Aayush loses money (05).
- International buyers later: $5–8 through Dodo Payments as the merchant of record (03, 05).

## 3. Where the paywall appears (and where it never does)

| Moment | Intensity | What it says |
|---|---|---|
| **First launch** (replaces the "go get a key" welcome) | Card, no price | "Your first 20 answers are on us. No key, no card." Link: "Have a Gemini key? Use it instead." |
| **Every Cloud answer** | Meta line | "Shadow Cloud · 14 free left" (no surprise wall later) |
| **5 left / last one** | One toast each, plus a small stub meter | "5 free answers left" |
| **Solve with 0 left** ← *main paywall* | Card in the answer panel, **screenshot kept** | "That was your 20th free answer. A 30-day pass is ₹99, paid once with UPI. It won't renew on its own." [Get the 30-day pass · ₹99] · Use my own key instead |
| **Listen with 0 minutes** | Card in the transcript slot | "Listen costs more to run than a screenshot, so it's paid. Your screenshot answers stay free with your own key." |
| **Listen runs out mid-lecture** | Warnings at 3 and 1 minutes left, then a soft stop; the transcript stays | "Listen paused. The transcript so far stays here." |
| **Own-key user hits Gemini's free limit (429) or a 5 s stall** | Inline row | "Gemini's free limit is full for a minute. [Answer this with Shadow Cloud]" — *the best upsell for existing users* |
| **3 days before a pass ends** | Once, dismissible, equal-weight buttons | "Your pass ends on 14 Dec. Renew, or let it end. Nothing is charged unless you choose." |

**Never:** on launch after the first time, on a timer, during auto-answer, as a modal over the pill or hotkeys, with red error styling,
or by opening the browser without a click. Never cut off an answer that's already streaming. Follow-ups on the current problem keep working.

Data: 93% of first purchases happen on day 0, and onboarding paywalls convert about 4x better than later ones (01). So the first-launch card matters
even without a price on it: it makes Cloud the default path.

## 4. The payment round trip

Decide in the overlay → pay in the real browser → come back by polling or by the deep link, whichever comes first.

1. The user clicks the button. The server creates a checkout tied to this install id and opens the browser. Capture the email first, so an abandoned checkout can be recovered (01).
2. The overlay shows "Finish paying in your browser. This card updates on its own," and checks the server every 3 seconds. Buttons: I've paid · Reopen checkout · Cancel.
3. Razorpay's server notification is the source of truth. `shadow://` only speeds things up, because browsers ask "Open Shadow?" and people cancel it.
4. The success page shows an [Open Shadow] button plus an activation code as a fallback.
5. The overlay punches the pass and **answers the saved screenshot straight away**.
6. After 10 minutes with no payment: an honest message plus a support email. Keep checking slowly for 30 more minutes.

The biggest risk to sales is someone who paid and comes back to a card that still says "out of answers" (06 §3.2).

## 5. How it looks

**Taste-gallery result (10 Nov 2026): 174 screens, 20 ★, 38 ❤, 116 ✕.**
- **What got ★:** dark tech premium. A black or deep-violet ground, one glowing or chrome object, and neon light, not gold. The ★ screens:
  - Raycast's chrome "PRO" hero and pricing page
  - a glass crystal on a lime upgrade modal
  - glowing price capsules
  - a glowing credit-usage meter
  - neon-green lit plan cards
  - dark "trial finished" plan pickers
  - the Perplexity Pro, Spotify and CRED club web pages
- **What got ✕:**
  - all 68 shipped light mobile paywalls (none got a ★)
  - **every Indian gold membership:** Zomato Gold (×6), Jar gold, District perks, Swiggy One, membership cards
  - checkout-success screens
- **So the gold-foil ticket below is rejected.** The paywall should use Shadow's existing violet night glass, one glowing glass or chrome object, and a credit/usage meter as a design element.

*Superseded starting direction* (written before the votes), in 06 §5:
- **The one glowing object:** a die-cut gold-foil **Shadow Pass** ticket on Shadow's existing night glass.
  - It has notches, a perforation line, and a stub with the price.
  - Before purchase the serial slot is empty. After purchase it's punched, dated, and becomes the license view in Settings.
  - Free answers left show as tiny stubs in the meter.
- **Gold appears only on the pass and the pay button.** Indigo stays the product colour.
- **Motion is spent once:** a 420 ms entrance and one foil sheen. No pulsing buttons, no animated counters, no confetti.

**Next:** rate the gallery, then render **two directions** of the limit card at real size beside the ★ screens.

## 6. Rules the paywall must follow (India's dark-pattern guidelines become binding 1 Jan 2027)

- **Neutral decline buttons:** "Not now" and "Use my own key instead". Never wording that shames the user for saying no.
- **No fake timers or countdowns,** and no "only 3 left".
- **No pre-ticked add-ons.** PhysicsWallah was fined ₹5 lakh, partly for a pre-selected ₹10 donation.
- **One all-inclusive price.** Never "+GST". A struck-through price must be the lowest price of the last 30 days.
- **Ask for data only when it's needed:** email at checkout only, no phone OTP.
- **If a subscription is ever added,** cancelling must be as easy as buying, with equal-weight buttons. McAfee was fined for "Renew Now / Accept Risk" with no neutral option.
- **Refund line on the paywall** (for example a 7-day refund). Make it real before showing it.

## 7. Cost guardrails (server-side, from 05)

- Quotas, prices and copy come from the server. The client has no auto-updater, so the server is the only thing you can change after release.
- Cap output at 4,096 tokens. Run the backup-model race for paid users only.
- Listen: auto-stop after idle, a hard cap per session, a Them-only stream by default, and test Nova-3 or Groq Whisper as cheaper speech-to-text.
- **Measure tokens on about 20 real solves before fixing prices.** At 2,500 output tokens instead of 1,500, a solve costs ₹0.67 and the ₹99 Pass margin shrinks.

## 8. Decisions for Aayush

1. Remove the uncommitted screen-capture hiding? (Recommended: yes, before applying to any payment gateway.)
2. Run the one-week classmate test first, or build straight away?
3. Confirm the ladder: ₹49 Sprint / **₹99 Pass** / ₹99 Listen 30 / ₹399 Season.
4. Gateway: Razorpay or Cashfree (no fees on the first ₹20 lakh until 31 Mar 2027). Both need only a PAN and a bank account as an individual.
5. Rate the paywall taste gallery.
