-- The Razorpay order behind a Shadow order (order_...), so its status can be checked with Razorpay.
ALTER TABLE orders ADD COLUMN link_id TEXT;
CREATE INDEX orders_link ON orders (link_id);
