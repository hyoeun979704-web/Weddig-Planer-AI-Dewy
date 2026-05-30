-- Products curation: add columns for external source tracking (Coupang/Naver),
-- multi-category support, ratings/featured flags, and admin write RLS.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS rating numeric(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sold_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_product_id text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS source_mall text,
  ADD COLUMN IF NOT EXISTS raw_data jsonb,
  ADD COLUMN IF NOT EXISTS categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS synced_at timestamptz;

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_source_check;
ALTER TABLE public.products ADD CONSTRAINT products_source_check
  CHECK (source IN ('manual','coupang','naver'));

CREATE UNIQUE INDEX IF NOT EXISTS products_source_unique
  ON public.products (source, source_product_id)
  WHERE source_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS products_active_idx ON public.products (is_active);
CREATE INDEX IF NOT EXISTS products_categories_gin ON public.products USING gin (categories);
CREATE INDEX IF NOT EXISTS products_featured_idx ON public.products (is_featured) WHERE is_featured = true;

-- Tighten public SELECT: non-admins see only is_active=true (curated pool stays hidden).
DROP POLICY IF EXISTS "Products are publicly viewable" ON public.products;
CREATE POLICY "Active products are publicly viewable" ON public.products
  FOR SELECT
  USING (
    is_active = true
    OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role))
  );

DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
CREATE POLICY "Admins can insert products" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update products" ON public.products;
CREATE POLICY "Admins can update products" ON public.products
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "Admins can delete products" ON public.products
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Per-source search cache to avoid hammering external APIs from the admin UI.
CREATE TABLE IF NOT EXISTS public.product_search_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('coupang','naver')),
  query text NOT NULL,
  results jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, query)
);
ALTER TABLE public.product_search_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read search cache" ON public.product_search_cache;
CREATE POLICY "Admins read search cache" ON public.product_search_cache
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins write search cache" ON public.product_search_cache;
CREATE POLICY "Admins write search cache" ON public.product_search_cache
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins update search cache" ON public.product_search_cache;
CREATE POLICY "Admins update search cache" ON public.product_search_cache
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
