-- AI 플래너 사용 게이트 고도화: 일일 한도 + 분당 rate-limit.
-- 무료: 일 10회. 프리미엄: 분당 10회 + 일 200회(남용 방지선, 실사용자 영향 0).
-- 분당 카운터 테이블 + 일/분 동시 원자 검사 RPC. 멱등 작성.

CREATE TABLE IF NOT EXISTS public.ai_usage_minute (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  minute TIMESTAMPTZ NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, minute)
);
-- 오래된 분 버킷은 누적되므로 주기 청소용 인덱스(운영 cron 이 1시간↑ 지난 행 삭제).
CREATE INDEX IF NOT EXISTS idx_ai_usage_minute_minute ON public.ai_usage_minute(minute);

ALTER TABLE public.ai_usage_minute ENABLE ROW LEVEL SECURITY;
-- RPC(SECURITY DEFINER)로만 기록 — 직접 접근 정책은 두지 않는다(서비스롤만).

-- 일/분 동시 게이트. 분 먼저 검사(차단 시 일일 카운트 미차감), 통과 시 일일 검사.
-- 반환: { allowed, daily_count, blocked_by('minute'|'daily'|null) }
CREATE OR REPLACE FUNCTION public.increment_ai_usage_gated(
  p_user_id UUID,
  p_date DATE,
  p_minute_limit INTEGER,
  p_daily_limit INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_minute_bucket TIMESTAMPTZ := date_trunc('minute', now());
  v_min INTEGER;
  v_day INTEGER;
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Cannot increment usage for other users';
  END IF;

  -- 분당 검사 (분 단위 윈도우 — 1분 지나면 새 버킷이라 자연 리셋)
  INSERT INTO public.ai_usage_minute (user_id, minute, message_count)
  VALUES (p_user_id, v_minute_bucket, 1)
  ON CONFLICT (user_id, minute) DO UPDATE
    SET message_count = ai_usage_minute.message_count + 1
    WHERE ai_usage_minute.message_count < p_minute_limit
  RETURNING message_count INTO v_min;

  IF v_min IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'blocked_by', 'minute');
  END IF;

  -- 일일 검사 (차단되면 message_count 변동 없음 — 분만 소모, 무시 가능)
  INSERT INTO public.ai_usage_daily (user_id, usage_date, message_count)
  VALUES (p_user_id, p_date, 1)
  ON CONFLICT (user_id, usage_date) DO UPDATE
    SET message_count = ai_usage_daily.message_count + 1
    WHERE ai_usage_daily.message_count < p_daily_limit
  RETURNING message_count INTO v_day;

  IF v_day IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'blocked_by', 'daily');
  END IF;

  RETURN jsonb_build_object('allowed', true, 'daily_count', v_day, 'blocked_by', NULL);
END;
$$;
