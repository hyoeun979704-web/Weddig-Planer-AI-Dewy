# 스키마 정합성 감사 + 중복/불필요 테이블 정리 (2026.06.18)

> 요청: "스키마 정합성 검토하고 중복/불필요 테이블 정리". repo 정적 분석으로 수행.
> **결론 먼저: 레거시 중복 테이블은 이미 제거됐고, 진짜 문제는 "양방향 스키마 드리프트"다.**
> 라이브 DB 를 직접 조회할 도구(Supabase/Postgres MCP)가 이 환경에 없어, 파괴적 DROP 은
> `docs/sql/260618_schema_audit_verify.sql` 를 실 DB 에 돌려 확정한 뒤 진행한다(아래 §5).

## TL;DR

| 항목 | 결과 |
|------|------|
| 실제 DB 객체(types.ts 기준) | **테이블 121 + 뷰 4** |
| repo 마이그레이션 정의 테이블 | 122 (CREATE 기준, 과거 유물 포함) |
| **레거시 중복 모델** (vendors·venues·studios·suits·hanbok·honeymoon·appliances·ext_*·shopping_products·vendor_gallery/highlights) | **이미 실 DB 에서 제거됨** — 통합 `places`+`place_*` 모델로 대체. 추가 정리 불필요 |
| **정합성 갭(심각)** | repo 마이그레이션에 핵심 객체 **CREATE 누락**: `places`, `place_*`(13개), `tip_*`, `user_ai_memory`, `wedding_consulting_*` 등 |
| **types.ts staleness** | ~6/16 스냅샷 — 이후 추가분(`place_media_albums`·`vendor_deliveries`·`device_tokens` 등) 누락 |
| **라이브 미사용 "후보"** | 5개(`collection_logs`·`naver_search_cache`·`billing_attempts`·`place_exclusions`·`place_sources`) — **실 DB stat 검증 필요**(untracked RPC 가 쓸 수 있음) |

**핵심 메시지**: "중복 테이블 DROP" 으로 할 일은 거의 없다(이미 정리됨). 지금 필요한 "정리" 는
**스키마 baseline 재수립**(repo ↔ DB 일치)이다. 이게 안 되면 앞으로도 "코드가 참조하는 컬럼/RPC 가
실 DB 에 있는지" 확인이 불가능해 회귀가 반복된다(AGENTS "DB 스키마 정합성" 경고).

---

## 1. 가장 중요한 발견 — 양방향 드리프트 (repo 가 DB 의 source of truth 가 아님)

두 소스 모두 불완전하다. 어느 하나만 믿으면 틀린다.

**(A) DB 가 마이그레이션보다 앞섬** — 코드·types.ts 가 쓰는데 repo 마이그레이션에 `CREATE` 가 없는 객체:
`places`(앱 핵심 테이블!), `place_appliances`·`place_details`·`place_dress_shops`·`place_exclusions`·
`place_gallery_images`·`place_halls`·`place_hanboks`·`place_honeymoons`·`place_invitation_venues`·
`place_jewelry`·`place_makeup_shops`·`place_reviews`·`place_sources`·`place_studios`·`place_tailor_shops`·
`place_wedding_halls`, `tip_blogs`·`tip_channels`·`tip_instagrams`·`tip_videos`, `user_ai_memory`,
`wedding_consulting_reports`·`wedding_consulting_usage`, `billing_attempts`·`blocked_blog_authors`·
`collection_logs`·`naver_search_cache`.
→ `public.places` 는 수십 개 `ALTER TABLE` 만 있고 `CREATE TABLE` 은 repo 어디에도 없다. 초기 통합
   마이그레이션이 추적되지 않았다(대시보드 직접 변경 또는 squash 누락 추정).

**(B) 마이그레이션이 types.ts 보다 앞섬** — types.ts 가 stale: `place_media_albums`(20260617),
`vendor_deliveries`·`device_tokens`·`calendar_event_links`·`design_purchases`·`user_mail_accounts`(20260616)
는 실제 코드가 쓰는 라이브 테이블인데 types.ts 스냅샷(~6/15~16)에 없다.

**함의**: "types.ts 에 없다 = 실 DB 에 없다" 는 **오래된 테이블에만** 성립(신규는 stale 누락). 그래서
드롭 판단은 반드시 실 DB stat(`pg_stat_user_tables`)으로 해야 한다.

## 2. 레거시 중복 모델 — 이미 제거됨 (조치 불필요)

초기 모델은 카테고리별 별도 테이블(`vendors`·`venues`·`studios`·`suits`·`hanbok`·`honeymoon`·
`appliances`)이었고, 외부 수집은 `ext_*`·`shopping_products`·`product_options` 였다. 현재는 단일
**`places`** + 카테고리 디테일 **`place_*`** + **`place_details`** 로 통합됐다.

- repo 에서 명시적 `DROP TABLE` 된 것: `appliances·hanbok·honeymoon·honeymoon_gifts·studios·suits·place_planners`(20260613 전후).
- types.ts(실 DB)에서도 사라진 것(= 드롭 확인): 위 + `vendors`(마지막 0316)·`venues`(0122)·`reviews`(0614)·
  `ext_products`·`ext_hanbok`·`ext_wedding_halls`·`shopping_products`·`product_options`(0304)·
  `vendor_gallery`·`vendor_highlights`(0316)·`invitation_venues`(0602).
- **마이그레이션 파일 자체는 삭제하지 않는다**(append-only 히스토리). 정리 대상이 아니다.

→ 즉 "중복 테이블 DROP" 으로 지금 할 일은 사실상 없다. 이미 끝났다. §5 ①번 SQL 로 부재만 확인하면 된다.

## 3. 라이브 DB 미사용 "후보" — 실 DB 검증 필요 (지금 DROP 금지)

실 DB(types.ts)에는 있으나 **repo 코드/SQL/엣지/스크립트/agent 어디서도 참조 안 되는** 테이블:

| 후보 | 추정 성격 | 왜 그냥 못 지우나 |
|------|----------|------------------|
| `collection_logs` | 수집 로그 | untracked 엣지/크론이 INSERT 할 수 있음 |
| `naver_search_cache` | 검색 캐시(`product_search_cache` 와 중복 의심) | 수집 파이프라인이 쓸 수 있음 |
| `billing_attempts` | 결제 시도 로그 | 결제 webhook(untracked)이 쓸 수 있음 |
| `place_exclusions` | places 중복제거 제외 | `multibranch_geo_dedup` RPC(untracked 본문)가 쓸 가능성 큼 |
| `place_sources` | places 출처 추적 | 수집 RPC 가 쓸 가능성 큼 |

이들은 모두 **추적되지 않은 RPC/엣지함수**가 사용할 수 있어, repo 부재만으론 미사용 단정 불가
(정확히 §1 드리프트 때문). **§5 의 ②④⑤ SQL 로 reads/writes/함수의존을 확인**한 뒤에만 DROP.

> ⚠️ 참고: ⓑ 차집합에는 `place_appliances·place_halls·place_dress_shops…` 등 카테고리 디테일도
> 떴지만, 이들은 `.from()` 직접 호출 대신 **places JOIN·`get_my_listing_detail` 등 RPC·스크립트**로
> 접근한다(`place_studio_products` 는 scripts 3곳에서 사용). 미사용 아님 → 후보에서 제외했다.

## 4. 그 외 정합성 관찰

- **뷰 4개**(`admin_reports_overview`·`community_author_cards`·`game_ranking`·`user_consents_canonical`)는
  코드가 정상 사용. `game_ranking` 만 코드 `.from()` 미참조(RPC/직접 쿼리 경유 가능) — 확인 권장.
- `naver_search_cache` ↔ `product_search_cache` 는 캐시 **중복 의심** — §5 로 둘 다 사용량 비교.
- 코드가 쓰는 RPC 57개는 별도 시그니처 정합성 점검 권장(AGENTS "RPC 인자↔시그니처" 회귀 다발).
  본 감사 범위 밖(테이블 중심).

## 5. 권장 조치 (우선순위)

### P0 — 스키마 baseline 재수립 (진짜 "정리"; 드리프트 차단)
실 DB 를 repo 의 단일 소스로 끌어와 §1 드리프트를 끝낸다. (CI/로컬에서 1회)
```bash
supabase db pull                       # 실 DB 현재 스키마 → 새 baseline 마이그레이션 생성
supabase gen types typescript --linked > src/integrations/supabase/types.ts   # types 최신화
npm run build && npm run test          # 회귀 확인
```
이후부터 "코드가 참조하는 컬럼/RPC 가 실 DB 에 있나"를 repo 만으로 검증 가능해진다.

### P1 — 미사용 후보 확정 후 DROP (검증 선행 필수)
1. `docs/sql/260618_schema_audit_verify.sql` 를 Supabase SQL Editor 에서 실행.
2. ②⑤ 결과에서 reads=0·writes=0·rows=0 이고 ③④ 의존 없음인 테이블만 추린다.
3. 그 목록을 알려주면 **가드된 DROP 마이그레이션**(`DROP TABLE IF EXISTS … ;` + 롤백 주석)을 작성한다.
   → 이 단계는 사용자 확인 후 진행(되돌리기 어려움).

### P2 — 캐시 중복 정리
`naver_search_cache` 가 ②에서 미사용 확정 시 `product_search_cache` 로 일원화.

---

## 부록 — 분석 방법 (재현용)

- 실 DB 객체: `src/integrations/supabase/types.ts` 의 `Tables`/`Views` 키 추출(생성 타입=DB 반영).
- repo 정의: `supabase/migrations/**` 의 `CREATE TABLE` / `DROP TABLE`.
- 코드 사용: `src/`·`supabase/functions/`·`api/`·`scripts/` 의 `.from("…")`·`.rpc("…")` + agent tools.
- 차집합 ⓐ(마이그∖DB) ⓑ(DB∖코드) ⓒ(DB∖마이그)로 드리프트·미사용·갭 분리.
- 한계: 라이브 DB 직접 조회 불가(MCP 부재) → 사용량/의존성은 §5 SQL 로 사용자가 확인.
