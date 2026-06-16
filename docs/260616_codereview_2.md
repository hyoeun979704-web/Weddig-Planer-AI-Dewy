# 260616 코드리뷰 #2 — 유기성 배선 Wave 0 (퍼스널컬러·메모리 → 드레스/메이크업 추천)

> 대상: 본 브랜치(`claude/app-enhancement-brainstorm-gnsjbx`)에서 신규 구현한 **개인화
> 컨텍스트 합성 + 추천 주입** 슬라이스. 배경은 "기능은 많은데 데이터가 서로 안 통한다(유기성
> 부족)"는 진단 — 흩어진 신호(퍼스널컬러 컨설팅·AI 선호 메모리·페르소나·예산)를 단일
> `PersonalizationContext` 로 합성해 드레스·메이크업 추천에 실제로 흘려보낸다.
> 변경을 6차원 + dead-end UI + DB 정합성으로 자기 감사하고, 시뮬레이션 결과·한계를 명시한다.

## TL;DR

- **무엇**: `wedding_consulting_reports.analysis`(퍼스널컬러 시즌·언더톤·실루엣·메탈·메이크업
  색)와 `user_ai_memory(preference)`(스타일 선호) — 지금까지 **컨설팅 보드 렌더/챗봇에만 쓰이고
  추천엔 전혀 안 흐르던 죽은 데이터** — 를 합성해 ① 추천 화면 상단 칩으로 노출 ② 이미지 생성
  프롬프트에 "STYLE PREFERENCE(secondary)" 절로 주입.
- **신규 파일 4 + 편집 2**. 순수 합성 로직은 `src/lib/weddingContext.ts`(React·supabase 무의존),
  I/O 는 `useWeddingContext` 훅이 담당(관심사 분리).
- **P0/P1 없음**: 신규 인가 구멍 없음(본인 행만 read), dead-end UI 없음(칩은 실제 추천에
  반영, 데이터 없으면 렌더 안 함), 프롬프트 주입은 정체성 규칙을 덮지 않게 "secondary" 명시.
- **검증**: `npm run build` 0 error · 신규 파일 `eslint` 0 error(기존 `any` 경고만, 미변경 라인) ·
  신규 유닛 테스트 **16/16 pass** · 전체 `vitest` 466 pass / **1 사전 실패**(`aiPlannerPostprocess`,
  clean tree 에서도 실패 — git stash 로 확인, 본 변경 무관).
- **한계(정직 보고)**: 실제 gpt-image 생성 결과물과 라이브 DB 쿼리(RLS 통과·embed)는
  sandbox 에서 e2e 미확인. 합성·추출·주입 **로직은 유닛 테스트로 고정**했고, DB 컬럼 존재는
  `types.ts` 로 확인. 실환경 클릭 검증은 사용자 확인 필요(아래 §시뮬레이션 한계).

## 무엇을 만들었나 (파일)

| 파일 | 역할 |
|---|---|
| `src/lib/weddingContext.ts` (신규) | 순수 합성/추출 단일 소스. `buildPersonalizationContext`, `extractColorTone`, `extractRankedNames`, `extractStyleTagsFromMemory`, `deriveBudgetBand`, `buildDress/MakeupPromptAddendum` |
| `src/lib/weddingContext.test.ts` (신규) | 위 로직 16 테스트(엣지: 빈/부분/모호 입력, no-op 보장) |
| `src/hooks/useWeddingContext.ts` (신규) | `useWeddingProfile` + `wedding_consulting_reports`(최근 completed) + `user_ai_memory(preference)` 조합 → `PersonalizationContext` |
| `src/components/PersonalizationChips.tsx` (신규) | "내 정보가 추천에 반영돼요" 칩. 칩 0개면 null 렌더 |
| `src/pages/DressRecommend.tsx` (편집) | 훅 사용 → intro 칩 + 생성 프롬프트에 dress addendum 결합 |
| `src/pages/MakeupRecommend.tsx` (편집) | 훅 사용 → intro 칩 + 생성 프롬프트에 makeup addendum 결합 |

## 6차원 자기 감사

1. **정확성/견고성**: 빈배열·null·비배열·빈 객체(`{}`·`{name:""}`) 전부 우아 처리(테스트로
   고정). 신호 0건이면 addendum=`""` → 프롬프트 **무변경**(기존 동작 보존). 빈 `catch{}` 없음 —
   훅 catch 는 빈 컨텍스트로 폴백 + 주석으로 의도 명시. `await Promise.all` 누락 없음, cancelled
   가드로 unmount 후 setState 방지.
2. **보안/인가**: 신규 쓰기 경로 없음(읽기 전용 합성). 두 쿼리 모두 `.eq("user_id", user.id)` —
   본인 행만. 프롬프트 주입 텍스트는 사용자 자신의 컨설팅 결과(외부 입력 아님). 클라 노출
   문구는 한국어 라벨뿐(내부 스키마/PII 누출 없음).
3. **성능**: 추천 화면 mount 당 2쿼리(`Promise.all` 병렬, 각 `limit`/`maybeSingle`). N+1 없음.
   `useMemo` 로 컨텍스트 메모이즈(매 렌더 재계산·새 객체 deps 폭주 없음).
4. **테스트**: 분기·실패·no-op 시나리오 포함 16 테스트. 현실적 동적 목업(고정 id 조작 없음).
5. **유지보수성(DRY)**: 톤/실루엣/색 추출을 단일 소스(`weddingContext.ts`)에 모음 — 드레스·
   메이크업이 같은 합성을 재사용(복붙 없음). 라벨은 `TONE_LABEL` 상수. 매직넘버(예산대 2000/5000
   만원) 주석화. "왜"(죽은 데이터 부활) 주석 명시.
6. **아키텍처**: 계층 분리 준수 — 순수 로직(lib) ↔ I/O(hook) ↔ UI(component/page). 기존 호출부
   시그니처 **무변경**(`buildRecommendDressPrompt` 등 그대로, 결과 문자열에만 addendum 결합) →
   breaking change 없음.

## dead-end UI 점검 (필수 차원)

- `PersonalizationChips` 는 **장식 토스트가 아니다**: 같은 `context` 가 그 자리에서 생성
  프롬프트에 실제로 주입되므로 "보여주기만 하고 동작 안 함" 아님. 칩 데이터가 없으면 컴포넌트가
  `null` 을 렌더(빈 박스/"준비 중" 잔존 없음).
- no-op onClick 없음(칩은 비대화형 표시 요소). 신규 placeholder CTA 없음.

## DB 정합성

- `wedding_consulting_reports`: `analysis`(Json)·`status`·`created_at`·`user_id` — `types.ts:5764`
  로 컬럼 존재 확인. `user_ai_memory`: `fact_type`·`fact_text`·`user_id` — 기존 `aiMemory.ts`
  와 동일 컬럼. **RPC 호출 없음**(인자↔시그니처 불일치 위험 없음). 신규 마이그레이션 없음
  (기존 테이블만 read) → 배포 영향 0.

## 시뮬레이션 (페르소나 walkthrough)

- **신규 사용자(컨설팅·메모리 없음)**: 훅 → `hasData=false` → 칩 미렌더 + addendum `""` →
  드레스/메이크업 추천이 **기존과 100% 동일**(회귀 없음). ✅ (유닛 "no signal" + null 가드로 보장)
- **퍼스널컬러 컨설팅 완료(예: 가을 뮤트/웜)**: 드레스 AI 추천 진입 시 "퍼스널컬러: 가을 뮤트",
  "추천 실루엣: A라인" 칩 노출 → 생성 시 프롬프트에 silhouettes/dress_white/metal 절 결합 →
  결과가 본인 퍼스널컬러를 반영. ✅ (합성·주입 로직 유닛 검증)
- **선호 메모리만 존재("미니멀 선호")**: "선호: 미니멀" 칩 + mood 절 주입. ✅

### 시뮬레이션 한계 (작동한다 ≠ 검증됨)

- 실제 **gpt-image 생성물**이 시즌 톤을 시각적으로 반영하는지, **라이브 DB**에서 RLS 통과·
  컨설팅 행 조회가 되는지는 **sandbox 에서 e2e 미확인**. 정적 통과(빌드/타입/린트)와 유닛
  테스트는 통과했으나, 호출 경로(컨설팅 행 존재 사용자의 실제 추천 클릭)는 사용자 실환경
  확인을 권장. 프롬프트 주입은 "secondary" 로 정체성 규칙 하위에 두어 안전 마진 확보.

## 남은 작업 (deferred — 유기성 배선 로드맵)

본 슬라이스는 **Wave 0 백본 + B그룹 대표 와이어(B1)**. 전체 배선 맵 기준 후속:

- **A그룹(행동→자동기록)**: 드레스/스드메 선택 → 예산·일정 자동 항목, 청첩장 주문 → 예산.
  *DB 쓰기 동반 → 라이브 검증 필요해 본 PR 범위서 제외.*
- **B그룹 잔여**: 퍼스널컬러 → 헤어 추천(`HairPreview`)·청첩장 팔레트 시드, 예산 상한 → 업체 추천 필터.
- **C그룹(양방향)**: 게스트 RSVP 수 → 예산 식대 추정·예식장 수용인원 필터, 일정 완료율 → 홈 readiness.
- **D그룹(능동화)**: 컨텍스트 종합 → "다음 액션 N개", 실납부 익명 집계 → 가격 벤치마크.
- **추가 검토**: 컨설팅 결과를 `user_ai_memory(preference)` 로도 승격하면 본 합성이 보드 미생성
  사용자(메모리만 있는 케이스)까지 더 촘촘히 커버.

---

## 2차 증분 — D2(크로스-피처 다음 액션) + C1(하객→식대 추정)

> 같은 PR 후속. 홈 "다음 액션"이 **일정 항목만** 보여주고 전부 `/my-schedule` 로만 보내던
> 한계(섬 안 순환)를, 기능 간 빈틈을 감지해 **각 기능으로 딥링크**하는 "스마트 제안"으로 확장.

### 무엇을 만들었나 (2차)

| 파일 | 역할 |
|---|---|
| `src/lib/smartSuggestions.ts` (신규) | 순수 제안 엔진. `deriveSmartSuggestions`(빈틈→우선순위 랭킹), `estimateCateringCost`(C1 하객×1인식대), `formatManwon` |
| `src/lib/smartSuggestions.test.ts` (신규) | 10 테스트(우선순위·딥링크·임박조건·limit·빈틈 없음) |
| `src/hooks/useSmartSuggestions.ts` (신규) | `usePersonaInsights`+`useWeddingContext`+`useBudget` 조합(읽기 전용) |
| `src/components/home/PersonaDashboard.tsx` (편집) | "스마트 제안" 블록 — 빈틈 있을 때만 렌더, 각 제안 딥링크 |

### 감지하는 빈틈(딥링크)
- 예산 **초과**(지출>총예산) → `/budget` (priority 95, 식대 초과액 표시)
- D-90 이내 + 진척 70% 미만 → `/my-schedule` 체크리스트 (85)
- 예산 **미설정** → `/budget` (80, "하객 N명 기준 식대 약 N만원" C1 동기부여)
- 퍼스널컬러 컨설팅 **미실시** → `/wedding-consulting` (55, Wave 0 추천 시너지로 연결)

### 6차원 (2차 델타)
- **정확성**: 빈틈 0이면 빈 배열 → 카드 미렌더(잡음 없음). `d>=0 && d<=90` 등 경계값 테스트로 고정.
  early-return 전 훅 호출(React 규칙 준수).
- **dead-end UI**: 모든 제안이 **실제 기능 라우트로 딥링크**(toast/no-op 아님). 일정 "다음 액션"과
  **중복 아님** — 그쪽은 일정 항목, 이쪽은 surface 간 빈틈(역할 분리).
- **DRY/아키텍처**: `useWeddingContext`(Wave 0) 재사용, 순수 랭킹은 lib, I/O 는 훅. 계층 유지.
- **성능**: `useBudget`는 react-query 캐시 공유(중복 쿼리 없음), `useMemo` 메모이즈.

### 검증 (2차)
- 신규 유닛 **10/10 pass**(누적 26/26) · `npm run build` 0 error · 신규 파일 lint 0 error
  (PersonaDashboard 의 기존 `supabase as any` 경고 1건은 미변경 라인) · 전체 `vitest`
  **476 pass / 1 사전 실패**(동일·무관).
- **한계**: 실데이터(예산 설정 유무·컨설팅 행)에 따른 실제 노출은 라이브 확인 권장(로직은
  유닛으로 고정). 홈 클릭 e2e 는 sandbox 미확인.

## 남은 작업 (갱신 — deferred 사유 명시)

- **A그룹(행동→자동 DB 기록)**: 의도적으로 보류. ① 추천 플로우는 *프리뷰 생성*이지 "이 드레스로
  확정" 결정점이 없어 예산 자동 항목의 트리거가 부재 ② 청첩장/결제→예산은 KakaoPay edge
  경로라 **중복발급·부분쓰기 방지(멱등성)** 가 라이브 e2e 없이는 위험. 결정점 UX 설계 후 별도 PR.
- **C그룹 잔여**: RSVP 실집계→예식장 수용인원 필터, 일정 완료율→readiness 정식 스코어.
- **D그룹 잔여**: 실납부 익명 집계→가격 벤치마크(오라클), 자율 에이전트 실행(승인/거부 루프).
