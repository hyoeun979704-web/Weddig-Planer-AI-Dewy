# 성능 최적화 핸드오프 프롬프트 (Phase 1·2·3)

> `docs/perf-optimization-plan.md` 를 단일 소스로 단계별 실행하기 위한 프롬프트 모음.
> 새 세션(Claude·Codex·Antigravity)에 그대로 붙여넣어 쓴다. 계획 내용은 여기 복붙하지
> 않고 **문서를 참조**하게 해서 드리프트를 막는다. 한 세션 = 한 Phase(회귀 위험 관리).

## 공통 전제 (모든 Phase)

- 브랜치 `claude/code-review-security-audit-tOqbk` 에서 작업·커밋·push(다른 브랜치 금지).
- AGENTS.md 준수: 변경 **최소·표적화**, API 시그니처/호출부 변경 금지, 6차원 자기검증.
- 착수 전 문서의 file:line 을 **실제 코드로 재확인**(줄번호 드리프트 가능). ✅ 표시도 재확인.
- 검증: `npm run test`·`npm run build` 통과. 런타임 FPS/LCP 는 이 환경 측정 불가 →
  "정적·빌드 레벨만 확인" 명시, 기능 회귀를 코드 경로로 검증, e2e 미확인은 솔직히 보고.
- 모델 식별자 커밋/코드에 금지. PR 은 명시 요청 없으면 생성 금지.

---

## Phase 1 — Quick Wins (저위험·즉효)

```
Dewy 레포 성능 최적화. 버벅임 개선 계획이 docs/perf-optimization-plan.md 에 진단·우선순위
까지 정리돼 있다. 그 문서를 단일 소스로 읽고 Phase 1 (Quick Wins) 전체만 구현해라
(P1-1 ~ P1-5). Phase 2·3 은 건드리지 마라.

브랜치: claude/code-review-security-audit-tOqbk 에서 작업·커밋·push.

규칙(AGENTS.md): 변경 최소·표적화, API 시그니처 변경 금지. 착수 전 문서의 file:line 을
현재 코드로 재확인(✅ 표시도). 6차원 자기검증.

회귀 주의(핵심): queryKey 안정화·useMemo·staleTime 은 잘못하면 기능을 깬다 —
 · queryKey 펼칠 때 의존값 빠짐없이 포함(빠지면 필터 안 먹거나 stale).
 · staleTime 줘서 갱신돼야 할 데이터가 안 갱신되는지 확인.
 · useMemo/useCallback 의존성 배열 정확히(빠지면 옛 결과 고착).
 · React.memo 적용 시 props 가 매 렌더 새 참조면 효과 없음 — 핸들러도 useCallback.

검증: 변경마다 npm run test·npm run build 통과. P1-4(PDF 동적 import) 후 Budget/Premium
청크 크기 감소를 빌드 출력으로 확인(before/after 기록). 런타임 FPS/LCP 는 측정 불가 →
"빌드·정적 레벨만 확인" 명시하고 필터·정렬·검색 동작이 정상인지 코드 경로로 검증.

완료 보고: 고친 항목, 빌드 청크 before/after, 남은 회귀 위험, 사용자가 기기에서 측정할
시나리오(Community 스크롤·검색, Venue 필터, Budget 진입).

먼저 docs/perf-optimization-plan.md 와 P1 대상 파일들을 읽고 시작해라.
```

---

## Phase 2 — 데이터 효율 (medium)

```
Dewy 레포 성능 최적화 Phase 2. docs/perf-optimization-plan.md 의 Phase 2 (데이터 효율)만
구현해라 — P2-1(N+1·워터폴: useCommentLikes, useCoupleLink), P2-2(과다 fetch: usePlaceDetail
조건부 select, select("*") 축소), P2-3(무한 select 에 limit), P2-4(거리계산 서버화).
Phase 1·3 범위는 건드리지 마라. 전제는 이 문서 상단 "공통 전제" 를 따른다.

DB 의존 주의(AGENTS.md 검증 규칙): 코드가 참조하는 컬럼/RPC/view 가 실제 DB 에 있는지
list_tables / information_schema 로 먼저 확인. select 컬럼 좁힐 때 UI 가 실제 쓰는 컬럼을
다 포함하는지 호출부까지 확인(빠지면 undefined 렌더). 조건부 select 는 place.category 분기.

P2-1 의 useCoupleLink 를 useQuery 로 전환 시: 기존 호출부 반환 형태(시그니처) 유지하거나
호출부 동시 수정. P2-4(PostGIS/RPC) 는 새 RPC·마이그레이션이 필요하면 범위가 커지니,
필요 시 사용자에게 확인 후 진행(아니면 클라 계산을 useMemo 캐싱하는 경량 대안으로).

검증: npm run test·npm run build. edge function 변경 시 esbuild 검증
(npx esbuild supabase/functions/<fn>/index.ts --bundle --platform=neutral --external:https://*
--external:npm:* --outfile=/dev/null). DB 변경은 SQL 레벨 확인 + 클라 e2e 미확인 명시.
N+1 제거는 쿼리 왕복 수 before/after 를 설명.

완료 보고: 항목별 변경, 줄어든 왕복/페이로드, DB 정합성 확인 결과, 남은 위험.
```

---

## Phase 3 — 인프라·구조 (신중 · 별도)

```
Dewy 레포 성능 최적화 Phase 3. docs/perf-optimization-plan.md 의 Phase 3 만, 그리고
**항목을 하나씩** 진행해라(한 번에 묶지 말 것 — 위험 큼). 전제는 문서 상단 "공통 전제".

P3-1(PWA 프리캐시 범위 축소)은 위험 중 — vite.config 의 workbox globPatterns/runtimeCaching
변경은 오프라인 동작·SW 캐시 회귀를 부른다. 변경 전후로 precache entries/용량을 빌드
출력으로 비교하고, 핵심 셸만 precache + 비핵심은 runtimeCaching 으로. 이 항목은 적용 전
사용자에게 캐시 전략 변경 의도를 confirm 받고 진행.

P3-2(죽은 chart.tsx/carousel.tsx 제거)는 사용처 0 을 grep 으로 재확인 후 제거(미사용이면
런타임 효과는 작고 의존성 정리 차원). P3-3(framer-motion→Tailwind)·P3-4(invitation 폰트
on-demand)는 선택 — 초기로드 영향 없으니 시간 남을 때만.

검증: npm run test·npm run build. PWA 변경은 dist/sw precache 목록 diff 로 확인.
런타임 측정 불가 명시. 각 항목 독립 커밋.

완료 보고: 항목별 변경, precache before/after, 오프라인/캐시 회귀 점검 결과, 남은 위험.
```

---

## 사용 메모

- 순서: **Phase 1 → 측정(사용자 기기 Lighthouse/Profiler) → Phase 2 → Phase 3**.
- 각 Phase 후 `docs/perf-optimization-plan.md` 의 해당 항목에 완료 표시(✔)·커밋 해시를
  남기면 추적이 쉽다.
- 광범위 코드리뷰를 곁들이면 결과는 `docs/YYMMDD_codereview.md` 양식으로(AGENTS.md 규칙).
