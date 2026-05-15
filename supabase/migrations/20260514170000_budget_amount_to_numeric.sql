-- The app records amounts in 만원 (10,000 KRW) and expects 1-decimal precision
-- so users can capture "32만 5천원" as 32.5. Previously the columns were
-- INTEGER, which silently rejected decimal inserts and made expense recording
-- appear broken (Sheet closed without a row appearing in the list).
ALTER TABLE public.budget_items
  ALTER COLUMN amount TYPE NUMERIC(12, 1) USING amount::numeric(12, 1);

ALTER TABLE public.budget_items
  ALTER COLUMN balance_amount TYPE NUMERIC(12, 1) USING balance_amount::numeric(12, 1);

ALTER TABLE public.budget_settings
  ALTER COLUMN total_budget TYPE NUMERIC(12, 1) USING total_budget::numeric(12, 1);
