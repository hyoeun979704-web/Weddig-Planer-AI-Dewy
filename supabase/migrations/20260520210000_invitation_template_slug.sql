-- 시드 시스템: invitation_templates 에 slug 컬럼 추가.
-- 코드(seedInvitationTemplates.ts)와 DB 간 upsert 키로 사용된다.
-- 운영자(디자이너)가 Figma 작업 후 시드 파일 수정 → PR → seed 스크립트가
-- 같은 slug 를 가진 row 를 update 또는 insert.

ALTER TABLE public.invitation_templates
  ADD COLUMN slug TEXT;

CREATE UNIQUE INDEX invitation_templates_slug_key
  ON public.invitation_templates(slug)
  WHERE slug IS NOT NULL;

COMMENT ON COLUMN public.invitation_templates.slug IS
  'seedInvitationTemplates.ts 의 upsert key. 영문 소문자 + 하이픈만 사용.';
