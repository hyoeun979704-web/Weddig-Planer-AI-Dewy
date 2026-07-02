# 260702 — 보안/정책 감사

> 요청: "문제가 발생할 부분 점검 + 보안/정책 감사."
> 방법: 실DB 보안 어드바이저(Supabase) + 병렬 감사 3축(백엔드 보안 / 스토어 정책 / 법률·개인정보).
> **스토어 정책·법률 축은 실행 중 세션 한도로 미완** → 다음 라운드로 이월(§미완). 이 문서는
> 완료된 **백엔드 보안 축 + 어드바이저** 결과와 그 조치를 기록한다.

## TL;DR

- **실제 P0 1건 발견·수정**: `delete_user_data(uuid)` RPC 가 **anon 키로 임의 user_id 계정
  전체 삭제** 가능(내부 인가 검사 전무). REVOKE 마이그가 적용기록만 있고 실DB grant 는 다시
  열려 있던 **드리프트**(품질검토의 reaper 미적용과 동일 계열). → service_role 전용으로 회수, 실DB 검증.
- **P3 하드닝 19함수**: add_game_points·increment_ai_usage(NULL 가드 우회 경로) + admin_* 17개
  (내부 has_role 가드는 있으나 컨벤션 정합) anon EXECUTE 회수.
- 나머지 advisor 카테고리(공개 버킷·rls_no_policy·always_true·definer view)는 **의도된 설계로
  판정** — 재보고/불필요 조치 아님(§확인함).
- **어드바이저·기존 triage 문서가 놓친 것을 실DB grant 직접 조회로 잡았다** — advisor 의
  "anon executable"은 EXECUTE 권한만 보고 내부 role 검사를 모르므로, 실제 뚫림 판정은
  `pg_get_functiondef` 로 본문 인가를 확인해야 한다는 교훈.

## P0 (수정 완료 — 실DB 적용)

**`public.delete_user_data(uuid)` — 비로그인 임의 계정 삭제**
- 실DB 확인: 함수 본문에 `auth.uid()` 미참조(`has_authuid=false`), EXECUTE grantee =
  `anon, authenticated, service_role, postgres`.
- 공격: 클라 번들의 공개 anon 키 + 임의 user_id(커뮤니티 작성자 id 는 `community_author_cards`
  뷰로 열거 가능) → 로그아웃 상태로 `POST /rest/v1/rpc/delete_user_data {"p_user_id":"<피해자>"}`
  호출 시 그 사용자의 프로필·커뮤니티·일정·예산·청첩장·업체프로필 등 삭제-분류 테이블 행 영구 파기.
- 드리프트: `20260624120100_delete_user_data_rpc.sql` 의 REVOKE 가 실DB 에 안 걸림(이후
  CREATE OR REPLACE 가 기본 PUBLIC EXECUTE 재부여 추정). `docs/260625_migration_reconciliation.md`
  도 "미적용 P0"로 표시했으나 실제 재잠금은 안 됐던 상태.
- 조치: `20260702130000_lockdown_anon_definer_grants.sql` — REVOKE FROM PUBLIC/anon/authenticated
  + GRANT TO service_role. delete-account 엣지가 service_role + `getUser(token)` 본인확인 후
  호출하므로 정상 동작. **실DB 적용 후 검증: anon=false, authenticated=false, service_role=true.**

## P3 (수정 완료 — 하드닝)

- **`add_game_points`·`increment_ai_usage`**: 소유권 가드가 `IF p_user_id <> auth.uid() THEN
  RAISE`. anon 은 `auth.uid()=NULL` → `<> NULL` = NULL → `IF NULL` 미실행 → 가드 우회
  (포인트 임의 지급/타인 AI 카운터 부풀리기). authenticated 는 auth.uid() 가 non-null 이라
  가드 정상 → **anon EXECUTE 만 회수**(호출부 useGamePoints·ai-usage 게이트는 authenticated/
  service_role 이라 무영향).
- **admin_* 17개**(ai_job_stats·get_member_affiliations·list_ai_failures·list_pending_*×4·
  list_place_claims·review_business/event/place_claim/product·set_app_config·set_member_
  affiliation/tier·upsert_promotional_event): 전부 본문 첫줄 `has_role(auth.uid(),'admin')`
  검사 존재(권한상승 아님 — advisor 실질 오탐). 20260614234033 이 다른 admin RPC 만 회수했던
  것과 정합 위해 동일 패턴으로 anon 회수(authenticated 유지).

## 확인함 — 의도된 설계 (조치 불필요)

- **경제 함수**(spend/earn_hearts·points·claim_*·redeem_*·complete_tutorial 등): 전부
  `IF auth.uid() IS NULL THEN RAISE/RETURN` 로 anon 거부. 정상.
- **자기범위 함수**(pay_balance·create_quote_request·publish_invitation·get_my_*·upsert_my_
  listing*·create/update_my_branch): auth.uid() 소유권 검사 정상.
- **RSVP(anon-facing by design)**: submit(published 검증)·update(edit_token 매칭). 정상.
- **RLS 헬퍼**(has_role·is_couple_member·is_premium_member·is_quote_target): 조회자 컨텍스트
  평가라 anon/authenticated EXECUTE 필수 — 회수 시 anon 커뮤니티/장소 조회 깨짐. 유지.
- **`community_author_cards` SECURITY DEFINER 뷰(advisor ERROR)**: 노출 컬럼 = user_id·닉네임·
  wedding_style·role(예식일·지역·연락처 없음). 커뮤니티 작성자 배지를 anon 포함 조회하려
  DEFINER 유지가 의도(`20260613050000` 이 이 뷰만 제외). 심각 PII 아님 — 제품 결정으로
  wedding_style/role 공개 축소는 선택(로드맵).
- **공개 버킷 listing 8건**: 콘텐츠 자체 public, 코드 `.list()` 사용 0건. 카탈로그 6개 무해,
  community/vendor 2개는 경로 user_id 포함 가능(중위험) — 본인폴더 한정 하드닝은 staging 검증
  필요해 이월.
- **rls_enabled_no_policy 15건**: deny-all(백엔드 전용, 클라 read 0). 의도된 안전기본값.
- **rls_policy_always_true 2건**(client_error_logs·product_clicks): public INSERT + admin SELECT,
  INSERT-only 텔레메트리. 타인 열람 불가.
- **verify_jwt=false 엣지 15개**: 전부 자체 인증(admin token/service_role/OAuth state/webhook
  재조회). 결제 함수(kakao-pay·iap-verify·design-purchase): 서버 카탈로그 가격 재계산 +
  프로바이더 확정금액 대조 + 불일치 자동취소 + UNIQUE 멱등키 — 클라 금액 신뢰 지점 0건.
- **PII/시크릿 로그**: 토큰·이메일·카드·전체바디 유출 0건. verify-business:134·vendor-web-
  search:214 는 LOW 트리밍 권장 수준.

## 미완(세션 한도) — 다음 라운드 이월

- **스토어 정책(14차원 8번)**: Info.plist 권한 문구·ATT·IAP anti-steering(네이티브 하트충전이
  IAP 전용인지)·회원탈퇴 인앱경로·UGC 신고/차단/삭제 — `docs/260622_appstore_submission_runbook.md
  §11` 기준 대조 미완.
- **법률/개인정보(10·13번)**: 전자상거래 표시의무·환불 고지·미성년 결제·**delete_user_data
  파기 테이블이 AI 버킷/잡(dress·makeup·sdm·hair·photofix·consulting·photoshoot) 전수 커버
  하는지**·얼굴 사진 OpenAI/Google **국외이전 고지** — 미완. delete_user_data 는 이번에 grant
  만 잠갔고 **삭제 커버리지 자체 감사는 별건**(파기 누락이면 개인정보보호법 리스크).
- 백엔드 보안 이월분: pg_net public 스키마 이동, community/vendor 버킷 리스팅 하드닝.

## 검증

- 실DB: 마이그 적용 후 grant 재조회 — delete_user_data(anon·authd 회수, svc 유지),
  add_game_points·increment_ai_usage·admin_* (anon 회수, authd 유지) 전부 확인.
- 리포 파일 `20260702130000_lockdown_anon_definer_grants.sql` = 실DB 적용분과 동일(멱등 REVOKE/GRANT).
- 한계: e2e(실제 anon 호출 차단) 미실행 — grant 조회로 갈음. 스토어·법률 축 미완(위).
