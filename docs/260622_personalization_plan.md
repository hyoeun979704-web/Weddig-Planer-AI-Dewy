# 개인화 고도화 — 데이터 전수조사 + 구현 계획 (2026-06-22)

> 지시: **페르소나별 관련 데이터 전수조사 → 계획 먼저**(구현 전). 대상 축: 추천일정·체크리스트 ·
> 예산 · value_tags(취향). 페르소나 엔진 단일 소스 = `src/lib/weddingPersona.ts`(20모드).
> 기준 커밋: 위젯 머지 직후(`main`). 방법론: `docs/persona-ux-review-rules.md`.

## 0. TL;DR — 가장 큰 갭 3

1. **추천일정/체크리스트가 전원 동일**(`src/lib/schedule.ts` `STANDARD_PHASES` 5단계×4할일).
   페르소나별 개인화는 **타임라인 압축(일수)뿐**, 할 일 자체는 임신·재혼·셀프·해외 다 똑같다.
   → "내 결혼식 같다"가 가장 안 되는 surface. (미션 카드만 페르소나별로 얹힘 — 별개 데이터.)
2. **예산도 전원 동일 10카테고리**. 소형/셀프/노웨딩이 웨딩홀·식대 카테고리를 그대로 보고,
   분석형은 숨은비용 가이드가 없다. 유일한 분기 = `excluded_categories`(수동) + 1인진행 양가분담 숨김.
3. **value_tags가 수집만 됨**. 사용자 4태그(eco/vegan/pet/foreign_guests)→places.tags(한글) **매핑
   테이블(`placeValueTags.ts`)은 이미 있는데** 추천 랭킹/꿀팁 점수에 **미연결**(AI 프롬프트만 소비).

엔진(분류)은 강함. 고도화 = **분류된 페르소나/수집한 신호를 추천일정·예산·추천랭킹이 실제로 소비**하게.

## 1. 현행 데이터 소스 맵 (단일 소스 위치)

| 데이터 | 위치 | 개인화 상태 |
|---|---|---|
| 페르소나 분류(20) | `weddingPersona.ts` `PERSONA_REGISTRY` | ✅ 단일 소스, DB 트리거 parity |
| 추천행 카테고리 순서 | `personaRecommendations.ts` `PERSONA_REC_CATEGORIES` | ✅ 20모드 전원 |
| 데일리 미션(홈 넛지) | `data/personaMissions.ts` `PERSONA_SPECIFIC` | ⚠️ 13/20 (나머지 style 폴백) |
| **추천일정/체크리스트 템플릿** | `schedule.ts` `STANDARD_PHASES.defaultTasks` | ❌ 전원 동일(압축만) |
| **예산 카테고리** | `data/budgetData.ts` `categoryKeys`·`categories`(10) | ❌ 전원 동일 |
| 예산 지역 평균 | `data/budgetData.ts` | ⚠️ 지역별(페르소나 아님) |
| **value_tags(사용자)** | `weddingValues.ts`(4) → AI 프롬프트 | ⚠️ AI만 |
| **value_tags(장소 매칭)** | `placeValueTags.ts` `userKey↔places.tags` | ❌ 매핑만, 랭킹 미연결 |
| 추천 랭킹(상세) | `usePlaceRecommendations.ts` | ❌ 카테고리+지역+partner_rank만 |
| 꿀팁 큐레이션 | `lib/tipCuration.ts` | ✅ 페르소나 부스트(value_tags 미사용) |

## 2. 페르소나별 데이터 전수조사 (20모드 × 축)

범례: ✅ 페르소나 전용 데이터 존재 · ⚠️ 부분(폴백/일반) · ❌ 없음(개인화 필요)

| # | 페르소나 | 추천행 | 데일리미션 | **추천일정** | **예산** | value_tags 적합 |
|---|---|:--:|:--:|:--:|:--:|:--:|
| 1 | pregnancy | ✅ | ✅(차수) | ❌ 의료게이트·가봉앞당김·허니문제약 필요 | ⚠️ 거의 표준 | — |
| 2 | international | ✅ | ✅ | ❌ 이중식·영문자료·비자 동선 | ❌ 해외여행비 추가 | foreign_guests |
| 3 | remarriage_with_children | ✅ | ✅ | ❌ 자녀동반 식순·혼인신고·톤다운 | ❌ 예물/예단↓ | — |
| 4 | remarriage | ✅ | ✅ | ❌ 작은가족식·혼인신고·톤다운 | ❌ 예물/예단↓·식대↓ | — |
| 5 | snap_only | ✅ | ✅ | ❌ 식 task 전부 제거·촬영중심 | ❌ venue/meal 숨김 | — |
| 6 | no_wedding_travel | ✅ | ✅ | ❌ 식 제거·허니문/혼수 중심 | ❌ venue/meal 숨김 | — |
| 7 | self_no_ceremony | ✅ | ✅ | ❌ 셀프촬영·혼인신고·식 제거 | ❌ venue/meal 숨김·sdm↓ | eco |
| 8 | small_outdoor | ✅ | ✅ | ❌ 우천/음향/계절 task | ⚠️ venue 소규모 | eco·pet |
| 9 | small_budget | ✅ | ✅ | ❌ 공공시설·DIY task | ❌ 대형 카테고리 축소 | eco |
| 10 | small_luxury | ✅ | ✅ | ❌ 호텔스몰 패키지 task | ⚠️ 소규모·고급 | — |
| 11 | small_intimate | ✅ | ⚠️style | ❌ 40~80명 식순·답례품 | ⚠️ 소규모 | pet |
| 12 | single_household | ✅ | ✅ | ❌ 1인진행 대안·양가 task 제거 | ⚠️ 양가분담 숨김(있음)·meetup↓ | — |
| 13 | remote_overseas | ✅ | ✅ | ❌ 방문압축·위임·시차 | ❌ 항공/체류비 | foreign_guests |
| 14 | regional | ✅ | ✅ | ⚠️ 권역 식장(소폭) | ⚠️ 지역평균(있음) | — |
| 15 | luxury_hotel | ✅ | ⚠️style | ❌ 패키지비교·견적 task | ⚠️ 고예산 | — |
| 16 | designer_late | ✅ | ⚠️style | ❌ 하우스·컨셉 task | ⚠️ | — |
| 17 | budget_analytic | ✅ | ⚠️style | ❌ 견적비교·숨은비용 점검 task | ❌ 숨은비용 경고·세부내역 | — |
| 18 | first_timer | ✅ | ⚠️style | ❌ 기초 교육 step | ⚠️ | — |
| 19 | standard_groom | ✅ | ✅ | ⚠️ 예복/예물 앞당김 | ⚠️ suit 강조 | — |
| 20 | standard_bride | ✅ | ⚠️style | ⚠️ 표준(기준선) | ⚠️ 표준(기준선) | — |

**요약 카운트**: 추천일정 페르소나 전용 = **0/20**(전부 ❌/⚠️). 예산 전용 = 사실상 0(분담숨김·지역평균만).
미션 ✅ 13/20. → 고도화 우선순위: **추천일정 ≫ 예산 ≫ value_tags ≫ 미션 보강**.

## 3. 구현 계획 (단계별 — 낮은 1인 운영비용·로직 기반·단일 소스)

### 설계 원칙
- **단일 소스 레지스트리 추가**: 페르소나별 일정/예산 프로파일을 **코드 한 곳**(`personaPlanProfile.ts`)에
  모은다. 흩어진 미션/추천/AI톤처럼 드리프트 나지 않게. 데이터 주도(콘텐츠 운영부담 0, 테스트 가능).
- **표준이 기준선**: standard_bride/groom 의 현행 5단계가 baseline. 각 페르소나는 **델타**(추가/제거/
  재정렬/게이트)만 선언 → 표준 변경이 전 페르소나에 자동 반영(DRY).
- **라벨 vs 값 분리**·**빈 결과 가드**(규칙 준수): 카테고리 숨김은 표시만, 매칭 키워드 불변.

### P1 — 추천일정/체크리스트 개인화 (임팩트 최대)
- **`src/lib/personaPlanProfile.ts`**(신규): `Record<WeddingPersonaMode, ScheduleProfile>`.
  `ScheduleProfile = { removeTasks?, addTasks?: {phase, title, gate?}[], reorderHints?, note? }`.
  - 식 없음(snap/no_wedding/self): phase-2 식장·식순·리허설 task 제거, 촬영·혼인신고·허니문 추가.
  - pregnancy: 의료 게이트 task(산부인과 상담) 최상단, 가봉 앞당김, 허니문 단거리 — 차수 신호 활용.
  - remarriage(+children): 예물/예단 비중↓, 혼인신고·자녀동반 식순 추가, 톤다운.
  - remote/international: 한국방문 압축·위임·이중식·비자 task.
  - small_*: 대형 웨딩홀 task→소규모 베뉴·답례품·웰컴키트.
  - single_household: 양가 task 제거·1인 대안.
- **적용 지점**: `Schedule.tsx`/`useWeddingSchedule`의 `STANDARD_PHASES` 소비부에서 프로파일 델타 머지.
  **기존 user_schedule_items(이미 시드된 사용자)는 건드리지 않음** — 추천(미adopt) 항목 표시에만 적용,
  혹은 신규 시드 시 반영. (마이그레이션 영향 분석 필요 — 아래 열린 질문.)
- 검증: 페르소나별 derive→일정 화면 e2e(빈 단계/깨진 게이트 없음), 표준 회귀 무변.

### P2 — 예산 개인화
- **`personaPlanProfile.ts`에 `BudgetProfile`**: `{ hideCategories?, emphasizeCategories?, warnings?: string[] }`.
  - 식 없음: venue·meal 숨김(또는 0 기본). small_*: 대형 카테고리 디엠퍼시스. remarriage: ring(예물/예단) 디엠퍼시스.
  - budget_analytic: 숨은비용 경고 배너 + sub_items 상세 펼침 기본값.
  - international/remote: honeymoon에 항공/체류 sub_items 강조.
- **적용**: `Budget.tsx`의 `visibleBudgetCategories`(현 excluded_categories 기반)에 **페르소나 기본 제외**를
  합성(사용자 수동 override 우선). 숨김이 아니라 디엠퍼시스(접힘) 기본도 옵션.
- 빈 화면 금지: 숨겨서 카테고리 0 되면 안 되게 최소 코어 유지.

### P3 — value_tags 활용 (수집한 신호 활성화) — ⛔ **데이터 부족으로 현재 보류**
- **실측(2026-06-22, 프로덕션 `places` 4,328곳)**: 친환경 **1**, 비건 **0**, 반려동물 **2**, 영문안내 **0**.
  → value_tag 매칭 가중치를 켜면 매칭 0~3곳뿐이라 **무의미**(규칙: "빈 결과 신뢰 손상"). **코드 P3 보류.**
- **선행 작업(데이터)**: `places.tags`에 가치태그 시딩 필요 — `scripts/collect-places/*`(Gemini enrichment)로
  베뉴/스튜디오 등에 친환경·비건·반려동물·영문안내 태깅 패스. 이건 코드 아닌 **데이터 수집 작업**.
  시딩이 충분(수십~수백 곳)해진 뒤 비로소 랭킹 연결:
  - `usePersonaRows`/`usePlaceRecommendations` 정렬에 사용자 value_tags ↔ places.tags 매칭 시 가산점(partner_rank 다음 tie-breaker).
  - `tipCuration.ts` 점수에도 매칭 부스트(기존 패턴 재사용).
- **AI 프롬프트 주입은 이미 동작**(데이터 무관) — 사용자 가치축은 지금도 AI 답변에 반영됨.

### P4 — 미션 공백 보강(저비용 마무리)
- `PERSONA_SPECIFIC` 미정의 7모드 중 의미 있는 곳(budget_analytic·first_timer·luxury_hotel·designer_late)에
  미션 1~2개 추가(나머지는 style 폴백 유지 합리적).

## 4. 데이터 모델 결정 (✅ 사용자 확정 2026-06-22)

1. **추천일정 적용 범위** → ✅ **(a) 추천 표시에만**. 이미 시드된 `user_schedule_items` 는 불변,
   페르소나 델타는 **빈 단계의 추천 할 일(defaultTasks) 표시**에만 적용. 회귀 0.
2. **예산 카테고리** → ✅ **접힘 + 되돌리기**(숨김 아님). 페르소나 부적합 카테고리는 기본 접힘,
   사용자가 '펼치기'로 언제든 복구. "그래도 쓰고싶다" 차단 안 함.
3. **value_tags** → ✅ **시딩 패스 먼저**. `scripts/collect-places`(Gemini enrichment)로 `places.tags`
   가치태그(친환경·비건·반려·영문) 태깅 후 P3 랭킹 연결. AI 프롬프트 주입은 이미 동작.
4. **저장 위치** → **코드 `personaPlanProfile.ts` 단일 소스**(운영부담 0, 테스트 가능). DB 테이블은
   A/B·비개발자 편집 필요 시 후속.

## 5. 권장 순서
**P1(추천일정) → P2(예산) → P4(미션) → P3(value_tags, 데이터 시딩 완료 후).** (P3 는 코드보다
`places.tags` 가치태그 시딩이 먼저 — 위 §3 P3.)
각 단계는 독립 PR. P1·P2 는 `personaPlanProfile.ts` 단일 소스를 공유하므로 P1 에서 골격을 만든다.
각 단계마다 페르소나 derive→surface e2e + 표준 회귀 무변 + `npm run build/lint/test`.
