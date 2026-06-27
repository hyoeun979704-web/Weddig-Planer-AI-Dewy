-- P0(개인정보): SDM 얼굴사진 30일 자동삭제 누락 교정 (260626 codereview P0-1).
-- list_expired_ai_uploads 가 dress/makeup 전용버킷 + invitation-uploads 하위(consulting/hair/
-- photofix/enhanced)만 정리하고, SDM 전용버킷(sdm-uploads·sdm-results, 20260620000000 에서 생성,
-- 얼굴 사진 보관)을 빠뜨려 개인정보처리방침 "처리 후 30일 자동 삭제"가 SDM 에 안 걸렸다.
-- 두 버킷을 IN 목록에 추가한다(나머지 정의 동일 — 멱등 CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION public.list_expired_ai_uploads(retention_days integer DEFAULT 30)
RETURNS TABLE(bucket_id text, name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'storage'
AS $function$
  SELECT bucket_id, name
  FROM storage.objects
  WHERE created_at < now() - make_interval(days => retention_days)
    AND (
      bucket_id IN ('dress-uploads', 'dress-results', 'makeup-uploads', 'makeup-results', 'sdm-uploads', 'sdm-results')
      OR (
        bucket_id = 'invitation-uploads'
        AND name ~ '^[^/]+/(consulting|hair|photofix|enhanced)/'
      )
    )
$function$;
