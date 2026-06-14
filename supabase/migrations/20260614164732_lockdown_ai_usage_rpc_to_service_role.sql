-- P1 보안: AI 쿼터 게이트 RPC 자가우회 차단.
-- 이 함수들은 limit 을 클라 파라미터로 받는다. authenticated/anon 에 EXECUTE 가 열려 있어,
-- 인증 사용자가 엣지펑션(ai-planner·vendor-web-search, service_role 로 호출하며 limit 을
-- 프리미엄 여부로 서버에서 산정)을 우회하고 RPC 를 직접 호출해 limit 을 부풀리면 AI 비용
-- 캡이 무력화된다. auth.uid() 가드는 '남의 카운터 증가'만 막지 '내 캡 우회'는 못 막는다.
-- 호출 경로는 service_role 엣지펑션뿐(src 직접 호출 0 확인) → 엣지 전용으로 잠근다.
revoke all on function public.increment_ai_usage_gated(uuid, date, integer, integer) from public, anon, authenticated;
grant execute on function public.increment_ai_usage_gated(uuid, date, integer, integer) to service_role;

revoke all on function public.increment_ai_usage_if_allowed(uuid, date, integer) from public, anon, authenticated;
grant execute on function public.increment_ai_usage_if_allowed(uuid, date, integer) to service_role;
