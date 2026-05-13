-- Add updated_at column to budget_items so item edits surface a "modified" hint
-- in the UI. Existing rows backfill via default now().

ALTER TABLE public.budget_items
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS update_budget_items_updated_at ON public.budget_items;

CREATE TRIGGER update_budget_items_updated_at
  BEFORE UPDATE ON public.budget_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
