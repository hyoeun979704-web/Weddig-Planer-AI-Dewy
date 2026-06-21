# 260621 페르소나 UX 시뮬레이션 (전체 20모드)

> `docs/persona-ux-review-rules.md` 방법론으로 `PERSONA_REGISTRY`(20모드, `src/lib/weddingPersona.ts`)
> 전체를 현재 코드 기준 walkthrough. stale 스냅샷 불신, 모든 발견은 `file:line` 근거.

## 시스템 맵 — 페르소나 분기 작동 방식

- **분류**: 클라 `derivePersonaMode`(`weddingPersona.ts:305`) ↔ DB 트리거 `derive_wedding_persona`
  가 20모드 전부 패리티(신규 4종 `remarriage_with_children`·`designer_late`·`budget_analytic`·
  `first_timer` 포함). 레지스트리 헤더 주석(신규 4종이 트리거 미발화)은 **stale**(트리거가 도출함).
- **입력 수집**: 온보딩 모달(`WeddingInfoSetupModal.tsx`)이 ceremony_type·planning_style·role·
  country·region·wedding_style 수집. 민감 3종(marital_history·pregnant·has_parents)은 설계상
  행동 신호/마이페이지로 추론.
- **소비처(페르소나 분기)**: 홈 대시보드(`PersonaDashboard.tsx`·`personaMissions.ts`), AI플래너
  인사/퀵Q(`AIPlanner.tsx`), AI백엔드 프롬프트(`ai-planner/user-data.ts`), 팁 큐레이션
  (`tipCuration.ts`), 스토어 캐러셀(`Store.tsx`), 스케줄 시딩(`checklistTemplate.ts`), 예산 양가분담.

## 페르소나 × surface 마찰 매트릭스

범례: ✅ 맞춤/정상 · ⚠️ 일반 폴백/부분 · ❌ 깨짐/불일치/dead-end

| Mode | Home | AIPlanner | AI백엔드 | AIStudio | Schedule | Budget | Tips | Tutorial |
|---|---|---|---|---|---|---|---|---|
| standard_bride | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| standard_groom | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| luxury_hotel | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| budget_analytic | ❌ | ⚠️ | ❌ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| designer_late | ❌ | ⚠️ | ❌ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| first_timer | ⚠️ | ⚠️ | ❌ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| regional | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ❌→✅ | ⚠️ |
| remarriage | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| remarriage_with_children | ❌→✅ | ⚠️ | ❌ | ⚠️ | ⚠️ | ✅ | ❌→✅ | ⚠️ |
| remote_overseas | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ⚠️ |
| single_household | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ❌ | ✅ |
| small_intimate | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| small_outdoor | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| small_luxury | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| small_budget | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| self_no_ceremony | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| no_wedding_travel | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ⚠️ |
| snap_only | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| pregnancy | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| international | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ⚠️ |

(`❌→✅` = 이 PR 에서 해소). 일관된 갭: **신규 4종 성향 페르소나가 분류는 되나 홈 미션·AI백엔드·
팁에서 미흡**, **AIStudio 가 가장 페르소나-blind**.

## 이 PR 에서 적용한 수정 (안전·재사용만)

| # | 위치 | 변경 |
|---|---|---|
| 1 | `src/lib/tipCuration.ts` | `remarriage_with_children: ["remarriage_family"]` 부스트 추가(기존 카테고리 재사용) — 자녀 동반 재혼 user 가 popularity 정렬에 묻혀 자기 콘텐츠 못 보던 갭 해소 |
| 2 | `src/data/personaMissions.ts` | `remarriage_with_children` 홈 미션을 `remarriage` 미션 재사용으로 매핑(자녀 동반 시나리오 hint 포함). 단일 소스 `REMARRIAGE_MISSIONS` 추출(드리프트 방지) |

검증: build ✓ · test 531 ✓ · 변경 파일 eslint 0 error.

## 남은 작업 (deferred — 제품/아키텍처 판단 필요, 무인 임의수정 안 함)

우선순위·권고안과 함께 남긴다. 승인 주시면 후속 PR 로 진행.

1. **[P0] AI Studio 페르소나-blind** — `src/pages/AIStudio.tsx:21-156` 카드 배열이 페르소나/
   ceremony 분기 0. `self_no_ceremony`·`no_wedding_travel`·`snap_only`(앱 전역에서 ceremony 숨김)
   에게도 스드메·드레스·메이크업이 헤드라인. **권고(보수적·일관)**: 기존 `shouldHideWeddingCeremony`
   를 이 화면에도 적용해 ceremony 중심 카드를 해당 페르소나에 숨김(새 콘텐츠 안 만들고 기존 규칙
   확장). groom de-emphasis·snap 전용 카드는 별도 판단. → **핵심 화면이라 승인 후 진행 권장.**
2. **[P1] AI 백엔드 페르소나 톤 미주입** — `ai-planner/user-data.ts:178` 가 `persona_mode` 문자열만
   넣고 레지스트리 `.ai` 톤 문자열(`describePersonaForAI`)은 미주입 → designer/budget/first_timer/
   +children 의 LLM 톤 가이드 부재. **아키텍처 이슈**: `describePersonaForAI` 는 `src/lib`(프론트)라
   Deno 엣지에서 import 불가 → 페르소나→톤 맵을 엣지로 **복제(드리프트)** 하거나 클라가 주입하도록
   재설계 필요. 무인 임의 결정 부적절 → 방향 결정 필요.
3. **[P1] 신규 4종 홈 미션/AIPlanner 퀵Q** — `personaMissions.ts`·`AIPlanner.tsx` 에
   budget_analytic/designer_late/first_timer 전용 미션·질문 부재(일반 폴백). 새 **카피 작성**이라
   제품 톤 판단 필요(remarriage_with_children 은 이 PR 에서 reuse 처리 완료).
4. **[P2] smartSuggestions 컨설팅 게이팅** — `smartSuggestions.ts:109` 퍼스널컬러 컨설팅 제안을
   personaMode 무관하게 노출. groom/no-ceremony 엔 부적합할 수 있으나 **퍼스널컬러는 신랑·셀프도
   원할 수 있어** 일률 게이팅은 과함 → 어떤 페르소나에서 숨길지 제품 판단 필요.
5. **[P2] regional/single_household 팁 부스트**, 튜토리얼 ceremony 스텝 `excludePersonas` — 코퍼스
   카테고리 존재 확인 후.

## 정상 처리(무수정) 확인
- 스케줄 시딩이 `none`/`snap_only` 표준 체크리스트 skip + ceremony/style/임신/재혼 애드온
  (`checklistTemplate.ts:122-165,295`). 예산 양가분담 `single_household` graceful 게이트
  (`BudgetSplitSimulator.tsx:64-102`). 업체 상세 CTA dead-end 아님(`PlaceDetailLayout.tsx:301-354`).
  스토어 캐러셀 페르소나 필터+빈 시 숨김(`Store.tsx`). D-Day 라벨 snap/no-wedding 재스킨.
