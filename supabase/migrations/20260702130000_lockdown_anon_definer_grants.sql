-- 260702 보안감사 P0/P3 — anon/authenticated 에 열린 SECURITY DEFINER 함수 grant 회수.
--
-- 배경(드리프트): 20260624120100(delete_user_data)·20260614234033(admin RPC 일부) 등에서
-- REVOKE 했으나, 이후 어떤 CREATE OR REPLACE FUNCTION 이 기본 PUBLIC EXECUTE 를 재부여해
-- 실DB grant 가 다시 열렸다(마이그 적용기록 ≠ 실DB grant). 실DB grant 를 직접 재잠근다.
--
-- ⚠️ P0: delete_user_data 는 내부 인가 검사가 전무한데 anon EXECUTE 가 열려 있어,
--        anon 키만으로 임의 user_id 계정 전체 삭제가 가능했다. service_role 전용으로 회수.
--        (delete-account edge 가 service_role + getUser(token) 본인확인 후 호출 — 정상 동작.)

-- ── P0: 타인 계정 삭제 차단 ──────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.delete_user_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_data(uuid) TO service_role;

-- ── P3: NULL 비교 소유권 가드 우회 경로 제거(anon=auth.uid() NULL) ────────
-- authenticated 는 auth.uid() 가 항상 non-null 이라 함수 내부 `p_user_id <> auth.uid()`
-- 가드가 정상 작동한다. anon EXECUTE 만 회수해 우회 경로를 없앤다.
REVOKE ALL ON FUNCTION public.add_game_points(uuid, integer, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.increment_ai_usage(uuid, date) FROM PUBLIC, anon;

-- ── P3: admin_* 함수 anon 회수(내부 has_role 가드는 있으나 컨벤션 정합·advisor 소음 제거).
-- authenticated 는 유지(관리자도 로그인 사용자) — 함수 첫줄 has_role 검사로 비관리자 거부.
REVOKE ALL ON FUNCTION public.admin_ai_job_stats() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_get_member_affiliations(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_ai_failures(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_pending_businesses() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_pending_events() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_pending_listings() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_pending_products() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_place_claims() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_review_business(uuid, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_review_event(uuid, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_review_place_claim(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_review_product(uuid, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_app_config(text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_member_affiliation(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_member_tier(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_upsert_promotional_event(text, jsonb) FROM PUBLIC, anon;
