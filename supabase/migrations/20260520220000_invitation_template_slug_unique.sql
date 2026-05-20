-- invitation_templates.slug 의 partial unique index 를 일반 UNIQUE constraint 로 교체.
--
-- 이전 마이그레이션(20260520210000)이 만든
--   CREATE UNIQUE INDEX ... ON invitation_templates(slug) WHERE slug IS NOT NULL
-- 는 PostgreSQL 의 ON CONFLICT (slug) 표현이 인식 못 한다. supabase-js 의
-- upsert(payload, { onConflict: "slug" }) 가 다음 에러로 실패:
--   "there is no unique or exclusion constraint matching the ON CONFLICT specification"
--
-- 일반 UNIQUE constraint 는 NULL 값을 unique 체크에서 자동 제외하므로
-- 기존 slug = NULL row 가 있어도 안전하다.

DROP INDEX IF EXISTS public.invitation_templates_slug_key;

ALTER TABLE public.invitation_templates
  ADD CONSTRAINT invitation_templates_slug_unique UNIQUE (slug);
