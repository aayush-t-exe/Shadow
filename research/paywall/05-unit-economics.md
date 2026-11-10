# 05 - Shadow Cloud unit economics: what each user costs, and which prices are safe

Researched 2026-11-10. Prices come from the live pricing pages listed in section 2. Token counts were measured from the real prompts in `src/main/ai/prompts.ts`; everything else is estimated from the code paths in `src/main/session.ts`, `src/main/ai/race.ts`, `src/main/live/*` and `src/main/screenshots.ts`. The model script is reproducible: every number below comes from one parameter set (section 0).

**The answer in four lines**

1. **Solve is cheap. A typical solve costs about ₹0.43**: $0.0045 on `gemini-3.5-flash-lite`. **85-90% of that is output and thinking tokens, not screenshots.**
2. **Listen is expensive. A typical hour costs about ₹96** ($1.01). **91% of that is Deepgram Flux**, because Shadow streams two channels without a break, silence included.
3. So the "regular" persona (10 solves/day plus 2 h Listen/week) costs **about ₹987/month**, and **no ₹99-₹399 plan can carry them** unless Listen is capped hard or the speech-to-text is replaced.
4. Every plan needs **(a) answer and Listen-minute quotas, (b) a server-side rupee cost ceiling per user, and (c) no Listen without a cap.** One user who leaves Listen on 24/7 costs **about ₹1,00,000/month**.

---

## 0. Assumptions (every number depends on these)

| # | Assumption | Value | Why / source |
|---|---|---|---|
| A1 | USD→INR | **₹95** (sensitivity ₹92-98 changes every ₹ figure by about ±3%) | No reliable Nov-2026 spot rate was found. The last dated close was ₹95.46 (25 Aug 2026, [hdfcsky](https://hdfcsky.com/news/rupee-rises-24-paise-to-close-at-95-46-against-us-dollar)). Forecasts for Nov 2026 run 95.5-97.8 ([30rates](https://30rates.com/usd-to-inr-converter-forecast-dollar-to-rupee), [longforecast](https://longforecast.com/usd-to-inr-forecast-2017-2018-2019-2020-2021-indian-rupee)). **Check XE or the RBI reference rate before you publish prices.** |
| A2 | Tokens ≈ chars ÷ 3.5 | Measured: solve prompt 3,011 chars ≈ **860 tok**, debug ≈ 675, live ≈ 793, triage ≈ 530, follow-up ≈ 95 | Measured by running the prompt builders (Python, concise). Gemini's tokenizer differs a little; ±15% on input changes the totals by only ±2%. |
| A3 | Image tokens | **1,120 per screenshot**, regardless of pixel size | Gemini 3 `media_resolution` default ("unspecified" = high) = 1,120 tok ([media-resolution docs](https://aistudio.google.com/docs/media-resolution)). The older tile rule (258 tok per 768² tile) would give 1,548 tok for a 1920×1080 or 2560×1440 screenshot, which is +₹0.012 per shot. That doesn't matter. |
| A4 | Screenshots per solve | Typical 1.5, max 4 (`MAX_SCREENSHOTS = 4`) | `session.ts` |
| A5 | **Solve output incl. thinking** | **Typical 1,500** (about 900 visible + 600 thinking). Hard 3,500. Hard ceiling 8,192 (`maxOutputTokens`) | **Not measured. This is the biggest uncertainty** (see section 7). Shadow sets `thinkingLevel: 'low'` for solve/debug/follow-up, but the model's own default is `minimal` ([thinking docs](https://aistudio.google.com/docs/thinking)), so Shadow asks for *more* thinking than the default. Thinking is billed as output, and `maxOutputTokens` includes thinking. |
| A6 | Follow-up | Input about 2,000 (prompt + text-only history), output 600 | History holds the last answer's text plus earlier turns, about +430 tok per turn |
| A7 | Debug | Input 3,620 (675 prompt + about 1,245 history + 1.5 shots), output 1,800 | Full corrected code is re-emitted |
| A8 | Live answer | Input 793 prompt + about 900 transcript (25 turns / 10k chars max) + 30 + **history growing about 300 tok per answer**. Output 300 | `ask()` passes `context = history` for live mode, and every live Q&A is appended until the user resets the session |
| A9 | Classifier (triage) | Input about 1,020 (530 prompt + about 60 schema + 8 turns + answered list), output 100 (cap 300). **2 calls/min typical, 5/min heavy** | Triggered on every finished turn from *either* speaker (`answerFrom` default `'anyone'`) that passes the loose `looksLikeQuestion` regex (any "?", or a turn starting with is/do/can/what…). It's blocked only for 6 s after an auto-answer. |
| A10 | Auto-answers per Listen hour | Typical 12, heavy 40 | Estimate. A viva or class with questions, versus rapid-fire Q&A |
| A11 | Listen STT | **2 streams × 60 min = 120 billed stream-minutes per hour.** Audio is sent the whole time, silence included | `listen.ts` opens `mic` + `system` sockets. The renderer `pushAudio`s every 80 ms frame (no VAD gating). Deepgram bills per second of audio processed ([pricing](https://deepgram.com/pricing)). |
| A12 | Backup race | **Off by default** (`backupModel: null`). If on: it fires when there's no first token within 5 s | `settings.ts`, `race.ts`, `HEDGE_AFTER_MS = 5000` |
| A13 | GST | Indian prices are **GST-inclusive. Net = price ÷ 1.18** (conservative: assumes you're GST-registered). The payment gateway's fee also carries 18% GST | The task's instruction. Below ₹20 lakh/yr turnover you may not need to register; then ₹ net is about 18% higher. Confirm with a CA. |
| A14 | Month | 30 days. "2 h/week" = 8.57 h/month | |

---

## 1. Prices used (Nov 2026, with sources)

### LLM (per 1M tokens, paid Standard tier)

| Model | Input | Output (incl. thinking) | Cached input | Note | Source |
|---|---:|---:|---:|---|---|
| **gemini-3.5-flash-lite** (Shadow default) | **$0.30** | **$2.50** | $0.03 | Batch is half price, but useless for streaming | [AI Studio pricing](https://aistudio.google.com/docs/pricing) |
| gemini-3.1-flash-lite | $0.25 | **$1.50** | $0.025 | **40% cheaper output.** The best "free-tier model" candidate | same |
| gemini-3-flash-preview | $0.50 | $3.00 | $0.05 | | same |
| gemini-3.8-flash / 3.6-flash | $0.75 → **$1.50 from 1 Jan 2027** | $3.75 → **$7.50 from 1 Jan 2027** | | Don't make it a paid-tier default: the price doubles in 7 weeks | same |
| Groq `qwen/qwen3.8-27b` (vision, preview) | $0.80 | $4.00 | | *More* expensive than Flash-Lite | [Groq models](https://console.groq.com/docs/models) |
| Groq `openai/gpt-oss-20b` (text only) | $0.075 | $0.30 | | Needs a separate vision transcription pass (`EXTRACT_PROMPT`) | same |
| OpenRouter `google/gemini-3.5-flash-lite` | $0.30 (lowest listed $0.15) | $2.50 (lowest $1.25) | | "No markup", but OpenRouter adds its own credit-purchase fee. The $0.15/$1.25 row looks like a batch/flex route. **No saving over going direct.** | [OpenRouter](https://openrouter.ai/google/gemini-3.5-flash-lite) |

Implicit caching is on by default, but the listed minimums are 4,096 tokens for 3.x Flash (Flash-Lite isn't listed) ([caching docs](https://aistudio.google.com/docs/caching)). Shadow's solve prompt is about 860 tokens, so **prompt caching will almost never trigger and isn't a lever** (section 6).

### Speech-to-text (per audio minute, per stream)

| Option | Price | Streaming + turn detection? | Source |
|---|---:|---|---|
| **Deepgram Flux English, Pay-as-you-go** | **$0.0077** | Yes (what Shadow uses) | [deepgram.com/pricing](https://deepgram.com/pricing) |
| Deepgram Flux English, Growth plan | $0.0065 | Yes. The Growth plan needs a prepaid commitment (see the page) | same |
| Deepgram Flux Multilingual (`sttLanguage: 'multi'`) | $0.0078 PAYG | Yes | same |
| Deepgram Nova-3 mono / multi | $0.0077 / $0.0092 PAYG | Streaming, endpointing only | same |
| Deepgram Flux via Cloudflare Workers AI | $0.0077 | Yes | [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) |
| **Deepgram Nova-3 via Cloudflare Workers AI** | **$0.0052** | Streaming, no Flux turn events | same |
| Groq `whisper-large-v3-turbo` | $0.04/h = $0.00067 | **No, batch only.** 10 s minimum per request | [Groq models](https://console.groq.com/docs/models) |
| Workers AI `whisper-large-v3-turbo` | $0.0005 | Batch | [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) |

> ⚠ `src/main/live/credit.ts` hard-codes **$0.0065**, which is the *Growth* price. On pay-as-you-go it's **$0.0077, 18% higher**. Use $0.0077 for Cloud planning.

### Cloudflare (Workers Paid)

$5/month includes 10M requests and 30M CPU-ms. Overage is $0.30/M requests and $0.02/M CPU-ms. **Egress is free.** WebSocket messages through a plain Worker aren't billed as requests (only the upgrade is). D1: 25B rows read and 50M rows written are included. KV: 10M reads and 1M writes are included. Durable Objects bill wall-clock duration while a WebSocket is `accept()`ed: 400k GB-s included, then $12.50/M GB-s ([Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)).

**Per user that's effectively ₹0.** A solve is 1 request and a few CPU-ms. A Listen hour proxied through a plain Worker is 1 upgrade plus about 90k forwarded frames (25 frames/s × 3,600), and at about 0.1 CPU-ms each that's about 9k CPU-ms, or $0.0002. If the proxy is a Durable Object (128 MB): 460 GB-s per hour, about $0.006/h after the free 868 h/month. **The only Cloudflare cost is the fixed ₹475/month (US$5).**

### Payments

| Rail | Fee | Source |
|---|---|---|
| Razorpay domestic (cards, UPI, netbanking) | 2% + 18% GST on the fee = **2.36%** | [razorpay.com/pricing](https://razorpay.com/pricing/) |
| Razorpay Subscriptions (cards) | 0.9% + 2% = 2.9% + GST = **3.42%**. UPI Autopay is "on request" (assumed the same) | same |
| Razorpay international cards | Up to 3% + GST = **3.54%** | same |
| Dodo Payments (MoR), India INR | **4% + 15¢ (₹14.25)** + 0.5% subscription | [dodopayments.com/pricing](https://dodopayments.com/pricing) |
| Dodo Payments (MoR), international | 4% + 40¢ + 1.5% intl + 0.5% subscription = **6% + $0.40**. Payout: $5 if under $1,000; $25 SWIFT | same |
| Lemon Squeezy (MoR) | 5% + 50¢ + 1.5% intl + 0.5% subscription = **7% + $0.50**, + 1% payout outside the US | [fees doc](https://docs.lemonsqueezy.com/help/getting-started/fees) |
| Paddle (MoR) | **5% + 50¢** (custom pricing for products under $10) | [paddle.com/pricing](https://www.paddle.com/pricing) |

---

## 2. Net revenue per sale (after GST and fees)

Formula (Razorpay subscription): `net = P/1.18 − P × 0.029 × 1.18 = 0.8133·P`. Razorpay one-time: `0.8239·P`. MoR on INR: `P/1.18 − (pct·P + fixed × ₹95)`.

| Gross price | Razorpay sub net | Razorpay one-time net | Dodo (INR, sub) net | Lemon Squeezy net | Paddle net |
|---|---:|---:|---:|---:|---:|
| ₹49 | ₹39.9 | ₹40.4 | ₹25.1 | **−₹9.4** | **−₹8.4** |
| ₹79 | ₹64.3 | ₹65.1 | ₹49.1 | ₹13.9 | ₹15.5 |
| ₹99 | ₹80.5 | ₹81.6 | ₹65.2 | ₹29.5 | ₹31.5 |
| ₹149 | ₹121.2 | ₹122.8 | ₹105.3 | ₹68.3 | ₹71.3 |
| ₹199 | ₹161.8 | ₹164.0 | ₹145.4 | ₹107.2 | ₹111.2 |
| ₹299 | ₹243.2 | ₹246.3 | ₹225.7 | ₹185.0 | ₹190.9 |
| ₹399 | ₹324.5 | ₹328.7 | ₹305.9 | ₹262.7 | ₹270.7 |

| USD price (international, tax-exclusive) | Razorpay intl net | Dodo net | Lemon Squeezy net | Paddle net |
|---|---:|---:|---:|---:|
| $5 | $4.82 | $4.30 | $4.11 | $4.25 |
| $8 | $7.72 | $7.12 | $6.87 | $7.10 |
| $10 | $9.65 | $9.00 | $8.71 | $9.00 |

**Takeaway:** for **INR prices under ₹200, only Razorpay is viable.** The fixed 50¢ fee at Lemon Squeezy and Paddle eats 30-70% of a ₹99 sale. Use a merchant of record only for USD sales, where its tax handling is worth about 1 percentage point more than Razorpay international.

---

## 3. Cost per action (gemini-3.5-flash-lite, ₹95/$)

`cost = input_tok × $0.30/1M + output_tok × $2.50/1M`

| Action | Input tok | Output tok | $ | **₹** | ₹ on 3.1 Flash-Lite |
|---|---:|---:|---:|---:|---:|
| Solve, light (1 shot, 1,000 out) | 1,995 | 1,000 | 0.00310 | 0.29 | 0.19 |
| **Solve, typical** (1.5 shots: 860 + 15 + 1,680) | 2,555 | 1,500 | 0.00452 | **0.43** | 0.27 |
| Solve, hard (4 shots, 3,500 out) | 5,355 | 3,500 | 0.01036 | 0.98 | 0.63 |
| Solve, worst case if output is capped at 4,096 | 5,355 | 4,096 | 0.01185 | 1.13 | 0.71 |
| **Solve, worst case today** (4 shots, 8,192 out) | 5,355 | 8,192 | 0.02209 | **2.10** | 1.30 |
| Follow-up, typical | 2,000 | 600 | 0.00210 | 0.20 | 0.13 |
| Follow-up, long thread | 4,125 | 800 | 0.00324 | 0.31 | 0.21 |
| Debug, typical | 3,620 | 1,800 | 0.00559 | 0.53 | 0.34 |
| Live answer, typical | 3,373 | 300 | 0.00176 | 0.17 | 0.12 |
| Live answer, heavy (long transcript + history) | 8,673 | 350 | 0.00348 | 0.33 | 0.26 |
| Classifier call, typical | 1,020 | 100 | 0.00056 | 0.053 | 0.038 |
| Classifier call, heavy | 1,970 | 150 | 0.00097 | 0.092 | 0.068 |

**Where a typical solve's ₹0.43 goes:** output and thinking ₹0.356 (83%), screenshots ₹0.048 (11%), prompt ₹0.025 (6%).

**Sensitivity to output tokens (the unmeasured number):**

| Solve output tok | 800 | 1,000 | **1,500** | 2,500 | 3,500 |
|---|---:|---:|---:|---:|---:|
| ₹ per solve | 0.26 | 0.31 | **0.43** | 0.67 | 0.90 |
| Image share of cost | 18% | 15% | 11% | 7% | 5% |

### Listen hour (two Flux streams)

| Listen hour scenario | STT $ | Classifier $ | Answers $ | **Total $** | **₹/hour** | ₹/min |
|---|---:|---:|---:|---:|---:|---:|
| **Typical** (Flux PAYG, 120 triage, 12 answers) | 0.924 | 0.067 | 0.021 | **1.012** | **96** | 1.60 |
| Heavy (300 triage, 40 answers, history growth) | 0.924 | 0.290 | 0.139 | 1.353 | 129 | 2.14 |
| Typical, Hinglish (`flux-general-multi`) | 0.936 | 0.067 | 0.021 | 1.024 | 97 | 1.62 |
| Typical, Flux on the Growth plan | 0.780 | 0.067 | 0.021 | 0.868 | 82 | 1.37 |
| Typical, **one** Flux stream (system audio only) | 0.462 | 0.067 | 0.021 | 0.550 | 52 | 0.87 |
| Typical, Nova-3 via Workers AI | 0.624 | 0.067 | 0.021 | 0.712 | 68 | 1.13 |
| Typical, Groq Whisper turbo (batch, both streams) | 0.080 | 0.067 | 0.021 | 0.168 | 16 | 0.27 |

STT arithmetic: 2 streams × 60 min × $0.0077 = $0.924. Classifier: 120 × $0.00056. Answers: 12 answers, input = 12 × 1,723 + 300 × (0+1+…+11) = 40,476 tok, output 3,600 tok.

### Backup race (`race.ts`)

- **Today: zero duplication**, because `backupModel` defaults to `null`.
- If Cloud enables a backup: when the primary sends no token within 5 s, the backup is billed for full input, and the loser is aborted after it has already billed its input plus whatever thinking it did. At about 1,000 wasted thinking tokens plus a second input, a hedged solve costs about +72%. **Expected overhead: +3.6% at a 5% hedge rate, +7% at 10%, +22% at 30%** (a bad Google day). Worst case is about 2× on hedged requests.
- **Hidden second effect:** the classifier always runs on the backup model when one is set (`classifierModel()` in `autoAnswer.ts`). With Groq qwen3.8-27b as the backup, each classifier call costs $0.00122 instead of $0.00056 (2.2×), which adds about ₹7.5 per Listen hour.
- `maxRetries: 2` only retries failed calls (429/5xx), and failed calls aren't billed, so it adds no cost.

---

## 4. Personas: monthly cost (uncapped, today's code paths)

| Persona | Solves | Follow-ups | Debugs | Listen h | Solve side ₹ | Listen ₹ | **Total ₹/month** | $ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Light (3 solves/day) | 90 | 30 | 0 | 0 | 45 | 0 | **45** | 0.47 |
| Regular (10/day + 2 h Listen/week) | 300 | 90 | 30 | 8.6 | 163 | 824 | **987** | 10.39 |
| Heavy (30/day + 2 h Listen/day; 20% hard solves) | 900 | 300 | 150 | 60 | 625 | 5,768 | **6,393** | 67.30 |
| Abuser A (100 maxed solves/day + Listen 8 h/day) | 3,000 | 1,500 | 600 | 240 | 7,985 | 30,846 | **38,831** | 409 |
| Abuser B (same, Listen left on 24/7) | 3,000 | 1,500 | 600 | 720 | 7,985 | 92,537 | **1,00,522** | 1,058 |

Regular solve side: 300 × 0.429 + 90 × 0.199 + 30 × 0.531 = ₹163. Listen side: 8.57 h × ₹96.1 = ₹824.

**The same personas if Listen used cheaper STT:**

| Persona | 2× Flux (today) | 1× Flux (system only) | Workers AI Nova-3 | Groq Whisper |
|---|---:|---:|---:|---:|
| Regular | ₹987 | ₹610 | ₹742 | ₹299 |
| Heavy | ₹6,393 | ₹3,760 | ₹4,683 | ₹1,582 |

### Margin per persona on an *uncapped* monthly plan (Razorpay subscription)

| Persona (cost) | ₹99 | ₹149 | ₹199 | ₹299 | ₹399 |
|---|---:|---:|---:|---:|---:|
| Light (₹45) | +₹36 (45%) | +₹77 (63%) | +₹117 (72%) | +₹199 (82%) | +₹280 (86%) |
| Regular (₹987) | −₹906 | −₹865 | −₹825 | −₹743 | −₹662 |
| Heavy (₹6,393) | −₹6,313 | −₹6,272 | −₹6,231 | −₹6,150 | −₹6,069 |
| Abuser (₹38,831+) | lose about ₹38.7k | … | … | … | lose about ₹38.5k |

**Uncapped is impossible at any INR price.** Even with no Listen at all, the regular persona's solve side (₹163) uses up the whole ₹199 net (₹161.8).

---

## 5. Offers that work: quotas, ceilings, margins

Each plan has two numbers:
- **Quota** (what the user sees): answers (solve, debug, follow-up and live answers each count 1) and Listen minutes. Sized so that **a user who uses 100% of the quota at typical cost** still leaves 30-47% margin.
- **Cost ceiling** (hidden, metered in real tokens and minutes on the server): **85% of net revenue.** A user who reaches it is downgraded (to 3.1 Flash-Lite, thinking `minimal`, Listen off) rather than cut off. **This is what makes "never lose money" literally true**, because quotas alone can't: a user who maxes every answer (4 screenshots, 4,096 output) costs ₹1.13 per answer, 2.6× typical.

Unit costs used: typical answer ₹0.429 / worst ₹1.125 (with a 4,096-token output cap). Typical Listen minute ₹1.60. Worst Listen minute ₹2.01 (STT + 6 classifier calls/min, live answers counted against the answer quota).

| Offer | Net ₹ | Quota | Cost at full quota (typical) | **Margin (typical)** | Cost at full quota (worst) | Margin (worst) | Hidden ceiling ₹ | Answers safe even at worst cost |
|---|---:|---|---:|---:|---:|---:|---:|---:|
| **Answer pack ₹49** | 40.4 | 50 answers | 21.5 | **47%** | 56.3 | −39% | 34 | 36 |
| **Listen pack ₹99** | 81.6 | 30 Listen min | 48.1 | **41%** | 60.4 | **+26%** | 69 | (40 min) |
| **Listen pack ₹199** | 164.0 | 60 Listen min | 96.1 | **41%** | 120.8 | **+26%** | 139 | (81 min) |
| Week pass ₹79 | 65.1 | 60 answers + 10 min | 41.8 | 36% | 87.7 | −35% | 55 | 40 |
| **₹99/month** | 80.5 | 100 answers, no Listen | 42.9 | **47%** | 112.5 | −40% | 68 | 72 |
| ₹149/month | 121.2 | 150 answers + 10 min | 80.4 | 34% | 188.9 | −56% | 103 | 90 |
| **₹199/month** | 161.8 | 150 answers + 20 min | 96.4 | **40%** | 209.1 | −29% | 138 | 108 |
| ₹299/month | 243.2 | 250 answers + 30 min | 155.3 | 36% | 341.8 | −41% | 207 | 162 |
| ₹399/month | 324.5 | 300 answers + 60 min | 224.8 | 31% | 458.4 | −41% | 276 | 181 |
| **$5/month** (Dodo) | 408.5 | 400 answers + 60 min | 267.8 | 34% | 571.0 | −40% | 347 | 256 |
| **$8/month** (Dodo) | 676.4 | 600 answers + 120 min | 449.7 | 34% | 916.9 | −36% | 575 | 386 |
| $10/month (Dodo) | 855.0 | 800 answers + 150 min | 583.6 | 32% | 1,202.4 | −41% | 727 | 491 |

**Reading this table:**
- "Worst" margins are negative for every answer-based plan. That's why the hidden ceiling is mandatory, not optional. The Listen packs are the only offers that stay positive at worst case, because a Listen minute's worst/typical ratio is only 1.26×.
- If you want quotas alone (no hidden ceiling) to guarantee no loss, use the "answers safe even at worst cost" column. Example: ₹99/month = 72 answers, not 100.
- **Listen doesn't fit inside cheap INR subscriptions.** 60 minutes costs ₹96, more than the whole net of a ₹99 plan. Sell Listen as **packs at about ₹3.3/min (₹99 for 30 min)** or include only a taster (10-20 min).
- Recommended INR line-up: **₹99/month (100 answers)**, **₹199/month (150 answers + 20 min)**, and **Listen packs ₹99/30 min and ₹199/60 min**. The ₹149 and ₹399 tiers add little: ₹399 has the thinnest margin (31%), and the gap between ₹149 and ₹199 is small.
- **Subscription vs packs:** on Razorpay the fee difference is tiny (3.42% vs 2.36%, about ₹1 on ₹99). Packs have one structural advantage: **prepaid Listen minutes can never run into a loss**, while a subscription renews whether or not usage blew up.

---

## 6. Free tier: cost per signup and break-even conversion

Assumes **every** signup uses 100% of the grant (conservative; real use will be lower, and at 50% use halve the break-even rates). "Cheap" = free users on gemini-3.1-flash-lite, thinking `minimal`, 1,000 output tokens: **₹0.20 per answer**.

| Free grant | Cost per signup |
|---|---:|
| 10 answers (default model) | ₹4.3 |
| 25 answers (default model) | ₹10.7 |
| **25 answers (cheap model)** | **₹5.1** |
| 10 Listen minutes (2× Flux) | ₹16.0 |
| **25 answers cheap + 10 Listen min** | **₹21.1** |
| 50 answers + 30 Listen min (default) | ₹69.5 |

**Break-even conversion rate** = cost per signup ÷ first-month contribution of one payer (contribution = net − cost at full quota, typical). This uses one month only, because churn and paid lifetime are unknown. With an assumed 3-month average life the rates divide by 3, but **that lifetime is an assumption to measure, not a fact.**

| Free grant (₹/signup) | ₹99 (₹37.6 contrib.) | ₹149 (₹40.8) | ₹199 (₹65.4) | ₹299 (₹87.8) | ₹399 (₹99.6) | $8 (₹226.7) |
|---|---:|---:|---:|---:|---:|---:|
| 10 answers (₹4.3) | 11.4% | 10.5% | 6.6% | 4.9% | 4.3% | 1.9% |
| 25 answers default (₹10.7) | 28.5% | 26.3% | 16.4% | 12.2% | 10.8% | 4.7% |
| **25 answers cheap (₹5.1)** | 13.5% | 12.5% | **7.8%** | 5.8% | 5.1% | 2.2% |
| 10 Listen min (₹16.0) | 42.6% | 39.3% | 24.5% | 18.2% | 16.1% | 7.1% |
| 25 cheap + 10 min (₹21.1) | 56.1% | 51.7% | 32.2% | 24.0% | 21.2% | 9.3% |
| 50 answers + 30 min (₹69.5) | 185% | 170% | 106% | 79% | 70% | 30.7% |

**What this means:** free *answers* are affordable. 25 cheap answers need about 8% of signups to convert to ₹199 within one month, or about 2.6% if payers stay three months. Free *Listen minutes* are the expensive part. **Give at most 5-10 Listen minutes, single-stream (system audio only), once per verified account.** A 10-minute free Listen on two Flux streams costs as much as 37 free answers.

Abuse note: grants are per signup, so free accounts are the attack surface. Tie the grant to a verified identity (Google sign-in plus device ID, or phone OTP) or the "cost per signup" turns into "cost per throwaway email".

---

## 7. Cost levers, ranked by rupees saved

| # | Lever | Saves | Code location | Trade-off |
|---|---|---|---|---|
| 1 | **Cap Listen and stop billing silence**: idle auto-stop (e.g. no `EndOfTurn` for 3 min → stop), a hard session cap, and Listen metered by the server proxy | Removes the ₹1 lakh/month tail. A forgotten Listen session is the only unbounded cost | `listen.ts` has no timeout; `listening.ts` sends every frame | None. Users rarely want 3 silent minutes billed |
| 2 | **One STT stream for cheap/free tiers** (system audio only; mic optional) | Listen ₹96 → **₹52/h (−46%)** | `SOURCES = ['mic','system']` | Loses "You" turns, so self-asked questions (`answerFrom: 'anyone'`) stop working |
| 3 | **Cheaper STT**: Workers AI Nova-3 $0.0052 (−32%), or Groq Whisper turbo (−91%, ₹16/h) | Up to −₹80/h | `deepgram.ts` | Nova-3 has no Flux `EagerEndOfTurn`/`EndOfTurn` events that `autoAnswer` relies on. Whisper is batch, adds 1-2 s latency, and needs client VAD chunking (10 s minimum billing per request). **Test quality before switching** |
| 4 | **Server-side `maxOutputTokens` 4,096 (paid) / 2,048 (free)** | Worst-case solve ₹2.10 → ₹1.13 (−46%) | `session.ts` `maxOutputTokens: 8192` | A very long Java answer could get cut off. Concise mode rarely needs more than 2k |
| 5 | **thinkingLevel `minimal` for free users** (it's the model's default; Shadow asks for `low`) | Probably −20-40% per solve (unmeasured) | `speedOptions()` in `providers.ts` | Possibly weaker answers on hard DP/graph problems. Keep `low` for paid |
| 6 | **gemini-3.1-flash-lite for free users** | Solve ₹0.43 → ₹0.27 (−36%). Combined with 5: about ₹0.20 | `PROVIDERS` default / server model map | Older model; quality check needed |
| 7 | **Trim live-mode history** (keep the last 3 live Q&As, not the whole session) | Heavy Listen hour about −₹6; stops linear growth in long sessions | `ask()` live branch uses `context = history` | Little. The transcript is already re-sent |
| 8 | **Throttle the classifier** (minimum 3 s between calls; skip `'You'` turns unless `answerFrom` needs them) | Classifier ₹6.3 → about ₹3/typical hour; ₹27.5 → about ₹10/heavy hour | `autoAnswer.ts` `consider()` | Rare missed questions |
| 9 | **Backup race off for free users; for paid, hedge at 8 s, not 5 s, and keep the classifier on the primary** | 4-22% of solve cost, depending on hedge rate | `HEDGE_AFTER_MS`, `classifierModel()` | Slower fallback on Google's bad days |
| 10 | Cap screenshot resolution / `media_resolution: medium` | **About ₹0.024/solve (≈5%)**. On Gemini 3, tokens are a fixed 1,120 per image whatever the pixel size | `screenshots.ts` `MAX_WIDTH = 2560`, PNG | **Do it for speed, not cost.** 4 × 2560-px PNGs base64-encoded can approach Gemini's 20 MB inline-request limit. JPEG at about 1,600 px is a latency and reliability win |
| 11 | Prompt caching | About 0. Prompts (≤ 860 tok) are below the 4,096-token implicit-cache minimum | — | Don't spend time on it |

**What all four ✓ levers (1, 2, 4, 6) do together:** the regular persona's Listen cost falls from ₹824 to about ₹446 (single stream), and their solve side from ₹163 to about ₹105 on a downgraded model (300 × 0.274 + 90 × 0.133 + 30 × 0.342). Even then, 2 h/week of Listen can't fit inside ₹199. **Listen must stay a metered add-on unless the STT changes (lever 3).**

---

## 8. CFO read (numbers-truth-teller)

1. **Core metrics.** Computable today: **gross margin per plan at full typical quota: 31-47%** (section 5). Fixed cost is ₹475/month (Workers), so you need **about 13 paying ₹99 users** (₹37.6 contribution each) to cover infrastructure. **Not computable**, with the input needed for each:
   - ARR/MRR and growth: the paying-user count and price mix
   - LTV (lifetime value = monthly contribution × months a payer stays): monthly churn
   - CAC (cost to acquire a payer) and LTV:CAC: marketing spend per signup and free→paid conversion
   - CAC payback: the same two inputs
   - Runway: cash on hand and monthly burn

   Don't fill these with guesses. Measure conversion and churn on the first 100 signups.
2. **The metric that's lying:** **"₹0.43 per answer"** makes Shadow Cloud look cheap. It hides that Listen costs ₹96/hour (₹1.60/min, 3.7 answers' worth every minute), so **for any user who touches Listen, about 75-85% of their cost is Deepgram** (regular: ₹752 of ₹987; heavy: ₹5,267 of ₹6,393), and that's the line item no ₹99-₹399 subscription can absorb. A close second: the 1,500-token output figure is an estimate. Shadow forces `thinkingLevel: 'low'` above the model's `minimal` default, and nobody has measured the thinking tokens yet.
3. **Runway reality:** at ₹475/month fixed there's no meaningful burn. But **a single uncapped user who leaves Listen on costs about ₹1 lakh/month**, so runway is "indefinite until the first uncapped Listen user, then weeks".
4. **Verdict: FIXABLE.** Solve is a healthy 40-47%-margin product at ₹99-₹199 with quotas. Listen is a leaking bucket until it's capped, metered and priced per minute.
5. **The one number to move: cost per Listen minute (₹1.60).** The levers: stop billing silence with an idle auto-stop, go single-stream (−46%), and test Workers AI Nova-3 or Groq Whisper (−32% to −91%).

### Before setting prices, measure these (1 hour of work)

- Log `usage` from `streamText` (`inputTokens`, `outputTokens`, `reasoningTokens`, or `providerMetadata.google.usageMetadata.thoughtsTokenCount`) on 20 real solves, 10 follow-ups and a 30-minute Listen session. Replace A5, A6, A9 and A10 with the measured values. If typical solve output comes out at 1,000 instead of 1,500 tokens, every answer-quota margin above improves by about 10-14 points. If it comes out at 2,500, the ₹99 plan's margin falls to about 17%.
- Count classifier calls per Listen minute on a real lecture and a real mock interview.
- Check the live USD/INR rate.

## Sources
- Gemini API pricing: https://aistudio.google.com/docs/pricing
- Gemini media resolution (image tokens): https://aistudio.google.com/docs/media-resolution
- Gemini image understanding (tile rule): https://aistudio.google.com/docs/image-understanding
- Gemini thinking levels and billing: https://aistudio.google.com/docs/thinking
- Gemini context caching: https://aistudio.google.com/docs/caching
- Deepgram pricing: https://deepgram.com/pricing
- Groq model pricing: https://console.groq.com/docs/models
- OpenRouter Gemini 3.5 Flash-Lite: https://openrouter.ai/google/gemini-3.5-flash-lite
- Cloudflare Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare Workers AI pricing: https://developers.cloudflare.com/workers-ai/platform/pricing/
- Razorpay pricing: https://razorpay.com/pricing/
- Dodo Payments pricing: https://dodopayments.com/pricing
- Lemon Squeezy pricing and fees: https://www.lemonsqueezy.com/pricing, https://docs.lemonsqueezy.com/help/getting-started/fees
- Paddle pricing: https://www.paddle.com/pricing
- USD/INR: https://hdfcsky.com/news/rupee-rises-24-paise-to-close-at-95-46-against-us-dollar, https://30rates.com/usd-to-inr-converter-forecast-dollar-to-rupee, https://longforecast.com/usd-to-inr-forecast-2017-2018-2019-2020-2021-indian-rupee
