-- 청첩장 양면(전면/후면) 지원 토대 + draft 보관 7일.
--
-- 배경/결정:
--   · 템플릿을 "전면+후면 세트"로 제공하되 후면은 취향대로 교체 가능.
--   · 템플릿 용도(face): front / back / both. 기존 단면 템플릿은 'both' (전·후면 모두 사용 가능).
--   · 전면 템플릿이 default_back_template_id 로 짝꿍 기본 후면을 가리켜 "세트" 구성.
--   · invitations.template_id = 전면, back_template_id = 후면.
--   · invitations.layout 은 면별 구조 { front:{...}, back:{...} } 로 확장(코드 레벨).
--     기존 평면 구조({textOverrides,...})는 코드에서 front 로 읽어 하위호환.
--   · 보관: 편집 가능 임시저장본(draft) 30일 → 7일.

-- ── 1) 템플릿: 용도 + 세트 + 엔진등급/추천폰트 ──────────────────
ALTER TABLE public.invitation_templates
  ADD COLUMN IF NOT EXISTS face TEXT NOT NULL DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS default_back_template_id UUID,
  ADD COLUMN IF NOT EXISTS engine_grade TEXT,
  ADD COLUMN IF NOT EXISTS recommended_fonts TEXT[];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invitation_templates_face_check'
  ) THEN
    ALTER TABLE public.invitation_templates
      ADD CONSTRAINT invitation_templates_face_check
      CHECK (face IN ('front','back','both'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invitation_templates_default_back_fk'
  ) THEN
    ALTER TABLE public.invitation_templates
      ADD CONSTRAINT invitation_templates_default_back_fk
      FOREIGN KEY (default_back_template_id)
      REFERENCES public.invitation_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invitation_templates_face
  ON public.invitation_templates(face, is_active);

-- ── 2) invitation: 후면 템플릿 참조 (template_id = 전면) ─────────
--   주의: back_template_id 는 일부러 FK 제약을 걸지 않는다.
--   invitations → invitation_templates FK 가 2개가 되면 PostgREST 의
--   암묵적 임베드(`invitation_templates(...)`)가 모호해져 기존 뷰어/스튜디오/
--   갤러리 쿼리가 깨진다. 후면 템플릿은 별도 조회로 가져오고, 참조 정합성은
--   앱 레벨에서 관리한다. (정합성보다 기존 쿼리 안정성 우선)
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS back_template_id UUID;

-- ── 3) layout 사진 path 추출 헬퍼 (평면 + 면별 구조 모두 지원) ────
--   기존 정리 로직은 layout->'imagePaths' 만 봤으나, 양면 구조에서는
--   layout->front->imagePaths / layout->back->imagePaths 도 스캔해야
--   삭제 누락(고아 사진) / 발행본 사진 오삭제를 막을 수 있다.
CREATE OR REPLACE FUNCTION public.invitation_photo_paths(layout jsonb)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(array_agg(DISTINCT val), '{}')
  FROM (
    SELECT val FROM jsonb_each_text(COALESCE(layout -> 'imagePaths', '{}'::jsonb)) AS a(k, val)
    UNION ALL
    SELECT val FROM jsonb_each_text(COALESCE(layout #> '{front,imagePaths}', '{}'::jsonb)) AS b(k, val)
    UNION ALL
    SELECT val FROM jsonb_each_text(COALESCE(layout #> '{back,imagePaths}', '{}'::jsonb)) AS c(k, val)
  ) s
  WHERE val <> '';
$$;

-- ── 4) draft 보관 30 → 7일 + 면별 사진 path 대응 ────────────────
CREATE OR REPLACE FUNCTION public.list_expired_invitation_drafts(
  retention_days integer DEFAULT 7
)
RETURNS TABLE(invitation_id uuid, photo_paths text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  published_paths text[];
BEGIN
  -- 발행본이 참조하는 사진(보존 대상) — draft 와 path 가 겹치면 삭제 제외.
  SELECT COALESCE(array_agg(DISTINCT p), '{}')
    INTO published_paths
  FROM public.invitations pub
  CROSS JOIN LATERAL unnest(public.invitation_photo_paths(pub.layout)) AS p
  WHERE pub.status = 'published';

  RETURN QUERY
  SELECT
    i.id,
    COALESCE((
      SELECT array_agg(DISTINCT p)
      FROM unnest(public.invitation_photo_paths(i.layout)) AS p
      WHERE NOT (p = ANY(published_paths))
    ), '{}') AS photo_paths
  FROM public.invitations i
  WHERE i.status = 'draft'
    AND i.created_at < now() - make_interval(days => retention_days);
END;
$$;

REVOKE ALL ON FUNCTION public.list_expired_invitation_drafts(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_expired_invitation_drafts(integer) TO service_role;

-- ── 5) 발행본(결과물) 만료: 종이 30일 / 모바일 공유링크 90일 ──────
--   결과물 보관 정책:
--     · 편집 가능 임시저장본(draft): 7일 (위 함수)
--     · 발행본 종이(format=paper): 30일
--     · 발행본 모바일 공유 링크(format=mobile): 90일
--   service_role(cleanup Edge Function)이 호출해 Storage 사진 + row 삭제.
CREATE OR REPLACE FUNCTION public.list_expired_invitation_published(
  paper_days integer DEFAULT 30,
  mobile_days integer DEFAULT 90
)
RETURNS TABLE(invitation_id uuid, photo_paths text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- LEFT JOIN + COALESCE — 템플릿 삭제(template_id=NULL)된 발행본도 정리 대상에 포함
  -- (format 미상은 종이로 간주). INNER JOIN 이면 그런 행이 영영 정리되지 않음.
  RETURN QUERY
  SELECT
    i.id,
    public.invitation_photo_paths(i.layout) AS photo_paths
  FROM public.invitations i
  LEFT JOIN public.invitation_templates t ON t.id = i.template_id
  WHERE i.status = 'published'
    AND (
      (COALESCE(t.format, 'paper') = 'mobile' AND i.created_at < now() - make_interval(days => mobile_days))
      OR (COALESCE(t.format, 'paper') <> 'mobile' AND i.created_at < now() - make_interval(days => paper_days))
    );
END;
$$;

REVOKE ALL ON FUNCTION public.list_expired_invitation_published(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_expired_invitation_published(integer, integer) TO service_role;

COMMENT ON FUNCTION public.list_expired_invitation_published(integer, integer) IS
  '발행본 만료 정리 — 종이 paper_days(기본30) / 모바일 mobile_days(기본90) 초과분의
   id + 사진 path 반환. cleanup Edge Function(service_role) 전용.';
