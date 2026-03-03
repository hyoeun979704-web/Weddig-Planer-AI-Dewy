-- C-4: Add UNIQUE constraint on payment_key to prevent duplicate payment records
-- If a payment success page is refreshed, the edge function will reject duplicate confirms
-- and the DB insert will also be blocked by this constraint.
ALTER TABLE public.payments ADD CONSTRAINT payments_payment_key_unique UNIQUE (payment_key);
