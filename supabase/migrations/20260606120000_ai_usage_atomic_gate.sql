-- AI 일일 사용량 원자적 게이트.
--
-- 기존 흐름(ai-planner / vendor-web-search)은 SELECT message_count 로 한도를 확인한 뒤
-- 별도 RPC(increment_ai_usage)로 +1 하는 비원자 구조였다. 동시 요청 두 개가 같은
-- 카운트를 읽고 둘 다 통과 → 무료 한도(5/일)를 초과할 수 있었다(race).
--
-- 이 함수는 "한도 미만일 때만 +1 하고 새 카운트를 반환, 한도 도달이면 갱신 없이 NULL"
-- 을 단일 문(INSERT ... ON CONFLICT ... DO UPDATE ... WHERE)으로 처리한다. 충돌 시
-- row-lock 으로 직렬화되므로 동시 요청도 정확히 한도에서 멈춘다.
--   반환값: 허용 시 증가 후 message_count(integer), 한도 도달 시 NULL.
-- 기존 increment_ai_usage 는 그대로 둔다(호환).

CREATE OR REPLACE FUNCTION public.increment_ai_usage_if_allowed(
  p_user_id uuid, p_date date, p_limit integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  -- service_role(auth.uid() NULL) 또는 본인만. 타인 대리 증가 차단.
  IF auth.uid() IS NOT NULL AND p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Cannot increment usage for other users';
  END IF;

  INSERT INTO ai_usage_daily (user_id, usage_date, message_count)
  VALUES (p_user_id, p_date, 1)
  ON CONFLICT (user_id, usage_date) DO UPDATE
    SET message_count = ai_usage_daily.message_count + 1
    WHERE ai_usage_daily.message_count < p_limit
  RETURNING message_count INTO v_count;

  RETURN v_count; -- 한도 도달 시 NULL
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_ai_usage_if_allowed(uuid, date, integer)
  TO authenticated, service_role;
