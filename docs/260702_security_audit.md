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

- ~~스토어 정책(14차원 8번)~~ · ~~법률/개인정보(10·13번)~~ · ~~delete_user_data 파기 커버리지~~
  → **2차 세션(같은 날)에서 완료** — 아래 "§2차 세션(이월분 실행)" 참조.
- 백엔드 보안 이월분(여전히 이월): pg_net public 스키마 이동, community/vendor 버킷 리스팅 하드닝.

## 검증(1차 세션)

- 실DB: 마이그 적용 후 grant 재조회 — delete_user_data(anon·authd 회수, svc 유지),
  add_game_points·increment_ai_usage·admin_* (anon 회수, authd 유지) 전부 확인.
- 리포 파일 `20260702130000_lockdown_anon_definer_grants.sql` = 실DB 적용분과 동일(멱등 REVOKE/GRANT).
- 한계: e2e(실제 anon 호출 차단) 미실행 — grant 조회로 갈음.

---

# §2차 세션(이월분 실행) — 파기 커버리지 + 법률/개인정보 + 스토어 정책

> 방법: 병렬 감사 3축(파기 커버리지[실DB 대조] / 법률·개인정보 / 스토어 정책) fan-out 후
> 발견 전건을 오케스트레이터가 코드·실DB 로 재검증하고 확정 결함만 수정.

## TL;DR (2차)

- **파기 커버리지 P1 3건 수정**: ① sdm 버킷(스드메 얼굴사진) 탈퇴 즉시파기 누락 ② vendor-deliveries
  (업체가 보낸 보정본 = 소비자 얼굴)가 업체 uid 폴더라 **구조적으로 파기 불능**이던 것 ③ couple_links
  단일행 모델에서 **파트너측 탈퇴 시** 일기·투표응답·링크 잔존. 전부 수정 + 실DB 적용.
- **역드리프트 P2**: "보존" 선언 테이블 8개(heart/point_transactions·billing_attempts·user_hearts·
  user_consents·design_purchases·design_purchase_intents·iap_transactions)가 실DB 에선 auth.users
  FK CASCADE 라 **탈퇴 시 전량 소실**되던 것(거래기록 보존의무·동의 입증과 정반대) — FK 해제로 보존.
- **미적용 드리프트 P1 재발견**: `20260620040000`(ai_content 신고 허용) 실DB 미적용 → **AI 생성물
  신고가 CHECK 위반으로 전량 실패 중**이었음. 재적용 + 후기 신고('review')까지 확장.
- 법률/개인정보: 약관 가격표 드리프트·구독 자동갱신 오기재·디자인마켓 청약철회 고지 부재·미성년
  결제 고지 부재·Privacy 수탁자 오기재(PortOne — 실코드 0건)·위치약관 과대기술 등 수정.
- 스토어: 후기 신고 수단 부재(1.2)·SKAdNetworkItems 부재·Android 위치권한 미선언(JIT 카드 100%
  실패)·iOS 결제 dead-end 3곳 게이트.

## 파기 커버리지 (P0 축 — 실DB 147개 테이블 × FK confdeltype 전수 대조)

수정(마이그 `20260702150000_delete_user_data_destruction_coverage.sql` — **실DB 적용·검증 완료**):

- **[P1] 파트너측 커플 데이터 잔존** — RPC 가 `couple_links.user_id` 만 삭제해 partner 측 탈퇴 시
  couple_diary(본문·기분·사진)·couple_votes 응답·링크 잔존. → couple_diary(author_id) DELETE,
  couple_votes 파트너 필드 NULL(행 소유자는 상대방이라 행 보존), couple_links unlink(클라 패턴 동일),
  user_wedding_settings.partner_user_id NULL.
- **[P2] 무FK 잔존 테이블** — community_notifications(recipient/actor)·quote_messages(sender)·
  quote_responses(owner)·business_coupons/business_events(owner) DELETE 추가(업체 계정 탈퇴 커버).
- **[P2] 보존 8테이블 역드리프트** — FK CASCADE 해제(위 TL;DR). ⚠️ 보존/삭제 분류 자체는
  20260624120100 의 운영 정책 — 법무 확인 권장 유지.
- **[P3] product_blocklist.blocked_by FK(NO ACTION)** — 차단 이력 남긴 관리자의 auth 삭제가 FK
  위반으로 실패(탈퇴 500) → ON DELETE SET NULL.
- **[P1] 스토리지 파기 누락** (`supabase/functions/delete-account/index.ts`): ① `sdm-uploads`·
  `sdm-results` 를 USER_CONTENT_BUCKETS 에 추가(기존엔 30일 cleanup 만 — 즉시파기 실패)
  ② `vendor-deliveries` — 수신자(소비자) 탈퇴 시 행 기준 `file_paths` 파기(`removeReceivedDeliveries`,
  auth 삭제 cascade 전 실행) + 업체 본인 탈퇴용 prefix 버킷 추가 ③ removeUserFiles offset
  페이지네이션(폴더당 1000개 초과 잔존 방지).
- 커버 확인(수정 불요): AI 스튜디오 잡 테이블 전수(dress/makeup/hair/photofix/consulting jobs+usage =
  RPC, sdm_previews = FK cascade), photoshoot 테이블·버킷은 실DB 미존재(N/A), 30일 cleanup
  (`cleanup-ai-uploads` RETENTION_DAYS=30 + pg_cron) 정상. 보존 대상(payments·orders·subscriptions·
  user_points)은 FK 없음 = 실제 보존 ✓.

## 법률/개인정보 (10·13번)

- **[P1] 약관 제6조 하트 가격표 드리프트** — 실판매가(9,900/13,900/19,900)와 불일치(11,900/24,900/
  54,900 기재) → 금액 나열 제거, 결제화면 참조로 단일소스화(`Terms.tsx`).
- **[P1] 약관 제8조 "자동 갱신되지 않으며"** ↔ IAP 는 자동갱신 → 웹/스토어 분기 기술로 정정.
- **[P1] 미성년자 결제 보호** — 약관 제6조에 취소권 항 신설 + 하트·구독·디자인 3개 결제 화면에
  고지 추가(`packages/lib/src/legalNotices.ts` MINOR_PAYMENT_NOTICE 단일소스).
- **[P1] 디자인 마켓 청약철회 고지 전무** — `InvitationMarket.tsx` 구매 다이얼로그에 전상법 제17조
  동의 체크박스(+미동의 시 구매버튼 disabled) 추가.
- **[P1] Privacy §5 수탁자 오기재** — "PortOne" 은 레포 전체에 사용 코드 0건(실제: 카카오페이 직연동
  + IAP) → ㈜카카오페이·Google/Apple(인앱결제)로 정정. Google 위탁업무에 "업로드 사진 품질
  검사(Gemini)" 추가(studioEdge precheck 가 얼굴사진을 Gemini 로 전송).
- **[P2] Privacy §3 "AI 결과물: 탈퇴 시까지"** ↔ 실제 30일 자동삭제 → "생성 후 30일"로 정정(문서를
  실제에 맞춤). §6 국외이전에 이전받는 자 연락처·거부 방법 추가(PIPA §28조의8).
- **[P2] PhotoUploadConsent** — 수탁사에 Gemini 명시 + "본인 사진만"을 커플/동반인 호환 문구로
  일반화(청첩장 2인 사진과 충돌 해소).
- **[P2] 위치기반** — `LocationJITCard` 에 약관 링크 + `user_consents(location_jit_v1)` 동의 기록,
  `LocationTerms` 제4조 "6개월 보관" → 실제(좌표 미저장·세션 내 즉시 파기)로 정정.
- 확인함(수정 불요): 전자상거래 표시의무는 `companyInfo.ts` 단일소스로 푸터·약관·결제화면 완비,
  하트/구독 청약철회 동의 체크 완비, 30일 삭제 집행 확인(cleanup-ai-uploads + pg_cron), AI
  디스클레이머 6개 결과화면 완비.
- **오너 판단 필요(코드로 못 정함)**: 약관 "식전영상 외주 29,900~89,900원"의 실판매 여부(결제 flow
  코드에 없음), PortOne 도입 계획 여부, 약관·방침 개정 공지 절차(7일/30일), 위치기반서비스사업
  신고(방통위) 필요 여부 — 현 구현은 좌표 미저장이라 부담 낮음.

## 스토어 정책 (8번)

- **[P1] 업체 후기 신고 수단 전무(App Store 1.2)** — `ReviewCard`(PlaceDetailLayout)에 신고 버튼 +
  기존 `ReportDialog`/`useReportContent` 재사용(`target_type='review'`, DB CHECK 확장 동반).
- **[P1] AI 생성물 신고 실DB 전량 실패(드리프트)** — 20260620040000 미적용이라 `ai_content` 가
  CHECK 위반. 20260702150000 에서 재적용(+review). **"머지 ≠ 적용" 구조 리스크의 3번째 실사례**
  (reaper·delete_user_data grant 에 이어) — `docs/260625_migration_baseline_plan.md` 정합 시급.
- **[P2] SKAdNetworkItems 부재** — Info.plist 에 Google 자체 네트워크 ID(cstr6suwn9, 플러그인 공식
  문서 기재값) 추가. ⚠️ 한계: Google 권장 서드파티 목록(~50개)은 developers.google.com 이 CI 네트워크
  정책으로 차단되어 미반영 — 오너가 `skadnetworkids.json` 받아 추가 필요(plist 주석에 URL 기재).
- **[P3] Android 위치권한 미선언** — WebView geolocation 은 manifest 권한 없으면 무조건 거부라
  JIT 카드가 Android 네이티브에서 100% 실패 → `ACCESS_COARSE_LOCATION` 추가(시도 단위라 COARSE 만).
- **[P2] iOS 결제 dead-end 3곳**(IAP 미오픈 빌드에서 가격 노출+결제 불가 = 심사 2.1 소지) —
  ① `/points/charge` 직접 진입 시 `/points` 로 redirect ② Premium 가격 카드 섹션을
  isPaymentEntryVisible() 게이트로 숨김 ③ 디자인마켓 원화 가격 뱃지 네이티브 미표시.
- **[P3]** AccountDeletion 안내 문구를 실제 메뉴 경로("설정 → 계정 → 계정 삭제")로 정정.
- 확인함(수정 불요): iOS 권한문구 5종 ↔ 실사용 일치(카메라·사진은 WKWebView 파일선택용으로 유지
  필요), ATT 흐름(initialize 전 requestTrackingAuthorization) 정상, IAP anti-steering steering 문구
  0건, 회원탈퇴 인앱 경로 완비, 커뮤니티 신고/차단/삭제 3종 실백엔드 연결 완비.
- **오너 액션 필요**: ① `PrivacyInfo.xcprivacy` 생성(Xcode 타깃 멤버십 필요 — 리눅스에서 파일만
  두면 번들 미포함) ② App Store Connect IAP 상품 등록 후 `IOS_IAP_RELEASED=true` ③ SKAdNetwork
  서드파티 목록 추가 ④ 빌드 산출물 merged manifest 에서 BILLING 권한 확인.

## 미점검(명시적 deferred)

- 하객사진 노출면 모더레이션, 파트너스(B) 영역 UGC, Sign in with Apple 동작, 카카오 챗봇 표면.
- admin_reports_overview 뷰의 review/ai_content preview 컬럼(NULL 로 표시됨 — 동작엔 지장 없음,
  콘솔 UX 개선은 선택).
- 백엔드 보안 이월분(1차와 동일): pg_net 스키마 이동, community/vendor 버킷 리스팅 하드닝.

## 검증(2차)

- 실DB: `20260702150000` apply_migration 적용 후 재조회 — 함수 본문에 신규 DELETE 포함 ✓, grant
  (anon/authd=false·svc=true) ✓, 보존 8테이블 auth.users FK 0건 ✓, product_blocklist FK SET NULL ✓,
  community_reports CHECK = post/comment/ai_content/review ✓.
- `npm run build` ✓ · `npm run test`(129 파일/1308개) ✓ · `npm run lint`(0 errors) ✓ ·
  delete-account esbuild 번들 ✓.
- 한계: 탈퇴 e2e(실계정 삭제→버킷/테이블 잔존 0 확인)는 실계정 파괴라 미실행 — 실DB 정의·경로
  검증으로 갈음. edge 배포는 main 머지 시 자동. 네이티브(ATT·IAP·위치권한)는 실기기 확인 필요.
