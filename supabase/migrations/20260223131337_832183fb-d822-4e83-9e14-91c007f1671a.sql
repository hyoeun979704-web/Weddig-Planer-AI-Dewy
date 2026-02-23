
ALTER TABLE public.budget_items ADD COLUMN payment_stage TEXT DEFAULT 'full';
ALTER TABLE public.budget_items ADD COLUMN payment_method TEXT DEFAULT 'cash';
