# Shadow Cloud

The small server that lets people use Shadow without an API key. It holds your Gemini, Groq and
Deepgram keys, gives each install free starter credits, counts credits, and records what every
answer really costs. It runs on Cloudflare Workers with a D1 database (both free at this size).

```
Shadow app ──(device token)──▶ Shadow Cloud ──(your key)──▶ Gemini (answers) / Groq (backup)
                                   │
                                   └─ 1-minute Deepgram token ─▶ the app streams audio to Deepgram directly
```

## Run it on your PC

```bash
cd server
npm install
cp .dev.vars.example .dev.vars   # then paste your Gemini, Groq and Deepgram keys into it
npm run db:local                 # creates the local database
npm run dev                      # Shadow Cloud on http://127.0.0.1:8787
```

Then run the app with `npm run dev` in the main folder, open Settings → **Answer with → Shadow Cloud**.
(The public build always uses Shadow Cloud; only your own build has that switch.)

## Tests (no real keys, no money)

```bash
npm test                         # unit tests
npm run e2e                      # the server against fake Gemini/Groq/Deepgram (32 checks)
node scripts/app-e2e.mjs         # the real Shadow app against it (15 checks; the overlay shows for ~1 min)
```

## Put it online

1. Make a free Cloudflare account, then in `server/`: `npx wrangler login`
2. `npx wrangler d1 create shadow-cloud` and paste the printed `database_id` into `wrangler.toml`
3. `npm run db:remote`
4. Add the keys (each command asks you to paste one):
   `npx wrangler secret put GEMINI_API_KEY`, `GROQ_API_KEY`, `DEEPGRAM_API_KEY`, `ADMIN_SECRET`
5. `npm run deploy` prints your address, e.g. `https://shadow-cloud.<you>.workers.dev`
6. Build the installer pointed at it (PowerShell):
   `$env:SHADOW_CLOUD_URL="https://shadow-cloud.<you>.workers.dev"; npm run dist`

Before real users arrive, turn on billing for the Gemini key: free-tier keys share one small
per-minute limit across everyone, and Google may use free-tier data for training.

## Change prices and limits

Everything is in `[vars]` in `wrangler.toml`: free credits, credits per answer and per listening
minute, the daily spending cap, the models. Edit and `npm run deploy`; the app picks it up, no new
installer needed.

## Credit packs and buying

The paywall shows the packs from `PACKS` (default: 50 credits ₹49, **120 credits ₹99**, 350 credits
₹249; prices include GST, in paise). To change them, set `PACKS` in `[vars]`, e.g.
`PACKS = '[{"id":"small","credits":50,"pricePaise":4900},{"id":"regular","credits":120,"pricePaise":9900,"default":true}]'`.

- `CHECKOUT_MODE=razorpay` + `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`: real payments through
  Razorpay Orders + Checkout. "Add credits" opens Shadow's own page (`/pay/:order`) on your server,
  which opens Razorpay's window (UPI, cards, netbanking) with the Shadow name and logo.
  With `rzp_test_` keys it's test money only.
- `CHECKOUT_MODE=test` (only in `.dev.vars`, never online) is a fake checkout page with no Razorpay,
  used by the automated tests.
- With `CHECKOUT_MODE` unset (the default online), the paywall shows but buying is switched off.

How a payment is confirmed: nothing the browser says is trusted on its own. Credits are added (by
`fulfil()`, exactly once per order) only when one of these is true:
1. the checkout window's receipt has a valid signature made with your key secret
   (`HMAC-SHA256(order_id|payment_id)`), or
2. Razorpay itself says the order is paid (checked every time the app polls), or
3. Razorpay's `order.paid` webhook arrives signed with `RAZORPAY_WEBHOOK_SECRET`.

Try it on your PC: `node scripts/razorpay-check.mjs` creates a real test order, prints the payment
page, and waits for you to pay (test mode: Netbanking → any bank → Success).

**Going live:** after Razorpay approves your KYC, generate **live** keys and set them online with
`npx wrangler secret put RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`. In Razorpay → Webhooks add
`https://<your server>/v1/razorpay/webhook` for the `order.paid` event, with a secret you also set
as `RAZORPAY_WEBHOOK_SECRET`. Never put live keys in chat or in git.

## See what answers really cost

```bash
curl -H "Authorization: Bearer <ADMIN_SECRET>" https://shadow-cloud.<you>.workers.dev/v1/admin/stats
```

It shows the last 7 days: spend per day, new installs, the average and worst cost of each kind of
answer (main model + backup + screenshot reader together), average tokens per call, and listening
minutes. Use it to settle the credits-per-rupee price.

## Give someone credits by hand

Every install shows its **Shadow ID** in Settings (like `K7Q2-9MPX`). Before Razorpay is connected
you can sell by UPI and add credits yourself:

```bash
curl -X POST -H "Authorization: Bearer <ADMIN_SECRET>" -H "content-type: application/json" \
  -d '{"deviceId":"K7Q2-9MPX","credits":120,"note":"UPI ₹99 from Rahul"}' \
  https://shadow-cloud.<you>.workers.dev/v1/admin/grant
```

## How it protects your money

- Your keys never leave the server; the app only has its own device token.
- Each answer is charged once, even when the backup model or the screenshot reader also run, and
  only when a model actually replies.
- Only the configured models are allowed, requests are size-capped, and replies are cut off if huge.
- New free credits: once per PC (a reinstall gets the same account back) and at most 5 new PCs per
  network per day.
- **Daily cap** (`DAILY_CAP_USD`, default $2): once a day's AI + speech cost passes it, Shadow Cloud
  says "busy" until tomorrow.
- Known limit: listening audio goes straight to Deepgram, so the per-minute charge relies on the app
  checking in. A modified app could listen without paying; the daily cap bounds that. If it ever
  happens, the fix is passing audio through the server.
