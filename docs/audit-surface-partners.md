# Partners(기업) 도메인 정밀감사 — 앱 분리 후 영역별 감사맵 (260625)

> 앱 분리 Phase 1(partners→`src/features/partners/`) 직후, **분리된 partners 도메인만** 14차원
> (AGENTS.md)으로 정밀감사한 결과. 분리의 목적("감사 빠짐 방지")대로 이 맵은 partners surface 전수를
> 다룬다. surface별 병렬 fan-out(4클러스터) + 실제 코드/실DB 확인. **단일 소스**: 전체 surface 맵은
> `docs/audit-surface-map.md`, 본 문서는 그 중 partners 부분의 심층판.

## TL;DR
- 🔴 **P0 1건(확정·실DB 검증)**: `business_profiles` self-UPDATE RLS 에 `WITH CHECK`·컬럼잠금 부재 →
  사업자가 자기 행의 **승인·인증·제휴등급·수수료를 직접 UPDATE 로 자가부여** 가능(권한상승). 운영자 승인
  전 과정과 `BusinessGuard` 가 무력화됨. **프로덕션 DB 변경이라 수정 방식·시점은 사용자 확인 후 적용.**
- 🟠 **P1 6건**: 디자인 등록 라우트 플래그 미가드(→이번에 수정) · 배송 수신자 위장 · 상품/미디어 인가
  RLS 단독 의존 · 이미지 URL 스킴 미살균 · 문의 연락처 PII 조기노출 · a11y(캐러셀 키보드·alt·랜딩).
- 🟢 **양호**: claim/verify-business IDOR 차단, draft 자동저장(VendorEdit 폼), CTA 전부 실제 mutation
  (dead-end 0), 리드 연락처 단계공개, 리뷰/문의 본문 잠금 트리거, 부팅 안정성.
- 이번 라운드 적용 수정: **디자인 등록 라우트 플래그 가드**(아래 §수정). P0·나머지 P1 은 §deferred.

## 커버리지 (partners surface × 14차원)
✅=점검함 / ⚠️=일부·DB확인 필요 / 모든 surface 14차원 훑음.

| Surface (route) | 점검 | 주요 발견 |
|---|---|---|
| BusinessLanding (`/business`) | ✅ | a11y(summary chevron·대비), 개인화 0~1단계 |
| BusinessOnboard (`/business/onboard`) | ✅ | 중복 제휴신청(P2), 빈 catch(P2), 폼 draft 없음(정보성) |
| BusinessDashboard (`/business/dashboard`) | ✅ | 제휴신청 race(P2), 부팅 안정성 양호 |
| BusinessClaim (`/business/claim`) | ✅ | IDOR 차단 양호(RPC SECURITY DEFINER) |
| BusinessVendorEdit (`/business/edit`) | ✅ | draft 보존 모범, 이미지 URL 미살균(P1) |
| BusinessProducts (`/business/products`) | ⚠️ | INSERT/DELETE 인가 RLS 단독(P1, DB확인), URL 미살균(P1) |
| BusinessGallery (`/business/gallery`) | ⚠️ | 동상(P1), orphan 업로드 잔존(P1), select label(P2) |
| BusinessDesigns (`/business/designs`) | ✅ | 라우트 플래그 미가드(P1→**수정함**), 결제 서버검증 양호 |
| BusinessLeads (`/business/leads`) | ✅ | 연락처 단계공개 양호, N+1(P2) |
| BusinessInquiries (`/business/inquiries`) | ✅ | 연락처 PII 조기노출(P1) |
| BusinessDeliveries (`/business/deliveries`) | ⚠️ | 수신자 위장 가능(P1, 마이그 주석에 기지 미결) |
| BusinessReviews (`/business/reviews`) | ✅ | 본문잠금 트리거 양호, 답글률 분모(P2) |
| BusinessCoupons (`/business/coupons`) | ⚠️ | moderation 컬럼 마이그 드리프트(P2) |
| BusinessEvents (`/business/events`) | ✅ | CTA 실제 mutation, 양호 |
| BusinessGuide/Detail/Index (`/business/guide*`) | ✅ | a11y(P1), 개인화 0~1단계(P1), dead-end 0 |

## P0 — business_profiles 권한상승 (확정, 실DB 검증)
**차원2 보안(인가)** · 정책: `supabase/migrations/20260316144406_*.sql` · 실DB `pg_policies` 확인(260625).

실DB 조회 결과 `business_profiles` 의 유일한 UPDATE 정책 =
`USING (auth.uid() = user_id)`, **`with_check = null`**, 컬럼 화이트리스트 없음. 권한 컬럼 잠금
트리거도 없음(`pg_trigger` 확인). 컬럼 `approval_status·partner_tier·is_verified·commission_rate_bps`
모두 존재.

→ 공격: 인증 사용자가
`from("business_profiles").update({approval_status:'approved',partner_tier:'bff',is_verified:true,commission_rate_bps:0}).eq('user_id', 본인)`
호출 → **운영자 승인·국세청 인증·최고 제휴등급(추천 우선노출)·수수료 0 을 스스로 부여.**
`admin_review_business`/`admin_set_business_tier` SECURITY DEFINER RPC 설계가 RLS 로 받쳐지지 않아,
클라 `BusinessGuard`(approval_status 기반)가 사실상 유일 방어 → CLAUDE.md §2 "인가 — RLS 가정이 클라
가드에만 의존" 정확히 해당.

**권장 수정(택1, 프로덕션 DB 변경 — 사용자 확인 후)**:
1. **BEFORE UPDATE 트리거(권장·견고)**: 비-service_role 이 권한컬럼을 바꾸면 예외/원복(SECURITY DEFINER).
2. **RLS WITH CHECK 컬럼 불변 강제**: `family_invites`(`20260523050000`) 의 "이전 행과 동일 강제" 패턴 재사용.
   self-UPDATE 는 일반 컬럼(상호·소개·연락처)만 허용, 권한 4컬럼은 불변.

## P1 (요약)
1. **디자인 등록 라우트 플래그 미가드** — `/business/designs` 가 `DESIGN_MARKET_ENABLED` 무관하게 도달
   (메뉴만 숨김). 직접 URL 로 승인대기 디자인 적재. → **이번 라운드 수정(§아래)**. 켤 때 결제 IAP 분기 필수
   (buyer `design-purchase-ready` = 카카오 외부 PG → native 3.1.1).
2. **배송 수신자 위장** — `vendor_deliveries` INSERT RLS 가 `owner_user_id` 만 검증, `recipient_user_id`
   가 실제 문의자인지 미확인 → 임의 uid 에 결과물 강제발송. 마이그 주석에 기지 미결. → INSERT WITH CHECK 에
   `EXISTS(place_inquiries ... recipient 일치)` 추가.
3. **상품/미디어 인가 RLS 단독** — Products/Gallery/Designs 가 `.from().insert/delete` 직접 + 클라
   `place_id` → 인가가 100% RLS 의존. `260624130000_business_place_ownership_rls.sql` 가 owner EXISTS 를
   추가했으나, 전 테이블 적용·삭제경로 커버 여부는 **실DB policy 재확인 필요**.
4. **이미지 URL 스킴 미살균** — VendorEdit/Products/Gallery/Designs 의 "외부 이미지 URL" 수동입력에
   `^https?://` 검증 없음(`javascript:`/`data:` 주입 → 공개 상세에 렌더). 문의/연락처 URL 은 검증하는데
   이미지만 빠짐. → 스킴 화이트리스트.
5. **문의 연락처 PII 조기노출** — `place_inquiries.contact` 가 답변 전부터 평문 노출(리드는 accepted/booked
   후 RPC 단계공개인데 문의함은 게이트 없음). → 노출 시점 정책 통일 검토.
6. **a11y** — ① GuideView 캐러셀 `tabIndex` 없어 키보드 포커스 불가 ② BusinessGuideIndex 썸네일 `alt=""`
   ③ BusinessLanding `<summary>` 펼침 상태 미표시·포커스링 없음 ④ 뒤로가기·점인디케이터 터치타깃 <44pt.

## P2 (요약)
중복 제휴신청 unique 부재 · Onboard 빈 catch(관측 누락) · 상품 등록 후 전체 재조회(N+1성) ·
parseInt NaN 가드 일부 누락 · 상품/사진/디자인 등록폼 draft 미적용 · orphan 업로드 잔존(생명주기) ·
콘솔 raw error PII · 쿠폰 moderation 컬럼 마이그 드리프트 · 리드 연락처 N+1 · 리뷰 답글률 분모(200 cap).

## 개인화 기회 매트릭스 (partners surface × 신호 × 현재→목표 깊이)
| Surface | 가용 신호 | 현재 깊이 | 목표 깊이 |
|---|---|---|---|
| BusinessLanding | 로그인여부·유입경로·(업종) | ④(CTA만) | ④ + 유입별 히어로 카피 |
| BusinessGuide(개요) | isBusiness·승인상태·진행단계·업종 | ① 거의 없음 | ③ 승인완료 시 가입슬라이드 생략·단계 강조 |
| BusinessGuideIndex | 진행단계(빈 영역)·업종 | ① 없음 | ② 빈 영역 가이드 우선 정렬 |
| BusinessGuideDetail | 승인상태(CTA 가드)·업종 | ① 없음 | ② 미승인 시 CTA 분기 + 업종 tip |
> 대시보드가 이미 "필수 6항목 충족" 진행단계·승인상태를 계산 → 그 신호를 가이드 정렬·CTA 분기로 흘리면
> 저비용 2~3단계 도달. 사업자 진행단계가 거의 안 쓰이는 사일로.

## 이번 라운드 적용 수정
- **P1-1 디자인 등록 라우트 플래그 가드** — `src/features/partners/routes.tsx`: `designs` 라우트를
  `DESIGN_MARKET_ENABLED ? … : <Navigate to="/business/dashboard">` 로 가드(InvitationMarket 일관).

## Deferred (다음 라운드 — 우선순위순)
1. **P0 business_profiles RLS/트리거 수정** — 사용자 확인 후 프로덕션 적용(가장 시급).
2. P1-2 배송 수신자 검증 트리거 · P1-4 이미지 URL 살균 · P1-5 문의 연락처 게이팅 · P1-3 RLS 실DB 재확인.
3. P1-6 a11y(캐러셀 tabIndex·alt·summary·터치타깃) · 개인화 ①→②(가이드 정렬·CTA 분기).
4. P2 모음(쿠폰 마이그 드리프트 역추가·콘솔 PII·N+1 등).

## 검증 한계
- P0 는 실DB `pg_policies`/`pg_trigger`/컬럼 조회로 **확정**. 나머지 P1 의 RLS 충분성(상품/미디어 삭제
  경로)은 실DB policy 전수조회를 다음 라운드로 이월. 클라 e2e(실기 결제·업로드)는 미확인.
