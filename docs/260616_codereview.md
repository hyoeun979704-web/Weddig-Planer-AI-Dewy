# 260616 코드리뷰 — 머지된 PR #307~#312 사후 감사 + 정합성 검토

> 대상: `main` 에 새로 머지된 6개 PR(#307 배포가이드 · #308 견적 큐레이션/데이터연동 ·
> #309 업체 온보딩 가드 · #310 인스타 카드 렌더러 · #311 제휴 세일즈문서 · #312 사용가이드
> 카드뉴스). 머지 직후 6차원 + **dead-end UI** + **DB 정합성(RPC 인자·컬럼)** 을 fan-out
> 서브에이전트로 감사하고, 확정·저위험 결함만 표적 수정했다. e2e 워크스루는 별도
> `docs/260616_e2e_simulation.md`.

## TL;DR

- **P0 없음(신규).** 인가(RLS/RPC) 구멍 없음, dead-end UI 없음, RPC 인자↔시그니처 전부 일치.
- **확정 P1 2건 수정 완료**:
  1. `vendorDecision.ts` 가 `places.latitude/longitude`(오타)를 SELECT → 식장 좌표 시드가
     **조용히 no-op**(실제 컬럼은 `lat/lng`). → `lat/lng` 로 수정.
  2. `VendorList` 지역 배지 카운트가 정렬 기준과 **불일치**(`startsWith` vs `city===`) →
     배지 숫자와 실제 상단 정렬 수가 어긋남. → 정렬과 동일 기준으로 수정.
- **P0 후보(기존, 라이브 검증 필요)**: `useQuoteResponses` 의 `places(...)` embed 가
  `quote_responses.place_id` FK 부재 시 PGRST200 으로 응답 목록을 조용히 비울 수 있음.
  **#308 이전부터 존재**(이번 머지 회귀 아님). 배포 안전한 idempotent FK 마이그레이션 추가 +
  에러 로깅 추가. **라이브 DB 에서 embed 동작/스키마캐시 리로드 확인 필요.**
- **P2 정리**: 역할 다운그레이드 시 stale `businessProfile` 클리어, 견적 로드 에러 로깅.
- 문서 전용 PR(#307·#311·#312)·렌더러(#310)는 앱 로직 영향 경미(아래 영역별).
- 검증: `npm run build` 0 error · `npm run lint` 0 error(경고 723 사전존재) · `npm run test`
  429 pass / **1 사전 실패**(`aiPlannerPostprocess > auditFullText`, 머지 전부터 실패·본 변경 무관).

## 보안 · 인가

- **CLEAN.** 견적/보드 쓰기는 전부 `SECURITY DEFINER` RPC 가 `auth.uid()` 를 서버측에서
  도출(클라 `user_id` 미신뢰), 읽기는 RLS. `vendor_board_items` 직접 쓰기는 `.eq("user_id", user.id)`
  이중방어. 문자열 병합 SQL 없음, 시크릿 하드코딩 없음.
- 인스타 카드 렌더러(#310): 서비스롤 경로 + 유저 JWT 경로는 `getClaims`→`has_role(admin)`
  로 admin 게이트(형제 함수와 동일 검증). IDOR 없음. 에러 응답은 제네릭(서버 misconfig 는
  서버 로그만). *minor*: 최종 catch 가 `error.message` 를 클라로 반환(P2, 아래 deferred).

## P0 버그

- **신규 P0 없음.**
- **P0 후보(기존·라이브 검증 필요)** — `src/hooks/useQuotes.ts:158` `useQuoteResponses`:
  `.select("*, places(...)")` 가 `quote_responses` → `places` embed 를 쓰는데
  `quote_responses.place_id` 에 FK 가 **마이그레이션 파일상 없음**(테이블 정의
  `20260615014740_quote_requests_matching.sql:33` 에 `place_id uuid not null` 만, references 없음).
  FK 없으면 PostgREST 가 관계를 못 찾아 응답 쿼리가 빈 결과(에러는 destructure 가 삼킴).
  - **단, 이 embed 는 #308 이전부터 존재**(commit 47781994) → 이번 머지가 만든 회귀 아님.
    라이브 DB 에 FK 가 직접 추가돼 동작 중일 가능성도 있음(마이그레이션 파일 ≠ DB 적용).
  - 조치(배포 안전): `20260616000000_quote_responses_place_fk.sql` — place_id FK 가 없을 때만
    `NOT VALID` FK 추가(고아데이터·중복FK 안전) + `notify pgrst`. 에러는 `console.error` 로 노출.
  - **남은 검증**: 라이브 DB 에서 ① 현재 embed 동작 여부 ② 마이그레이션 적용 후 응답 목록
    정상 표시 — sandbox 에서 e2e 불가하여 미확인(검증 규칙 준수, 실환경 확인 요청).

## 정합성(스키마·RPC) 검토

- **[P1·수정완료] 컬럼 오타 — `latitude/longitude` → `lat/lng`**: `src/lib/vendorDecision.ts:70`
  (#308 신규)가 `places` 에서 `latitude, longitude` SELECT. 실제 컬럼은 `lat/lng`
  (`types.ts:4320`·`usePlaceDetail.ts:532` 의 기존 경고 주석으로 확정). PostgREST 42703 →
  `p` null → `seedWeddingVenueIfEmpty` 조기 return → 식장 좌표(`wedding_venue_lat/lng`) **영구
  미시드**. `(supabase as any)` 캐스트가 타입 검출을 가려 빌드·린트 통과(정적통과≠런타임). → 수정.
- **[OK] RPC 인자↔시그니처 전부 일치**: `create_quote_request`(9인자)·`submit_quote_response`·
  `accept_quote_response`·`mark_quote_booked`·`send_quote_message`·`get_quote_lead_contact`·
  `admin_review_listing`(`p_note` 포함)·`admin_set_member_tier`·`admin_review_partnership`·
  `admin_review_place_claim` 모두 DB 함수 파라미터와 정확히 일치(PGRST202 위험 없음).
- **[OK] #308 컬럼 실재**: `user_wedding_settings.wedding_venue_*`·`wedding_region`,
  `places.{city,district,is_partner,avg_rating,review_count,main_image_url}`,
  `vendor_board_items.{slot_key,status,place_id,vendor_name,memo,custom_label}` 모두 마이그레이션 존재.
- **[검증 필요·드리프트] `user_schedule_items.source`**: `vendorDecision.ts:46` 가 insert 하는데
  추가 마이그레이션 파일이 repo 에 없음(단 `types.ts:5536`·기존 `useWeddingSchedule` 가 이미
  사용 → 라이브 DB 엔 존재 추정). repo 마이그레이션 파일 백필 권장(파일≠적용 경고).
- **[OK] label vs value**: #308 의 지역 매칭(`useVendors`·`quoteMatch.ts`)은 **city 정확 일치**를
  의도적으로 사용(부분문자열 ILIKE 금지 — `충남`/`충청남도` 회귀 주석 명시). 신규 substring 위험 없음.

## Dead-end UI

- **CLEAN.** `HomeQuickLinks`(보드/내견적/비교)·업체 대시보드 CTA(다시신청·마이페이지·파트너신청)·
  견적 CTA 전부 실제 라우트 이동 또는 실 DB 쓰기. toast 만 띄우는 placeholder/no-op onClick 없음.
  `vendorBoard.ts` 는 공급 있는 슬롯에만 견적 CTA 부착(죽은 버튼 회피). 업체 메뉴의 `준비중`
  배지 분기는 존재하나 실제로 `준비중` 을 세팅하는 항목이 없음(영구 비활성 항목 미출고).

## P1/P2 — 견고성 (수정 완료)

| 위치 | 문제 | 조치 |
|---|---|---|
| `src/lib/vendorDecision.ts:70,84-85` | `latitude/longitude` 오타 → 식장 좌표 시드 no-op | `lat/lng` 로 수정 + 매핑 |
| `src/pages/VendorList.tsx:31` | 지역 배지 `startsWith` 가 정렬(`city===`)과 불일치 | 정렬과 동일 기준(`region===` or `startsWith(region+" ")`)으로 수정 |
| `src/hooks/useUserRole.ts:59` | business 역할 없을 때 stale `businessProfile` 잔존 | `else setBusinessProfile(null)` 추가 |
| `src/hooks/useQuotes.ts:155` | `Promise.all` 이 3개 error 를 모두 버림(embed 실패=빈화면 오인) | 3개 error `console.error` 로깅 |
| `supabase/migrations/20260616000000_*.sql` | quote_responses.place_id FK 부재 가능성(embed 실패) | idempotent `NOT VALID` FK + `notify pgrst` |

## #310 인스타 카드 렌더러 (검토)

- **[OK]** 폰트 폴백 실동작(Pretendard 우선 fetch+`.ok`, SUITE 는 try/catch+warn 후 Pretendard),
  `card_texts` 빈배열 400 가드, 단일카드 인덱스 안전, 인가 admin 게이트, 시크릿 비노출.
- **[P2·deferred]** 최종 catch 가 `error.message` 클라 반환(서버로그만 권장),
  `resvgInitialized` 동시 콜드 호출 더블-init 경합(단일플라이트 권장) — 둘 다 저빈도, 배포 후 확인.

## 검증

- `npm run build` ✓(0 error) · `npm run lint` ✓(0 error, 경고 723 사전존재) ·
  `npm run test` 429 pass / 1 사전 실패(`auditFullText`, 본 변경 무관·머지 전부터 동일).
- **한계(검증 규칙 준수)**: sandbox 에 Supabase 라이브 DB·Playwright 미연결 → quote embed FK 적용
  효과·식장 좌표 시드·업체 가드 새로고침 동작의 **클라 e2e 미확인**. 정적/타입/마이그레이션
  레벨까지 확인. 실환경 클릭 확인 권장(특히 ① 견적 응답 목록 표시 ② FK 마이그레이션 배포 후 embed).

## 남은 작업 (deferred)

- **[검증]** quote_responses place embed — 라이브 DB 에서 현재 동작 여부 + FK 마이그레이션 적용 후 확인.
- **[P1·제품]** `QuoteNew` 지역이 free-text Input → canonical 아닌 입력(`서울`/`경기`)은 매칭 0건
  (값 정규화 미스). 지역 picker(canonical value) 또는 입력 정규화 권장 — 범위 커서 deferred.
- **[P2]** `vendorDecision.ts`·`SetAsWeddingVenueButton` 의 `wedding_region` 시드 로직이 DB 트리거
  `sync_venue_region` 와 중복(DRY). 트리거를 단일 소스로 정리 권장.
- **[드리프트]** `user_schedule_items.source` 마이그레이션 파일 백필(라이브 존재 추정).
- **[P2]** 카드 렌더러 `error.message` 클라 노출·resvg 더블-init 단일플라이트.
- **[P2]** `BusinessDashboard` `setListingRow` 선언 전 참조(런타임 무해·가독성) 재배치.
