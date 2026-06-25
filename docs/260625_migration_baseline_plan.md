# 마이그레이션 베이스라인 + 배포 파이프라인 계획 (Task #7)

작성: 2026-06-25 · 대상 프로젝트: `qabeywyzjsgyqpjqsvkd`

## 0. TL;DR

- **search_path 하드닝(21개 함수) ✅ 완료** — 프로덕션 적용 + repo 마이그(`20260625140000_harden_function_search_path.sql`) + 히스토리 기록.
- **배포 파이프라인 ✅ 워크플로 추가**(`.github/workflows/deploy-migrations.yml`) — 단, **드리프트 때문에 기본은 dry-run(진단)이고 자동 apply 는 비활성**. 활성화 전제 = 아래 베이스라인 정합 + `SUPABASE_DB_PASSWORD` 시크릿.
- **베이스라인 정합 = 의사결정 필요(이 문서 §3)** — repo 마이그 lineage 와 원격 `schema_migrations` lineage 가 갈라져 있어, 사람이 전략(스쿼시 vs 마킹)을 골라야 안전하게 자동배포를 켤 수 있다.

## 1. 발견된 문제 — 히스토리 lineage 분기

| 항목 | 수 |
|---|---|
| repo 표준 마이그 파일(`supabase/migrations/*.sql`) | 258 |
| 원격 `supabase_migrations.schema_migrations` 기록 버전 | 161 |
| repo 에 있는데 원격 히스토리에 **없음**(naive `db push` 가 재적용 시도) | **220** |
| 원격 히스토리에 있는데 repo 에 **없음** | **123** |
| 양쪽 일치 | ~38 |

즉 **두 lineage 가 거의 별개**다. 원격 `schema_migrations` 는 초기 Supabase/Lovable
툴링이 자기 버전 스탬프로 기록했고, repo 마이그는 팀이 따로 작성한 lineage 다.
**프로덕션 스키마 자체는 repo 마이그를 반영**한다(아래 검증).

### 핵심: 프로덕션은 repo 마이그를 반영하고 있다(히스토리만 안 맞을 뿐)

스팟체크 — repo 에 있지만 히스토리에 없는 최신 마이그들의 객체가 실DB 에 존재:

| 마이그 파일 | 객체 | 실DB 존재 |
|---|---|---|
| `..._couple_votes_link_guard` | `couple_votes` | ✅ |
| `..._invitation_guest_photos` | `invitation_guest_photos` | ✅ |
| `20260622150000_listing_contact_rpc` | `upsert_my_listing_contact()` | ✅ |
| `20260622140000_budget_item_refund` | `budget_items.is_refund` | ✅ |

→ "히스토리에 없음" ≠ "프로덕션에 미적용". 프로덕션은 repo 마이그 효과를 갖고 있고
**기록만 누락**됐을 가능성이 높다. (단 220개 전수 검증은 안 했다 — §3 전략이 이 리스크를 다룬다.)

## 2. 왜 naive 자동배포가 위험한가

`supabase db push` 는 "원격 `schema_migrations` 에 없는 로컬 마이그"를 전부 적용한다.
지금 켜면 **220개**(대부분 이미 적용된 과거 마이그)를 재실행 → `CREATE TABLE` 중복 등으로
**실패하거나 부분 적용**되어 위험하다. 그래서 베이스라인 정합 전에는 자동 apply 를 막아야 한다.

`deploy-migrations.yml` 는 이 위험을 반영해 **기본 dry-run**(읽기 전용 진단)이고, 실제
apply 는 `workflow_dispatch(apply=true)` 수동 + `SUPABASE_DB_PASSWORD` 시크릿이 있을 때만 동작한다.

## 3. 베이스라인 정합 — 전략 선택(사람 의사결정)

### 옵션 A — 스쿼시 베이스라인(권장, 가장 안전·깔끔)

현재 프로덕션 스키마를 **단일 진실원천**으로 받아들인다.

1. (DB 비번 필요) 로컬에서 `supabase db pull` 또는 `supabase db dump --schema public ... > baseline.sql` 로 현재 스키마 덤프.
2. 기존 258개 마이그를 `supabase/migrations/_archive/` 로 이동(히스토리 보존용).
3. `supabase/migrations/<baseline_ts>_baseline.sql` 한 장으로 대체.
4. 원격 `schema_migrations` 를 베이스라인 버전 1줄로 리셋(`supabase migration repair` 또는 직접 갱신).
5. 이후 신규 마이그는 `db push` 로 깨끗하게 적용.

- 장점: 덤프가 곧 프로덕션이라 "미적용 마이그 누락" 리스크 0. 히스토리가 깔끔하게 forward-only.
- 단점: DB 비번/ CLI 필요, 기존 마이그 히스토리를 아카이브(팀 합의 필요), 진행 중 PR 과 충돌 가능 → **머지 조용한 시점에 1회 실행**.

### 옵션 B — 마킹 정합(repo lineage 를 원격에 기록)

repo 마이그 220개를 원격 `schema_migrations` 에 "이미 적용됨"으로 기록(INSERT)해서 히스토리를 repo 에 수렴.

- 장점: SQL 만으로 가능(내가 바로 실행 가능), 되돌리기 쉬움(넣은 행 삭제). 기존 파일 보존.
- 단점: "220개가 전부 실제 적용됨"을 신뢰해야 함. 만약 진짜 미적용 마이그가 섞여 있으면 **영영 skip**(silent gap). 스팟체크는 통과했지만 전수는 아님.
- 보강: 마킹 전, 220개 각 마이그의 핵심 객체(테이블/컬럼/함수) 존재를 스크립트로 전수 확인 → 존재하지 않는 것만 골라 실제 적용 후 마킹. (정밀하지만 작업량 큼.)

### 옵션 C — 보류(현 상태 유지)

자동배포 없이, 마이그 추가 시 지금처럼 MCP/수동으로 적용. `deploy-migrations.yml` 는
dry-run 진단으로만 둔다. 가장 무위험이나 "머지=배포" 자동화는 미완.

## 4. 권장 순서

1. ✅ search_path 하드닝 — 완료.
2. ✅ `deploy-migrations.yml`(dry-run 기본) 추가 — 완료. 머지만으로 프로덕션 변경 없음.
3. ⏳ **옵션 선택**(A 권장). A 면 DB 비번 확보 후 스쿼시 1회. B 면 전수 객체검증 후 마킹.
4. ⏳ `SUPABASE_DB_PASSWORD` 시크릿 등록 → dry-run 자동 동작 → 검증 후 apply 수동 1회 → 안정화되면 자동 apply 로 승격.

## 5. 남은 보안 권고(search_path 외 — 별도 트랙)

`get_advisors(security)` 기준 추가 항목(이번 범위 밖, deferred):
- `rls_enabled_no_policy` 15건 · `public_bucket_allows_listing` 8건 · `rls_policy_always_true` 2건 ·
  `security_definer_view` 1건 · `extension_in_public` 1건 · SECURITY DEFINER 함수 노출 다수.
  → 각각 개별 검토 필요(일부는 의도된 설계일 수 있음). 다음 보안 감사 트랙에서 다룬다.
