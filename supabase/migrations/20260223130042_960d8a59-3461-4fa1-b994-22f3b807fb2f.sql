
-- Budget settings table (per-user budget configuration)
CREATE TABLE public.budget_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  region TEXT NOT NULL DEFAULT 'seoul',
  guest_count INTEGER DEFAULT 200,
  total_budget INTEGER DEFAULT 0,
  category_budgets JSONB DEFAULT '{"venue":0,"sdm":0,"ring":0,"house":0,"honeymoon":0,"etc":0}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budget_settings" ON public.budget_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own budget_settings" ON public.budget_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own budget_settings" ON public.budget_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own budget_settings" ON public.budget_settings FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_budget_settings_updated_at
  BEFORE UPDATE ON public.budget_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Budget items table (individual expense records)
CREATE TABLE public.budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  amount INTEGER NOT NULL,
  paid_by TEXT DEFAULT 'shared',
  item_date DATE DEFAULT CURRENT_DATE,
  memo TEXT,
  has_balance BOOLEAN DEFAULT false,
  balance_amount INTEGER,
  balance_due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budget_items" ON public.budget_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own budget_items" ON public.budget_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own budget_items" ON public.budget_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own budget_items" ON public.budget_items FOR DELETE USING (auth.uid() = user_id);
