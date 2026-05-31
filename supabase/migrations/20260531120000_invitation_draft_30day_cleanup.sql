-- 청첩장 draft 30일 자동 정리.
--
-- "기록 자동 저장(한달 보관)" 정책: 미발행(draft) 청첩장 레코드와 그 업로드 사진을
-- 생성 30일 후 자동 삭제한다. 발행본(status='published', 하객 라이브 링크)은 유지.
--
-- 개인정보처리방침의 "사용자 업로드 사진 30일 자동 삭제" 약속도 invitation-uploads
-- 버킷에 대해 함께 충족된다 (단, 발행본이 참조하는 사진은 보존 — 사용자가 직접
-- 공개·공유한 콘텐츠이므로).
--
-- list_expired_ai_uploads 와 동일 패턴:
--   · SECURITY DEFINER 함수가 정리 대상(레코드 id + 사진 path)을 반환
--   · Edge Function `cleanup-ai-uploads` 가 service_role 로 Storage 삭제 + row 삭제
--   · service_role 만 실행 가능

CREATE OR REPLACE FUNCTION public.list_expired_invitation_drafts(
  retention_days integer DEFAULT 30
)
RETURNS TABLE(invitation_id uuid, photo_paths text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  published_paths text[];
BEGIN
  -- 발행본이 참조하는 모든 사진 path (보존 대상) — 같은 path 가 draft 에도
  -- 걸려 있으면 삭제 후보에서 제외해 라이브 청첩장이 깨지지 않게 한다.
  SELECT COALESCE(array_agg(DISTINCT val), '{}')
    INTO published_paths
  FROM public.invitations pub
  CROSS JOIN LATERAL jsonb_each_text(
    COALESCE(pub.layout -> 'imagePaths', '{}'::jsonb)
  ) AS e(key, val)
  WHERE pub.status = 'published'
    AND val <> '';

  RETURN QUERY
  SELECT
    i.id,
    COALESCE((
      SELECT array_agg(DISTINCT val)
      FROM jsonb_each_text(
        COALESCE(i.layout -> 'imagePaths', '{}'::jsonb)
      ) AS e(key, val)
      WHERE val <> ''
        AND NOT (val = ANY(published_paths))
    ), '{}') AS photo_paths
  FROM public.invitations i
  WHERE i.status = 'draft'
    AND i.created_at < now() - make_interval(days => retention_days);
END;
$$;

REVOKE ALL ON FUNCTION public.list_expired_invitation_drafts(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_expired_invitation_drafts(integer) TO service_role;

COMMENT ON FUNCTION public.list_expired_invitation_drafts(integer) IS
  'cleanup-ai-uploads Edge Function 전용 — retention_days 보다 오래된 draft 청첩장의
   id 와 (발행본이 참조하지 않는) 업로드 사진 path 목록 반환. service_role 만 호출.';
</content>
