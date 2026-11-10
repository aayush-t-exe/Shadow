# 02: Competitor paywall and monetization teardown

Checked: **2026-11-10**. Builds on `research/01-cluely.md` §5 and `research/02-interview-coder.md` §5. Those sections are summarized here, not repeated.

**How to read the confidence tags**
- **[Official]**: the vendor's own pricing page or help docs, fetched 2026-11-10.
- **[App Store IN]**: the Apple App Store India listing's in-app purchase list, fetched 2026-11-10. These are real ₹ prices. Apple doesn't label billing periods, so the period is inferred from the SKU name or price.
- **[3rd-party, date]**: a review, comparison or news article. Many come from competitors, and those are flagged.
- **Failed fetches.** These pages could not be loaded, so their figures come from third parties:
  - Chegg plans (403), Quizlet /upgrade (403), LeetCode /subscribe (403) and TurboScribe /pricing (403).
  - superwhisper.com/pricing returned 404, so its figures come from the homepage.
  - The Gauth and Knowunity India App Store pages returned 404. They may not be listed in the India store, but that is unconfirmed.
  - Fireflies' and LockedIn's pricing pages loaded but showed no prices. Pluely's page shows tier names only.

---

## 0. TL;DR

1. **Price bands in India are now set by the big labs:**
   - **₹399/mo** is the mass tier: ChatGPT Go ₹399, Google AI Plus ₹399 (₹199 intro for 6 months), and Cursor's India-only Start plan at ₹649.
   - **₹1,950–₹2,400/mo** is the premium tier: ChatGPT Plus ₹1,999, Gemini AI Pro ₹1,950, Claude Pro ₹2,000 (annual) or ₹2,399 (monthly), Perplexity Pro ₹1,999.
   - India-localized study apps go lower still: **Brainly Plus ₹199/mo and ₹1,499/yr**, and Question.AI has a ₹199 monthly SKU.
   - A Shadow Cloud plan above ₹399/mo competes with "all of ChatGPT". The realistic band for Indian students is **₹99–₹299/mo, or small prepaid packs**.
2. **Many Indian students already have premium AI for free, or did until recently:**
   - **Google AI Plus**: free for 1 year for Indian college students, redeemable until **Dec 31, 2026**.
   - **Jio**: 18 months of Google AI Pro with Jio 5G plans of ₹349 and up.
   - **GitHub Copilot Student**: free, but self-selection of premium models was removed in March 2026.
   - **ChatGPT Go's free year**: new claims closed around Jan 2026. **The free years are expiring right now (Nov 2026 to Jan 2027)** and auto-charge ₹399.
   - **Perplexity Pro via Airtel**: claims closed Jan 2026, and free years have been expiring since Jul 2026, with auto-renew.
   - The real competitor is "free Gemini or ChatGPT in a browser tab". Shadow has to sell **workflow** (hotkey, no copy-paste, live lecture audio, structured DSA output, Hinglish), not model access.
3. **Paywall types and conversion (RevenueCat SOSA 2026):**
   - Hard paywalls convert about 5x better than freemium at download-to-paid: **10.7% vs 2.1%** by Day 35. Year-one retention is the same.
   - In Education, about half of trials run 5–9 days. **Trials of 17–32 days convert at 42.5%, against 25.5% for trials under 4 days.**
   - AI-app monthly plans retain **36% worse** than non-AI apps.
   - APAC download-to-paid is about **2.4%**.
4. **The best upgrade-trigger design found is Wispr Flow's soft-degrade cap.** It warns, then slows, then blocks, shows the prompt at most once a day, and **lets an in-progress dictation finish**. Students get a special "Students get Wispr Flow free! / Claim free offer" card in place of the upgrade prompt.
5. **What users hate most:**
   - In 791 one-to-three-star homework-app reviews, **paywalls and limits were 16% of complaints**, second only to wrong answers. Quizlet and Brainly led.
   - "Answer free, steps paid" (Photomath, Mathway) draws particular anger.
   - Billing horror stories come from credit systems and no-refund policies: Parakeet charges credits during freezes, Interview Coder and LockedIn refuse refunds, Cluely's Trustpilot is 1.6.
   - Trials that roll into annual plans, and free promos that auto-charge a saved card (Airtel/Perplexity, ChatGPT Go), are a further source of complaints.
6. **The open gap:**
   - No one sells a **cheap, honest, desktop, student-first** overlay. Desktop overlays (Cluely, LockedIn, Parakeet, Final Round, Interview Coder) cost **$15–$299/mo** and are sold on stealth.
   - Homework apps are **phone-camera-first** and at ₹199–₹1,199/mo they don't see your screen or hear your lecture.
   - Lecture transcribers have stingy free tiers: Otter caps a conversation at 30 minutes, Notta at 3 minutes, Turbo at about 2 hours a month.
   - Shadow can be the **₹149–₹249/mo or pay-as-you-go "no API key" study overlay with UPI, no auto-renew trap, and a fair free tier**. That combination doesn't exist today.

---

## 1. Comparison table

USD unless noted. "Paid entry" means the cheapest recurring plan with the core AI feature.

| Product | Category | Free tier (core limit) | Paid entry | India price | Trial | Main upgrade trigger | Conf. |
|---|---|---|---|---|---|---|---|
| **Cluely** | Overlay | Starter: "limited AI responses" (≈5/day per 3rd-party), 3 files | Pro $19.99/mo (≈$11.99/mo yearly); Pro+Undetectability $149.99 | USD only (see 01-cluely) | 7-day reported | Daily response cap; stealth as a separate high tier | Official |
| **Interview Coder** | Overlay | Download only, no AI | $299/mo (1,000 credits); $799 lifetime | USD | None | Hard paywall at first use | 3rd-party Oct 2026 |
| **LockedIn AI** | Overlay | Unlimited 5-min sessions, ≤60 min/day, no card | $54.99/mo promo "from $109.98"; Credits $69.99 (400 min); Lifetime $999.50 | USD; iOS $139.99 | Free sessions | Session timer; Stealth/Duo only on higher tiers; countdown and promo code | 3rd-party Sep 2026 |
| **Final Round AI** | Overlay | Prep only (Goals, resume); **no live sessions** | "$25+/mo" on page; 3rd-party: $150/mo, $300/yr | USD | **"There is no free trial"** | Hard feature lock on live Copilot | Official + 3rd-party |
| **Parakeet AI** | Overlay | "10 free sessions" (≤10 min each) + 1 mock, no card | Unlimited ₹9,470/mo, ₹37,900/yr, **₹4,980/week**; credits 3 for ₹3,690 | **₹ shown natively; UPI + PhonePe** | Free sessions | Credit exhaustion (mid-session dialog) | Official (₹) |
| **Pluely** | Overlay (OSS→closed) | Free tier "always available" | Limited Pro / Unlimited Pro / Dev Pro (prices not shown); license keys; free lifetime Dev Pro for a 5k-impression post | n/a | None stated | License key; "Purchases are final" | Official (partial) |
| **Raycast** | Desktop launcher | **No AI at all** on Free | Pro $10/mo ($96/yr), 500 AI credits | USD | 7-day Pro trial credits | Feature lock (AI absent) | Official |
| **Granola** | Meeting notes | Unlimited notes but **30-day history** | Business $14/user/mo | USD | None | History lock (old notes hidden) | Official |
| **Wispr Flow** | Dictation | 2,000 words/wk desktop (≈1,000 iPhone) | Pro $15/mo, $12/mo yearly | USD | 14-day Pro (being A/B removed) | Soft cap: warn → slow → block | Official docs |
| **Superwhisper** | Dictation | Free local Whisper models, unlimited | Pro ≈$8.49/mo, $84.99/yr, $249.99 lifetime | USD | 3,000 Pro words | Feature lock (cloud models, BYOK, files) | Official homepage + 3rd-party |
| **Highlight AI** | Desktop meeting AI | 10 h transcription, 500 credits/mo | Pro $35/mo; Max $200 | USD | 14-day Pro (Free gets 14 days of Pro first) | Credits/hours caps | Official |
| **Screenpipe** | Screen memory | Free, one device | Basic $21/mo or $250/yr | USD | None | History limit and device sync | Official |
| **Gauth** | Homework | Daily "tickets" (≈11/day per one review), ads | Plus $11.99/mo, $31.99/qtr, $99.99/yr (varies by store) | Not found in IN store (404) | 3-day | Daily cap; trial at the paywall | 3rd-party |
| **Photomath** | Homework | Answers and steps free | Plus $9.99/mo, $69.99/yr | **₹449–₹999** SKUs | 7-day (3rd-party) | Feature lock (animated tutorials, textbook solutions) | App Store IN |
| **Mathway** | Homework | Answers free | Steps $9.99/mo, $39.99/yr | **₹849/mo, ₹3,349/yr** | Disputed | Feature lock: **steps** | App Store IN |
| **Brainly** | Homework | Limited answers (a user reports 10/week), ads | Plus ≈$9.99/mo | **₹199/₹499/₹899/mo; ₹1,499 and ₹3,849/yr**; Tutor ₹2,699 | Varies | Answer cap; ads | 3rd-party (IN listing) |
| **Chegg** | Homework | None useful (hard paywall) | Study $15.95/mo; Study Pack $19.95 | n/a | Occasional | Hard paywall | 3rd-party Oct 2026 |
| **Quizlet** | Flashcards | Learn/Test rounds capped, ads | Plus $7.99/mo, $35.99/yr | **₹699 / ₹2,999** | 7-day typical | Round caps on Learn/Test | App Store IN + 3rd-party |
| **StudyX** | Homework | ≈5 questions/day | ≈$4.99–$12.99/mo (conflicting) | n/a | 3-day | Daily cap | 3rd-party |
| **Question.AI** | Homework | Limited scans | $8.99–$11.99/mo; $34.99–$99.99/yr | **₹199, ₹999, ₹1,199/mo; ₹9,900/yr** | n/a | Scan cap | App Store IN |
| **Answer.AI** | Homework | Limited | $9.99/mo, $99.99/yr | **₹299/wk, ₹999/mo, ₹6,900–₹9,900/yr**; ₹199 for 50 credits | n/a | Cap plus credit packs | App Store IN |
| **Knowunity** | Study | Daily AI tutor cap (number unpublished) | ≈$4.49–$8.99/mo; $49.99/yr | Not in IN store (404) | 7-day (3rd-party) | Daily cap | 3rd-party |
| **Socratic** | Homework | Discontinued; merged into Google Lens (2025) | n/a | Free via Lens | n/a | n/a | 3rd-party |
| **NoteGPT** | Notes/YouTube | Free (limits not shown) | Pro $9.99/mo ($108/yr); Unlimited $29 | USD; group "SaveTogether" plan | None | Quota | Official |
| **Turbo AI** | Lecture notes | ≈2 h lecture processing/month | $9.99/week; $14.99–$19.99/mo; ≈$119.99/yr | USD (App Store) | n/a | Minutes cap; weekly plan | 3rd-party Oct 2026 |
| **Cursor** | Coding | Free: "limited agent & chat"; new users get 14-day Pro trial | Plus $8 / Premium $30 (X bundle since Oct 2026); **India: Start ₹649/mo** | **₹649, UPI** | 14-day Pro | Weekly usage pool; top-ups | Official + TechCrunch |
| **GitHub Copilot** | Coding | Free: 2,000 completions/mo, limited chat | Pro $10/mo | USD | n/a | Credit caps | Official |
| **Copilot Student** | Coding | **Free for verified students** (premium models only via Auto since Mar 2026) | — | Free | — | Upsell to Pro/Pro+ while keeping Student Pack | Official + 3rd-party |
| **Windsurf / Devin** | Coding | Light agent quota, unlimited Tab | Pro $20/mo | USD | None | Quota | Official |
| **Replit** | Coding | No free plan on page | Core $20/mo ($18 yearly) | USD | n/a | Credits ("effort-based") | Official |
| **LeetCode Premium** | DSA | Most problems free | $35/mo; $159/yr | USD; 20% India discount seen on a 2023 invoice | None | Locked problems and company tags | 3rd-party Oct 2026 |
| **NeetCode Pro** | DSA | Roadmap and many videos free | $119/yr "from $199"; **$297 lifetime "from $599"** | USD | None | Content lock | Official |
| **AlgoExpert** | DSA | None | ≈$99–$119/yr bundle, flash sales to $59 | USD | None | Hard paywall | 3rd-party |
| **ChatGPT** | General | Free (capped, ads coming) | **Go ₹399**; Plus ₹1,999; Pro ₹10,699–₹52,900 | ₹, UPI | Go free year (claims closed) | Message and feature caps | App Store IN |
| **Claude** | General | 5-hour and weekly limits | Pro $20 ($17 yearly) | **₹2,000 (yr) / ₹2,399 (mo) incl. GST; no UPI** | n/a | Usage limits | Official + news Jul 2026 |
| **Gemini** | General | Free | **AI Plus ₹399 (₹199 intro)**; AI Pro ₹1,950 | ₹ | **Students: 1 yr AI Plus free (to Dec 31 2026)**; Jio 18 mo AI Pro | Caps | Official Google IN blog |
| **Perplexity** | General | Free | Pro ₹1,999; credit packs ₹499–₹9,900 | ₹ | Airtel 12-mo promo (closed) | Pro search caps and credits | App Store IN |
| **Otter.ai** | Transcription | 300 min/mo, **30 min per conversation**, 3 lifetime imports | Pro $16.99/mo ($8.33/mo yearly; promo half off) | Has an "India-issued card only" offer | None | Mid-meeting cutoff at 30 min | Official |
| **Fireflies** | Transcription | Not disclosed on page | Pro $10/mo yearly ($18 monthly) | USD | n/a | Credits for AskFred and AI apps | 3rd-party Oct–Nov 2026 |
| **TurboScribe** | Transcription | 3 files/day, 30 min each | Unlimited $20/mo, $10/mo yearly | USD | n/a | Daily file cap | 3rd-party Jul 2026 |
| **Notta** | Transcription | 120 min/mo, **3 min per recording** | Pro $8.17/mo yearly ($97.99) | USD; **50% edu discount** | 7-day Business | Per-recording cap | Official |

---

## 2. Per-product notes

### 2.1 Overlay and desktop AI

**Cluely** (detail in 01-cluely §5)
- **Pricing page copy:**
  - Headline: **"Start for free."** Subhead: "free to use for meetings, homework, sales calls, or curiosity."
  - Three cards: Starter / Pro / Pro + Undetectability. CTAs are "Get for Mac", "Subscribe" and "Download on the App Store".
  - Closing line: "Try Cluely on your next meeting today." The page has **no social proof**.
- **Inconsistency:** the page title says "Pro from $11.99/mo", but the card shows $19.99. That is annual anchoring that only shows up in the title.
- **Paywall structure:** a daily reset cap on responses (≈5/day per 3rd-party, Aug 2026). The killer feature (stealth) is a separate **7.5x price tier**.
- **Refunds:** 24 hours only, and only if "the tool doesn't work on your computer". No pro-rata refunds ([OphyAI comparison, Sep 2026](https://ophyai.com/blog/career-advice/ai-interview-copilot-pricing-comparison)).
- **Lesson:** the daily-reset counter matches how students actually work (one problem set a day). Charging 7.5x for one switch reads as a gouge.

**Interview Coder** (detail in 02-interview-coder §5)
- Free download with no AI at all. Pro is $299/mo for 1,000 credits; Lifetime is $799, with an $899 figure seen in Nov 2025.
- Struck-through anchors ($499 → $299; $1,598 → $799). "All purchases non-refundable."
- **Lesson:** a pure hard paywall with no try-before-buy works only for desperate, high-stakes buyers. Students in study mode aren't that buyer.

**LockedIn AI** ([OphyAI review, checked Sep 29 2026](https://ophyai.com/blog/career-advice/lockedin-ai-review); [pricing page](https://www.lockedinai.com/pricing))
- **Pricing page** (fetched; prices not rendered):
  - Headline "Choose Your Plan"; subhead "Land your next offer with real-time interview help."
  - Tabs: **Unlimited / Credits / Lifetime**.
  - Badges: "Credits never expire", "Money-back guarantee", "Trusted by 1M+ users". CTA: "Start for free".
- **Prices (3rd-party, all shown as 50%-off promos):**
  - Unlimited General $54.99 (from $109.98) and Unlimited Professional $119.99 (adds Stealth and Duo).
  - Credits $69.99 for 400 Copilot minutes; Lifetime $999.50.
  - The iOS App Store charges more ($139.99 Unlimited monthly).
- **Urgency tactics:** site-wide banner, countdown timer, promo code LOCKIN50.
- **Free tier:** unlimited 5-minute sessions, up to 60 minutes a day, no card.
- **Gotchas:**
  - Paid sessions hard-stop at **120 minutes** even on "Unlimited".
  - Monthly and quarterly plans are "Non-refundable once started", despite the money-back badge.
  - Trustpilot rating is suppressed "due to a breach of our guidelines".

**Final Round AI** ([pricing page](https://www.finalroundai.com/pricing), fetched)
- **Copy:**
  - Pricing headline **"What's your next interview worth?"** This is value anchoring: it frames the price against a job offer.
  - Hero: "Ace Your Interview with #1 AI Interview Assistant". Closing: "Your next round is the one that counts."
- **Free plan:** prep only (Goals, resume, JD parsing, desktop app). Pro covers live Copilot, Stealth, debriefs and auto-capture.
  - The page says "$25+/mo" and "Save up to 40%". 3rd-party reviews in Sep–Nov 2026 saw $150/mo, $250/qtr, $300/yr and $500 "MAX".
- **"There is no free trial - live sessions need an active Pro subscription."**
- **Social proof** is heavy: "10M+ job seekers", 4.9★ Product Hunt, 80+ countries, FAANG logos under "Used by candidates interviewing at", SOC 2 badges, 143 languages.
- **Refunds:** a 72-hour money-back guarantee, void after 2+ sessions over 30 minutes, with Stripe fees deducted. The FAQ contradicts it ("monthly plans non-refundable").

**Parakeet AI** ([pricing page](https://www.parakeet-ai.com/pricing), fetched; it rendered **in ₹**, probably geo-localized)
- **This is the most relevant India reference.**
  - Payment logos on the page: **Visa, Amex, PayPal, UPI, PhonePe**.
  - Social proof: "No. 1 Viral App in India", "Trusted by 1.5M+ people", "4.86 from 340K+ reviews", "#1 AI Interview Assistant on SimilarWeb", and verified-platform badges (Zoom, Teams, Meet…).
- **Copy:**
  - Headline "Your Real-Time AI Interview Assistant"; subhead "Get the right answer while you're still talking."
  - CTAs: "Try for Free", "Go Unlimited", "Choose a credit pack".
  - Trust lines: "Join 1.5M+ users. No credit card required." and "No lock-in. Cancel anytime."
- **Plans:**
  - **Unlimited** (badge "Recommended"): ₹9,470/mo, ₹37,900/yr (shown as ₹3,158/mo), or **₹4,980/week**.
  - **Credit packs with bonus credits:** 3 for ₹3,690; **8 for ₹7,380 ("6 + 2 free")**; **15 for ₹11,070 ("9 + 6 free")**; a single credit for ₹2,360. 0.5 credit buys a 30-minute call.
  - "Custom" à-la-carte Prepare tools at ₹2,900/mo each.
- **Free:** "10 free sessions left" counter on the dashboard, plus the first mock free.
- **Pain points (Parakeet's own featurebase board):**
  - The desktop app froze and cost an extra 0.5 credit.
  - Credits kept counting after a session ended.
  - Refunds are denied once *any* credit is used, and partially used packs get no partial refund.
  - Competitors say the mid-session "credits expired" dialog is the most common failure.
- **Lessons for Shadow:**
  - Weekly passes and bonus-credit packs show that Indian buyers will pay in **bursts around high-stakes events**. Exam week works the same way.
  - Credits that die mid-task generate the worst complaints.

**Pluely** ([pricing page](https://pluely.com/pricing), fetched)
- It started as a GPL-3 Cluely alternative. From v1 it is closed-source signed binaries with **license keys**.
- Tiers: Free ("whenever you want to get a feel for Pluely first"), Limited Pro, Unlimited Pro and Dev Pro. **Prices are not rendered on the page.**
- Notable mechanics:
  - Buying in-app auto-activates the license. Buying on the web emails a key to paste into the app.
  - **"Purchases are final."**
  - **A free lifetime Dev Pro license for a public post with 5,000+ impressions.** That is a distribution hack worth copying for a student launch.
  - A partner program offers "your models, your license keys, per-license billing".
  - A BYOK FAQ exists, but the answer isn't rendered.

**Raycast** ([pricing](https://www.raycast.com/pricing), fetched)
- **Free has no AI at all.** That is a hard feature lock.
- Pro is $10/mo ($96/yr) with 500 AI credits; Plus $20 (3,000 credits); Max $50 (7,500).
- **Verified students get 50% off Pro.** New accounts get a Pro trial whose **credits expire 7 days** after they are granted.
- **Lesson:** a launcher can be great without AI and sell AI as the add-on. Shadow's core *is* AI, so a zero-AI free tier doesn't transfer. BYOK is Shadow's equivalent "free without our AI".

**Granola** ([pricing](https://www.granola.ai/pricing), [students](https://www.granola.ai/students), fetched)
- Basic is free with unlimited notes but **30-day history**. Older notes are stored but locked until you upgrade ([Hedy](https://hedy.ai/post/granola-redesign-alternative-hedy/)). Business is $14/user/mo; Enterprise $35.
- **Student program:**
  - **12 months of Business free** for students in the US, UK and Canada, verified with a student ID.
  - **Each student can refer 5 classmates, who also get 12 months free.**
- Copy: "Granola how you wanna"; closing line "Try Granola for a few meetings today. It's free to get started."
- **Lesson:** the history lock converts well because your data is held hostage, but it breeds resentment. For Shadow, locking past lecture transcripts would feel the same. Avoid it.

**Wispr Flow** ([pricing](https://wisprflow.ai/pricing); help docs: [free cap](https://docs.wisprflow.ai/articles/4760791189), [trial end](https://docs.wisprflow.ai/articles/7140488640-trial-end-value-summary-in-wispr-flow), fetched)
- **This is the most carefully designed upgrade system in the set.**
- **Free plan:** 2,000 words/week on desktop, combined across devices. The window is a fixed week with no carryover.
- **Trial:** 14-day Pro trial, now being A/B tested away.
  - In the experiment, some new accounts get no trial. **The first time they hit the cap, Flow grants 8,000 bonus words for that week.** That is a "surprise gift at the moment of pain".
- **Escalation copy:**
  1. "You're approaching your weekly free limit"
  2. "You have reached your weekly limit." / "**Flow will slow down until next week.**"
  3. "No words remaining" / "You've hit your weekly word limit. Upgrade to continue using Flow."
- **Rules:**
  - The desktop Flow bar shows "**Upgrade for unlimited access**" **at most once daily**.
  - **A dictation already in progress finishes.**
  - Restarting the app doesn't reset the allowance.
- **Trial countdown:**
  - The sidebar card reads "Trial ends in N day(s)" with **Upgrade to Pro**.
  - For teams: "Add billing info to keep Pro for your team. **You won't be charged until the trial ends.**"
- **Students:** they see "**Students get Wispr Flow free!**" with **Claim free offer** *instead of* the upgrade prompt. The pricing page also lists 50% off for students and 40% for educators.
- Pro is $15/mo or $12/mo yearly (-20%). "You never need a credit card to start."

**Superwhisper** ([homepage](https://superwhisper.com), fetched; /pricing returned 404)
- Free: unlimited local Whisper models. Pro adds **"your own AI API keys"**, cloud models, file transcription and translation.
- Price ≈$8.49/mo; yearly is "2 months free". **Lifetime is labeled "Top choice"**, about $249.99 per 3rd-party sources.
- **40% student discount**, **30-day refund on all plans**, and the Pro trial is "3,000 words".
- **Lesson:** BYOK sits *inside* the paid tier here. Shadow does the opposite (BYOK is free), which is more generous and a credible trust signal.

**Highlight AI** ([pricing](https://highlightai.com/pricing), fetched)
- Free: 10 hours of transcription and 500 chat credits a month, **plus 14 days of Pro first**.
- Pro is $35/mo (badge "Most popular"; CTA "**Start 14-day free trial**"); Max is $200.
- Per PricingSaaS, in late Oct 2026 the paid "Lite" plan became a free plan and Pro dropped from $60 to $35. That is a move *toward* free plus a reverse trial.

**Screenpipe** ([pricing](https://screenpipe.com/pricing), fetched)
- Headline "Give your AI more of your work." Subhead: "Start local. Upgrade for full history, personal sync…"
- Free covers one device. Basic is $21/mo or $250/yr, and the annual toggle says "2 months free".
- Students and faculty get **50% off the first month only**.
- It is open source, but "commercial source builds require Enterprise".

### 2.2 Study and homework AI

**Gauth** (ByteDance)
- **Free:** daily "tickets", about 11 questions/day per one review (unverified). Ads, plus occasional bonus solutions for watching ads.
- **Plus:** $11.99/mo, $31.99/qtr, $99.99/yr, though regional SKUs vary widely (a US listing shows $1.99/$5.99/$14.99).
- **3-day trial.** App Store complaints say the trial item displays a price, which looks misleading.
- **India:** the App Store page `apps.apple.com/in/app/id1542571008` returned 404. Possibly not listed in India; unconfirmed.
- In the Poppy review sample, Gauth's top complaint was **wrong answers** (138/217), not paywalls (9).

**Photomath** (Google)
- Answers *and* step-by-step explanations are free. Plus adds animated tutorials and textbook solutions.
- Plus is $9.99/mo or $69.99/yr. **India App Store SKUs: ₹449, ₹469, ₹849, ₹949, ₹999.**
- Even so, it gets "steps behind paywall" complaints. Example (Poppy, 1★ Sep 2026): "a broken down explanation is a premium only feature so.. if your actually trying to learn find a different app".

**Mathway** (Chegg)
- The canonical "answer free, steps paid" model.
- **India: Steps ₹849/mo and ₹3,349/yr** (higher SKUs at ₹999–₹1,199/mo and ₹3,999–₹4,899/yr, probably A/B tests). US: $9.99/mo, $39.99/yr.

**Brainly**
- Free answers are capped. One user reports "**you now only get 10 answers per WEEK not per day per WEEK**" (1★, Mar 2026).
- **India-localized SKUs: Plus ₹199, ₹499 and ₹899/mo; ₹1,499 and ₹3,849/yr; Tutor ₹2,699/mo.** These are the lowest India prices in the study set.
- The India store listing is titled "Brainly-NCERT, CBSE, Study App", which is localized positioning.
- A complaint example: "Charged a full year. Never used the app. No refund."

**Chegg** (official page 403)
- Study $15.95/mo; Study Pack $19.95 ([3rd-party, Oct 2026](https://www.toolsurf.com/chegg-prices-2026/)). Essentially a hard paywall.
- 20%-off first-month promos, excluding app sign-ups.

**Quizlet** (official /upgrade 403)
- Plus is $7.99/mo or $35.99/yr. **India SKUs: Plus ₹699 and ₹2,999; Quizlet Go ₹2,999.**
- Free Learn and Test rounds are capped. Trustpilot is ≈1.4/5, mostly about features that "used to be free".
- It led the Poppy complaint set with 55 paywall complaints. Example: "**It was great until 90% of it was put behind a paywall.**"
- **Lesson:** *taking away* free features is the most damaging move. Launch the free tier at a level you can sustain.

**StudyX:** ≈5 questions/day free. Paid prices conflict ($4.99–$19.99/mo). 3-day trial. Separate forum points (100 for $0.99). Credit cost per question is undisclosed.

**Question.AI** (3HOUSE / Zuoyebang)
- **India SKUs:** "Plus-monthly ID" **₹199**, DPro ₹999/mo, Plus ₹1,199/mo, several ₹9,900/yr SKUs (names like `RM_NewUer_Yearly`, `RM_PlusLow`/`High` suggest price testing by segment).
- A Play reviewer complained of a renewal charge after "only 30 free uses" and ads.

**Answer.AI**
- **India: Pro ₹299/week, ₹999/mo (four A/B variants D, D4, D7), ₹6,900 or ₹9,900/yr; "SuperAI 50 Credits" ₹199.**
- That is a hybrid of subscription and consumable credit packs. Pro promises "Unlimited usage, 2x faster query time, early access".

**Knowunity:** daily AI-tutor cap (number unpublished). Pro is ≈$4.49–$8.99/mo or $49.99/yr. 7-day trial (3rd-party). The India App Store page returned 404.

**Socratic:** discontinued and merged into Google Lens in 2025. Its homework help now lives inside a free Google product, which is another free substitute.

**NoteGPT** ([pricing](https://notegpt.io/pricing), fetched)
- Banner: "Save 30% · Limited Time".
- Plans: Pro $9.99/mo ($108/yr); Unlimited $29 ($239/yr); Max $99.
- **"SaveTogether" group plan:** at least 3 people, Pro drops to $4.66/person/yr, "Save 30% + 6 Months Free". **Group buying is a good fit for hostel-room or friend-group students.**
- Refund within 24 hours, minus credits used.

**Turbo AI / TurboLearn**
- Free: about 2 hours of lecture processing a month. **$9.99/week**, $14.99–$19.99/mo, ≈$119.99/yr on the App Store, with price tests.
- 5M users ([TechCrunch Oct 2025](https://www.techcrunch.com/2025/10/23/20-year-old-dropouts-built-ai-notetaker-turbo-ai-to-5-million-users)).
- **This is Shadow's closest lecture-mode competitor.** Weekly pricing aimed at students is aggressive.

### 2.3 Coding

**Cursor** (SpaceX acquisition closed Aug 14 2026)
- **Pricing page today:** Free / Plus $8 / Premium $30 / Super $100 / Ultra $200 (part of the **X Subscription**, Oct 12 2026).
  - Usage is a **weekly pool** shared with Grok, with top-offs. Third-party models are billed at API list price.
- **India-only "Cursor Start" (Jul 27 2026, [TechCrunch](https://techcrunch.com/2026/07/27/cursor-makes-its-biggest-india-push-yet-ahead-of-spacex-acquisition-with-localized-pricing/)):**
  - **₹649/mo**, billed in rupees with cards **and UPI**.
  - Includes Cursor's own Composer 2.5 and Grok models; excludes OpenAI and Anthropic frontier models.
  - Anti-VPN checks. Positioned as "commercially sustainable, not a loss leader" because it uses cheaper in-house models.
  - India is Cursor's third-largest market.
- **Free year for students:** closed to new applicants on Jun 25 2026 (3rd-party).
- New users get a **14-day Pro trial**, then fall back to Hobby. The limit message reads "You've reached your trial request limit" with an upgrade prompt.
- **Pricing crisis precedent:** in Jun–Jul 2025 Cursor silently turned "500 requests + unlimited slow" into a $20 usage pool. That led to surprise overage charges, a CEO apology ("not communicated clearly"), refunds for Jun 16–Jul 4 charges, and spend limits.
- **Lessons:**
  - A **cheaper India SKU built on a cheaper model** is exactly the shape Shadow Cloud should take (Gemini Flash-class plus Deepgram).
  - Never silently change what a plan buys.

**GitHub Copilot** ([plans](https://github.com/features/copilot/plans), [free access docs](https://docs.github.com/en/copilot/how-tos/manage-your-account/get-free-access-to-copilot-pro))
- Free: 2,000 completions/mo and "limited chat and agent usage". Pro $10, Pro+ $39, Max $100. Billing moved to GitHub AI Credits in Jun 2026.
- **Copilot Student plan:** free for verified students.
  - Since Mar 12 2026, GPT-5.4 and Claude Opus/Sonnet can no longer be self-selected (only via Auto).
  - New sign-ups for Pro, Pro+ and Student were "temporarily paused" from Apr 20 2026 (French docs).
  - Students can now upgrade to paid Pro while keeping Pack benefits. Eligibility is re-checked monthly.
- **Implication:** any CS student in India with a college email has a free in-IDE coding AI. Shadow's coding mode competes on "explain the problem on screen like a tutor (approach, dry run, complexity) in Hinglish", not on "write code".

**Windsurf** now redirects to **devin.ai/pricing** (Cognition). Free: "light quota", unlimited Tab. Pro $20; Max $200. No trial or student offer shown.

**Replit:** no visible free plan on the pricing page. Core $20/mo ($18 yearly); Pro $100. "Effort-based" credits.

**LeetCode Premium** (official 403): $35/mo; $159/yr ("previously $299"). Strictly non-refundable. Black Friday sales recur. A 2023 invoice shows a 20% "India Yearly Discount", so regional pricing has existed.

**NeetCode Pro** ([fetched](https://neetcode.io/pro))
- **Lifetime $297 "from $599"**; One-Year $119 "from $199", **auto-renew off by default**.
- CTA "Get Pro", plus "Gift a Plan". Offer-letter testimonials ("Cracked my final round at Google today!").
- **Lifetime plus no auto-renew is a strong trust pattern for students.**

**AlgoExpert:** ≈$99–$119/yr bundle with perpetual "Flash Sale" countdowns (down to $59) and a struck-through $693 list price.

### 2.4 General AI (the willingness-to-pay ceiling)

**ChatGPT**
- **India App Store:** Go ₹399, Plus ₹1,999, Pro 100 ₹10,699, Pro 200 ₹19,900, Pro 500 ₹52,900.
- Go launched in India first (Aug 2025) with ₹ pricing and UPI. It offers about 10x the free tier's limits.
- **Free year of Go** for India users from Nov 4 2025:
  - Signing up needed a ₹1 UPI or ₹2 card verification charge, which put a mandate on file.
  - New claims closed around Jan 21 2026 (3rd-party).
  - **Free years expire between Nov 4 2026 and late Jan 2027 and auto-charge ₹399/mo** unless cancelled.
  - So right now millions of Indian users are deciding whether ChatGPT is worth ₹399. That decision sets the ceiling Shadow sits under.
- OpenAI's Learning Accelerator (Aug 2025) handed out about 500k free ChatGPT licences to Indian students and teachers (AICTE colleges and government schools).

**Claude**
- Free: 5-hour and weekly limits. Pro $20 ($17 yearly); Max from $100 ([pricing](https://claude.com/pricing)).
- **India rupee pricing since Jul 2026:** Pro ₹2,000/mo yearly or ₹2,399/mo monthly, GST included; Max ₹11,999–₹23,999. **No UPI.**
- No student discount; an institution-level Education plan exists.

**Gemini / Google One**
- **AI Plus ₹399/mo with a ₹199 intro for 6 months** (Dec 2025 launch, shareable with 5 people). AI Pro ₹1,950/mo.
- **Students** ([Google India blog](https://blog.google/intl/en-in/products/start-the-academic-year-with-one-year-of-gemini-on-us/)):
  - **One year of Google AI Plus free for Indian college students, redeemable until Dec 31 2026.** It requires a payment method, auto-renews at $4.99-equivalent, and verification is via SheerID.
  - In 2025 the student offer was AI **Pro**; it was downgraded to AI **Plus** for 2026.
- **Jio:** 18 months of Google AI Pro (worth ₹35,100) with a Jio 5G plan of ₹349+. The age limit was later removed. It was live in Feb 2026; current status is unverified.

**Perplexity**
- India App Store: Pro ₹1,999; Max ₹19,900; **credit packs 500 for ₹499 up to 10,000 for ₹9,900**. That is a subscription-plus-consumables hybrid.
- **Airtel bundle:** 12 months of Pro free. Claims ran Jul 17 2025 to Jan 16/17 2026.
  - Users had to add a card mid-promo, which drew a "card on file" trust backlash ([Business Today, Jan 2026](https://www.businesstoday.in/technology/news/story/from-free-for-a-year-to-card-on-file-how-airtel-and-perplexitys-ai-bundle-is-testing-consumer-trust-510521-2026-01-12)).
  - The earliest free years ended in **Jul 2026 with auto-renew charges**.

### 2.5 Transcription

**Otter.ai** ([pricing](https://otter.ai/pricing), fetched)
- **Basic free:** 300 min/mo, **30 minutes max per conversation**, 3 *lifetime* file imports, 25 most recent conversations, 20 AI chat queries/mo.
- **Pro:** $16.99/mo or $8.33/mo yearly, with promo prices of $8.49 and $4.17. Pro gets 90 minutes per conversation.
- **Students and teachers get 20% off** with a .edu email ($79.99/yr).
- A footnote ties one offer to "**India-issued credit card**" only, a sign of India-specific discounting.
- **A 30-minute cap guarantees a mid-lecture paywall moment.** It is effective, but it's the kind of cutoff students resent.

**Fireflies:** the pricing page shows no numbers. Third-party: Pro $10 yearly / $18 monthly; Business $19. Transcription is unmetered; AI features (AskFred, apps) use credits sold in packs.

**TurboScribe** (official 403)
- Free: **3 files/day, 30 minutes each**. Unlimited is $20/mo or $10/mo yearly (files up to 10 h). A competitor claims a hidden 720 h/mo cap (unverified).
- The "Unlimited" plan as the *only* paid tier is the simplest paywall in the set.

**Notta** ([pricing](https://www.notta.ai/en/pricing), fetched)
- Free: 120 min/mo with a **3-minute cap per recording**, which is effectively a demo.
- Pro $8.17/mo yearly ($97.99), with **40% off annual**. **50% education discount** ("50% OFF education discount" CTA). 7-day Business trial.

---

## 3. Patterns

### 3.1 Recurring monetization patterns
1. **Daily or weekly reset caps** (Cluely, Gauth, StudyX, Knowunity, Wispr, TurboScribe, Brainly). Students understand "X per day", and a reset brings them back each day. Weekly caps (Brainly 10/week, Wispr) are stricter and get more anger in student apps.
2. **"Answer free, depth paid"** (Mathway steps, Photomath tutorials, Chegg). It converts, but **it is the most-hated pattern in student reviews** and conflicts with "learn, don't cheat" positioning. Shadow should never gate the *explanation*.
3. **Session-length caps** (Otter 30 min, Notta 3 min, LockedIn 5-min free sessions and a 2-hour paid cap, Parakeet 10-min free sessions). Effective for live audio. The cutoff arrives at peak need, which drives both conversion and resentment.
4. **Hybrid subscriptions plus consumables** (Perplexity credit packs, Answer.AI 50-credit pack ₹199, Parakeet credit packs with bonus credits, LockedIn credits, Fireflies AI credits, Raycast credits). Credits suit bursty usage such as exam season and interview loops.
5. **Weekly plans** (Parakeet ₹4,980/wk, Answer.AI ₹299/wk, Turbo $9.99/wk). Common in AI education apps for impulse buys near deadlines. Weekly plans churn heavily and feel predatory if they auto-renew.
6. **Lifetime deals** (Interview Coder $799, LockedIn $999.50, NeetCode $297, Superwhisper "Top choice"). Students like them because they hate subscriptions, but they are dangerous for a product with per-use API costs. If offered, cap them (e.g., "lifetime BYOK features plus a monthly Cloud allowance").
7. **Fake-discount anchors and urgency** (LockedIn 50% off plus countdown, AlgoExpert flash sale, NeetCode strikethroughs, Final Round "Save up to 40%", NoteGPT "Limited Time"). This is common in interview-prep products. It works on the impulse buyer but erodes trust, and Shadow's open-source audience will spot it.
8. **India localization** (Parakeet ₹ + UPI + PhonePe + "No. 1 Viral App in India"; Brainly "NCERT, CBSE" naming and ₹199; Cursor Start ₹649 via UPI; ChatGPT and Gemini at ₹399; Claude in ₹ but no UPI). **UPI is now table stakes**, and Claude is criticized for lacking it.
9. **Student programs as acquisition:**
   - Free: Wispr ("Students get Wispr Flow free!"), Granola (12 months free plus 5 referrals), Copilot Student, Google AI Plus for a year.
   - Discounts: Raycast 50%, Superwhisper 40%, Notta 50%, Otter 20%, Screenpipe 50% of the first month.
   - Cursor ended its free student year in Jun 2026.
   - **Verification** uses SheerID (Google), GitHub Education, student ID upload (Granola), or .edu email (Otter). An Indian college email domain or ID-card upload would be the equivalent.
10. **Free years that convert to auto-renew** (ChatGPT Go, Google AI Plus, Airtel/Perplexity, Jio). These were huge acquisition plays, and the expiry wave causes visible "surprise charge" stories in India in 2026.

### 3.2 Price points students actually pay
- **India, student-relevant (₹/month):**
  - **₹199**: Brainly Plus, Question.AI low SKU, Google AI Plus intro.
  - **₹299/week**: Answer.AI.
  - **₹399**: ChatGPT Go, Google AI Plus.
  - **₹449–₹999**: Photomath, Mathway, Quizlet ₹699.
  - **₹649**: Cursor Start.
  - **₹1,999**: ChatGPT Plus, Perplexity Pro.
  - Yearly study plans land around **₹1,499–₹3,849** (Brainly, Mathway ₹3,349, Quizlet ₹2,999).
- **Global student apps:** a median of **$9.99/mo and $44.99/yr in Education** (RevenueCat 2026). Education has the highest annual price of any category.
- **What students resist:** $15–$20/mo USD tools without a student price; a widely cited dev.to essay calls the flat $20 a "luxury tax" for emerging markets. Interview-copilot prices ($55–$299/mo) are bought only by job seekers in crisis.
- **Implied Shadow ceiling (India):**
  - It must sit clearly **under ₹399/mo**, because ChatGPT Go and Google AI Plus cost that and many students got them free.
  - **₹99–₹199 for a monthly pass, or ₹49–₹149 top-up packs**, is the realistic impulse band.
  - A ₹299 tier is defensible only if lecture mode (Deepgram minutes) is included.
- Global (non-India) users: **$4.99–$7.99/mo** sits under the $9.99 education median and well under Cluely's $19.99.

### 3.3 Upgrade triggers that seem to work
- **Cap hit with soft-degrade, not a hard wall** (Wispr): warn → slow → block, never interrupt work in progress, prompt at most once a day. Wispr also gives *bonus* allowance the first time the cap is hit (an 8,000-word surprise), so the first paywall moment builds goodwill.
- **Reverse trial** (Highlight: Free starts with 14 days of Pro; Cursor: 14-day Pro then Hobby; Raycast: 7-day trial credits). Users feel the loss when Pro features go away. Combined with a countdown card ("Trial ends in N days") and "You won't be charged until the trial ends" copy, it reduces anxiety.
- **Trial length:** RevenueCat finds longer trials (17–32 days) convert far better than short ones (42.5% vs 25.5%). Education apps cluster at 5–9 days, and **55% of 3-day-trial cancellations happen on Day 0**. For Shadow, a reverse trial covering a student's next exam or assignment cycle (14 days) is better than 3 days.
- **High-stakes moment framing:** Final Round asks "What's your next interview worth?" and Parakeet says "Get the right answer while you're still talking." The student equivalent anchors on the exam or the placement drive.
- **Social proof in the paywall:** user counts ("1.5M+", "10M+"), star ratings, company-logo walls, offer-letter testimonials (NeetCode), and "No. 1 Viral App in India" (Parakeet).
- **Risk reversal copy:** "No credit card required", "No lock-in. Cancel anytime" (Parakeet), "You never need a credit card to start" (Wispr), "Auto-renew off by default" (NeetCode), "30-day refund" (Superwhisper).
- **Hard paywalls convert 5x better at the top** (10.7% vs 2.1%), but those are mostly consumer mobile apps with paid UA. Shadow is open-source and BYOK-free, so a hard paywall is off the table. The lesson is to **show the paywall early in a non-blocking way** (onboarding choice: "Use Shadow Cloud, no key needed" vs "Bring your own key"), because most hard-paywall conversions happen at Day 0 to Day 7.

### 3.4 What users hate (by evidence)
1. **Paywalls and limits:** 16% of 791 negative homework-app reviews ([Ask Poppy, Oct 2026](https://learn.askpoppy.ai/research/homework-app-reviews-2026/); author is a competitor, method disclosed). The worst cases are *taking away* free features (Quizlet, Brainly going to a weekly cap) and gating steps.
2. **Billing traps:**
   - Trials converting to annual plans.
   - "Charged a full year. Never used the app. No refund" (Brainly).
   - A price displayed on the "free trial" item (Gauth).
   - Cluely's "monthly trial defaulting to annual" (01-cluely).
   - Free promos that later charge a saved card (Airtel/Perplexity, ChatGPT Go expiries).
3. **No-refund policies:** Interview Coder (all purchases), LockedIn (monthly/quarterly "once started"), Pluely ("Purchases are final"), LeetCode, Parakeet (void once any credit is used, with "one refund per person" reported). Badges like "Money-back guarantee" that the policy contradicts (LockedIn, Final Round) are worse than having no badge.
4. **Credit opacity and loss:**
   - Credits burned by bugs and freezes (Parakeet).
   - Credits that expire mid-session.
   - Undisclosed credit cost per question (StudyX).
   - Silent changes to what a plan buys (Cursor 2025, which ended in apology and refunds).
   - "Unlimited" plans with hidden caps (LockedIn's 2-hour session cap; TurboScribe's alleged 720 h).
5. **Ads in study flows** (Quizlet: "Too many interruptions from adverts").
6. **Aggressive fake discounts and countdowns**: common in interview-prep products, and they invite suspicion.

### 3.5 Free alternatives Indian students already have (the WTP ceiling)

| Free option | What it gives | Status (Nov 2026) |
|---|---|---|
| Google AI Plus student offer | 1 yr of Gemini at AI Plus level, 2x limits, 400 GB | Redeem until **Dec 31 2026**; auto-renews after |
| Jio + Google AI Pro | 18 mo of AI Pro (₹35,100 value) with Jio 5G ₹349+ | Live as of Feb 2026; current status unverified |
| ChatGPT Go free year | Go-level ChatGPT for 12 months | Claims closed around Jan 2026; **expiring Nov 2026 to Jan 2027 → ₹399 auto-charge** |
| Perplexity Pro via Airtel | 12 mo of Pro | Claims closed Jan 2026; expirations since Jul 2026 |
| OpenAI Learning Accelerator | About 500k ChatGPT licences for AICTE college students and teachers | Launched Aug 2025; extension status unknown |
| GitHub Copilot Student | Free Copilot in the IDE (Auto mode for premium models) | Active, with reduced model choice |
| Gemini app and API free tier | Free chat and free API keys (Shadow's BYOK path) | Active; the free tier keeps shrinking |
| Google Lens homework | Ex-Socratic photo homework help | Free |
| Wispr Flow students | Free Pro for verified students | Active |
| Granola students | 12 mo of Business | **US, UK, CA only** |

**Takeaway:**
- Shadow cannot win on "access to a smart model". Students have free Gemini or ChatGPT, and many have them at a paid tier.
- **Shadow wins on friction and context:**
  - One hotkey on whatever is on screen, with no tab switch or copy-paste.
  - It **hears the lecture** (system audio plus mic).
  - Structured DSA output (approach → code → complexity → dry run).
  - Hinglish explanations.
  - Always-on-top while you code or watch.
- And the paid tier sells **"no API key setup, no rate-limit errors, lecture minutes included"**.
- Timing: **Nov 2026 to Jan 2027 is when free ChatGPT Go years expire and Google's student redemption window closes.** Students are actively re-evaluating AI spend.

---

## 4. Competitive gap Shadow's paid tier can exploit

1. **Price gap on desktop overlays.**
   - Every desktop overlay with screen and audio costs **$15–$299/mo** and is sold on stealth, with heavy no-refund terms.
   - There is no honest, cheap, student-priced overlay.
   - Shadow Cloud at **₹149–₹249/mo (≈$1.7–$2.8)**, or a global $4.99, is 4–60x cheaper and openly visible ("your college can see it, and that's fine").
2. **Desktop gap in homework AI.**
   - Gauth, Photomath, Brainly, Question.AI and Answer.AI are phone-camera-first.
   - Indian CS students do DSA, assignments and lecture videos on a laptop. A laptop overlay that reads the screen and hears the video has no direct study-app competitor at this price.
3. **Lecture-mode gap.**
   - Otter (30-minute cap), Notta (3 minutes), Turbo (≈2 h/mo, $9.99/week) and Granola (US/UK/CA student offer) are either stingy or not India-focused.
   - None **auto-explain the questions they hear** in Hinglish.
   - A "lecture hours" allowance is a clear, countable paid unit ("10 lecture hours/month").
4. **Trust gap.** The category is full of no-refund, auto-renew and credit-burn complaints. Shadow can put trust in the paywall itself:
   - **UPI one-time packs with no auto-renew**, or autopay as opt-in.
   - "Unused solves roll over". "Credits never burn on errors: if the AI fails, you're not charged".
   - "The answer you're reading always finishes".
   - A 7-day no-questions refund.
   - BYOK stays free forever (it's MIT, and that gets said out loud).
5. **"Fair free" gap.** Students hate features being taken away (Quizlet, Brainly). Shadow can promise up front that **BYOK mode stays fully free and the explanation is never gated**. The free Cloud allowance (e.g., N solves a day) is the only thing that's metered.
6. **Distribution mechanics worth copying:**
   - Granola: refer 5 classmates, each gets the plan.
   - Pluely: a free licence for a public post with 5k+ impressions.
   - NoteGPT: a group plan for 3+ people at about 70% off.
   - Wispr: a student-verified free card in place of the upgrade prompt.
   - India-specific: hostel and friend-group packs, college-ambassador codes, and an exam-season "Semester Pass".

**Suggested shape to test (input for paywall design, not a decision):**
- Free (BYOK, unlimited) plus a Free Cloud taste (e.g., 5 solves/day plus 30 lecture-minutes/week, with a reverse trial of 14 days of full Cloud at first launch).
- Cloud Monthly ₹149–₹199 via UPI.
- Exam/Semester Pass ₹499–₹699 for 4 months, no auto-renew.
- Top-up packs ₹49 / ₹99.
- Global $4.99/mo.
- Prompt rules taken from Wispr: warn at 80%, never cut mid-answer, at most once a day, and a one-time bonus the first time the cap is hit.

---

## 5. Data gaps and caveats
- Most homework-app prices come from App Store India listings without billing periods, or from third-party SEO blogs that conflict with each other. Treat USD figures as ±$2.
- Competitor-authored sources are used for LockedIn, Final Round, Parakeet, Interview Coder and Cluely refund details (OphyAI, Final Round, InterviewPal, PracHub, AceRound), as well as Ask Poppy and Transkriptor. The facts used are ones the vendor's own pages or docs corroborate where possible.
- No public conversion rates were found for any named product. The benchmarks are RevenueCat's cross-app medians, and no India- or education-specific trial-to-paid rate was published in what was accessible.
- No good survey of Indian students' willingness to pay for AI in rupees was found. The ceiling is inferred from market prices and free offers.
- Not found: in-app paywall screenshots for Gauth, Photomath and Question.AI. The pricing-page copy and Wispr's documented in-app copy are the best primary evidence of paywall wording.

---

## 6. Sources

**Official pages and docs (fetched 2026-11-10)**
- Cluely pricing: https://cluely.com/pricing
- LockedIn AI pricing: https://www.lockedinai.com/pricing
- Final Round AI pricing: https://www.finalroundai.com/pricing
- Parakeet AI pricing (rendered in ₹): https://www.parakeet-ai.com/pricing
- Pluely pricing: https://pluely.com/pricing
- Raycast pricing: https://www.raycast.com/pricing
- Granola pricing: https://www.granola.ai/pricing
- Granola students: https://www.granola.ai/students
- Wispr Flow pricing: https://wisprflow.ai/pricing
- Wispr Flow free-tier cap doc: https://docs.wisprflow.ai/articles/4760791189
- Wispr Flow trial-end doc: https://docs.wisprflow.ai/articles/7140488640-trial-end-value-summary-in-wispr-flow
- Superwhisper homepage: https://superwhisper.com
- Highlight AI pricing: https://highlightai.com/pricing
- Screenpipe pricing: https://screenpipe.com/pricing
- NoteGPT pricing: https://notegpt.io/pricing
- Cursor pricing: https://cursor.com/pricing
- Windsurf, now Devin: https://devin.ai/pricing
- Replit pricing: https://replit.com/pricing
- GitHub Copilot plans: https://github.com/features/copilot/plans
- GitHub free Copilot docs: https://docs.github.com/en/copilot/how-tos/manage-your-account/get-free-access-to-copilot-pro
- NeetCode Pro: https://neetcode.io/pro
- Claude pricing: https://claude.com/pricing
- Otter pricing: https://otter.ai/pricing
- Notta pricing: https://www.notta.ai/en/pricing
- Fireflies pricing (no numbers rendered): https://fireflies.ai/pricing
- Google India student offer: https://blog.google/intl/en-in/products/start-the-academic-year-with-one-year-of-gemini-on-us/

**App Store India listings (₹ in-app purchases, fetched 2026-11-10)**
- ChatGPT: https://apps.apple.com/in/app/id6448311069
- Perplexity: https://apps.apple.com/in/app/id1668000334
- Photomath: https://apps.apple.com/in/app/photomath/id919087726
- Mathway: https://apps.apple.com/in/app/id467329677
- Quizlet: https://apps.apple.com/in/app/id546473125
- Question.AI: https://apps.apple.com/in/app/id6449486871
- Answer.AI: https://apps.apple.com/in/app/id6446047896
- Brainly (via search snippet): https://apps.apple.com/in/app/id745089947
- 404 in the India store: Gauth `id1542571008`, Knowunity `id1484296272`

**Benchmarks and complaint data**
- RevenueCat SOSA 2026, Education: https://www.revenuecat.com/state-of-subscription-apps-2026-education
- RevenueCat 2026 trends: https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026
- Ask Poppy, 791 homework-app complaints (Oct 2026): https://learn.askpoppy.ai/research/homework-app-reviews-2026/
- OphyAI interview copilot pricing and refund comparison (Sep 2026, competitor): https://ophyai.com/blog/career-advice/ai-interview-copilot-pricing-comparison
- OphyAI LockedIn review (competitor): https://ophyai.com/blog/career-advice/lockedin-ai-review
- Parakeet complaints (support board):
  - https://parakeetai.featurebase.app/p/desktop-app-freezes-and-cost-me-an-extra-05-credit
  - https://parakeetai.featurebase.app/p/issue-with-credit-deduction-after-session-end
- Parakeet refund refusal: https://www.finalroundai.com/community/t/parakeet-ai-7-day-refund-window-disappears-the-moment-you-use-any-credits-at-all/441
- Cursor 2025 pricing apology: https://forum.cursor.com/t/clarifying-cursor-pro-pricing/113803 ; https://techbriefly.com/2025/07/08/cursor-ai-coding-tool-apologizes-for-pricing-changes/
- Highlight price change (PricingSaaS): https://pricingsaas.com/companies/highlightai/diffs/2026W44
- Granola history lock: https://hedy.ai/post/granola-redesign-alternative-hedy/

**India market and promos**
- Cursor Start India (TechCrunch, Jul 27 2026): https://techcrunch.com/2026/07/27/cursor-makes-its-biggest-india-push-yet-ahead-of-spacex-acquisition-with-localized-pricing/
- Cursor and X Subscription: https://pricingsaas.com/news/article/cursor-rebuilds-its-pricing-around-grok-and-x-with-plans-from-8-to-200
- Claude India pricing (Jul 2026): https://www.businesstoday.in/technology/news/story/anthropic-introduces-india-pricing-for-claude-ai-plans-pricing-starts-at-542742-2026-07-14
- ChatGPT Go free year (launch): https://www.businesstoday.in/technology/news/story/chatgpt-go-free-for-indians-openai-extends-new-offer-for-one-year-starting-nov-4-check-details-499828-2025-10-28
- ChatGPT Go free year ending: https://bestai.in/guides/chatgpt-go-free-year-ending ; https://www.technicaladda.in/chatgpt-go-free-india/
- Google AI Plus India launch: https://techcrunch.com/2025/12/10/google-launches-sub-5-ai-plus-plan-in-india-to-compete-with-chatgpt-go
- Jio + Google AI Pro: https://analyticsindiamag.com/ai-news-updates/reliance-jio-expands-free-google-ai-pro-access-to-users-of-all-ages
- Airtel Perplexity end: https://telecomtalk.info/airtels-perplexity-pro-ends-existing-12month-access/1004521/ ; https://www.perplexity.ai/help-center/en/articles/11842322-perplexity-pro-airtel-promo
- Airtel card-on-file backlash: https://www.businesstoday.in/technology/news/story/from-free-for-a-year-to-card-on-file-how-airtel-and-perplexitys-ai-bundle-is-testing-consumer-trust-510521-2026-01-12
- OpenAI Learning Accelerator: https://www.digit.in/news/general/openai-to-give-5-lakh-free-chatgpt-plus-accounts-to-students-and-teachers-in-india.html
- Copilot Student changes (Mar 2026): https://github.com/orgs/community/discussions/189268
- UPI AutoPay ₹15,000 no-OTP limit: https://support.google.com/pay/india/answer/10452280?hl=en

**Third-party pricing references (dated in text)**
- LockedIn: https://jobright.ai/blog/lockedin-ai-pricing/
- Final Round: https://ophyai.com/blog/career-advice/final-round-ai-pricing
- Cluely: https://ophyai.com/blog/career-advice/cluely-pricing
- Superwhisper: https://www.getvoibe.com/resources/superwhisper-pricing/
- Wispr: https://www.getvoibe.com/resources/wispr-flow-pricing.md
- Gauth: https://nibble-app.com/blog/gauth-app
- Photomath: https://www.myengineeringbuddy.com/blog/photomath-reviews-alternatives-pricing-offerings/
- Brainly: https://www.fast.io/resources/brainly-ai-review-2026.md
- Chegg: https://www.toolsurf.com/chegg-prices-2026/
- Quizlet: https://www.myengineeringbuddy.com/blog/quizlet-reviews-alternatives-pricing-offerings/
- StudyX: https://myengineeringbuddy.com/blog/studyx-online-tutoring-review-features-pricing-and-alternatives/
- Question.AI: https://flowith.io/blog/question-ai-free-vs-pro-subscription-worth-finals
- Knowunity: https://apkpure.com/news/is-knowunity-free-pricing-explained
- Mathway: https://aisotools.com/blog/mathway-review-2026
- Turbo AI: https://plisio.net/ai/turbo
- Socratic: https://en.wikipedia.org/wiki/Socratic_(Google)
- LeetCode: https://prachub.com/resources/leetcode-pricing
- AlgoExpert: https://www.lodely.com/blog/algoexpert-pricing
- Cursor students: https://dupple.com/learn/how-to-get-cursor-pro-for-free
- Cursor usage docs: https://docs.cursor.com/get-started/usage
- Fireflies: https://dupple.com/learn/fireflies-ai-pricing
- TurboScribe: https://convertaudiototext.com/pricing-comparison/turboscribe
- Interview Coder: https://ophyai.com/blog/career-advice/interview-coder-alternative
- Emerging-market "$20 luxury tax" essay: https://dev.to/subprime2010/ai-accessibility-in-emerging-markets-why-20month-is-a-luxury-tax-2k35
