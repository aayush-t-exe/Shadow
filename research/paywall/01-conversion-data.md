# 01 - What makes paywalls convert: the quantitative evidence

Researched 2026-11-10 for Shadow Cloud (paid, no-API-key mode next to the free BYOK mode).

**How to read the labels**

- **[V]** Verified. I read the number on the primary page (report, filing, or the author's own post). The date is the publication date.
- **[S]** Secondary or vendor-reported. The number comes from a vendor case study, a vendor's "winning tests" aggregate, or a third party quoting a report I couldn't open. It points in a direction but proves nothing.
- **[W]** Weak. Single anecdote, unclear method, or sources disagree. Use it only for test ideas.
- **[I]** Inference. My reasoning for Shadow, not data.

**Read this before using any number.** Almost all large datasets (RevenueCat, Adapty, Superwall, Paywall Index) cover **mobile app-store subscription apps**. Shadow is a **desktop app that will take payment through a web checkout** (Razorpay or Dodo), so the B2B/prosumer SaaS data (Kyle Poyar, Lenny, First Page Sage) is closer on checkout behaviour. Hard-paywall vs freemium comparisons are also **cross-app correlations with selection bias**: apps with strong intent pick hard paywalls.

---

## TL;DR: top 10 findings, ranked by expected impact on Shadow

1. **The first session is where nearly all buying happens, and Shadow's API-key screen sits right on that moment.**
   - Adapty 2026: 93% of first purchases happen on Day 0, 60% of buyers buy on the first paywall view, and 53% of subscription revenue starts in the first session. Onboarding paywalls convert 0.85% view→paid against 0.23% for later paywalls (about 4x) [V].
   - RevenueCat: 82% of trial starts happen on install day [V].
   - [I] Today the first-run screen asks people to "go create a Gemini key and a Deepgram key". The Cloud offer should replace that screen as the default path ("Start with Shadow Cloud, no keys needed"), with BYOK as the secondary link. This is the biggest lever because it removes the friction and makes the offer at the same moment.

2. **Gate the expensive part. Pure "free forever" cloud usage converts about 5x worse than a gated model.**
   - RevenueCat SOSA 2026: median Day-35 download→paid is 10.7% for hard paywalls vs 2.1% for freemium. Revenue per install at Day 60 is $3.09 vs $0.38. One-year retention of yearly subscribers is about the same (27% vs 28%) [V]. The 2025 edition reported 12.1% vs 2.2% [S].
   - Caveats: the comparison is correlational. Hard-paywall refunds run 5.8% vs 3.4% [S]. One RevenueCat client moved hard→freemium and gained 75% LTV per user; another lost more than 50% of conversions and reverted [V].
   - [I] For Shadow, the free BYOK mode already acts as the "freemium" tier, and every Cloud answer costs Aayush money. So Cloud should be **gated with a small, capped free allowance**, not an open free tier.

3. **India needs its own price, and probably its own payment shape.**
   - RevenueCat 2026, IN/SEA vs North America:

     | Metric | IN/SEA | North America |
     |---|---|---|
     | Download→trial | about 3.0-3.7% | 7.1% |
     | Trial→paid | 15.2% | 34.2% |
     | Download→paid (D35) | 0.7-1.4% | 2.6-2.8% |
     | Median monthly price | $3.75 | $9.99 |
     | Median yearly price | $18.32 | $39.99 |

     [V]
   - UPI AutoPay recurring debits are unreliable. Mint (Oct 2025), using NPCI's August 2025 data, reported that 55-90% of AutoPay debits failed across banks [S]. Another report says approval rates fell from about 50% (Jan 2024) to about 30% (Nov 2025) [W]. One-time UPI payments succeed about 99% of the time [S].
   - [I] For Indian students, **prepaid passes paid by one-time UPI** (exam week, month, semester) will likely collect money more reliably than an auto-renewing monthly plan.

4. **Charge for what costs money. Listening hours are the cost driver, and credits are now mainstream.**
   - Shadow's own code (`src/main/live/credit.ts`) prices Deepgram Flux at $0.0065/min per stream. Listening runs two streams, so one hour costs about $0.78. File 05 estimates about ₹96/hour all-in and about ₹0.43 per solve [V, from the codebase and file 05].
   - Credit pricing in the PricingSaaS 500 grew from 35 to 79 companies in 2025 (+126%) [V, Growth Unhinged].
   - RevenueCat says hybrid pricing (subscription + consumables/usage) is "the default model in 2026". 35% of apps already mix subscriptions with consumables or lifetime purchases [V].
   - Lovable: one-month credit rollover "did not impact our conversion or pay-to-play upgrades" and improved retention [V, Metronome Q&A].
   - [I] Solves are about 200x cheaper per unit than a listening hour. Price plans in "listening hours + answers". Generous on answers, capped on hours, with a top-up pack.

5. **Show how the trial works, and promise a reminder. This is the best-replicated element.**
   - Blinkist's transparent trial screen (timeline plus a reminder before the charge) gave +23% trial sign-ups and −55% complaints. Its push opt-in went from 6% to 74% [S, self-reported].
   - Paywall Index (3,313 Superwall onboarding paywalls, Oct 2026): paywalls with a reminder screen convert 14.8% vs 8.7% without, and earn $1.53 vs $0.96 per view [V, correlational].
   - Adapty, winning tests only: a trial explainer raised ARPU 12-36% [S].
   - An indie replication of Blinkist cut Day-0 cancels but saw trial→paid fall 7.8% [W].

6. **Don't require a card upfront. Bound the free Cloud trial by usage instead.**
   - Card-required trials convert 30% trial→paid, "more than 5x" no-card trials (Growth Unhinged 2026, 200 products). Only 20% of trial products require a card [V].
   - Per visitor, it roughly washes out. First Page Sage: opt-in trials get 8.5% visitor→trial × 18.2% = about 1.5% visitor→paid. Opt-out (card) trials get 2.5% × 48.8% = about 1.2% [V numbers, I arithmetic].
   - [I] Indian students often have no credit card, and a UPI mandate for a trial is the unreliable path from finding 3. A no-card trial capped at N answers + M listening minutes bounds cost without the card friction.

7. **Expect to lose roughly a quarter to a third of buyers when the purchase leaves the app, so design the checkout handoff carefully.**
   - RevenueCat × Dipsea test (May 2025, about 3,100 users per arm): IAP-only initial conversion was 27.0% vs 18.1% for web-only. Conversion to paying was 6.3% vs 5.3% [V].
   - Adapty: web checkout cut purchase rate per paywall view by 26% (4.95% → 3.69%) [S].
   - [I] Shadow has no native store, so every purchase is a browser handoff. Pre-fill email, show UPI QR / UPI intent first for India, auto-detect payment back in the app, and send a recovery email (finding 9).

8. **Paywalls need repeat, contextual exposures. One onboarding screen is not enough.**
   - Adapty 2026: about 7 in 10 paywall views happen after the first session, and those later paywalls bring 38% of revenue [V]. 15% of buyers buy on the second view [V].
   - Superwall: among its 25 biggest apps, every app with a transaction rate above 5% averaged at least one paywall view per user. Paywalled users saw about 2 paywall views before converting [S, 2022].
   - Case studies [S]: Greg (plant app) moved its paywall from a usage gate to onboarding: trial sign-ups +400%, 3% → 15%. Wizz cut prompt volume 50% and timed prompts better: +81% on the primary offer flow.
   - [I] Shadow's natural contextual moments: free allowance used up, an answer that just helped (post-aha), starting Listen, and exam-season sessions.

9. **Two options, the longer one pre-selected, and a small rescue discount.**
   - Adapty 2026: paywalls with two plan lengths show 67% higher conversion. The most common layouts are 1 plan (41%), 2 (39%) and 3+ (20%) [V]. Annual pre-selected with the trial attached: ARPU +25-40% in winning tests [S]. Paywall Index: leading with yearly converts and earns about 1.5x [V, correlational].
   - Discount depth (Adapty): subscribers who took up to 30% off still generate 90% of full-price six-month revenue; above 60% off, only 46% [V].
   - Superwall "transaction abandon" paywalls produced 17% of revenue across 18 companies [S, not incrementality-tested].
   - Lifetime plans: 14% of apps offer one, and they bring about 1% of revenue [V]. A bad fit when every use costs money [I].

10. **Recover the people who almost paid, and the people who left.**
    - Paddle sends checkout-recovery emails 60 minutes after abandonment and claims 10-30% recovery. It says 10-20% discounts work best [S, vendor doc].
    - RevenueCat SOSA 2026 reactivation (cancelled subscribers who resubscribe within a year): monthly 18-24% (Productivity monthly 36.1%, APAC about 24%), annual 4-6%, weekly 7-10% [V].
    - Adapty: 56% of returning subscribers who take an offer are still paying after 3 months [V].
    - [I] Students are seasonal. A "your exams are back, here's 20% off a semester pass" email is the cheapest revenue Shadow will get.

---

## 1. Benchmark conversion rates

### 1.1 Consumer / mobile subscription apps

| Metric | Value | Source | Label |
|---|---|---|---|
| Download→paid, D35, median (all apps) | 2.0% (2026); 1.9% (2025); top performers 4.6% | RevenueCat SOSA 2026 / 2025 | V |
| Download→paid, hard paywall vs freemium (median) | 10.7% vs 2.1% (2026); 12.1% vs 2.2% (2025) | RevenueCat SOSA 2026; Airbridge citing 2025 | V / S |
| Same, top 10% | hard 39.0% vs freemium 7.9% | Airbridge citing SOSA 2025 | S |
| Trial→paid, median vs top | 34.8% vs 51.5% | RevenueCat (SOSA 2025 via Dec 2025 blog) | V |
| Trial→paid by region | NA 34.2%, APAC 31.9%, W. Europe 29.7%, LATAM/MEA/ROW about 20-23%, **IN/SEA 15.2%** | RevenueCat SOSA 2026 | V |
| Download→trial (D30) by region | NA 7.1%, APAC 5.7%, W. Europe 5.0%, **IN/SEA and others 3.0-3.7%** | RevenueCat SOSA 2026 | V |
| Download→paid (D35) by region | NA 2.6-2.8%, APAC 2.4%, W. Europe 2.0%, LATAM 1.5%, **IN/SEA 0.7-1.4%** (two charts disagree) | RevenueCat SOSA 2026 | V (internally inconsistent) |
| Download→paid by price tier | high 2.8%, mid 2.0%, low 1.4% | RevenueCat SOSA 2026 | V |
| Paywall view→paid | US 2.75%, Europe 1.38% | Adapty State of Paywalls 2026 | V |
| Install→trial / trial→paid (global avg) | 10.9% / 25.6% | Adapty SOIS 2026 | V |

**Education apps**

- Download→trial 6.5%.
- 78.5% of trial starts on Day 0, the lowest of any category, so education buyers take longer.
- Only 28.5% of paid conversions happen on Day 0.
- 50.3% of trials are 5-9 days long.
- Median yearly price $44.99 (the highest category); monthly $9.99.
- Revenue per install at Day 14: $0.30. Year-1 realized LTV per payer: $22.82.
- All of the above: RevenueCat SOSA 2026 Education page [V].
- Education trial→paid 42% and refund rate 4.86%: SOSA 2025 via Airbridge [S].

**AI apps (RevenueCat SOSA 2026, via PPC Land, Mar 2026)** [S, consistent with RevenueCat's own summary]

| Metric | AI apps | Non-AI apps |
|---|---|---|
| Trial start rate | 8.5% | 5.6% |
| Download→paid | 2.4% | 2.0% |
| Year-1 LTV per payer | $30.16 | $21.37 (+41% for AI) |
| Monthly plan 12-month retention | 6.1% | 9.5% |
| Annual plan retention | 21.1% | 30.7% |
| Refund rate | 4.2% | 3.5% |
| Monthly plans' share of subscriptions sold | 59.8% | 26.2% |

- RevenueCat's own page says AI monthly plans retain 36% worse over 12 months [V].
- 41.1% of Productivity subscription apps are AI-powered.
- "86% of AI apps skip trials" appears only in an Airbridge summary of SOSA 2025 [W, unverified].

**Consumer AI at scale**

- ChatGPT: just over 5% of weekly actives pay. OpenAI reported 50M+ consumer subscribers against 900M+ WAU in Feb 2026. The CFO said 5-6% free→paid in Oct 2024 [S, press reports of company statements].
- Duolingo: 12.7M paid subscribers vs 140.6M MAU in Q2 2026, about 9% of MAU and about 22% of DAU. My arithmetic on SEC filings [V numbers, I ratio].

### 1.2 SaaS / prosumer / desktop-like (web checkout)

| Metric | Value | Source | Label |
|---|---|---|---|
| Free→paid, median across 200 B2B products | **8%** (within 6 months) | Growth Unhinged free-to-paid report, Feb 2026 | V |
| Card-required trial → paid | **30%**, more than 5x no-card trials | same | V |
| Model adoption | free trial 57%, freemium 26%, reverse trial 7%, paid trial 4% | same | V |
| Trial length used | 14 days 62%, 7 days 14%, 30 days 14% | same | V |
| Freemium self-serve good / great | 3-5% / 6-8% | Lenny + Kyle Poyar, Aug 2023, 1,000+ products | V |
| Free trial good / great | 8-12% / 15-25% | same | V |
| Developer-focused products, median | about 5%, half the others | same | V |
| Opt-in trial (no card) | visitor→trial 8.5%, trial→paid 18.2% | First Page Sage, Sep 2025, 86 SaaS clients, agency data | S |
| Opt-out trial (card) | visitor→trial 2.5%, trial→paid 48.8% | same | S |
| Freemium | visitor→signup 13.3%, free→paid 2.6% | same | S |
| Edtech trial→paid | 24.8% (visitor→trial 10.3%) | same | S |
| Lovable (AI app builder) free→paid | "typically 5-10%" (Verna's blog); "double-digit" (Stripe case study) | Elena Verna / Stripe | S (inconsistent) |
| ChatGPT traffic → Webflow signups | 24% conversion, about 6x Google traffic | Growth Unhinged, Mar 2026 | V |

[I] **Expectation for Shadow Cloud.** Of people who reach the Cloud offer, plan on **2-5% paying within a month if they are worldwide, and about half that for Indian students**. If the offer replaces the API-key step, a much higher share of installs will see it.

---

## 2. Hard paywall vs freemium vs reverse trial vs usage-limited

**What the data says**

- **Hard paywall vs freemium**
  - About 5x download→paid [V].
  - About 8x revenue per install at D60 ($3.09 vs $0.38) [V].
  - Similar 1-year retention of yearly subscribers (27% vs 28%) [V].
  - Higher refunds (5.8% vs 3.4%) [S].
  - Adapty: hard paywalls give 21% higher LTV per subscriber [V].
  - Adapty, same app hard vs soft: trial starts 4.7% vs 3.2% (+48% for hard), but direct purchases 0.50% vs 0.75% (−33%). Hard wins on the combined total in 57% of apps [V]. So in more than 4 in 10 apps, a hard paywall does *not* win.
- **Caveats**
  - David Barnard (RevenueCat, Apr 2026) reports one client gaining +75% LTV per user by going hard→freemium, and another losing more than 50% of conversions [V].
  - The large gap is partly selection: apps with obvious upfront value choose hard paywalls.
- **Freemium in AI**
  - Elena Verna (Lovable) argues freemium still works for AI, "the most rational irrational strategy". Lovable spent "hundreds of millions" on its free tier and applies a **3-month payback threshold** to free acquisition [S].
  - Kyle Poyar: 70-80% of AI token consumption comes from about 10% of users [V, practitioner estimate].
  - Growth Unhinged: giving free users limited AI credits each month increased MAU [V, anecdote].
- **Reverse trial** (full features for N days, then downgrade)
  - Adopted by 7% of products [V].
  - The often-quoted "10-40% lift over freemium" traces to Elena Verna's practitioner estimate [W]. I found no primary dataset.
  - Calendly runs 14 days and Canva 30 days, both no card. Grammarly runs 7 days [S].

**[I] Fit for Shadow, where every use costs money**

- A pure time-based reverse trial is risky. A student who installs the night before an exam can burn hours of Listen (about ₹96/hour) in a few days.
- The right shape is a **usage-limited reverse trial**: on first run, give Cloud with no keys for a small fixed allowance, for example 15 answers + 30 Listen minutes (about ₹55 of cost at file 05's numbers). Then fall back to "pay, or bring your own keys".
- This keeps the hard-paywall dynamics (the offer is unavoidable, at the moment of highest intent) while the BYOK path stays free and open-source honest.

---

## 3. Trials

**With vs without**

- Adapty 2026: trials help LTV in some categories and hurt it in others.
  - Annual plans: trials raise LTV in Utilities, Health & Fitness and **Education**.
  - Direct buyers are worth more in **Productivity**, Lifestyle, Entertainment, and Graphics & Design.
  - [S, Adapty report summary]
- Trial subscribers retain 1.4-1.7x better than direct buyers [V, Adapty].
- Productivity LTV: $55.45 for direct purchasers vs $40.13 for trial users [S, Airbridge citing Adapty].
- In Adapty's trial-period experiments, 59.6% raised LTV but only 39.9% raised conversion [V].

**Length**

| Trial length | Median trial→paid | Source |
|---|---|---|
| ≤4 days | 25.5% | RevenueCat SOSA 2026 [V] |
| 5-9 days | 37.4% | same |
| 17-32 days | 42.5% | same |
| 1-4 / 5-9 / 10-16 / 17-32 days (older data, 10k apps) | 30% / 45% / 44% / 45% | RevenueCat blog, updated Jun 2024 [V] |

- 46.5% of apps now use trials of 4 days or less, even though short trials convert worst [V].
- 55.4% of 3-day-trial cancellations happen on Day 0, and 84% by Day 1 [V].
- Adapty: 32% of trial cancels happen within 1 hour and 44% within 24 hours (Europe 55%) [V].
- Most of those Day-0 "cancels" turn off auto-renew while keeping the trial. That is fear of forgetting, which is exactly what the Blinkist reminder fixes.

**Card-required vs not.** See TL;DR 6. Card-required gets far fewer starts but much higher trial→paid. Per visitor, the two land close together.

**Reminders and the "how your trial works" timeline**

- Blinkist (7-day trial, reminder 2 days before the charge): +23% trial sign-ups, −55% complaints, about 4% fewer trial cancellations, push opt-in 6% → 74% [S, self-reported].
- Paywall Index, Oct 2026 (145 apps' best paywalls) [V, correlational]:
  - A reminder screen appears on 84% of the top-25 paywalls. Conversion is 14.8% with it vs 8.7% without.
  - A promise/value screen first converts 13.9% vs 10.8%.
  - A buy button on screen 1 *hurts*: 8.8% vs 13.6%.
  - Multi-page paywalls convert 9.3% vs 6.3% for single-page.
- The Masterly (single SaaS test): timeline +28% trial starts; a default-on "Remind me before my trial ends" toggle +14% [W].
- Linearity Curve (Superwall case): 10% higher trial conversion when users actively *chose* the trial instead of having it bundled by default [S].
- Pepper (Superwall case): timeline paywall +50% LTV [S].
- Counterpoint: an indie dev copying Blinkist saw trial→paid fall 7.8% among users who asked for the reminder [W]. Run it as an A/B test.

**[I] For Shadow**

- Shadow is free to start, so there's no charge to remind people about.
- Adapt the timeline to the allowance: "Today: full Shadow Cloud. When 15 answers / 30 min are used: choose a pass or add your own keys. We never auto-charge."
- For subscriptions, send a reminder email 2 days before renewal. RBI's e-mandate rules already require a pre-debit notification for recurring charges in India.

---

## 4. Timing and placement

| Finding | Number | Source | Label |
|---|---|---|---|
| Onboarding vs later paywall, view→paid | 0.85% vs 0.23% (about 4x); revenue per 1,000 views about $170 vs $40 | Adapty State of Paywalls 2026 | V |
| Share of revenue starting in session 1 | 53%; later paywalls 38% | same | V |
| First purchases on Day 0 | 93% | same | V |
| Buy on 1st view / 2nd view | 60% / 15% | same | V |
| Onboarding vs in-app, with trial (install→paid) | 1.78% (or 1.35%) vs 0.89% | Adapty blog, two figures | S |
| Trial starts on install day | 82% | RevenueCat SOSA 2025 | V |
| Apps using 2+ paywalls / 5+ | 80% / 44% | Adapty 2026 | V |
| Paywall views per user, top apps | ≥1 per user among apps with transaction rate above 5%; about 2 views before converting | Superwall, Nov 2022 | S |
| Install→paywall view target | ≥85% of installs; show the paywall before onboarding if onboarding completion is below 85% | Superwall | S (guidance) |
| Greg: usage gate (6th plant) → onboarding paywall | trial sign-ups +400%; 3% → 15% | RevenueCat blog, 2023 | S |
| Rootd: paywall moved early in onboarding | 5x revenue | same | S |
| Wizz: held-back, better-timed prompts | −50% prompt volume, +81% on the primary offer flow, about +20% LTV | RevenueCat, Dec 2025 (ContextSDK case) | S |
| Unnamed meditation app: moved paywall upfront | −40% conversion | PaywallPro blog | W |

**Dismissible vs not**

- 11% of apps use a no-close-button paywall, which accounts for 2% of paywall views [V].
- 22% of apps delay the close button, usually by 3-5 seconds [V].
- No rigorous public test isolates close-button delay, and none reports refunds. One developer claims +5-7% trial conversion [W].
- Adapty's playbook notes that *adding* a close button sometimes raises conversion [S].

**[I] For Shadow**

- Shadow is a tool people summon mid-problem, so a non-dismissable modal would collide with the core job and with the "visible, honest study companion" positioning.
- Use the onboarding offer at first run.
- At the limit, use an inline, contextual paywall: the answer area becomes the offer, with BYOK always one click away.
- Add a soft post-aha nudge after a solve the user rated helpful or followed up on.
- Cap exposure frequency.

---

## 5. Plan count, structure and price display

| Finding | Number | Source | Label |
|---|---|---|---|
| Plan lengths offered | 1: 41%, 2: 39%, 3+: 20% | Adapty 2026 | V |
| Two plan lengths vs one | +67% conversion (report headline) | Adapty 2026 | V (headline, method unclear) |
| Adding more products | wins only 53% of A/B tests | Adapty 2026 | V |
| Annual pre-selected + trial on annual | ARPU +25-40% (winning tests) | Adapty | S |
| Leading with yearly vs a yearly+monthly picker | about 1.5x conversion and revenue | Paywall Index, Oct 2026 | V (correlational) |
| Default stickiness | 90% keep a pre-selected weekly plan vs 46% a pre-selected annual | Adapty 2026 | V |
| Weekly plans | 55.5% of 2025 revenue (up from 43.3% in 2023); convert 1.7-7.4x better than annual | Adapty SOIS 2026 | V |
| Weekly retention | 1-yr retention 3.4% (weekly) vs 17.0% (monthly) vs about 44.1% (annual) | RevenueCat SOSA 2025 | V |
| Annual subscribers cancelling in year 1 | about 72% (2026) vs about 56% (2025); 35% of annual cancels happen in month 1 | RevenueCat SOSA 2026 | V |
| Annual plan share falling | 41.4% → 33.6% of plans | SOSA 2026 commentary | S |
| Lifetime | 14% of apps offer it, about 1% of revenue; priced at about 1.3x annual; adding lifetime next to annual +10-15% revenue (winning tests) | Adapty 2026 | V / S |
| Price display | annual shown as yearly amount on 62% of paywalls, as monthly on 24%, as weekly on 4% | Adapty design sample (100 paywalls) | V (prevalence, not effect) |
| "Save X%" badge / crossed-out price | 41% / 16% of paywalls | same | V (prevalence) |

**Decoy/anchoring**

- Ariely's Economist example (web $59 / print $125 / both $125) moved the combo share to 84% when the decoy was shown. It was a classroom demonstration [W as product evidence].
- Two large 2014 *Journal of Marketing Research* replications (Frederick, Lee & Baskin, "The Limits of Attraction"; Yang & Lynn) found the attraction effect largely disappears with realistic stimuli. Don't build a fake third plan expecting a big lift.
- "Pennies-a-day" framing (Gourville, *Journal of Consumer Research*, 1998) is an established effect that makes a price feel small. Use it honestly ("₹10 a day during exams").

**[I] For Shadow**

- Two options: a short pass and a longer pass/subscription, with the longer one pre-selected.
- For Indian students the "annual" equivalent is a **semester/exam-season pass**. Real annual plans churn heavily in AI (21% annual retention for AI apps).
- Lovable deliberately de-emphasizes annual in favour of monthly [V].
- Skip lifetime: an open-ended liability on per-use cost.

---

## 6. Paywall elements (what tests found)

Adapty's lifts are from *winning* tests only, so they overstate the typical effect. Win rates are the more honest number.

| Element | Effect | Source | Label |
|---|---|---|---|
| Trial explainer / timeline | ARPU +12-36% (winners) | Adapty 2026 | S |
| Reminder screen | 14.8% vs 8.7% conversion | Paywall Index | V (correlational) |
| Social proof | conversion +10-30% (winners). Paywall Index: 14.1% vs 11.9%, revenue per view $1.52 vs $1.04. Only 27% of paywalls use it | Adapty; Paywall Index | S / V |
| Personalization (personalized onboarding) | ARPU +13-35% (winners); only 2% of headlines are personalized; 1 in 4 apps personalize paywalls | Adapty | S |
| Visuals / animation | ARPU +16-34% (winners); 54% of paywalls use no image | Adapty | S |
| Visual or copy-only tests in general | only 35% raise LTV, 31% raise conversion | Adapty SOIS 2026 | V |
| Localization tests | 62% raise LTV, the highest win rate of any test type | Adapty SOIS 2026 | V |
| Price tests | 46% raise LTV, but only 28% raise conversion | same | V |
| Feature checklist | on 48% of paywalls; no isolated effect found | Adapty design sample | V (prevalence) |
| CTA copy | 83% mention the trial in the CTA; "Start free trial" 36%, "Continue" 23%. Paywall Index: "Try for $0.00" did better; "Turn on reminders" weakest at 12.1% | Adapty; Paywall Index | V / S |
| "Cancel anytime" line | on 68% of paywalls; no isolated effect found | Adapty | V (prevalence) |
| Duolingo CTA framing | "free week" wording made more people subscribe than "start your 7-day free trial" (they thought they had to pay) | podcast recollection | W |
| Headline length | median 5 words; 79% ≤6 words | Adapty | V (prevalence) |

**Feature list vs benefit list.** I found no clean test. The closest is Paywall Index's "promise screen first" (a benefit/outcome statement) at 13.9% vs 10.8%. Duolingo changes the first bullet to match where the user entered the paywall [S].

**[I] Most promising for Shadow, in order**

1. Contextual headline matched to the entry point. For example: "You've used your 15 free answers. Keep going in Hindi/English for ₹X."
2. How-it-works / no-surprise-charge reassurance.
3. Real social proof: students, GitHub stars, colleges.
4. Localized INR pricing with UPI first.

Animation and heavy visuals are low priority for a slim overlay.

---

## 7. Credits / prepaid packs vs subscription for AI

**Evidence**

- Credit adoption: 79 of the PricingSaaS 500 offered credits by end of 2025, up from 35 (+126%). "Credits became the defining pricing trend of the year." The authors expect some swing back toward simplicity [V, Growth Unhinged + PricingSaaS].
- Kyle Poyar (Sep 2025): Microsoft, Salesforce, Cursor, OpenAI Enterprise, Adobe, Replit, Lovable and others moved to credits. Cursor's switch drew user backlash [V].
- RevenueCat (Feb 2026, Thomas Petit): "The zero marginal cost era of software is over the minute you touch LLM APIs." Hybrid = subscription + usage/consumables is the 2026 default [V].
- Mix in RevenueCat SOSA 2026: 63.5% subscriptions only, 23.2% + lifetime, 10.7% + consumables, 2.5% all three. In IN/SEA only 56.4% are subscriptions-only, the most hybrid region [V].
- Adapty 2025 revenue mix: weekly 55.5%, annual 22.5%, monthly 11.7%, one-time 10.3% [V].
- Lovable [V]:
  - Credits roll over one month, which "did not impact our conversion" and improved retention.
  - Lovable absorbs costs of failed builds and bugs.
  - It tests lower entry prices in lower-purchasing-power markets and judges tests on conversion + retention + expansion, not conversion alone.
- AI apps sell monthly far more than others (59.8% of plans vs 26.2%) and retain monthly payers worse [S].

**What's missing.** No public A/B test compares *conversion* of prepaid packs vs subscriptions for a consumer AI app. The case for packs in India rests on payment reliability (UPI AutoPay failures, finding 3) and cost control, not on a measured conversion lift.

**[I] For Shadow**

- A hybrid is the evidence-consistent choice:
  1. A **pass** (time-boxed allowance, one-time payment, no auto-renew) as the main India product.
  2. A **monthly subscription** for international card users.
  3. A **Listen-hours top-up** for both.
- Let unused allowance roll over once. That is Lovable's finding: it costs little and helps retention.
- Show balance in "answers" and "listening hours", never raw credits. Credit opacity is the main user complaint in the Cursor backlash.

---

## 8. Checkout handoff, abandoned checkout, win-back

| Finding | Number | Source | Label |
|---|---|---|---|
| IAP-only vs web-only checkout (Dipsea, about 3.1k/arm) | initial conversion 27.0% vs 18.1%; to paying 6.3% vs 5.3% | RevenueCat test, May 2025 | V |
| Native vs web checkout (1-yr data) | purchase rate per view 4.95% vs 3.69% (−26%), but about 53% more take-home revenue per viewer from higher prices and no store fee | Adapty | S |
| Users who start an in-app purchase and complete it | about 50% | Superwall, Aug 2024 | S |
| Transaction-abandon paywall (18 companies) | 17% of total revenue; about 20% of paywalled users see one; refund rate 3.3% vs 6.8% control; incrementality not measured | Superwall, Aug 2024 | S |
| Second-chance / exit discount paywall | 4% of apps; typical discount 38%; converts 0.88x the main paywall; beats it in 45% of apps | Adapty 2026 | V |
| External abandon offer in onboarding | about 1 in 5 viewers see it; converts 7.4%; adds about 18% revenue per onboarding view; about 11% less revenue per payer | Paywall Index | V (correlational) |
| Discount depth vs 6-month revenue | ≤30% off: 90% of full price; 31-60%: 70%; >60%: 46% | Adapty 2026 | V |
| Checkout-recovery email (sent at 60 min) | 10-30% recovery claimed; 10-20% discounts most effective; needs the email captured | Paddle docs | S |
| Dodo Payments recovery | up to 3 emails at 1h / 24h / 72h for one-time checkouts; renewals handled by separate dunning | Dodo docs, Oct 2026 | V (feature, no rate) |
| E-commerce cart abandonment baseline | 70.22% average of 50 studies | Baymard, Sep 2025 | V |
| Reactivation within a year | monthly 18-24% (avg 20.1%, up from 13.7%); high-priced monthly 28.9%; Productivity monthly 36.1%; annual 4-6%; weekly 7-10%; APAC monthly about 24% | RevenueCat, May 2026 (SOSA 2026) | V |
| Returning subscribers who took an offer, still paying at 3 months | 56% (vs about 1 in 10 new users) | Adapty 2026 | V |
| Payment-failure cancellations | Google Play 31%, App Store 14%; dunning/grace periods recover 15-20% on Android | RevenueCat SOSA 2026 | V |

**[I] For Shadow**

- Capture the email in-app *before* opening the browser checkout, so the 60-minute recovery email can fire.
- Detect the payment back in the app via webhook + polling, so the user never has to "restore purchase".
- Keep rescue discounts ≤20-30%.
- Run a "welcome back" campaign timed to the Indian exam calendar.

---

## 9. India / low-ARPU specifics

- **Funnel is roughly half as strong at every step**: download→trial 3.0-3.7% vs 7.1% (NA), trial→paid 15.2% vs 34.2% [V, RevenueCat 2026].
- **Prices are about 40-45% of NA**: IN/SEA medians are $3.75/month and $18.32/year vs $9.99 and $39.99 [V]. Adapty lists India's average weekly price at $5.62 [V].
- **Spending is growing fast from a low base.**
  - India app consumer spend hit a record $345M in Q2 2026, +35% YoY, driven by AI, streaming and productivity [S, Sensor Tower via TechCrunch, Aug 2026].
  - ChatGPT and Claude are about 83% of India's AI app revenue [S].
  - Revenue per download is still "a small fraction" of the US's $4.60 [S].
- **Free competition from giants**
  - Google gave eligible Indian students a free year of AI Pro (worth ₹19,500) in 2025.
  - Airtel bundled Perplexity Pro free for a year, and Jio bundled 18 months of Google AI Pro.
  - OpenAI made ChatGPT Go (₹399/month) free for a year from 4 Nov 2025, after paid subscribers in India "more than doubled" in the month after launch.
  - [S, press]
  - [I] "AI help" alone is not something Indian students will pay for. Shadow must sell what those don't do: an always-on-top overlay, screenshot-to-explained-solution, live lecture listening, Hinglish.
- **Price localization works.**
  - Localization tests have the highest win rate of any paywall test type (62% raised LTV) [V, Adapty].
  - Lovable runs lower entry prices in lower-purchasing-power markets [V].
  - ProfitWell's "4.7x higher conversion with PPP pricing" is a quoted remark with no published method [W].
- **Payment rail matters**
  - UPI AutoPay failures are high (55-90% in Aug 2025 per NPCI data reported by Mint) [S].
  - About 40 crore UPI users vs about 5 crore credit-card users [W, Whalesbook].
  - Razorpay's own case study shows only 65%+ success for repeat AutoPay at Testbook [S].
  - [I] One-time UPI passes avoid the mandate problem entirely.
- **Media subscriptions show the ceiling**: only about 8% of India's 178M music streamers paid in 2025 [S]. Redseer: 25% of Tier-2 vs 40% of Tier-1 users pay for any media service [S].

---

## 10. What this means for Shadow's cost structure (inference, using file 05)

- Solves are cheap: about ₹0.43 each. Listen is expensive: about ₹96/hour (two Deepgram streams, about $0.78/hour at list price).
- A ₹299 pass that includes 3 hours of Listen spends about ₹290 on Listen alone, which leaves nothing. So:
  - **India pass**: answers at a generous fair-use cap; Listen capped low (about 1-2 hours) with paid top-ups. Or reduce Listen cost first (one stream, silence gating, a cheaper STT promo rate, about $0.0048/min).
  - **International monthly** (around $8-10, the NA median monthly is $9.99): can include more Listen.
- Hard paywalls carry higher refunds (5.8%), and AI apps run 4.2%. Budget about 5% refunds plus payment-gateway fees on top of usage cost.

---

## 11. Weak or vendor-marketing data to treat carefully

- Every Adapty "+X-Y%" lift is from **winning tests only**. Use win rates (31-62%) as the honest prior: most paywall tests don't win.
- The Superwall and RevenueCat case studies (Greg, Rootd, Wizz, Pepper, transaction abandon) are self-selected successes with no holdouts. Superwall's own 17% figure replaced an earlier claim of 25-40%.
- Hard vs freemium medians are cross-app correlations. Two individual RevenueCat clients went opposite ways.
- First Page Sage is one agency's client data (86 companies) with no stated method.
- The reverse-trial "10-40% lift" and "38% higher" figures have no primary dataset.
- ProfitWell's PPP "4.7x" and "30%" figures are quotes, attributed to different sources by different blogs.
- The Blinkist +23% is self-reported, and an indie replication failed on trial→paid.
- SOSA 2026's IN/SEA D35 appears as both 0.7% and 1.4% in different charts.
- Whalesbook's UPI AutoPay approval figures (50% → 30%) come from a page that discloses possible AI-generated errors. Mint/NPCI is the stronger source.
- "86% of AI apps skip trials" is unverified.

---

## Sources

**Subscription-app reports**

- RevenueCat, "The State of Subscription Apps in 10 minutes… 2026" (19 Mar 2026, updated 22 Apr 2026): https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026
- RevenueCat, State of Subscription Apps 2026 web report (regional, category and plan data): https://www.revenuecat.com/state-of-subscription-apps/
- RevenueCat, SOSA 2026 Education: https://www.revenuecat.com/state-of-subscription-apps-2026-education
- RevenueCat / David Barnard, "Hard paywall vs. freemium: lessons from a 75% LTV lift" (29 Apr 2026): https://www.revenuecat.com/blog/growth/hard-paywall-vs-freemium
- RevenueCat, "Context wins…" (4 Dec 2025): https://www.revenuecat.com/blog/growth/contextual-paywall-targeting
- RevenueCat, "Paywall placement" (20 Nov 2023): https://www.revenuecat.com/blog/growth/paywall-placement
- RevenueCat, "App trial conversion rate insights" (updated 6 Jun 2024): https://www.revenuecat.com/blog/growth/app-trial-conversion-rate-insights/
- RevenueCat, "20% of your churned users will come back" (28 May 2026): https://www.revenuecat.com/blog/growth/20-of-your-churned-users-will-come-back-but-are-you-ready/
- RevenueCat, "AI hybrid monetization" (5 Feb 2026): https://www.revenuecat.com/blog/growth/ai-hybrid-monetization
- RevenueCat, IAP vs web purchases test (Dipsea, May 2025): https://revenuecat.com/blog/growth/iap-vs-web-purchases-conversion-test
- PPC Land, "AI apps earn 41% more per user but churn 30% faster" (14 Mar 2026): https://ppc.land/ai-apps-earn-41-more-per-user-but-churn-30-faster-revenuecat-finds/
- Airbridge, "Hard paywall vs freemium 2026" (27 May 2026, cites SOSA 2025 and Adapty 2026): https://www.airbridge.io/en/blog/hard-paywall-vs-freemium-2026
- Adapty, State of Paywalls 2026 (data Oct 2025-Sep 2026): https://adapty.io/state-of-paywalls/report/
- Adapty, State of In-App Subscriptions 2026 (16k+ apps, $3B): https://adapty.io/state-of-in-app-subscriptions/
- Adapty, "Paywall optimization tests" (2026): https://adapty.io/blog/paywall-optimization-tests/
- The Paywall Index (Michal Parizek), "The anatomy of the best-performing onboarding paywalls" (27 Oct 2026; 3,313 paywalls, 1,470 apps): https://thepaywallindex.substack.com/p/the-anatomy-of-the-best-performing

**Superwall**

- "17% revenue boost with transaction abandon paywalls" (6 Aug 2024): https://superwall.com/blog/17-revenue-boost-with-transaction-abandon-paywalls-a-case-study
- "App monetization: two important metrics you probably aren't tracking" (9 Nov 2022): https://superwall.com/blog/app-monetization-two-important-metrics-you-probably-arent-tracking
- "3 proven paywall and pricing experiments" (23 Oct 2024): https://superwall.com/blog/3-proven-paywall-and-pricing-experiments-to-boost-indie-app-revenue

**SaaS / PLG**

- Growth Unhinged (Kyle Poyar), free-to-paid conversion report (4 Feb 2026; 200 products): https://growthunhinged.com/p/free-to-paid-conversion-report
- Growth Unhinged, "How to improve free-to-paid conversion" (18 Mar 2026): https://www.growthunhinged.com/p/how-to-improve-free-to-paid-conversion
- Growth Unhinged, "Why everyone's switching to AI credits" (3 Sep 2025): https://kylepoyar.substack.com/p/ai-credit-pricing
- Growth Unhinged × PricingSaaS, 2025 state of SaaS pricing changes (credit models 35 → 79 of 500): https://www.growthunhinged.com/p/2025-state-of-saas-pricing-changes
- Lenny Rachitsky & Kyle Poyar, "What is a good free-to-paid conversion rate" (1 Aug 2023): https://www.lennysnewsletter.com/p/what-is-a-good-free-to-paid-conversion
- First Page Sage, SaaS free trial conversion benchmarks (5 Sep 2025): https://firstpagesage.com/seo-blog/saas-free-trial-conversion-rate-benchmarks/
- Elena Verna, "Why AI doesn't mean the end of freemium" (12 Dec 2025): https://www.elenaverna.com/p/why-ai-doesnt-mean-the-end-of-freemium
- Metronome, Q&A with Lovable's head of growth (3 Feb 2026): https://metronome.com/blog/q-a-with-lovables-head-of-growth-on-pricing-experimentation-and-monetizing-ai
- Stripe customer story, Lovable / Elena Verna: https://stripe.com/customers/lovable-elena-verna

**Case studies**

- Blinkist trial-reminder case (UX Planet, self-reported): https://uxplanet.org/how-solving-our-biggest-customer-complaint-at-blinkist-led-to-a-23-increase-in-conversion-b60ad514134b
- Blinkist timeline details (Onboard Me, 10 Jan 2025): https://onboardme.substack.com/p/why-most-free-trials-fail-and-how-blinkist-gets-it-right
- Duolingo Q2 2026 shareholder letter / 10-Q (SEC): https://www.sec.gov/Archives/edgar/data/0001562088/000162828026053299/q2fy26duolingo6-30x26share.htm and https://www.sec.gov/Archives/edgar/data/0001562088/000162828026053603/duol-20260630.htm
- ChatGPT 900M WAU / 50M subscribers (Feb 2026): https://9to5mac.com/2026/02/27/chatgpt-approaching-1-billion-weekly-active-users/

**Checkout and recovery**

- Paddle, checkout recovery docs: https://developer.paddle.com/concepts/sell/checkout-recovery/
- Dodo Payments, abandoned cart recovery docs (Oct 2026): https://docs.dodopayments.com/features/recovery/abandoned-cart-recovery
- Baymard, cart abandonment rate (22 Sep 2025): https://baymard.com/lists/cart-abandonment-rate

**India**

- TechCrunch via Yahoo, "India is starting to pay for apps" (1 Aug 2026, Sensor Tower/Appfigures): https://finance.yahoo.com/technology/ai/articles/india-starting-pay-apps-not-210745693.html
- TechCrunch, ChatGPT Go India launch (18 Aug 2025): https://techcrunch.com/2025/08/18/openai-launches-a-sub-5-chatgpt-plan-in-india
- Inc42, ChatGPT Go free in India: https://inc42.com/buzz/openai-makes-chatgpt-go-free-for-indian-users
- YourStory, Google AI Pro free for Indian students: https://yourstory.com/ai-story/google-gemini-ai-pro-free-indian-students
- Mint via Magzter, "UPI AutoPay's endless woes forcing an industry rethink" (Oct-Nov 2025): https://www.magzter.com/hi/stories/newspaper/Mint-New-Delhi/UPI-AUTOPAYS-ENDLESS-WOES-FORCING-AN-INDUSTRY-RETHINK
- Whalesbook, UPI AutoPay approval rates (8 Jan 2026, weak): https://www.whalesbook.com/news/English/economy/Merchants-Favor-UPI-Autopay-Over-Cards-Despite-Lower-Success-Rate/695f4705ef4ed95f98060af9
- Razorpay blog, UPI AutoPay interoperability / Testbook case: https://razorpay.com/blog/upi-autopay-interoperability/ and https://razorpay.com/blog/testbook-razorpays-upi-autopay/
- Razorpay Rize, "The psychology of subscriptions in India" (21 Nov 2025): https://rizevault.razorpay.com/p/the-psychology-of-subscriptions-in
- Music Business Worldwide, India paid streaming 2025: https://www.musicbusinessworldwide.com/india-added-nearly-4m-paid-music-streaming-subscriptions-in-2025-taking-its-total-to-14-4m-according-to-new-report/

**Academic**

- Ariely, *Predictably Irrational* (2008), Economist decoy example.
- Frederick, Lee & Baskin, "The Limits of Attraction," *Journal of Marketing Research* 51(4), 2014.
- Yang & Lynn, "More Evidence Challenging the Robustness and Usefulness of the Attraction Effect," *Journal of Marketing Research* 51(4), 2014.
- Gourville, "Pennies-a-Day: The Effect of Temporal Reframing on Transaction Evaluation," *Journal of Consumer Research* 24(4), 1998.

**Cost inputs**

- Shadow codebase `src/main/live/credit.ts` (Deepgram Flux $0.0065/min per stream × 2 streams).
- `research/paywall/05-unit-economics.md` (₹0.43/solve, about ₹96/Listen hour at ₹95/USD).
- Deepgram third-party price trackers (Nova-3 streaming promo $0.0048, list $0.0077/min).
