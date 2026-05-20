-- AI 업로드 사진 30일 자동 삭제
--
-- 개인정보처리방침에 명시한 "처리 후 30일 자동 삭제" 약속을 코드로 보장한다.
-- 대상 버킷: dress-uploads (사용자 본인 사진), dress-results (AI 생성 결과물).
--
-- 두 부분으로 구성:
--   1) list_expired_ai_uploads(retention_days) — SECURITY DEFINER 함수.
--      service_role 호출로 storage.objects 를 조회해 만료된 행 목록을 반환.
--   2) pg_cron 스케줄 — 매일 KST 03:00 (UTC 18:00 직전) 에
--      Edge Function `cleanup-ai-uploads` 를 호출.
--
-- 멱등 설계 : 이미 cron 작업이 있으면 unschedule 후 재등록.

-- ============================================================================
-- 1. SECURITY DEFINER 헬퍼 함수
-- ============================================================================
--
-- storage 스키마는 Supabase API 에 노출되지 않으므로,
-- Edge Function 이 service_role 로도 직접 SELECT 할 수 없다.
-- SECURITY DEFINER 로 우회하면서 권한은 service_role 에게만 부여한다.

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
  'cleanup-ai-uploads Edge Function 전용 — retention_days 보다 오래된
   AI 업로드/결과 파일 경로 목록 반환. service_role 만 호출 가능.';

-- ============================================================================
-- 2. pg_cron 스케줄
-- ============================================================================
--
-- 필요 확장 (Supabase 프로젝트엔 보통 둘 다 사전 활성화되어 있음).

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 이전에 다른 이름/스케줄로 등록된 게 있다면 지운다 (멱등).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-ai-uploads-daily') THEN
    PERFORM cron.unschedule('cleanup-ai-uploads-daily');
  END IF;
END $$;

-- Vault 에 저장해 둔 service_role_key 와 project_url 을 읽어
-- net.http_post 로 Edge Function 을 호출한다.
--
-- 사전 설정 필요 (수동, 1회) :
--   SELECT vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   SELECT vault.create_secret('<service-role-key>',                  'service_role_key');
--
-- Vault 미설정 시 cron 호출은 'secret not found' 로 조용히 실패하므로,
-- 마이그레이션 적용 직후 supabase/README 의 Vault 설정 절차를 반드시 실행해야 한다.

SELECT cron.schedule(
  'cleanup-ai-uploads-daily',
  '0 18 * * *',  -- 매일 UTC 18:00 = KST 다음날 03:00
  $cron$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/cleanup-ai-uploads',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) AS request_id;
  $cron$
);
