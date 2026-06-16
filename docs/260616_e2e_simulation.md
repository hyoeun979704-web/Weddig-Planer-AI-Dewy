# 260616 e2e 시뮬레이션 — 머지된 큐레이션·연동·온보딩 여정

> `docs/feature-simulation.md` 방법론(페르소나별 surface walkthrough · ✅/⚠️/❌ ·
> dead-end UI 동시 점검)에 따라, 이번에 머지된 PR #308(견적 큐레이션·데이터 연동)·
> #309(업체 온보딩 가드)·#310(카드 렌더러)이 바꾼 **사용자 여정을 현재 코드 기준으로**
> 워크스루한다. stale 스냅샷 불신.
>
> **한계**: 이 sandbox 는 Supabase 라이브 DB·실기기/Playwright 가 차단됨 → 아래는
> **코드 경로 기준 정적 워크스루**(검증 규칙 준수). "검증함"이 아니라 "코드상 이렇게 동작"이며
> 실환경 클릭 확인이 필요한 항목은 ⚠️/❌ 로 표기.

## 1. 견적 요청 → 응답 큐레이션 (A1 이지원 · A2 박서연 · B2 최도현)

| 단계 | 경로 | 평가 | 메모 |
|---|---|---|---|
| 보드 슬롯 → '견적 받기' | `VendorBoard` → `QuoteNew` | ✅ | 등록 식장/지역(`wedding_venue_city`>`wedding_region`)으로 지역 1회 시드(입력 중이면 미덮음) |
| 지역 입력 | `QuoteNew` city Input | ⚠️ | **free-text** — canonical 아닌 입력(`서울`/`경기`)이면 RPC `p.city=btrim` 정확매칭 0건. 시드값(canonical)은 안전. → picker 권장(deferred) |
| 요청 제출 | `create_quote_request`(9인자) | ✅ | RPC 인자↔시그니처 일치, 이미지 최대 3장 |
| 응답 목록 표시 | `useQuoteResponses` → `QuoteDetail` | ❌→검증필요 | `places(...)` embed 가 FK 부재 시 PGRST200 으로 **빈 목록**(에러 삼킴). FK 마이그레이션 추가했으나 **라이브 적용·동작 확인 필요** |
| 적합도 정렬 | `rankQuoteResponses`(`quoteMatch.ts`) | ✅ | 지역>예산>파트너>평점 결정적 점수화, 조건 미입력 시 도착순(회귀 없음). `내 조건에 맞춤 추천`+`예산 내`/`지역 일치` 칩 |
| 업체 비교 | `VendorCompare` | ✅ | 동일 소스(`useQuoteResponses`)에서 큐레이션 후보 공유(DRY) |

**핵심 마찰**: 응답 목록 embed(❌→검증필요)와 지역 free-text(⚠️). 정렬 로직 자체는 견고.

## 2. 식장 결정 → 보드·예산·일정 반영 (A1 · A2 · A3)

| 단계 | 경로 | 평가 | 메모 |
|---|---|---|---|
| 상세에서 '이 식장으로 정하기' | `SetAsWeddingVenueButton` → `recordVendorDecision` | ✅ | anchor(`user_wedding_settings`) + 보드 베뉴 슬롯 예약완료(best-effort) 동기화 |
| 식장 좌표 시드 | `seedWeddingVenueIfEmpty` | ⚠️→수정 | `latitude/longitude` 오타로 좌표가 **항상 미시드**였음 → `lat/lng` 로 수정(이번 PR). city/name 시드는 정상이었음 |
| 보드 반영 실패 시 | `markBoardSlotBookedByQuoteCategory` | ✅ | best-effort, 실패해도 anchor 등록 보호 + `{ok}` 결과를 토스트에 반영(false-success 아님) |
| 예산/일정 자동반영 | `recordVendorDecision` | ✅ | 견적 예약 성사 경로는 예산·일정·보드 3곳 동기화. 단순 '정하기'는 가격 없어 예산 보류(의도) |

## 3. 카테고리 둘러보기 — 지역 우선 큐레이션 (A1 · A2 · B1)

| 단계 | 경로 | 평가 | 메모 |
|---|---|---|---|
| `/vendors/:label` 진입 | `VendorList` + `useVendors(region)` | ✅ | 예식 지역 업체를 상단 soft 큐레이션(`city===region` 정확일치, 부분문자열 금지) |
| `내 지역 N곳 먼저` 배지 | `VendorList` | ⚠️→수정 | 배지 카운트가 정렬과 다른 기준(`startsWith`)이라 숫자 어긋남 → 정렬과 동일 기준으로 수정(이번 PR) |
| region 미지정 | `useVendors` | ✅ | 기존 동작 100% 동일(호출부 회귀 없음) |

## 4. 업체 온보딩 — 가드/검토중 (제휴 업체 페르소나)

| 단계 | 경로 | 평가 | 메모 |
|---|---|---|---|
| 승인 업체가 관리페이지 새로고침/딥링크 | `useUserRole` → `BusinessGuard` | ✅(수정확인) | 재조회 동안 `setIsLoading(true)` 유지 → roles·profile 모두 도착 후에만 가드 판정(튕김 버그 해소). 단 라이브 새로고침 e2e 는 sandbox 미확인 |
| 역할 다운그레이드 후 stale profile | `useUserRole` | ✅→수정 | business 역할 없을 때 `businessProfile` 미클리어였음 → `else null` 추가(이번 PR) |
| '검토 중' 화면 | `BusinessDashboard` | ✅ | 진행 단계 표시기(①가입→②등록→③노출) + 예상소요 + 상호명. CTA(다시신청/마이페이지) 실 라우트. dead-end 없음 |

## 5. 종합

- **즉시 수정(이번 PR)**: 식장 좌표 오타(P1)·배지 불일치(P1)·stale profile(P2)·견적 에러로깅(P2)·
  quote embed FK 마이그레이션(P0후보).
- **실환경 확인 필요(❌/⚠️)**: ① 견적 응답 목록 embed 표시(FK 적용 후) ② 업체 가드 새로고침
  동작 ③ 식장 좌표 시드 — 모두 라이브 DB/실기기 필요(sandbox 차단).
- **deferred(범위 밖)**: 견적 지역 free-text → canonical picker, `wedding_region` 시드 DRY
  (트리거 단일화), 카드 렌더러 P2(error.message·resvg).
- 경쟁사 분석(`docs/260614_invitation_editor_competitor_analysis.md`) 대상인 **청첩장 편집기는
  이번 머지 범위 밖** — 별도 월간 시뮬레이션 유지.
