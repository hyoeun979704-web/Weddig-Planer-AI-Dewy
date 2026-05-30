-- Targeted recommendation: which personas should see this product in
-- the "추천 상품" carousel. Empty array = visible to all personas;
-- non-empty = only personas whose persona_mode appears in the array.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS featured_personas text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS products_featured_personas_gin
  ON public.products USING gin (featured_personas)
  WHERE is_featured = true;

COMMENT ON COLUMN public.products.featured_personas IS
  '추천 노출 대상 페르소나 목록(weddingPersona.ts 의 WeddingPersonaMode). 빈 배열이면 전체 페르소나에 노출.';
