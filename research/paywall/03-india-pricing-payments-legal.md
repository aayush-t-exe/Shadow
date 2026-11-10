# 03 — India pricing, payments and legal limits for the Shadow Cloud paywall

Researched 2026-11-10. Every fee, promo and rule below is dated. Items marked **[unverified]** come from one secondary source or conflicting sources and need a check before you rely on them. This is not tax or legal advice: confirm the GST and income-tax points with a CA before the first paid sale.

Cost inputs come from the sibling report `05-unit-economics.md` (typical solve **₹0.43**, worst **₹1.13**; Listen **₹1.60 per minute** with two Deepgram streams; ₹95 = $1). Funnel context comes from `04-shadow-journey-and-triggers.md`.

---

## TL;DR

1. **The ceiling has moved, and it's mixed.** Google gives Indian college students **AI Plus free for 12 months (redeem by 31 Dec 2026)**. ChatGPT Go's free year **closed to new users on 21 Jan 2026**, and the earliest free years **started expiring on 4 Nov 2026**, so many students are hitting a surprise **₹399/month autopay** right now. Airtel's free Perplexity Pro **closed on 16–17 Jan 2026**. Paid AI anchors are **₹399/month** (ChatGPT Go, Google AI Plus), and the everyday student anchor is **Spotify Student at ₹69/month** (cut in May 2026). With Gemini free and a free API key one click away, Shadow Cloud can't charge for "AI answers". It charges for **no setup, no 429s, and Listen**.
2. **Recommended ladder (INR, prepaid, no autopay):** a free BYOK path forever plus a free starter grant, then **₹49 for a 7-day Sprint (50 answers)**, **₹99 for a 30-day Pass (100 answers), the hero**, and **₹399 for a 90-day Season Pass (100 answers every 30 days + 60 Listen min)**. Sell Listen separately as **₹99 for 30 minutes**. Don't use ₹149/₹199/₹299 monthly tiers: they are too close to ₹399 AI plans that do much more, and Listen can't fit inside them profitably (05 §5).
3. **Use prepaid packs, not subscriptions, at launch.** UPI Autopay approval rates reportedly fell to **about 30% by Nov 2025** (NPCI data via press) **[secondary]**. Mandates add per-debit fees (Cashfree charges ₹7.5 to set up plus ₹5 per UPI Autopay debit under ₹1,000). Subscriptions also bring the most legal exposure: CCPA "subscription trap" and "SaaS billing" rules, US auto-renewal laws, and the EU/UK cancellation rules. "**Pay once. Nothing auto-renews.**" is a real selling point in November 2026, while ChatGPT Go free-year users are being auto-charged.
4. **Payments:** **Razorpay** (or Cashfree) as an individual with PAN only, for INR via a **UPI QR on desktop**. At ₹99 that keeps about **₹96.7** per sale. Add **Dodo Payments** (merchant of record, individuals allowed) **only for non-INR buyers**. Dodo on a ₹99 INR sale keeps only about ₹66, because of the fixed 15¢ fee plus GST it must remit. Avoid Lemon Squeezy (maintenance mode, moving to Stripe Managed Payments, which appears to exclude India) and Stripe (invite-only in India). Paddle and Polar are fallbacks.
5. **GST:** below **₹20 lakh** aggregate turnover a year, you don't need to register for domestic sales. The OIDAR "register regardless of turnover" rule is aimed at *foreign* suppliers selling into India, not at you. Show **one all-inclusive price** ("₹99, no extra charges"). Selling abroad *directly* would make you liable for EU/UK VAT from the first sale, and that is the reason to put a merchant of record in front of foreign buyers.
6. **Legal:** the CCPA Dark Patterns Guidelines 2023 become **binding e-commerce rules from 1 Jan 2027** (E-Commerce Amendment Rules 2026, G.S.R. 789(E), notified 9 Sep 2026). They require an **annual self-audit**, a **displayed compliance certificate**, and a **"prior price" (lowest price in the last 30 days) shown next to any discount**. The CCPA has already fined an edtech company, **PhysicsWallah (₹5 lakh, order dated 1 Jun 2026)**, for a **pre-selected ₹10 donation, confirm-shaming and forced data collection**, and fined **McAfee** for a "Renew Now / Accept Risk" prompt with no neutral option. Section 5 turns these rules into a paywall checklist.
7. **Approval risk:** Paddle prohibits "essay and paper mills". A screen-reading overlay in the Cluely/Interview Coder lineage, especially with the uncommitted screen-capture hiding found in 04 §0, is a plausible reason for a gateway or merchant of record to reject or freeze the account. Describe Shadow as a **study and explanation tool**, and don't ship capture-hiding before you apply.

---

## 1. Willingness to pay: what Indian students already pay for

### 1.1 The AI ceiling (status on 2026-11-10)

| Offer | Status | Price after | What it means for Shadow |
|---|---|---|---|
| **ChatGPT Go free 12 months (India)** | Opened 4 Nov 2025. **Closed to new redemptions 21 Jan 2026** (OpenAI release notes, quoted by several outlets). Existing claimants keep 12 months from redemption, so **the first expiries began 4 Nov 2026**. | **₹399/month incl. GST**, auto-renewing on the saved card or UPI | Millions of students are meeting a ₹399 autopay right now. "No autopay" is a timely trust message. ₹399 is the "real AI subscription" anchor, so Shadow should sit well below it. |
| **Google AI Pro free for Indian students** | The 2025 offer is **over** (registration closed 15 Sep 2025). **Now: Google AI Plus free for 12 months for college students 18+**, verified via SheerID, **redeem by 31 Dec 2026**, reverified yearly. An AI Pro + YouTube Premium student bundle at "up to 70% off" was announced 20 Aug 2026 (price not found). | AI Plus **₹399/month** (₹199 intro for 6 months to new users at launch; current status of the intro offer unknown) | A student can get Gemini free *and* a free Gemini API key. Shadow's paid value has to be the **overlay, one keypress, Listen and no rate limits**, not model access. |
| **Jio: 18 months AI Pro free** | Reported as "no longer available" on Jio's terms page **[unverified: one source says check MyJio]** | — | Some students on Jio plans may still hold AI Pro. |
| **Perplexity Pro via Airtel** | **Closed to new claims 16 Jan 2026** (Perplexity help centre; another source says 17 Jan). Existing users keep it 12 months, so the last free years end around Jan 2027. Airtel replaced it with Adobe Express Premium. | Perplexity Pro bills in USD in India (no INR recurring plan) | Shows that free telco bundles end and then convert to auto-charges. Students remember this. |
| Google AI Pro / Ultra (India) | — | ₹1,950/month / ₹24,500/month | Out of student range |
| Spotify Student (India) | Cut **₹99 → ₹69/month** in May 2026 | ₹69 (Standard ₹139) | The everyday "student subscription" reference price |

### 1.2 Edtech and coding-prep prices

| Product | Price found | Date / confidence |
|---|---|---|
| **Physics Wallah** batches | Mostly **₹1,199–₹5,350 per batch** (often a year-long course), sale prices like **₹1,499 vs ₹4,000 "actual"** (Diwali sale, 3–10 Nov 2026), JEE Arjuna ₹3,500 sale vs ₹5,000 | pw.live, Sep–Nov 2026. Reliable. |
| **LeetCode Premium** | **$35/month or $159/year**. No current India price found. A 2023 invoice shows a **20% "India Yearly Discount"**. Indian users complain it's too expensive. | prachub (Oct 2026). Medium. |
| **Unacademy Plus** | About ₹2,083/month (date unclear). A 2022 promo sold **₹299 for 45 days**. | Low. Aggregator. |
| **GeeksforGeeks Premium** | The official page shows no prices. One affiliate site says "from ₹83/month". | **[unverified]** |
| **Coding Ninjas, Scaler** | Not found. Scaler is a ₹3–4 lakh career programme, a different category. | Not verified |
| Udemy Personal Plan (India) | About ₹780/month | Zoutons. Medium. |

**What students actually pay.** The only India-specific figure found: an IIT Delhi committee survey (2025, 427 students) reportedly found that **about 1 in 10 pay for a premium AI plan** **[secondhand via studentupdate.in; original Indian Express report not checked]**. Globally, flytedesk (Mar 2026) reports **11% of student AI users pay** and **60% would not consider paying**. Plan for **1–3% of active free users converting**, not 10%.

**Sachet logic (evidence and its limits).** Lightspeed's Dev Khare: Indian consumers are "more value-conscious and OK with some inconvenience" and prefer per-transaction or prepaid models, with subscriptions "only for the most loyal customers" (TechCrunch, Aug 2023). Spotify ran daily and weekly "Premium Mini" plans in India. **No published conversion study comparing prepaid and auto-renew in India was found.** RevenueCat's docs confirm Google Play introduced prepaid plans because RBI rules paused new auto-renewing subscriptions for Indian users, but they publish no conversion split. Treat "packs convert better" as strong practitioner consensus plus mechanism evidence (section 2), not as measured fact.

### 1.3 Pricing-adversary attack on the candidate prices

Each price was attacked from three angles: a skeptical buyer, a value buyer, and a competitor.

| Price | Skeptic | Value buyer | Competitor | Verdict |
|---|---|---|---|---|
| **₹29–₹49 day pass** | "₹29 for 24 hours, then what?" | Reads as a gimmick from an app with 0 GitHub stars | A free Gemini key beats it on the first day | Too small: the fee share and support load per sale are high, and it invites "buy a day, farm it". **Skip for now.** |
| **₹49 / 7 days** | Clear and low-risk: "less than a samosa-and-chai a day" | Fine as an *entry* option, not the hero | Students can get free Gemini; ₹49 is below the hassle threshold | **Keep as the entry/impulse option** (exam week, placement test week) |
| **₹99 / 30 days** | "Why pay when the key is free?" → answer: **no setup, no 429s, works in 60 s**. "What if I hit 100?" → show the counter. "Will it autopay me like ChatGPT Go?" → **"No. It never renews."** | Above Spotify Student (₹69), a quarter of ChatGPT Go | If Gemini in Chrome reads a LeetCode page free, solve-only value falls; Listen and Hinglish across any app are the moat | **Hero.** Matches 05's cost-safe line-up |
| **₹149 / ₹199 / month** | "Almost half of ChatGPT Go, which does everything" | Price creeps toward the "real AI app" bracket without real AI-app breadth | ChatGPT Go and AI Plus at ₹399 make ₹199 look like a bad half-measure | **Drop.** Thin margin once Listen is added (05 §5: ₹149 tier −56% at worst-case usage) |
| **₹299 / month** | "That's nearly ChatGPT Go" | Signals a pro tool to students who aren't pros | Same as above | **Drop** |
| **₹399 / 90 days (Season)** | "Three months of Shadow for one month of ChatGPT Go" makes it easy to justify | Feels like a real purchase, which builds commitment | Hard to undercut. A competitor at ₹399/month looks expensive next to it | **Keep as the anchor.** Typical margin is about 42% net of fees (if not GST-registered) |

**What the ladder signals:** "a small, honest student tool, priced like a recharge, that won't trap you." The risk is that ₹49–₹99 also signals "hobby project". Counter that with proof (the free starter grant is the demo), a visible refund promise, and a real name and contact on the checkout page.

**The one change:** make the ₹99 30-day Pass the pre-selected hero, and print **"Pay once · No autopay · Nothing renews"** directly under its price.

### 1.4 Recommended price ladder

All prepaid (one-time UPI or card), INR, all-inclusive. Margins use 05's typical costs (answer ₹0.43, Listen minute ₹1.60). Two net columns: **unregistered** (Razorpay 2% + 18% GST on the fee = 2.36%) and **GST-registered** (price ÷ 1.18, then fee).

| Offer | What you get | Net (unregistered / registered) | Cost at full quota (typical) | Typical margin | Role |
|---|---|---|---|---|---|
| **Free: Bring your own key** | Unlimited, your own Gemini/Deepgram keys | ₹0 / ₹0 | ₹0 | — | Required: MIT licence, anti-abuse (04 §7) |
| **Free: Cloud starter** | Once per device, no sign-up (size it per 04 §4 / 05 §6, e.g. 20–25 answers on the cheap model + 10 Listen min) | — | ₹5–21 | — | Activation and the aha moment |
| **₹49 · 7-day Sprint** | 50 answers in 7 days | ₹47.8 / ₹40.4 | ₹21.5 | 55% / 47% | Entry, exam week |
| **₹99 · 30-day Pass** ★ | 100 answers in 30 days | ₹96.7 / ₹81.6 | ₹43 | 56% / 47% | **Hero, pre-selected** |
| **₹399 · 90-day Season Pass** | 100 answers every 30 days + 60 Listen min | ₹389.6 / ₹328.7 | ₹225 | 42% / 32% | Anchor, placement season |
| **₹99 · Listen 30** | 30 Listen minutes, valid 90 days | ₹96.7 / ₹81.6 | ₹48 | 50% / 41% | Sold at the Listen trigger |

Notes:
- **Show per-day maths**, which is the sachet framing without daily sachets: "₹3.3/day" under ₹99/30 days and "₹7/day" under ₹49. Don't show a strike-through unless it's real (section 5, prior-price rule).
- **Keep a hidden server-side cost ceiling** (05 §5: 85% of net) that downgrades the model rather than cutting the user off. Quotas alone can't stop worst-case losses (05: worst answer ₹1.13). Disclose that heavy use can switch to a lighter model ("fair use"), stated *on the plan card*. A hidden cap is a bait-and-switch risk.
- **Top-ups:** when a pass runs out early, offer "+50 answers ₹49" rather than a forced upgrade.
- **Student discount:** no separate student price is needed, since the whole INR ladder *is* the student price. Don't build SheerID-style verification.
- **Test, server-driven:** ₹99 vs ₹79 for the 30-day Pass (the first 200 paywall views each). Measure **paid conversion per paywall view** and revenue per 100 views, not clicks.
- **Later, once you have repeat buyers:** add *opt-in* "Auto-renew monthly, cancel any time in one tap" as a second option, never the default.

**International (non-INR) ladder, via a merchant of record:** **$6.99 for 30 days (200 answers + 60 Listen min)** and **$17.99 for 90 days**. Net on $6.99 through Dodo with an international card: fee 5.5% + $0.40 ≈ $0.78, minus VAT/sales tax of 0–20%, leaves about **$4.9–6.2 (₹465–590)** against about ₹182 typical cost. Launch India-first. Turn on international only after the INR flow works.

---

## 2. Payment methods and checkout UX in India

### 2.1 Facts

- **UPI share:** **85.5% of all payment transactions by volume in H2 2025** (RBI Payment Systems Report, reported May 2026). By value it's only 9.5%, which is fine: Shadow's tickets are tiny.
- **UPI Collect is gone for merchants.** NPCI ended P2P collect on 1 Oct 2025, and Razorpay's docs say **P2M Collect was deprecated from 28 Feb 2026**. Exceptions include iOS, mandate execute/modify/revoke, and cross-border. **On desktop, UPI means a dynamic QR the user scans with their phone. On mobile, it means Intent.** Razorpay Standard Checkout switches automatically. Razorpay marketing claims **+8% success from desktop QR** **[vendor claim]**.
- **Shadow is a Windows desktop app, so every Indian payment is a "scan this QR with your phone" flow.** Design the paywall around that: show the QR (or open a page that does) and say "Scan with any UPI app: GPay, PhonePe, Paytm…".

### 2.2 Recurring rules (only if you add autopay later)

From the RBI "Digital Payments — E-mandate Framework, 2026" (Business Today, 2 May 2026; consolidated framework reportedly effective 21 Apr 2026 **[effective date unverified against the RBI circular]**):

- **AFA (extra authentication) is required at mandate creation.** Recurring debits up to **₹15,000** then run without AFA. Insurance, mutual funds and credit-card bills get ₹1 lakh.
- **Pre-debit notification at least 24 hours before each debit**, with merchant name, amount and date, and an opt-out. Users can view, pause or cancel mandates any time in their bank or UPI app. Banks can't charge for mandates. Zero-liability protection now covers e-mandate debits.
- **Card-on-file tokenisation:** cards can't be stored by merchants, so card recurring runs through network tokens via the gateway. Card mandate failures "spiked to 20%+ in some categories" after the 2021 rules (Razorpay) **[vendor]**.
- **UPI Autopay execution is unreliable:** approval reportedly fell from about **50% (Jan 2024) to about 30% (Nov 2025)** while volume grew 10×. Mint cites **55–90% of AutoPay debits failing** at many banks in Aug 2025. Over 20 million mandates are revoked monthly **[all secondary, citing NPCI; not checked against NPCI tables]**. Most failures are "business declines" such as low balance, which is a real problem for students.
- **Cost:** Razorpay prices UPI and e-mandate subscriptions "on request", and card subscriptions at **0.9% + platform fee**. Cashfree charges **₹7.5 setup + ₹5 per debit under ₹1,000** for UPI Autopay (both checked 2026-11-10). On a ₹99 renewal that's **5%+ extra**.
- **Dodo note:** UPI subscriptions run through RBI mandates. Renewals take **about 48 hours** to settle, and a mandate cancelled in the UPI app makes the next charge fail.

**Conclusion:** for a ₹49–₹399 student product, one-time UPI (one PIN, about 92–95% success claimed for Intent/QR) beats a mandate that may succeed only 30–50% of the time and adds legal duties. Use a **renewal reminder** (in-app plus email, "Your pass ends in 3 days. Renew ₹99") followed by a one-scan payment instead.

---

## 3. Payment providers for a solo Indian developer

All fees checked **2026-11-10** on the linked pages unless stated. ₹95 = $1. "Net on ₹99" assumes you're not GST-registered (a merchant of record still remits 18% Indian GST).

| Provider | Model | Fees (date) | KYC as an individual | GST | Payout | UPI | Subscriptions | Webhooks / licence | Approval risk (AI study tool) | Net on ₹99 | Fit |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Razorpay** | Gateway (you're the seller) | **2% + 18% GST on the fee** for UPI, domestic cards and RuPay. Intl cards **up to 3%**. Setup ₹0. Payment Pages/Buttons +0.2%. Card subscriptions +0.9%. UPI subscriptions on request. (pricing page, May 2026 version) | **Yes: "individual / unregistered" route** with personal PAN, CKYC or other ID, and bank account. Sole proprietor needs 2 business proofs (e.g. Udyam). International cards need a **separate activation**. (Razorpay blog, 9 Oct 2026) | You handle it. Not needed below ₹20 lakh | **INR, T+1** | Yes. Desktop QR auto | Yes (Subscriptions; docs now point UPI mandates to "Recurring Payments") | `payment_link.paid`, `payment.captured`, QR Codes API (`qr_code.credited`). No licence keys (you don't need them) | Medium-low. Describe it as an "AI study/explanation app" | **₹96.7** | **Best for INR** |
| **Cashfree** | Gateway | **1.95%** standard. **₹0 platform fee on the first ₹20 lakh GMV** for merchants signing up on or after 21 Jul 2026, **until 31 Mar 2027** (excludes subscriptions, international, AmEx). Intl cards 2.99%. UPI Autopay ₹7.5 + ₹5/₹15 per debit. (pricing page, 2026) | **Yes: "Individual (Unregistered)"** with personal PAN. **₹199 one-time KYC fee without GST** | You handle it | INR, T+1 (instant settlement 0.30%) | Yes | Yes | Webhooks | Similar to Razorpay | **About ₹99** during the offer (then ₹96.7) | **Equal alternative.** The zero-fee offer is worth up to ₹40k |
| **PhonePe PG** | Gateway | Not published on the page found | PhonePe's article says individuals and sole proprietors can often onboard without GST via a non-enrolment declaration. The same article contradicts itself. **[unverified]** | You | INR | Yes, strong | Yes | Yes | — | — | Backup only |
| **Dodo Payments** | **Merchant of record** (Dodo Inc., US, is the seller) | **4% + 40¢** (US). **India domestic: 4% + 15¢** for cards and UPI. +1.5% international, +0.5% subscriptions, $30 chargeback (Fungies), $1 refund. (pricing page plus Fungies review, Jun/Oct 2026) | **Yes, individuals**: no company or KYB. Persona ID + selfie, bank name must match ID. 1–3 business days. Site must show pricing, ToS, privacy, refund policy, contact | **Handles VAT, GST and US sales tax** worldwide | **USD/GBP/EUR only. INR payouts discontinued** (docs, 2026). Threshold $50–100. USD SWIFT for non-US $25 | **Yes**: `upi_intent` only, INR, India billing; UPI subscriptions via mandate | Yes | Webhooks; licence keys included | Medium. Restricted list "not exhaustive", "higher-risk" review | **About ₹66** | **Best for non-INR buyers.** Bad for INR tickets |
| **Polar.sh** | Merchant of record | **New orgs since 27 May 2026: Starter 5% + 50¢** (Pro $20/month → 3.8% + 40¢). +1.5% intl cards; payout $2/month + 0.25% + 25¢, FX up to 1%; $15 dispute | **India payouts supported** via Stripe Connect Express, "even if Stripe standalone is invite-only" (Polar docs) | Handles it | Stripe Connect payouts | No UPI | Yes | Webhooks; licence keys | Low-medium (developer-friendly) | About ₹45 | **Backup merchant of record** |
| **Paddle** | Merchant of record | **5% + 50¢**. "Under $10 contact us for bespoke pricing" (pricing page) | Possible for sole traders, but rejections over entity mismatch are reported. 3–7 days, sometimes 2–3 rejection cycles for AI (Fungies) | Handles it | Not stated | No UPI | Yes | Webhooks | **Higher.** AUP prohibits "essay and paper mills". Gen-AI friction is reported | About ₹36 | Fallback |
| **Lemon Squeezy** | Merchant of record | 5% + 50¢ + surcharges; non-US bank payout 1% | Some Indian sellers report payout restrictions **[secondhand]** | Handles it | — | No | Yes | Licence keys | — | — | **Avoid**: maintenance mode, moving users to Stripe Managed Payments (GA Apr 2026), which **appears not to support India** **[not confirmed on Stripe's list]** |
| Stripe | Gateway | — | **Invite-only in India** | — | — | — | — | — | — | — | Not available |

### 3.1 Recommendation

1. **Week 1: apply to Razorpay *and* Cashfree** as an individual (PAN + bank). Ship with whichever activates first. If both approve, Cashfree's zero-fee window to 31 Mar 2027 saves about 2%. Razorpay has better docs and a QR Codes API.
2. **Only when you sell outside India: add Dodo.** Route by the billing country chosen at checkout (India → INR via Razorpay; elsewhere → USD via Dodo). Keep Polar as the backup merchant of record.
3. **Before applying anywhere:** a live site with your **legal name, address, contact email, pricing, Terms, Privacy, and a Refund & Cancellation policy** (Dodo requires these, and Indian e-commerce rules expect them). Positioning should be study and explanation. **Don't ship screen-capture hiding** (04 §0).

### 3.2 Electron flow (checkout in browser → back to the app)

```
Overlay paywall ─► POST /checkout {plan, deviceId}  (your server)
                    └─ creates Razorpay Payment Link / QR (reference_id = orderId),
                       callback_url = https://<site>/paid?o=orderId
Option A (best desktop UX): show the UPI QR *inside* the paywall
                    (Razorpay QR Codes API, fixed amount, single use) → user scans with phone
Option B: shell.openExternal(paymentLinkUrl) → browser checkout (shows QR / cards)
Server  ◄─ webhook payment_link.paid | qr_code.credited | payment.captured
           (verify signature, idempotent; a failed event can be followed by captured)
App     ─► polls GET /entitlement every 2–3 s (or SSE) until paid → "Pass active ✓"
/paid page tries shadow://paid?o=orderId to bring the app forward (needs
           app.setAsDefaultProtocolClient('shadow') + the second-instance handler, see 04 §0)
```

- **Never grant access from the redirect.** Razorpay's docs say to verify the signature and reconcile on the server. The webhook is the source of truth, and the deep link is only a convenience.
- Cloud is server-side, so **you don't need licence keys**. The entitlement lives on the server against a device token plus the email captured at checkout (for receipts and recovery).
- Option A (in-app QR) avoids the browser hop entirely. **[Verify that the QR Codes API is enabled for individual accounts.]** Use Option B for cards and international buyers (3-D Secure needs a real browser, not an embedded webview).

---

## 4. GST and tax basics

| Question | Answer | Confidence |
|---|---|---|
| Registration threshold | **₹20 lakh aggregate turnover per financial year** for service suppliers (**₹10 lakh** in special-category states). "Aggregate" is PAN-wide across India and includes exports. | High (multiple sources) |
| Do inter-state or online sales force registration? | No, for services below the threshold: Notification 10/2017-Integrated Tax exempts inter-state service suppliers below the limit. | High |
| OIDAR (online services) | The **"register regardless of turnover"** rule applies to suppliers **located outside India** selling to Indian non-taxable recipients. You're an Indian supplier, so the normal ₹20 lakh threshold applies. | Medium-high (my reading of IGST s.14 and CGST s.24; one blog claims otherwise, so confirm with a CA) |
| Selling to foreign consumers yourself | It's an export of services (zero-rated GST) if paid in foreign exchange and the place of supply is outside India. **But foreign VAT then becomes your problem**: EU VAT on digital services from the first euro for non-EU sellers (OSS non-Union scheme), UK VAT with no threshold for non-established sellers, and US state nexus rules. | High |
| Does a merchant of record remove this? | **Yes, for foreign taxes.** Dodo or Polar is the seller to the customer and collects and remits VAT/GST/sales tax. Your supply is to the merchant of record (a B2B export, zero-rated). Keep the merchant of record's payout statements and your bank's e-FIRA/e-BRC as export proof. **Your Indian income tax and GST threshold still apply to you.** | High |
| Indian GST on Dodo's INR sales | Dodo, as a foreign merchant of record, must remit 18% IGST on sales to Indian consumers, which is why its INR net is low. | Medium (inferred; ask Dodo how it treats India) |
| Price display | The Consumer Protection (E-Commerce) Rules 2020 require the **total price in a single figure with a break-up including applicable tax**. Legal Metrology treats MRP as tax-inclusive. Dark-pattern "drip pricing" bans revealing price elements late. So **show one all-inclusive figure** ("₹99, all-inclusive"). While unregistered, **don't print "+GST"**: you can't charge GST you aren't registered for. If you register later, keep the same sticker price and absorb the 18%. | High on the principle; whether the 2020 Rules cover a solo seller is unclear (section 5) |
| Income tax | It's business income. The presumptive scheme (old s.44AD: 6% of digital receipts deemed profit) may suit you. **The Income-tax Act 2025 replaced the 1961 Act from 1 Apr 2026, so section numbers have changed. Confirm with a CA.** | Medium |

---

## 5. Legal do/don't checklist for the paywall

### 5.1 India: the framework

- **Guidelines for Prevention and Regulation of Dark Patterns, 2023** (CCPA, notified 30 Nov 2023). They apply to "**all platforms systematically offering goods or services in India, advertisers and sellers**", so they apply to you, and they list **13 patterns**: false urgency, basket sneaking, confirm shaming, forced action, subscription trap, interface interference, bait and switch, drip pricing, disguised advertisement, nagging, trick question, SaaS billing, rogue malware.
- **CCPA self-audit advisory** (5–7 Jun 2025): audit within 3 months. 26 platforms (Flipkart, Swiggy, Zomato and others) self-declared compliance.
- **Consumer Protection (E-Commerce) (Amendment) Rules, 2026** (G.S.R. 789(E), notified **9 Sep 2026**, in force **1 Jan 2027**). New Rule 4(15) makes the guidelines **mandatory**, with an **annual self-audit and a prominently displayed compliance certificate**. **Prior-price rule:** an announced reduction must show the "prior price" = **lowest price in the preceding 30 days**. Also: display legal name, address and grievance contact; acknowledge complaints within **48 hours** and resolve them within **one month**. **[Whether a solo developer selling their own app counts as an "e-commerce entity" isn't settled. The definition covers anyone operating a digital platform for selling goods or services, so assume it does. Compliance costs almost nothing.]**
- **Enforcement precedents (2026):**
  - **PhysicsWallah, ₹5 lakh** (order 1 Jun 2026, CCPA-2/94/2025-CCPA): a **pre-selected ₹10 donation** added at checkout (basket sneaking, about ₹2.47 crore collected), emotional nudges (**confirm shaming**), and **mandatory data collection to access "free" courses** (forced action). It had to stop and file a compliance report within 15 days.
  - **McAfee, ₹1 lakh** (reported Jun 2026): renewal prompt with only **"Renew Now" / "Accept Risk"** and no neutral option, ruled confirm shaming and trick question. Adding "Skip" after the notice **did not cancel liability**.
  - **Nine platforms, ₹20 lakh total** (IndiGo, Zepto, FirstCry, PhysicsWallah, SpiceJet and others; reported to Parliament Aug 2026): hidden charges, forced subscriptions, **misleading countdown timers**, manipulative renewal prompts.

### 5.2 Paywall checklist (India; also satisfies most EU/US expectations)

| Pattern | DON'T | DO |
|---|---|---|
| **False urgency** | Fake countdown timers, "Only 3 passes left", "Price goes up tonight" that isn't true or quietly resets | Launch-price deadlines only if real, dated and honoured ("Founding price until 30 Nov"), and never reset per user |
| **Basket sneaking** | Pre-ticked "Add Listen 30 for ₹99", "Tip the developer ₹10", or a pre-selected "Donate" (the PhysicsWallah case) | Every add-on unticked. The total shown equals the plan chosen. Offer add-ons only *after* purchase |
| **Confirm shaming** | "No thanks, I'll keep struggling", "Accept risk", "Stay stuck" | Neutral secondary actions: **"Not now"** and **"Use my own free key"** |
| **Forced action** | Requiring sign-up, phone or email to *see prices* or to use the free BYOK path. Requiring referrals or contacts to unlock the starter pack | Prices visible before any sign-up. Collect email only at payment (needed for the receipt). BYOK always works without an account |
| **Subscription trap** | Card or UPI needed for the "free" starter pack. Cancellation hidden or slower than sign-up | Free starter needs no payment details. With prepaid passes there's nothing to cancel, so say so. If autopay is added later: cancel in-app in ≤ the same number of steps as signing up, plus a 24-hour pre-debit notice |
| **SaaS billing** | Free grant silently turning into a paid plan. Charging without fresh consent | Nothing converts automatically. Passes simply end, with a reminder 3 days before |
| **Interface interference** | A hidden or tiny close (✕) button, low-contrast "Not now", a decline button styled like disabled text | Highlighting one plan is fine. **Close and "Not now" must be visible and tappable** (≥ 24 px, normal contrast) |
| **Bait and switch** | "Unlimited" that's really capped. A different price at checkout. A silent model downgrade | State quotas on the card ("100 answers · 30 days"). State fair use on the card ("heavy use may switch to a lighter model"). Paywall price = checkout price |
| **Drip pricing** | A "convenience fee" or "+GST" appearing at checkout. "Free app" marketing that hides that Cloud is paid | One all-inclusive figure. Website and README: "Free with your own key. Shadow Cloud (no key needed) is paid after the free starter" |
| **Prior price (from 1 Jan 2027)** | Strike-through "~~₹199~~ ₹99" when ₹199 was never charged | Show a strike-through only if the struck price was the **lowest price in the previous 30 days**. Otherwise no strike-through |
| **Nagging** | The paywall on every keypress, repeated pop-ups, push and email spam after "Not now" | Paywall only at trigger moments (04 §5). "Not now" = cooldown (e.g. 24 h or until the next quota event). One reminder email before a pass ends |
| **Trick question** | "Uncheck to not miss out", double negatives | Plain-language, positive checkboxes |
| **Disguised ads** | Fake testimonials, unlabelled paid influencer posts | Real quotes with first name + college (with consent). Label sponsored posts |
| **Rogue malware** | Bundled installers. Hidden behaviour | Code-signed installer. No capture-hiding by default (04 §0) |
| **Housekeeping** | — | Footer: legal name, address, grievance email (48 h acknowledgement), refund policy linked *before* pay, a one-page **annual dark-pattern self-audit and compliance note** (from 1 Jan 2027) |

**Refund promise (recommended):** "Not useful? Full refund within 7 days if you've used fewer than 10 answers." It's cheap at these prices, it answers the "0-star app" doubt, and it makes the EU withdrawal rules simpler.

### 5.3 If you sell worldwide

The merchant of record is the seller of record and handles much of this. These rules still shape *your* paywall copy.

- **EU**
  - Show prices **including VAT**.
  - The final button must make the obligation to pay clear ("Pay now"/"Buy"), per the Consumer Rights Directive Art. 8(2).
  - There's a **14-day right of withdrawal** for digital services/content. It's lost only with the consumer's **express consent to immediate performance plus acknowledgement**, a checkbox at checkout, which the merchant of record usually provides.
  - **Withdrawal button (Directive 2023/2673, new Art. 11a) applies from 19 Jun 2026**, though national transposition varies.
  - **Digital Fairness Act** (subscription traps, dark patterns): the proposal is listed for **11 Nov 2026**. It's not law yet and likely not in force before 2028.
  - The UCPD blacklist already bans false "only available for a very limited time" claims.
- **US**
  - The FTC **click-to-cancel rule was vacated** by the 8th Circuit (8 Jul 2025) and removed from the CFR (Feb 2026). A **new ANPRM opened in Mar 2026**. ROSCA still applies: disclose material terms *before* collecting billing details, get express informed consent, and offer simple cancellation. The FTC brought 5+ negative-option cases after Jan 2025.
  - **California ARL (AB 2863, in force 1 Jul 2025):** separate express consent to auto-renewal, an **annual reminder**, online cancellation in the same medium ("click to cancel"), and consent records kept **3 years**.
- **UK**
  - The DMCC Act unfair-practices regime has been in force since 6 Apr 2025. The **subscription contracts regime** (reminders, 14-day cooling-off after renewal) is now expected **Jan 2027** (Stephenson Harwood, 24 Aug 2026; earlier sources said spring 2027).
- **Takeaway:** **prepaid, non-renewing passes avoid almost all auto-renewal law** in India, the EU, the US and the UK. That's another reason to launch without subscriptions.

---

## 6. Regional pricing (INR for India, USD elsewhere)

- **Yes:** show INR to Indian users and USD to everyone else. The INR ladder above works out to roughly 20–25% of the USD price, close to a typical PPP discount for India (vendors suggest $99 → $49 for India; Shadow goes further, which is fine because UPI fences it).
- **How sellers implement it:**
  - **Display** by IP geolocation and Windows region/locale.
  - **Enforce** by payment method or billing country: the INR price only goes through Razorpay/Cashfree, and UPI needs an Indian bank account, so **UPI is a natural PPP fence**. Keep international cards *off* on the Razorpay account so foreigners can't buy the INR price with a VPN.
  - For other emerging markets (Pakistan, Bangladesh, Nigeria and others), use Dodo's adaptive currency or country-locked discount codes (ParityDeals-style). The billing country must match the discounted country.
  - **Server-driven pricing:** the app asks `/prices?country=` and never hard-codes prices. This also lets you A/B test prices without shipping an update (04 §0).
- **Watch for:** Indian users on foreign VPNs being shown USD, so add a manual "Show prices in ₹" toggle. Track conversion per country after launch.

---

## 7. Numbers check (numbers-truth-teller)

- **Core metrics:** none can be computed yet. Revenue, CAC, churn and runway all need users, and Shadow has **3 downloads and 0 stars** (04 §0). The only real numbers are per-sale: **₹99 pass → ₹96.7 net → about ₹43 typical cost → about ₹54 contribution (56%)**. Average lifetime value is ₹54 × (number of passes bought), which is unknown until repeat purchases appear.
- **The metric most likely to mislead:** "₹0.43 per answer". It makes Cloud look nearly free, while **one Listen hour costs about ₹96, the whole net of a ₹99 pass**. Average cost per user will look fine until one heavy Listen user wipes out the margin of 20 light users. Meter Listen separately, always.
- **Runway reality:** with no payroll, burn is Cloudflare (about ₹475/month, 05) plus free-grant cost (₹5–21 per install). Cash lasts as long as the free grant stays capped per device.
- **Verdict: FIXABLE.** The unit economics work at ₹49–₹399 *only* with quotas, a hidden cost ceiling and Listen sold as packs. The unknown is demand, not margin.
- **The one number to move:** **the paid conversion rate per paywall view** among users who got the aha (a first Cloud answer on their own problem). The lever is time-to-aha (the Cloud starter with no key) plus the "no autopay" trust line. Run 04 §3's one-week UPI pre-order test before building the rest.

---

## 8. Sources (accessed 2026-11-10 unless noted)

**AI ceiling and student prices**
- ChatGPT Go free-year status: https://www.businesstoday.in/technology/photo/your-free-chatgpt-go-year-may-end-soon-check-your-date-before-rs399-is-charged-565432-2026-11-03 (3 Nov 2026); https://www.technicaladda.in/chatgpt-go-free-india/ ; https://llmwise.ai/prices/india/chatgpt
- Google AI Plus student offer: https://swapbiswas.com/blog/gemini-student-offer/ (31 Oct 2026); https://www.business-standard.com/technology/tech-news/google-ai-plus-free-india-students-gemini-study-tools-126082000453_1.html (Aug 2026, page blocked; summary via search); claim page one.google.com/ai-student
- Google AI Plus INR price: https://www.businesstoday.in/technology/news/story/google-expands-ai-plus-subscription-to-global-markets-check-prices-benefits-and-features-513152-2026-01-28 ; https://www.croma.com/unboxed/google-ai-plus-arrives-in-india
- AI plan prices and the Jio/Airtel status: https://echai.ventures/how-founders-use-ai/choosing-an-assistant/what-do-these-ai-plans-cost-in-india-and-are-the-free-jio-and-airtel-offers-still-running
- Perplexity × Airtel ended: https://www.perplexity.ai/help-center/en/articles/11842322-perplexity-pro-airtel-promo ; https://telecomtalk.info/airtels-perplexity-pro-ends-existing-12month-access/1004521/ ; https://trak.in/stories/airtel-ends-free-perplexity-pro-offer-worth-rs-17000-year/
- Spotify India price cut: https://www.businesstoday.in/technology/story/spotify-cuts-subscription-prices-in-india-discontinues-premium-lite-531507-2026-05-14 (14 May 2026)
- Physics Wallah prices: https://www.pw.live/iit-jee/exams/pw-jee-gandhi-jayanti-offer-2026 ; https://www.pw.live/news/pw-mission-100-jee-2027-batch-launch-date-fee ; https://www.pw.live/msbshse/exams/pw-gyaan-utsav-diwali-sale-2026
- LeetCode pricing: https://prachub.com/resources/leetcode-pricing (Oct 2026)
- Unacademy: https://www.myengineeringbuddy.com/blog/?p=5371 ; https://obeta.ttef.in/edugraph/news/unacademy-offers-plus-subscription-to-learners-for-rs-299-till-april-30/cid/1862239
- Student WTP: https://studentupdate.in/careers/top-10-free-ai-tools-students-2026 (IIT Delhi figure, secondhand); https://www.flytedesk.com/insights/student-ai-usage-a-market-forming-in-real-time-on-campus
- Sachet and subscriptions in India: https://techcrunch.com/2023/08/19/subscriptions-saas-india/ (19 Aug 2023); https://www.revenuecat.com/docs/subscription-guidance/google-prepaid-plans

**Payments and RBI**
- UPI share: https://www.freepressjournal.in/tech/upi-commands-largest-share-of-transaction-volume-at-855-in-2025-2nd-half-rbi-report (May 2026)
- E-mandate framework 2026: https://www.businesstoday.in/personal-finance/news/story/rbi-auto-debit-rules-explained-what-new-changes-mean-for-your-upi-and-card-payments-528507-2026-05-02 ; https://razorpay.com/blog/upi-autopay-vs-card-e-mandates/
- Autopay failure data: https://x.com/chandrarsrikant/status/2009160159491428506 ; https://www.whalesbook.com/news/English/economy/Merchants-Favor-UPI-Autopay-Over-Cards-Despite-Lower-Success-Rate/695f4705ef4ed95f98060af9 ; https://www.htsyndication.com/mint/article/upi-autopay-s-recurring-woes-are-forcing-an-industry-rethink/93925664
- UPI Collect deprecation: https://razorpay.com/docs/announcements/upi-collect-migration/s2s-integration/ ; https://www.businesstoday.in/personal-finance/banking/story/npci-to-tighten-upi-rules-peer-to-peer-collect-feature-to-end-in-october-489244-2025-08-13 ; https://www.cashfree.com/docs/payments/manage/payment-methods/upi-collect
- Intent vs Collect and desktop QR: https://razorpay.com/blog/upi-intent-vs-collect-success-rates/ ; https://razorpay.com/upi/

**Providers**
- Razorpay pricing: https://razorpay.com/pricing/ ; onboarding docs: https://razorpay.com/blog/minimum-documents-payment-gateway-onboarding-india/ (9 Oct 2026); Payment Links webhooks: https://razorpay.com/docs/webhooks/payment-links.md ; subscription methods: https://razorpay.com/docs/payments/subscriptions/supported-payment-methods.md
- Cashfree pricing: https://www.cashfree.com/payment-gateway-charges/ ; onboarding: https://www.cashfree.com/docs/help/onboarding-related/onboarding-faqs ; https://www.cashfree.com/fee-tnc/
- PhonePe: https://business.phonepe.com/articles/payment-gateway-without-gst-do-you-need-registration-to-accept-payments (May/Jun 2026)
- Dodo: https://dodopayments.com/pricing ; https://docs.dodopayments.com/features/payment-methods/india ; https://docs.dodopayments.com/miscellaneous/verification-process ; https://docs.dodopayments.com/features/payouts/payout-structure ; https://fungies.io/dodo-payments-review-2026/ (competitor, Jun/Oct 2026)
- Polar: https://polar.sh/docs/merchant-of-record/fees ; https://polar.sh/docs/merchant-of-record/supported-countries
- Paddle: https://www.paddle.com/pricing ; https://www.paddle.com/help/start/intro-to-paddle/what-am-i-not-allowed-to-sell-on-paddle ; https://dev.to/pavelbuild/paddle-rejected-my-saas-3-times-heres-what-they-check-that-isnt-in-their-docs-5dnn
- Lemon Squeezy / Stripe Managed Payments: https://dodopayments.com/blogs/lemonsqueezy-review (competitor); https://www.paddle.com/resources/stripe-managed-payments ; https://docs.stripe.com/payments/managed-payments ; https://docs.stripe.com/india-exports

**Tax**
- GST threshold, exports, OIDAR: https://www.incorpx.io/blog/gst-for-freelancers-india-guide ; https://taxadda.com/decoding-oidar-services-under-gst/ ; https://taxzentic.com/blog/gst-for-freelancers-india-2026/
- E-Commerce Rules 2020, total price: https://www.lkslaw.com/insights/news/e-commerce-consumer-protection-e-commerce-rules-2020-notified ; Legal Metrology: https://ssrana.in/articles/legal-metrology-compliance-for-e-commerce-businesses/

**Legal (India)**
- Dark Patterns Guidelines 2023: https://www.jsalaw.com/newsletters-and-updates/ccpa-issues-guidelines-for-prevention-and-regulation-of-dark-patterns-2023/ ; https://consumeraffairs.nic.in/sites/default/files/file-uploads/latestnews/Draft%20Guidelines%20for%20Prevention%20and%20Regulation%20of%20Dark%20Patterns%202023.pdf
- Self-audit advisory and results: https://www.pib.gov.in/PressReleasePage.aspx?PRID=2191948 ; https://www.azbpartners.com/bank/central-consumer-protection-authority-issues-advisory-to-e-commerce-platforms-for-self-audit-to-detect-dark-patterns-on-their-platforms/
- E-Commerce Amendment Rules 2026: https://www.scconline.com/blog/post/2026/09/14/consumer-protection-e-commerce-amendment-rules-2026-explained/ ; https://triumvirlaw.com/insights/decoding-the-consumer-protection-(e-commerce)-(amendment)-rules-2026 ; https://lexcomply.com/blog/dark-patterns-ecommerce-amendment-rules-2026-compliance-guide-6ac68b344325c ; https://sjexim.services/2026/09/11/consumer-protection-e-commerce-amendment-rules-2026-new-norms-on-rankings-dark-patterns-discounts-and-seller-transparency/
- PhysicsWallah and McAfee orders: https://www.livelaw.in/amp/consumer-cases/ccpa-fines-physicswallah-5-lakh-for-basket-sneaking-confirm-shaming-and-forced-action-imposes-1-lakh-penalty-on-mcafee-over-dark-patterns-536775 ; https://www.taxscan.in/top-stories/physicswallah-penalised-by-ccpa-for-sneaking-10-donations-into-purchase-carts-emotional-appeals-to-users-1447033 ; https://taxguru.in/corporate-law/ccpa-imposes-penalty-mcafee-accept-risk-renewal-prompt-dark-pattern-ccpa.html ; https://spicyip.com/2026/07/small-fines-big-platforms-the-ccpa-on-physicswallah-mcafee-and-the-cost-of-getting-caught-part-i.html
- Nine-platform penalties: https://www.aninews.in/news/business/govt-says-ccpa-imposes-rs-20-lakh-for-dark-patterns-steps-up-action-against-deceptive-online-practices20260806161831/ ; https://www.freepressjournal.in/business/ccpa-penalises-zepto-indigo-physics-wallah-and-6-other-platforms-over-dark-patterns

**Legal (EU/US/UK)**
- FTC click-to-cancel: https://www.jonesday.com/en/insights/2026/05/ftc-revives-clicktocancel-rule-new-risks-for-subscription-businesses ; https://www.bclplaw.com/en-US/events-insights-news/im-not-dead-yet-is-the-demise-of-the-ftcs-click-to-cancel-exaggerated.html
- California AB 2863: https://btlaw.com/en/insights/alerts/2025/california-expands-automatic-renewal-law-new-requirements-now-in-effect ; https://fenwick.com/insights/publications/california-tightens-requirements-for-automatically-renewing-subscriptions
- EU withdrawal button: https://www.loyensloeff.com/insights/news--events/news/new-eu-rules-on-withdrawing-from-online-contracts/ ; https://www.freshfields.com/en/our-thinking/blogs/risk-and-compliance/pitfalls-for-e-commerce-how-the-new-eu-withdrawal-button-widerrufsbutton-wi-102ms91
- Digital Fairness Act: https://www.techtimes.com/articles/330286/20261109/eu-dark-patterns-law-listed-wednesday-digital-fairness-act-targets-firms-platform-rules-miss.htm (9 Nov 2026); https://en.wikipedia.org/wiki/Digital_Fairness_Act
- UK DMCC subscriptions: https://www.stephensonharwood.com/insights/subscription-reforms-brought-forward-to-january-2027-is-your-business-ready/ (24 Aug 2026); https://www.taylorwessing.com/de/insights-and-events/insights/2026/04/subscription-contracts

**Regional pricing**
- https://fungies.io/purchasing-power-parity-saas-pricing-2026 (vendor); https://thegtmdirectory.com/tools/paritydeals ; https://docs.dodopayments.com/features/adaptive-currency

### Couldn't verify
- Official GfG Premium, Coding Ninjas and Scaler prices. A current LeetCode India price.
- The RBI primary circular for the 2026 e-mandate framework, and its effective date.
- NPCI's own UPI Autopay success tables (the figures above come from press citing NPCI).
- Whether Razorpay's QR Codes API and international cards are open to individual (unregistered) accounts.
- Whether Dodo collects 18% Indian GST on INR sales, and Dodo's prohibited list for "academic" tools (the docs page returned 404).
- Whether Stripe Managed Payments excludes India (competitor claims only).
- Whether the 2020 E-Commerce Rules (and so the 2027 audit and certificate duty) formally cover an individual selling their own app.
- PhonePe PG fees and its individual onboarding route.
