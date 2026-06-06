-- 전체 보안 감사 후속 잠금 (docs/260606_codereview_3.md).
--
-- 1) geocode_backfill_log: RLS 비활성(완전 노출) → 활성. 정책을 두지 않아 deny-all
--    (서비스롤/정의자만 접근). 지오코딩 백필 로그라 클라 접근 불필요.
-- 2) cron/edge(service_role) 전용 SECURITY DEFINER 함수의 anon/authenticated 직접
--    호출 회수. 근거:
--      - list_expired_ai_uploads / list_expired_invitation_drafts /
--        list_expired_invitation_published: 전 사용자 storage 경로·청첩장 ID 반환(정보 노출)
--      - subscriptions_due_for_renewal_notification: 전 사용자 구독 PII(plan/price/날짜) 반환
--      - cleanup_inactive_tips: 팁 대량 DELETE
--      - reap_stuck_generation_jobs / consulting_board_done: 잡 강제 실패·환불(earn_hearts)
--        → 경제 abuse(타 사용자/본인 강제 환불·보드 마감)
--    모두 edge(admin) 또는 pg_cron 에서만 호출 → service_role 은 유지(영향 없음).

ALTER TABLE public.geocode_backfill_log ENABLE ROW LEVEL SECURITY;

REVOKE EXECUTE ON FUNCTION public.cleanup_inactive_tips() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.reap_stuck_generation_jobs() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.list_expired_ai_uploads(integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.list_expired_invitation_drafts(integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.list_expired_invitation_published(integer, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.subscriptions_due_for_renewal_notification(integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.consulting_board_done(uuid, text, text) FROM anon, authenticated, public;
