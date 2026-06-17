# 260617 정합성 검토 — RPC 계약 + repo↔라이브 DB drift

> 계기: 검토(승인/반려) 연쇄 실패가 모두 **repo↔라이브 스키마 드리프트**(마이그레이션 미적용·
> 타입 불일치)에서 비롯. CI 에 `supabase db push` 가 없어 마이그레이션이 자동 적용되지 않는 게
> 뿌리. ① 정적 RPC 계약 대조(완료) + ② 라이브 introspection SQL(아래) 로 정합성을 잡는다.

## ① 정적 RPC 계약 대조 (프론트 호출 ↔ repo 시그니처)
- **대부분 일치(45+ RPC ✅)**. 프론트가 보내는 인자 집합이 repo 최신 시그니처와 맞음.
- **repo 정의 누락 2건**(라이브엔 존재할 수 있음 — repo 추적 누락, schema-in-DB≠repo):
  - `admin_ai_job_stats` (`AdminAIJobs.tsx`) — repo 에 CREATE 없음. → 라이브 정의를 repo 로 캡처 필요.
  - `claim_mission_bonus` (`PersonaDashboard.tsx`) — repo 에 CREATE 없음. → 동일.
- **반환타입 P2**: `admin_set_member_tier` 가 `returns void`(호출부는 error 만 검사 → 무해).

## ② 확인된 repo↔라이브 드리프트(런타임 장애 유발)
| 증상 | 원인 | 조치 |
|---|---|---|
| 이벤트/상품 검토 "처리 실패"(PGRST202) | `admin_review_event/product` 3-인자(p_note) 가 **라이브 미적용**(repo 20260522000000) | 라이브에 3-인자 버전 적용(완료) |
| 업체정보 검토 `operator does not exist: uuid = text` | `places.place_id` 는 **uuid** 인데 `admin_review_listing` 파라미터/비교가 text | `place_id::text = p_place_id` 캐스트(마이그레이션 `20260617060000`) |
| 직접전환/포트폴리오 미반영 | place_media 포폴 컬럼·역할부여 RPC 라이브 미적용 | 대시보드 SQL 로 적용(완료) |

### place_id 타입 내부 불일치(주의)
repo 마이그레이션조차 `place_id` 타입이 엇갈림: `place_media`/`business_products` = **uuid** FK,
`business_coupons`/`business_events` = **text** FK. 라이브 정답은 **uuid**. text 로 가정한 코드/FK 가
잠재 위험 → introspection 으로 확인 후 정리.

## ③ 라이브 introspection SQL (대시보드에서 실행 → 결과로 정합성 확정)

```sql
-- (1) 핵심 RPC 가 라이브에 어떤 인자로 존재하는지 (프론트 호출과 대조)
select p.proname as func, pg_get_function_arguments(p.oid) as args
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in (
  'admin_review_business','admin_review_event','admin_review_product','admin_review_listing',
  'admin_set_member_tier','admin_set_member_affiliation','admin_get_member_affiliations',
  'admin_set_business_tier','admin_review_partnership','admin_review_place_claim',
  'upsert_my_listing','upsert_my_listing_detail','get_my_listing','request_place_claim',
  'create_quote_request','submit_quote_response','accept_quote_response',
  'claim_mission_bonus','admin_ai_job_stats','pay_balance','increment_place_views'
)
order by p.proname, args;

-- (2) 핵심 컬럼 타입/존재 (타입 드리프트·미적용 컬럼)
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public' and (
  (table_name='places' and column_name in ('place_id','moderation_status','moderation_note','owner_user_id','lat','lng','is_partner','data_completeness')) or
  (table_name='business_events' and column_name in ('moderation_status','moderation_note','place_id')) or
  (table_name='business_products' and column_name in ('moderation_status','moderation_note','place_id')) or
  (table_name='business_coupons' and column_name in ('moderation_status','moderation_note','image_url','place_id')) or
  (table_name='place_media' and column_name in ('venue_place_id','venue_name','style_tags','description','album_id')) or
  (table_name='business_profiles' and column_name in ('approval_status','partner_tier'))
)
order by table_name, column_name;

-- (3) repo 에 없는 함수의 라이브 정의 추출(있으면 repo 로 캡처)
select pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public' and p.proname in ('admin_ai_job_stats','claim_mission_bonus');

-- (4) CLI 로 적용된 마이그레이션 최신 목록 (대시보드 수동 적용분은 여기 안 잡힘 — 참고용)
select version from supabase_migrations.schema_migrations order by version desc limit 50;
```

> 주의: 대시보드 SQL 에디터로 수동 적용한 변경은 `supabase_migrations.schema_migrations` 에
> 기록되지 않는다. 따라서 (4)보다 **(1)(2)의 실제 객체 존재**가 정합성의 신뢰 지표다.

## 근본 해결 (재발 방지)
- **CI 에 마이그레이션 적용 단계 추가**(`supabase db push --linked`, `SUPABASE_DB_PASSWORD` 시크릿) —
  단, 라이브가 이미 드리프트돼 있어 첫 push 는 충돌 가능 → **먼저 위 introspection 으로 정합화한 뒤**
  도입. (`docs/260617_ops_migration_and_push.md` 참조.)
- repo 누락 함수(admin_ai_job_stats·claim_mission_bonus)는 (3) 결과를 마이그레이션으로 캡처.
- place_id 타입 단일화(uuid) — text FK/파라미터 정리(별도 PR, 신중히).

## 다음
사용자가 (1)(2)(3) 결과를 공유 → repo 기준과 1:1 대조해 **남은 미적용/불일치 목록 확정** →
일괄 교정 SQL + repo 캡처 마이그레이션 제공.

## 검토 결론 (260617 — 라이브 introspection 후 확정)
- **라이브 적용 이력이 `20260615061514`에서 멈춤** → repo 의 6/15 정오~6/17 마이그레이션 **13개 미적용**
  (업체보드·캘린더동기화·결과물전송·인앱메일·디자인마켓·견적FK·문의상태·푸시 등). → **일괄 적용 완료**
  (대시보드 SQL, 전부 `IF NOT EXISTS`/`CREATE OR REPLACE` 멱등).
- **역드리프트 없음**: 라이브 전용 3건(`20260615043205`·`045531`·`061514`)은 모두 repo 에 **다른
  버전번호로 동일 기능 존재**(`043300_quote_lead_sla_reminder`·`120000_vendor_board_items`(스키마
  완전 일치)·`123000_vendor_board_custom_label`). 캡처 불필요 — 버전번호 표기 차이일 뿐 기능 일치.
- **수동 적용분(미추적)**: place_media_portfolio·admin_review_business_grants_role·
  admin_member_affiliation·notify_on_inquiry_answered·review_notes(3-arg)·admin_review_listing(uuid캐스트)
  은 대시보드로 적용됨(schema_migrations 미기록이나 객체는 존재).
- **순 결과**: repo ↔ 라이브 **기능적 정합 확보**. 잔여는 버전번호 bookkeeping(선택적 `migration repair`).
- **재발 방지(권장)**: 정합 상태에서 CI `supabase db push` 도입 시 드리프트 영구 차단(멱등이라 안전).
