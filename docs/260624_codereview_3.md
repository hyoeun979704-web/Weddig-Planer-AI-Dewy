# 260624 전체 코드 감사 (Dewy 출시 직전 — 보안·P0버그·dead-end·공통화·성능)

5개 차원 병렬 심층 감사(보안 / 정확성·견고성 / dead-end UI / 공통화 DRY / 성능).
각 발견은 **실제 전체 코드를 읽고 검증**했으며, 실 DB(`pg_proc`) 교차확인 포함. 발췌 기반 과대보고는
배제하고, 과장된 후보는 강등·정정했다(말미 "오판 정정" 참조). 260623 1차(iOS 차원)의 후속 전체판.

## TL;DR
**P0 없음.** 방어 수준 전반적으로 매우 높음(RLS 소유자정책+본문 불변 트리거, 결제 금액 서버 재도출,
`payments.payment_key`/`iap_transactions` UNIQUE 멱등, IAP/카카오 권위 재조회). **출시 전 처리 권장 P1 3건**,
사용자 눈에 보이는 품질 이슈(라벨 드리프트·업체목록 성능) 약간, 나머지 P2 하드닝.

| # | 영역 | 이슈 | 심각도 | 파일 |
|---|---|---|---|---|
| S1 | 보안 | design 구매: 포인트 차감 실패해도 라이선스 grant → 무료 탈취 | 🔴 P1(금전) | `supabase/functions/design-purchase-approve/index.ts:80-101` |
| S2 | 보안 | webhook 발신자 검증 약함(apple fail-open / play OIDC 미검증) | 🟠 P1 | `apple-notifications-v2/index.ts:20`, `play-rtdn/index.ts:18` |
| B1 | 버그 | `create_quote_request` 8/9인자 오버로드 공존 → 이미지 유무로 갈림 | 🟠 P1 | `useQuotes.ts:65` ↔ 실DB 2개 정의 |
| D1 | DRY | 카테고리 라벨 인라인(예물/혼수 ≠ 정식) — 화면마다 다른 명칭 | 🟠 사용자노출 | `VendorDetailPage.tsx:23`, `chatbot/handlers/searchHandlers.ts:21` |
| D2 | DRY | 가격 포맷 재구현·동명이의(`formatWon`) — 카드 가격 핵심경로 | 🟠 | `lib/vendorInfoLines.ts:39`, `chatbot/handlers/priceStats.ts:97`, `placeMappers.ts:256` |
| P1 | 성능 | 업체목록 전량 fetch(limit 없음) + 비가상화 렌더 | 🟠 | `hooks/useVendors.ts:141`, `pages/VendorList.tsx:138` |
| — | (P2 다수) | 아래 상세 | 🟡 | — |

## 보안 (S)
**S1 [P1, 실 금전 손실]** `design-purchase-approve/index.ts:80-86` — `points_used>0`일 때 `spend_points` RPC가
실패해도 `console.error`만 하고 line 101에서 `design_purchases` 라이선스를 그대로 발급. ready가 잔액을
예약하지 않아(read만) ready→approve 사이 잔액 소진 시 **할인분만큼 공짜 + 포인트 유지**. 대칭 함수
`kakao-pay-charge-approve`는 동일상황에서 전체환불+미적립으로 올바르게 처리 → 디자인 쪽만 누락.
**수정**: `spErr` 시 카카오 cancel + `status='refunded'` + grant 중단(charge-approve 패턴 복제).

**S2 [P1]** webhook 발신자 검증: `play-rtdn`은 쿼리 비밀토큰만(OIDC JWS 미검증), `apple-notifications-v2`는
`if (expected)` 라 **`APPLE_ASN_TOKEN` 미설정 시 게이트 통째 스킵(fail-open)**. 둘 다 `getSubscriptionPurchaseV2`
권위 재조회로 entitlement 부여는 막혀 위조로 구독 만료(DoS성)만 가능 → P1. **수정**: apple를 fail-closed
(`if(!expected||got!==expected) 403`), 가능하면 JWS x5c/OIDC 서명 검증.

**P2**: `verify-business/index.ts:215,246` 가 `updError.message`/`profileError.message` 원문을 클라 응답에 concat
(같은 함수 catch는 제네릭인데 비일관) → 제네릭화. `useCoupleDiary.ts:248` `couple_diary_photos` delete가
소유자 필터 없이 `.eq("id",photoId)` — RLS DELETE 정책 **라이브 확인 필요(미확인-의심)**.

**확인—안전**: 클라 mutation 61건 전수 — 고가치 테이블은 RLS 소유자정책+본문 불변 트리거. 결제 ready 전부
금액·할인·하트 서버 재도출(클라 amount 불신), approve 소유권 대조+불일치 자동환불+UNIQUE 멱등. IAP 권위
재조회. 인젝션: `.or()` 전부 `postgrestEscape` 경유, raw SQL 없음, `dangerouslySetInnerHTML` 비-사용자입력.
시크릿 하드코딩 없음(anon key만).

## P0 버그·견고성 (B)
**B1 [P1]** `create_quote_request`가 실 DB에 **8인자(이미지 미처리, 구버전)·9인자(`p_image_paths`) 2개 오버로드
공존**(마이그 `create or replace` 4회 누적, 구 시그니처 DROP 안 됨). `types.ts:6291`엔 8인자만(stale).
supabase-js가 `p_image_paths` undefined면 키 omit→8인자 라우팅(이미지 없는 견적 정상), 이미지 있으면 9인자.
즉 "조용히 갈라짐" — 향후 한쪽만 고치면 회귀. **수정**: 구 8인자 `DROP FUNCTION` + `types.ts` 재생성.
(권장: 이미지 없이 견적 1건 실제 제출해 8인자 라우팅·INSERT 최종 확인.)

**P2**: `usePartnerDeals.ts:246`(increment_claim_count `.catch(()=>{})`+낙관적 카운트) → `console.warn` 추가.
`CoupleVoteDetail.tsx:118`(update `{error}` 미확인) → error throw. `Cart.tsx:66,73`(수량 ± 절대값 write,
더블클릭 last-write-wins) → 버튼 `disabled={isLoading}`. `useReferral/useAttendance/useCoupleLink` race는
useState 가드+서버 SECURITY DEFINER unique로 멱등 → P2 하드닝(useRef가 더 견고).

**확인—안전**: maybeSingle ~127개 전수 옵셔널체이닝/error가드 일관, 빈 catch{} 0건, import 섀도잉/TDZ 없음,
시그니처 일치 RPC 다수 확인(pay_balance·submit_quote_response·redeem_referral_code 등).

## dead-end UI (정상 — 출시 차단급 없음)
CLAUDE.md 경고 회귀(4천여 미입점 '문의하기' 토스트)는 **이미 수정됨**: `PlaceDetailLayout.tsx:301-371`이
입점=인앱시트 / 미입점+연락처=외부채널 / 둘다없음=견적전환(`/quote/new`)으로 분기, `isClaimed` 게이트가
RLS 실패 경로 차단(가짜 성공 없음). AIStudio "준비중"=waitlist 실제 INSERT, 결제 "준비 중"=`provider
unavailable`(iOS는 iap 반환→도달불가)인 안전기본값. `onClick={()=>{}}`·`href="#"`·핸들러없는버튼 **0건**.
정당한 placeholder: ValueTagChipRow(0건 필터칩, aria-disabled+설명), ComingSoonAdminPage(어드민 스텁),
챗봇 "곧 출시"(안내텍스트, 링크는 실재 라우트만).

## 공통화·성능 (D / P)
**D1 [HIGH, 사용자노출]** 카테고리 라벨 인라인 → `src/lib/categoryLabels.ts`(`PLACE_CATEGORY_LABEL`) 미사용:
`VendorDetailPage.tsx:23`(예물/혼수 ≠ 정식 주얼리/혼수가전), `searchHandlers.ts:21`(허니문→신혼여행, 키 `suit`
인데 DB는 `tailor_shop` → 매칭도 깨질 수 있음). 챗봇 답변과 카드 UI 명칭 불일치.

**D2 [HIGH/MED]** 가격 포맷 재구현(`src/lib/priceFormat.ts` 정식 미사용): `vendorInfoLines.ts:39` `formatWon`이
억/만원 재구현 + priceFormat의 `formatWon`과 **동명이의**(카드 가격 핵심경로). `priceStats.ts:97` `formatManwon`
중복정의(동작도 미묘히 다름). `placeMappers.ts:256` 인라인(같은 파일 151은 `formatManwonRange` 사용 — 자기모순).
+ FilterBar·searchHandlers 만원 인라인 다수.

**D3 [MED]** `formatDistanceToNow` 직접 호출(정식 `relativeTime` 미사용) 5곳(community/* , BookmarkedPosts).
`joinRegion` 미사용 인라인 산발(LOW).

**P1 [HIGH]** `useVendors.ts:141` `fetchVendorsByCategory`에 `.limit()` 없음 → 카테고리(수백~수천) 전량 fetch.
`VendorList.tsx:138-155`가 가상화 없이 전체 `.map()` 렌더 → 대량 DOM. **수정**: `.range()` 페이지네이션 +
react-window/tanstack-virtual. (select는 단일카테고리 join으로 이미 최적, over-fetch는 해결됨.)

**P2** `AuthContext.tsx:276` Provider `value={{...}}` 인라인 객체(함수 9개) 매 렌더 새 참조 → 모든 useAuth
소비자 리렌더 → `useMemo`.

## 오판 정정 (지난 감사 과대보고 교훈 반영)
- 결제 더블서밋(Checkout/HeartCharge): `isSubmitting` 가드+성공시 리다이렉트로 미재활성 → **안전(P0 아님)**.
- useState race(referral/attendance/link): 서버 멱등 → **P2**(P0 과장 정정).
- `budgetFormat.ts`: 예산 도메인(만원·소수 보존) **정식 단일소스** → DRY 위반 아님.
- `useValueTagAvailability` N+1: 고정 소수 옵션·head-only count → **오탐(LOW)**.

## 검증 한계
Edge functions(Deno)는 정적 점검 위주, 실기기 e2e 미확인. RLS 일부 정책·`create_quote_request` 라우팅·
가상화 프레임드랍은 코드/실DB 시그니처 기반 분석 — 출시 전 실환경 확인 권장(견적 제출, 결제 4경로, 위치/로그인).

## 우선순위
1. **출시 전(P1)**: S1 디자인구매 환불처리 · B1 create_quote_request 구 오버로드 DROP · S2 webhook fail-closed.
2. **품질(사용자노출)**: D1 라벨 단일화 · D2 가격포맷 단일화 · P1 업체목록 페이지네이션+가상화.
3. **하드닝(P2)**: best-effort 에러 로깅 · Cart 더블클릭 가드 · AuthContext useMemo · verify-business 에러 제네릭 · couple_diary RLS 확인.
