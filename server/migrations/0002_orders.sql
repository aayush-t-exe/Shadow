-- One row per checkout. Credits are added exactly once, when an order turns "paid"
-- (from the payment provider's webhook, or the test checkout page while developing).
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  pack_id TEXT NOT NULL,
  credits INTEGER NOT NULL,
  amount_paise INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending',   -- pending | paid | failed
  provider TEXT NOT NULL,                   -- test | razorpay
  provider_ref TEXT,
  created_at INTEGER NOT NULL,
  paid_at INTEGER
);
CREATE INDEX orders_device ON orders (device_id, created_at);
