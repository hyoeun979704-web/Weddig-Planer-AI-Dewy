-- Product blocklist: rejected external products that should never be re-collected.
-- When the admin trashes a pool product we insert (source, source_product_id) here
-- BEFORE deleting the row, so the next batch / manual search skips it.

CREATE TABLE IF NOT EXISTS public.product_blocklist (
  source text NOT NULL CHECK (source IN ('coupang','naver')),
  source_product_id text NOT NULL,
  blocked_at timestamptz NOT NULL DEFAULT now(),
  blocked_by uuid REFERENCES auth.users(id),
  reason text,
  PRIMARY KEY (source, source_product_id)
);

ALTER TABLE public.product_blocklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read blocklist" ON public.product_blocklist;
CREATE POLICY "Admins read blocklist" ON public.product_blocklist
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins write blocklist" ON public.product_blocklist;
CREATE POLICY "Admins write blocklist" ON public.product_blocklist
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins delete blocklist" ON public.product_blocklist;
CREATE POLICY "Admins delete blocklist" ON public.product_blocklist
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
