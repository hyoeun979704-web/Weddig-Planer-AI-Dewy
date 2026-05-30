-- Admin-managed seed keyword catalog so product-batch-collect can read its
-- worklist from the DB instead of the hardcoded map. Pre-loaded with the
-- same keywords the function shipped with so behavior is unchanged on day 0.

CREATE TABLE IF NOT EXISTS public.product_seed_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  keyword text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, keyword)
);
CREATE INDEX IF NOT EXISTS product_seed_keywords_category_idx
  ON public.product_seed_keywords (category)
  WHERE is_active = true;

ALTER TABLE public.product_seed_keywords ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read seed keywords" ON public.product_seed_keywords;
CREATE POLICY "Admins read seed keywords" ON public.product_seed_keywords
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins write seed keywords" ON public.product_seed_keywords;
CREATE POLICY "Admins write seed keywords" ON public.product_seed_keywords
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins update seed keywords" ON public.product_seed_keywords;
CREATE POLICY "Admins update seed keywords" ON public.product_seed_keywords
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins delete seed keywords" ON public.product_seed_keywords;
CREATE POLICY "Admins delete seed keywords" ON public.product_seed_keywords
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.product_seed_keywords (category, keyword) VALUES
  ('photo_props', '웨딩 가랜드'),
  ('photo_props', '웨딩 풍선'),
  ('photo_props', '웨딩 플래카드'),
  ('photo_props', '포토존 소품'),
  ('photo_props', '웨딩 사인보드'),
  ('bouquet', '조화 부케'),
  ('bouquet', '드라이 부케'),
  ('bouquet', '부토니에'),
  ('bouquet', '프리저브드 부케'),
  ('bouquet', '셀프웨딩 부케'),
  ('self_wedding_dress', '셀프 웨딩 드레스'),
  ('self_wedding_dress', '촬영 드레스'),
  ('self_wedding_dress', '스몰웨딩 드레스'),
  ('second_dress', '2부 드레스'),
  ('second_dress', '피로연 드레스'),
  ('second_dress', '이브닝 드레스'),
  ('wedding_shoes', '웨딩 슈즈'),
  ('wedding_shoes', '신부 구두'),
  ('wedding_shoes', '웨딩 힐'),
  ('accessories', '웨딩 티아라'),
  ('accessories', '신부 이어링'),
  ('accessories', '신부 베일'),
  ('accessories', '신부 장갑'),
  ('frame', '웨딩 액자'),
  ('frame', '결혼사진 액자'),
  ('album', '웨딩 앨범'),
  ('album', '셀프웨딩 앨범'),
  ('album', '웨딩 포토북'),
  ('paper_invitation', '종이 청첩장'),
  ('paper_invitation', '청첩장 인쇄'),
  ('return_gift', '결혼 답례품'),
  ('return_gift', '웨딩 답례품'),
  ('return_gift', '하객 답례품')
ON CONFLICT (category, keyword) DO NOTHING;
