-- 보안: security definer(기본) 뷰가 하위 테이블 RLS 를 우회해 데이터가 노출되던 것 차단.
--  - user_consents_canonical: anon/authenticated 에 SELECT 권한 + definer 라
--    누구나 전 사용자 동의 기록을 읽을 수 있었음(PII). user_consents RLS 는
--    본인 행(auth.uid()=user_id)만 허용 → invoker 로 전환하면 본인 것만 보인다.
--    (AuthContext backfill 은 .eq(user_id, 본인) 으로 조회 → 영향 없음)
--  - admin_reports_overview: community_reports(admin read / 본인 신고 read) 기반.
--    invoker 로 전환하면 운영자만 전체, 비운영자는 본인 신고만 — AdminReports 는
--    운영자 전용이라 정상 동작.
ALTER VIEW public.user_consents_canonical SET (security_invoker = on);
ALTER VIEW public.admin_reports_overview SET (security_invoker = on);
