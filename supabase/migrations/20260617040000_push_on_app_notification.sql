-- 인앱 알림(app_notifications) 생성 시 FCM 푸시 자동 발송 — e2e 감사가 짚은 "푸시 미연결" 해소.
--
-- 기존엔 app_notifications row 만 쌓이고(앱 열어야 확인) send-push 자동 호출이 없었다.
-- 20260520120000(cleanup cron)의 vault + net.http_post 패턴을 그대로 미러해, INSERT 트리거가
-- send-push 엣지펑션을 호출한다.
--
-- 사전 설정(수동 1회 — cleanup 과 동일 시크릿 재사용):
--   SELECT vault.create_secret('https://qabeywyzjsgyqpjqsvkd.supabase.co', 'project_url');
--   SELECT vault.create_secret('<service-role-key>', 'service_role_key');
-- pg_net 확장 + device_tokens 등록도 전제. (미설정/토큰없음이면 푸시만 조용히 누락 — 알림 row 는 정상.)
--
-- ★ 안전장치: 모든 오류를 삼켜(best-effort) app_notifications INSERT 를 절대 막지 않는다.
--    (vault 미설정·pg_net 미설치·함수 오류가 알림 생성을 깨뜨리면 안 됨.)

CREATE OR REPLACE FUNCTION public.push_on_app_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_key text;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'project_url';
    SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';
    IF v_url IS NOT NULL AND v_key IS NOT NULL AND NEW.recipient_id IS NOT NULL THEN
      PERFORM net.http_post(
        url := v_url || '/functions/v1/send-push',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
        body := jsonb_build_object(
          'user_id', NEW.recipient_id,
          'title', COALESCE(NEW.title, '알림'),
          'body', COALESCE(NEW.body, ''),
          'data', jsonb_build_object('deeplink', COALESCE(NEW.link, '/'))
        ),
        timeout_milliseconds := 5000
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- 푸시 발송 실패가 알림 생성을 막지 않게(best-effort).
    NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_on_app_notification ON public.app_notifications;
CREATE TRIGGER trg_push_on_app_notification
  AFTER INSERT ON public.app_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.push_on_app_notification();
