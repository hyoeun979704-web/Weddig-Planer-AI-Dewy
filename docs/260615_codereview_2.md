# 260615 _2 — 전체 감사 재실행 + 신선도 수집기준 (코드리뷰)

> 사용자 요청: "1. 수집기준 2. 감사 한번 더". ① 신선도 지표를 '수집 시각' 기준으로 정합화
> ② 새 규칙(RPC 인자↔시그니처 교차정합성)·dead-end·보안·정확성/DRY 3개 도메인을 서브에이전트로
> 재감사. 직전: `260615_codereview.md`. 각 항목 커밋·파일 추적.

## TL;DR

- **신선도 '수집기준' 적용**: `places.last_collected_at`(우리가 마지막 수집/검증한 시각) 신설 +
  수집기(`upsert.ts`) 매 upsert 갱신 + 기존행 백필(`coalesce(last_source_date, created_at)`).
  대시보드를 이 컬럼 기준으로 전환. `last_source_date`(소스 발행일)는 scoring 용으로 유지 — 두
  의미를 분리해 신선도 거짓신호를 근본 차단. (mig 20260615003613)
- **재감사 결과: 새 P0/P1 0건**(코드베이스 견고). RPC 인자 불일치 없음(P0는 이미 수정), dead-end
  CTA 없음, 새 SECURITY DEFINER RPC·RLS 전부 적정.
- **P2 정리(이번 커밋)**: DRY(CATEGORY_LABEL 단일 소스화) · openExternal 위험 스킴 가드 ·
  distributePhotos 중복 호출 · product-search raw error 일반화 · admin_set_member_tier 추적
  마이그레이션 · useEntryPopup `.limit` · types.ts 보강.

---

## 1. 신선도 — 수집기준(last_collected_at)

- 결정: 신선도는 '마지막으로 손댄 시각'(updated_at, 오염)도 '소스 발행일'(last_source_date, scoring용)도
  아닌 **'우리가 마지막으로 수집/검증한 시각'**으로 잰다.
- 구현(`upsert.ts`·`AdminDashboard.tsx`·mig 20260615003613·20260614... dashboard):
  - `places.last_collected_at timestamptz` 신설, 수집 upsert 마다 `now()` 로 갱신(ignoreDuplicates:false
    라 재수집 시 UPDATE).
  - 기존 행 백필 `coalesce(last_source_date, created_at)`(updated_at 제외).
  - 대시보드 신선도를 last_collected_at 기준으로 + '수집일 미상' 분리 표기 유지.
- `last_source_date` 는 scoring.ts 의 source-recency 보너스에 그대로 사용(의미 분리 유지).

## 2. 재감사 (3 서브에이전트) — 결과

### 새 P0/P1: 없음
- **RPC 인자↔시그니처**: `src/` 30+ `.rpc()` 호출 전수 점검 — **현재 불일치 0**(승인 P0는 수정됨).
  apparent 불일치는 전부 `types.ts` stale(런타임은 `as any` 라 무사). dead-end CTA 도 0.
- **보안**: 신규 RPC(`admin_upsert_promotional_event`·`admin_review_listing` 3-arg·`upsert_my_listing`·
  view dedup·RSVP burst) 전부 admin/owner 스코프·revoke 적정. `view_events` definer-only. 결제·
  포인트·RSVP·inquiry-url 살균 견고.

### P2 — 이번 커밋에서 수정
| 항목 | 위치 | 처리 |
|---|---|---|
| DRY: CATEGORY_LABEL 중복(2파일) | TagResults·PlaceRecommendations | `categoryLabels.PLACE_CATEGORY_LABEL` 단일 소스화 |
| openExternal 위험 스킴 미차단 | `lib/native/openExternal.ts` | javascript:/data:/vbscript:/file: 차단(+schemeless) |
| distributePhotos 2회 호출 | `InvitationFlow.tsx` | 1회 계산 후 재사용 |
| product-search raw error 반환 | `functions/product-search` | 제네릭 + console.error(공개 표면) |
| admin_set_member_tier 마이그레이션 부재 | mig 20260615004041 | 현재 정의 idempotent 캡처(추적성) |
| useEntryPopup 무제한 fetch | `hooks/useEntryPopup.ts` | `.limit(20)` |
| types.ts 누락(last_collected_at 등) | `types.ts` | places 컬럼 보강 |

## 적용 마이그레이션
| version | 내용 |
|---|---|
| 20260615003613 | places.last_collected_at + 백필 (수집기준) |
| 20260615004041 | admin_set_member_tier 추적 캡처 |

## 남은 작업 (deferred)
- **P1 types.ts 전면 stale**: 마이그레이션 대비 드리프트. `supabase gen types` 재생성 + `(supabase as
  any).rpc` 캐스트 제거 → RPC 인자/시그니처 드리프트가 **컴파일 타임에** 잡히게(이번 P0 재발 방지의
  근본책). 단 호출부 다수 영향이라 별도 집중 리팩터.
- 신선도 근본: 기존 NULL 백필은 created_at 근사 — 정확한 수집일은 다음 수집 사이클부터.
- A2 is_premium_member · 익명 view 카운터(엣지 rate-limit) · cta_path 내부경로 검증 — 저영향/별도.

## 규칙 효과 확인
이번 재감사에서 **RPC 인자↔시그니처 교차확인**(새 규칙)으로 전 호출부를 점검했고, 신선도도 '무엇으로
재느냐'(신호 선택) 관점으로 근본 정합화했다 — 260615 교훈이 실제 감사 절차에 반영됨.
