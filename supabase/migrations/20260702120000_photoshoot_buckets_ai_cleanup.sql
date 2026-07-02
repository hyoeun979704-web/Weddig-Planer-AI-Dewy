-- 개인정보(선제): photoshoot-uploads/photoshoot-results 버킷이 30일 자동삭제 대상에서
-- 누락돼 있었다(버킷·RLS 는 20260620010000 에서 생성 — 업로드는 이미 가능, 정리 경로 없음).
-- 웨딩촬영 시안 기능 가동 전에 list_expired_ai_uploads IN 목록에 편입한다.
-- (cleanup-ai-uploads 의 TARGET_BUCKETS 도 같은 커밋에서 추가 — 둘 다 있어야 실삭제됨.)

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
      bucket_id IN (
        'dress-uploads', 'dress-results',
        'makeup-uploads', 'makeup-results',
        'sdm-uploads', 'sdm-results',
        'photoshoot-uploads', 'photoshoot-results'
      )
      OR (
        bucket_id = 'invitation-uploads'
        AND name ~ '^[^/]+/(consulting|hair|photofix|enhanced)/'
      )
    )
$function$;
