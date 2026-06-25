-- 감사 260624 P0 교정 — AI 개인사진 30일 자동삭제 대상 확장.
-- 기존 RPC 는 dress-uploads/dress-results 만 정리 → makeup·photofix·hair·consulting 결과물이
-- 영구 잔존(개인정보처리방침 "처리 후 30일 자동 삭제" 위반). 다음을 추가한다:
--   · 전용 AI 버킷: makeup-uploads, makeup-results
--   · invitation-uploads 의 AI 결과물 하위폴더만: {uid}/(consulting|hair|photofix|enhanced)/...
-- 주의(안전): invitation-uploads 의 '직접 {uid}/<file>'(청첩장 사진·지도)·guest-photos(하객사진)는
-- 청첩장 생명주기로 관리되므로 본 30일 일괄 삭제에서 제외한다(활성 청첩장 자산 보존).
-- (sdm 전용 버킷은 실제로 존재하지 않음 — DB 확인. SDM 산출물은 위 prefix/전용버킷에 포함.)
CREATE OR REPLACE FUNCTION public.list_expired_ai_uploads(retention_days integer DEFAULT 30)
RETURNS TABLE(bucket_id text, name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT bucket_id, name
  FROM storage.objects
  WHERE created_at < now() - make_interval(days => retention_days)
    AND (
      bucket_id IN ('dress-uploads', 'dress-results', 'makeup-uploads', 'makeup-results')
      OR (
        bucket_id = 'invitation-uploads'
        AND name ~ '^[^/]+/(consulting|hair|photofix|enhanced)/'
      )
    )
$$;

REVOKE ALL ON FUNCTION public.list_expired_ai_uploads(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_expired_ai_uploads(integer) TO service_role;

COMMENT ON FUNCTION public.list_expired_ai_uploads(integer) IS
  'cleanup-ai-uploads 전용 — dress/makeup 전용버킷 + invitation-uploads AI 결과물 prefix(consulting/hair/photofix/enhanced)의 retention_days 초과 파일 경로. 청첩장 사진·guest-photos 는 제외. service_role only.';
