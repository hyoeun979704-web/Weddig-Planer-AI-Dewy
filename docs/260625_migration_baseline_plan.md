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

## 4. 실행 결과 — 옵션 B(마킹 정합) 완료 + 진짜 미배포 8건 발견

**선택: 옵션 B(검증 기반 마킹).** 2026-06-25 실행.

1. repo 220개 미기록 마이그의 생성 객체(테이블·함수·컬럼·뷰 = 115/103/77/4)를 실DB 전수 대조.
2. 분류:
   - **이미 실행됨(객체 존재 또는 후속 마이그로 대체)**: 212건 → `schema_migrations` 에 기록(마킹).
     - 옛 프로토타입 테이블(vendors·events·reviews·ext_*·product_options·invitation_venues 등)을
       만든 2건은 "실행 후 폐기(places 모델로 대체)"라, **마킹**해서 push 재실행으로 죽은 테이블이
       부활하지 않게 했다.
   - **진짜 미배포(merge 됐지만 프로덕션에 안 닿음)**: **8건** → 마킹하지 않고 남김(파이프라인이
     배포하도록). 아래 §4-1.
3. 결과: 원격 히스토리 161 → **371** 기록. repo↔원격 미일치 = **딱 이 8건**(= push dry-run 이 보여줄 목록).

### 4-1. ⚠️ 진짜 미배포 마이그 8건 (merge 됐으나 프로덕션 미적용 — 실기능 갭)

배포 파이프라인 부재로 6/17~6/22 머지분 일부가 프로덕션에 안 닿았다. **현재 프로덕션에서 해당
기능이 깨져 있거나 빠져 있다**(클라는 배포됐는데 DB 스키마/RPC 가 없음):

| 마이그 | 미적용 객체 | 영향 |
|---|---|---|
| `20260617100000_admin_list_ai_failures` | `admin_list_ai_failures()` | 어드민 AI 실패 상세 조회 불가 |
| `20260619090000_business_product_detail_images` | `business_products.detail_images` | 상품 상세 다중이미지 저장 실패 |
| `20260620010000_photoshoot_drafts` | `photoshoot_drafts`·`_cuts` 테이블+버킷 | 웨딩촬영 시안 기능 전체(※ 워커 edge function 도 필요) |
| `20260620030000_subscription_recurring_columns` | `subscriptions.sid` 등 | 구독 자동갱신 토대 컬럼 |
| `20260622000000_add_schedule_start_date` | `user_schedule_items.start_date` | 체크리스트 시작일 |
| `20260622040000_invitation_rsvp_deadline` | `invitations.rsvp_closed/deadline`+gate | RSVP 마감 |
| `20260622050000_invitation_rsvp_self_edit` | `invitation_rsvp.edit_token`+RPC | 하객 응답 수정 |
| `20260622060000_notify_on_rsvp_submit` | `notify_on_rsvp_submit` 트리거 | RSVP 호스트 알림 |

→ 전부 멱등·추가형(IF NOT EXISTS / CREATE OR REPLACE)이라 적용 안전. 단 photoshoot 는 스키마만으로
   불완전(워커 함수 필요).

### 4-2. 처리 결과 (2026-06-25)

- **안전 추가형 7건 = 프로덕션 적용 완료** + 버전 기록. 적용 후 객체 존재 검증 통과
  (함수 5·컬럼 5·트리거 2 모두 생성 확인). 깨져 있던 실기능(상품 상세이미지·RSVP 마감/
  자가수정/알림·구독 컬럼·체크리스트 시작일·어드민 AI 실패조회) 복구.
- **photoshoot_drafts 1건 = 보류**. 스키마(테이블·버킷)만으로는 불완전하고 워커 edge function
  연결이 필요해, 그 기능 트랙에서 함께 배포. 현재 repo↔원격 미일치 = **이 1건뿐**.

## 5. 권장 순서(갱신)

1. ✅ search_path 하드닝.
2. ✅ `deploy-migrations.yml`(dry-run 기본).
3. ✅ 마킹 정합(212건) + 진짜 미배포 8건 격리.
4. ✅ 미배포 중 안전 7건 적용(프로덕션 복구) · photoshoot 1건 보류(워커 트랙).
5. ⏳ `SUPABASE_DB_PASSWORD` 시크릿 등록 → push dry-run 이 **photoshoot 1건만** 표시 확인 →
   워커 준비되면 apply → 안정화 후 자동 apply 승격.

## 5. 남은 보안 권고(search_path 외 — 별도 트랙)

`get_advisors(security)` 기준 추가 항목(이번 범위 밖, deferred):
- `rls_enabled_no_policy` 15건 · `public_bucket_allows_listing` 8건 · `rls_policy_always_true` 2건 ·
  `security_definer_view` 1건 · `extension_in_public` 1건 · SECURITY DEFINER 함수 노출 다수.
  → 각각 개별 검토 필요(일부는 의도된 설계일 수 있음). 다음 보안 감사 트랙에서 다룬다.
