-- cleanup-ai-uploads Edge Function 이 만료된 dress-uploads/dress-results 파일을
-- 조회하는 SECURITY DEFINER 헬퍼. (원본 마이그레이션 20260520120000 의 함수 부분 —
-- cron 스케줄은 role-claim 인증 + service_role JWT 로 별도 등록되어 Vault 의존 제거.)
CREATE OR REPLACE FUNCTION public.list_expired_ai_uploads(retention_days integer DEFAULT 30)
RETURNS TABLE(bucket_id text, name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT bucket_id, name
  FROM storage.objects
  WHERE bucket_id IN ('dress-uploads', 'dress-results')
    AND created_at < now() - make_interval(days => retention_days)
$$;

REVOKE ALL ON FUNCTION public.list_expired_ai_uploads(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_expired_ai_uploads(integer) TO service_role;

COMMENT ON FUNCTION public.list_expired_ai_uploads(integer) IS
  'cleanup-ai-uploads Edge Function 전용 — retention_days 보다 오래된 AI 업로드/결과 파일 경로 목록 반환. service_role 만 호출 가능.';
