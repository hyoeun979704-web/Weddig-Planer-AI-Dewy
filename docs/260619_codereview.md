# 260619 코드리뷰 — 전체 감사 (보안·P0/P1·dead-end·iOS·공통화·스키마·라이브 e2e)

> 계기: "md 전체 확인 → 전체 감사 → 기능 고도화 계획(타 업체 전수조사 선행) → e2e 시뮬레이션 → 결과보고."
> 5개 차원을 병렬 서브에이전트로 전수 감사하고, **모든 핵심 P0/P1 주장은 직접 파일을 열어 라인 교차검증**
> (에이전트 라인 환각 방지 — 검증 규칙). 추가로 **라이브 Supabase DB(`qabeywyzjsgyqpjqsvkd`)에 직접 SQL**을
> 던져 스키마 드리프트·데이터 충전 상태를 실측(= "작동한다 ≠ 검증됨"의 e2e 근거).
> 범위: src 120 pages · 52 edge functions · 139,941 LOC. 베이스 `main`, 브랜치 `claude/md-review-audit-at4qt5`. 기준 커밋 `ef3de07`.
> 본 문서는 **진단 + 일부 안전 픽스 적용**: 결제 머니패스·대규모 리팩터는 우선순위 지정 후로 deferred(아래 표).

## TL;DR — 핵심 성과

- **진짜 불(라이브 사용자 경로) 3건**, 전부 직접 확인:
  ① **MergeGame iOS 사파리 프라이빗 모드 흰화면 크래시**(raw `localStorage` 를 `useState` 초기화에서 접근 →
  throw → 페이지 전체 렌더 실패). 260617 감사에서 진단됐으나 **픽스 미적용 → 여전히 OPEN**. → **이번에 수정**.
  ② **장바구니 크래시**(`useCart`): 삭제된 상품이 카트에 남으면 임베드 조인이 `null` → `item.product.sale_price`
  접근에서 `TypeError` → 카트 페이지 전체 down. → **이번에 수정**.
  ③ **커플 연결해제 무음 실패**(`useCoupleLink`): unlink 3-write 가 `{ error }` 미확인 → RLS/실패해도 성공처럼 보이고
  UI 는 해제됐는데 DB 는 `linked` 잔존 → **헤어진 상대에게 공유 데이터가 계속 노출**(프라이버시). → **이번에 수정**.
- **결제 견고성 클러스터(P1, 4개 edge function)**: 금액검증·멱등성·인가는 **견고**하나, 드문 실패 경로에서
  "돈은 받았는데 권한/포인트 정합성이 깨지는" 미확인 update/grant 가 4곳. **머니패스라 실 카카오 호출을 직접 못
  밟는 한 블라인드 수정 금지**(검증 규칙) → **정밀 진단만, 픽스 deferred**(디자인 마켓은 OFF라 실손해 0).
- **보안**: 라이브 advisor 1 ERROR(`community_author_cards` SECURITY DEFINER 뷰가 RLS 우회 노출) + unescaped
  ILIKE 3곳(P2) 외엔 전반 견고. → ILIKE escape **이번에 수정**, 뷰는 마이그레이션 권고(deferred).
- **스키마 드리프트 — 라이브 실측으로 prior 경보 1건 해소**: 260617 이 P1로 올린 `business_coupons/events.place_id
  = TEXT vs places.place_id = UUID` 타입 불일치는 **현재 라이브 DB 에서 셋 다 `uuid`** = **이미 정렬됨**(prior 경보 close).
- **dead-end UI 0건**(신규), **N+1 0건**(bulk `.in()` 적용 우수), draft 자동저장·safe-area **우수**.
- **공통화(DRY)**: inline `.toLocaleString()+"원"` **72곳** 미사용 + CATEGORY_LABEL/FAVORITE_TYPE 사본 → 단일 소스 미적용(드리프트 위험). deferred(대규모, 표적 PR 권장).
- **라이브 데이터 실측**: 활성 업체 4,213(콘텐츠 충실)이나 **partner_rank>0 = 0 · 활성 partner_deals = 0 · 커뮤니티/문의 = 0**
  = 디렉터리는 살아있고 **제휴·소셜·수익 레이어는 미충전(pre-launch)**. 고도화 계획의 핵심 전제(아래 plan 문서).

---

## ❌ P0 — 라이브 경로에서 실제로 깨짐 (직접 확인 + 이번에 수정)

### P0-1. MergeGame iOS 사파리 프라이빗/추적방지 모드 흰화면 크래시 ✅직접확인·수정완료
- **`src/pages/MergeGame.tsx:38`** — `useState(() => Number(localStorage.getItem('mergeGame_best') ?? 0))`.
  iOS 사파리 프라이빗·추적방지·용량초과 시 localStorage 접근이 **throw** → useState 초기화에서 터지면 컴포넌트
  렌더 자체가 실패(흰 화면). 같은 raw 접근이 `:171,:187` setItem 에도. (AGENTS.md 7-① 회귀 = iOS 가입 실패와 동일 패턴.)
- **상태**: 260617_codereview_4 P0-1 로 진단됐으나 그 문서는 진단 전용 → **픽스가 실제론 적용 안 됨**, 라인 그대로 OPEN이었음.
- **수정**: 읽기는 `try{…}catch{return 0}`, 쓰기는 try-catch 래핑(`src/lib/safeStorage` 어댑터 패턴과 동일 정책).

---

## 🟠 P1 — 정합성/프라이버시 (직접 확인)

### P1-1. 장바구니 null 상품 크래시 ✅직접확인·수정완료
- **`src/hooks/useCart.ts:35` → `:137`** — `product: item.products`(임베드 조인)는 상품이 삭제되면 `null`을 반환(필터 안 됨).
  이후 `item.product.sale_price ?? item.product.price`(`:137`)에서 `TypeError: Cannot read properties of null`
  → 카트 페이지 전체 크래시. 재고 소진/판매중지 상품을 담아둔 사용자가 카트를 열면 발생.
- **수정**: `fetchCartItems` 에서 `item.products` null 행 제외 + `totalAmount` 합산에 옵셔널 체이닝/0 fallback.

### P1-2. 커플 연결해제 무음 실패 → 공유 데이터 잔존 노출(프라이버시) ✅직접확인·수정완료
- **`src/hooks/useCoupleLink.ts:218-233`** — unlink 가 `couple_links` 1건 + `user_wedding_settings` 2건을 await
  하지만 supabase-js 는 throw 가 아니라 `{ error }` 반환인데 **error 를 한 번도 확인하지 않음**. RLS 거부/네트워크
  실패해도 `setCoupleLink(null)` 로 UI 만 해제 → **DB 는 `linked` 유지, 헤어진 상대에게 일정·예산 등 공유가 지속**.
- **수정**: 각 write 의 `{ error }` 확인, 하나라도 실패 시 throw(상위 catch 가 토스트로 사용자에 실패 통지·상태 미정리).

### P1-3 ~ P1-6. 결제 견고성 클러스터 ⚠️정밀진단·픽스 deferred(머니패스, 블라인드 수정 금지)
> 금액 서버검증·`UNIQUE(payment_key)` 멱등성·소유자 403 가드·금액불일치 자동환불은 **전부 정상**(아래 CLEAN 참조).
> 아래는 "승인은 났는데 후속 정합성 write 가 미확인"인 드문 실패 경로. 실 카카오 승인을 직접 못 밟으므로(검증 규칙)
> 진단만 남기고 수정은 우선순위 지정 후. 디자인 마켓은 `DESIGN_MARKET_ENABLED=false` 라 P1-6 실손해 0.

- **P1-3 `supabase/functions/kakao-pay-charge-approve/index.ts:251-286`** — earn(하트적립) 실패 시 환불 경로가
  카카오 취소 + payment refunded 마킹만 하고 **이미 차감한 `pointsSpent` 재적립을 안 함**(주석은 대칭 환불을 주장하나
  코드가 누락). → 하트는 못 받고 포인트만 날아감. 픽스: 환불 시 포인트 reverse RPC 동반.
- **P1-4 `supabase/functions/kakao-pay-order-approve/index.ts:94`** — `orders` "paid" update 결과 미확인.
  실패 시 결제는 됐는데 주문이 pending 잔존, tid 멱등 재시도는 `alreadyProcessed` 로 빠져 정합 보정 없음. 픽스: update error → 500/보정.
- **P1-5 `supabase/functions/kakao-pay-approve/index.ts:264-266`** — 비중복 `payments` insert 에러를 로그만 하고
  **구독은 그대로 부여**(:276-289) → 결제레코드 없는 유료 구독. 픽스: 비중복 insert 실패 시 권한부여 전 중단/환불.
- **P1-6 `supabase/functions/design-purchase-approve/index.ts:78,106`** — order update(:78) 미확인 +
  `design_purchases` 라이선스 grant 실패(:106)를 `console.error` 만(결제 확정·tid 멱등 후) → 결제했는데 라이선스 미지급,
  재시도 회복 불가. **마켓 OFF라 현재 실손해 0**(켜기 전 필수). 픽스: `grantErr` 확인 → 환불/보정.

---

## 🔐 보안 / RLS / 라이브 advisor

### 라이브 advisor 실측 (Supabase security advisors: ERROR 1 / WARN 181 / INFO 14)
- **ERROR(1) — `public.community_author_cards` SECURITY DEFINER 뷰** ⚠️deferred(마이그레이션 권고).
  뷰가 `profiles.community_nickname` + `user_wedding_settings.wedding_style/role` 을 작성자 기준 노출하는데
  **SECURITY DEFINER 라 caller RLS 우회** → `user_wedding_settings` 의 per-user RLS 를 무시하고 작성자 wedding_style/role
  을 anon 에 노출. 표시용 공개 메타라 민감도는 낮음(P2)이나 ERROR 등급. 픽스: PG17 → `ALTER VIEW … SET (security_invoker = on)` 마이그레이션.
- **WARN 181 의 대부분(150건)** = SECURITY DEFINER 함수의 `anon/authenticated` EXECUTE 권한 — 보일러플레이트 하드닝
  권고(능동 누출 아님). `function_search_path_mutable` 19건은 일괄 `SET search_path` 권고.
- **`rls_policy_always_true`(3) — `client_error_logs`·`product_clicks`·`service_waitlist`** INSERT open(`USING true`):
  텔레메트리/대기열 엔드포인트라 의도적이나 스팸 노출. (rate-limit/captcha 또는 size 캡 권고.) **rls_disabled_in_public 은 0건**(양호).
- `extension_in_public`: `pg_net` 를 public 스키마에서 이동 권고.

### 코드 레벨 (서브에이전트 + 직접 검증)
- **P2 unescaped ILIKE ✅이번에 수정** — `src/hooks/useVenues.ts:45,50`·`useCommunityPlaces.ts:33`·
  `useCategoryData.ts:338,354` 가 사용자 입력을 `%${…}%` 로 보간(`escapeLikePattern` 미적용). read-only·`is_active` 게이트라
  SQLi/인가우회 아님 = 와일드카드 왜곡/경미 DoS(P2). escape helper 가 `src/lib/postgrestEscape` 에 있는데 미사용 → 적용.
- **P3 verify-business** `index.ts:215,246` 가 `updError.message`/`profileError.message` 를 클라 응답에 덧붙임(내부 DB
  에러 텍스트 경미 누출). 제네릭 메시지로 교체 권고(deferred).

### CLEAN (이상 없음 — 직접 확인)
- 결제 금액 서버검증(`PLAN_INFO`/`HEART_PACKAGES`/`orders.total_amount` 대조 + 불일치 자동환불), `UNIQUE(payment_key=tid)`
  멱등 + 기존행 단락, `partnerUserId !== userId` 403, 포인트할인 50% 캡, 클라 `.from()` write 의 user_id auth-scope·RLS
  백킹(클라가 role/is_verified/approval_status/commission/balance 직접 set 안 함), src 하드코딩 시크릿 0, console PII 0.

---

## 🪦 dead-end UI / placeholder CTA — 신규 0건 (서브에이전트 전수 + 스팟 확인)
- 상세/딜/비즈니스/체크아웃/문의 주요 CTA 전부 실제 동작 수행. `Deals.tsx:210-212` 는 0건 시 "해당 카테고리에 혜택이
  없습니다" 빈상태(라이브 partner_deals=0 와 합치 — dead-end 아님). `PlaceDetailLayout:302+` 는 연락처 truly 없을 때만
  비활성, 그 외 CTA actionable. `ValueTagChipRow` "준비 중" 칩은 안내 토스트(버튼 아님). 260617 의 미입점 '문의하기' toast
  백로그는 PlaceDetailLayout 게이팅으로 해소됨.
- (관리자) `/admin/wedding-photo-refs` "준비중" 배지 → `ComingSoonAdminPage` 로 명시적 안내(숨은 dead-end 아님).

## 📱 iOS / 사파리(웹)
- **수정**: MergeGame raw storage(P0-1, 위).
- **잔존 LOW**(비치명 플래그 — deferred): `Suit.tsx:34,36`·`Community.tsx:149-174`·`Schedule.tsx:95` 의 raw
  session/localStorage 가드 플래그 쓰기 try-catch 미적용. 크래시 아닌 플래그라 LOW.
- **우수**: `useTextDraft`/`formDraft` 자동저장(CommunityWrite·Contact·QuoteNew·PlaceInquirySheet 등), `.safe-sticky-header`
  37파일·`safeArea.ts`. WeddingBlessingSplash·VenueCrossLink·BudgetAddSheet 는 이미 안전 래핑.
- **권고(deferred)**: 네트워크 에러 매핑이 "Load failed"(iOS) vs "Failed to fetch"(Chrome) 양쪽 커버 확인, HEIC 업로드 변환.

## ⚡ 성능 / 공통화(DRY)
- **N+1 CLEAN** — `usePartnerDeals` 가 `Array.from(new Set(ids))` + 단일 `.in(place_id, ids)` bulk. 스켈레톤 `Array.from`
  은 placeholder(정상).
- **DRY deferred(대규모 표적 PR 권장)**: inline `.toLocaleString()+"원"` **72곳** → `formatWon()`(`src/lib/priceFormat.ts`)
  미사용. CATEGORY_LABEL 사본(`VendorDetailPage:23`·`PlaceImagePlaceholder:36`·`AdminPlaceEdit:49` — 라벨이 "드레스샵"
  vs "드레스" 등 **이미 갈라짐**) + FAVORITE_TYPE 사본(`VendorDetailPage:35`) + `QuoteDetail.tsx:13` 지역 `won()`
  → `categoryLabels.ts`/`priceFormat.ts` 단일 소스로 통합 필요. (드리프트 실재 — 우선 라벨 사본부터.)

---

## 📊 라이브 DB 실측 (e2e 근거 — 2026-06-19, project `qabeywyzjsgyqpjqsvkd`)

| 지표 | 값 | 해석 |
|---|---|---|
| places 총/활성 | 4,304 / **4,213** | 디렉터리 콘텐츠 충실(살아있음) |
| partner_rank > 0 | **0** | 제휴 등급 큐레이션 데이터 미충전 |
| 활성 partner_deals | **0** | 혜택/딜 피드 사실상 빈 상태(빈상태 UI 로 정상 degrade) |
| business_coupons / events | 1 / 1 | 테스트 수준 |
| products(active) | 18 | 커머스 시드 단계 |
| community_posts / inquiries | 0 / 0 | 소셜·리드 레이어 미가동(pre-launch) |
| profiles / wedding_settings | 34 / 8 | 초기 유저 |
| couple_links(linked) / places(claimed) | 1 / 8 | 입점·커플연결 시드 |
| place_id 타입(places/coupons/events) | **uuid / uuid / uuid** | 260617 TEXT/UUID 드리프트 경보 **해소 확인** |

> 결론(e2e): **디렉터리(검색·상세)는 실데이터로 동작**하나, **제휴·딜·커뮤니티·커머스는 미충전** = 콘텐츠/공급 측
> 충전과 입점 세일즈가 다음 병목. 고도화 계획은 이 전제 위에서 우선순위를 잡는다(→ `docs/260619_feature_enhancement_plan.md`).

---

## 적용 마이그레이션·픽스 (이 PR)

| # | 영역 | 파일 | 상태 |
|---|---|---|---|
| P0-1 | iOS 크래시 | `src/pages/MergeGame.tsx` | ✅ 수정 |
| P1-1 | 카트 크래시 | `src/hooks/useCart.ts` | ✅ 수정 |
| P1-2 | 커플해제 프라이버시 | `src/hooks/useCoupleLink.ts` | ✅ 수정 |
| P2 | ILIKE escape | `useVenues.ts`·`useCommunityPlaces.ts`·`useCategoryData.ts` | ✅ 수정 |

## 남은 작업 (deferred — 우선순위 지정 후)

| # | 영역 | 위치 | 비고 |
|---|---|---|---|
| P1-3~6 | 결제 정합성 4건 | kakao-pay-*·design-purchase-approve | 머니패스 — 실 호출 검증 동반 필요. 디자인 마켓은 OFF |
| P2 | SECURITY DEFINER 뷰 | `community_author_cards` | `security_invoker=on` 마이그레이션 |
| P2 | always-true INSERT RLS | client_error_logs·product_clicks·service_waitlist | size 캡/rate-limit |
| P3 | 에러 메시지 누출 | verify-business:215,246 | 제네릭화 |
| LOW | raw storage 플래그 | Suit·Community·Schedule | try-catch 래핑 |
| DRY | 72× toLocaleString + 라벨 사본 | priceFormat/categoryLabels 단일 소스 | 표적 리팩터 PR |
