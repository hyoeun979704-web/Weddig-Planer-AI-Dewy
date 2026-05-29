-- Click tracking for curated outbound products + per-product aggregation RPC
-- + resync tracking columns. Click logging is unauthenticated so anonymous
-- store visitors are counted; reading is admin-only.

CREATE TABLE IF NOT EXISTS public.product_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  source_tab text,
  clicked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS product_clicks_product_idx
  ON public.product_clicks (product_id, clicked_at DESC);
CREATE INDEX IF NOT EXISTS product_clicks_recent_idx
  ON public.product_clicks (clicked_at DESC);

ALTER TABLE public.product_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone logs product clicks" ON public.product_clicks;
CREATE POLICY "Anyone logs product clicks" ON public.product_clicks
  FOR INSERT TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins read product clicks" ON public.product_clicks;
CREATE POLICY "Admins read product clicks" ON public.product_clicks
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.product_click_counts(p_days integer DEFAULT 7)
RETURNS TABLE (product_id uuid, click_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT product_id, count(*)::bigint
  FROM public.product_clicks
  WHERE clicked_at > now() - (p_days || ' days')::interval
    AND public.has_role(auth.uid(), 'admin'::app_role)
  GROUP BY product_id;
$$;
REVOKE ALL ON FUNCTION public.product_click_counts(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.product_click_counts(integer) TO authenticated;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS last_resynced_at timestamptz,
  ADD COLUMN IF NOT EXISTS stale_reason text;
