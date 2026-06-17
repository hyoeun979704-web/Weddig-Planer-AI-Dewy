# 260617 기획 — 멀티지점 + 같은-좌표 중복등록 차단 (분석 선행)

> 사용자 결정: ① 한 계정이 **여러 지점** 관리 ② **같은 좌표/같은 업체 중복 등록 차단**(오프라인
> 매장 유무로 판정 분기) ③ 중복이 크롤링 카탈로그 업체면 **claim 안내** ④ 멀티지점 UX = 상단
> **지점 선택기 + 새 지점 추가**. 계기: 마토니 인천본점이 같은 계정으로 2행 중복 등록됨.

## 현 구조 분석 (코드 전 조사)
- `places`: `owner_user_id`(nullable, **UNIQUE 없음** → 한 계정 다수 소유 storage 차원 이미 가능),
  `lat`/`lng`(크롤링만 백필, 업체 직접등록은 좌표 없음), `category`·`city`·`district`·`data_source`.
- `get_my_listing()` = `SELECT * FROM places WHERE owner_user_id=auth.uid() **LIMIT 1**`(ORDER BY 없음)
  → 2행이면 비결정적. **11개 업체 페이지 전부**가 이걸 호출(단일 지점 전제):
  Dashboard·VendorEdit·Gallery·Products·Events·Coupons·Deliveries·Inquiries·Designs·Reviews.
- `upsert_my_listing(7-arg)` = owner LIMIT 1 로 기존행 찾아 update, 없으면 insert. **좌표·주소·매장유무 없음.**
- 등록 폼(`BusinessVendorEdit`)은 시/도·구/군만 입력(상세주소·좌표 없음).
- 재사용: `request_place_claim`/`admin_review_place_claim`(미소유 카탈로그 업체 인수), geocode edge fn.

## 중복 판정 규칙 (사용자 결정 반영)
- **오프라인 매장 있음**(`has_offline_store=true`) → **좌표 기준**: 같은 category + 반경 ~50m 내
  기존 place 존재 시 중복. (등록 폼에 상세주소 입력 → 지오코딩으로 lat/lng 확보)
- **오프라인 매장 없음**(스냅·축의대·축가 등) → **이름+지역 기준**: 같은 category + 정규화 이름 +
  시/도 + 구/군 일치 시 중복.
- 매칭된 기존 업체가 **owner 없음(카탈로그)** → `claim` 안내(차단 X, 인수 유도).
  **다른 owner** → 차단. **본인 owner** → "이미 등록된 지점" 안내(마토니 케이스 방지).
- 가드는 **SECURITY DEFINER RPC 서버측**에 둔다(클라 검사만으론 우회 가능 — AGENTS.md 보안).

## 데이터 모델 (마이그레이션, 전부 additive·멱등)
| 대상 | 변경 |
|---|---|
| places | `has_offline_store boolean default true`, `road_address text`, (`lat`/`lng` 이미 존재—IF NOT EXISTS 보강) |
| index | `idx_places_owner_created`(지점 선택기 정렬), `idx_places_geo`(lat,lng 부분), 정규화이름 매칭 인덱스 |

## RPC (Phase 1 — 전부 additive, 기존 upsert_my_listing 미변경 = 무중단)
1. `get_my_listings()` → owner 의 **모든** place(`order by created_at`). (단수 get_my_listing 은 호환 유지)
2. `find_duplicate_place(p_category,p_name,p_city,p_district,p_has_offline_store,p_lat,p_lng,p_exclude)`
   → 규칙대로 매칭되는 **기존 place 1건**(place_id,name,owner_user_id,data_source) 또는 없음. 폼 사전경고+서버가드 공용.
3. `create_my_branch(...신규지점 필드...)` → 내부에서 find_duplicate_place 호출:
   - 카탈로그매칭 → `{ok:false,reason:'claimable',place_id}` (claim 유도)
   - 타 owner → `{ok:false,reason:'duplicate_other',place_id}`
   - 본인 owner → `{ok:false,reason:'duplicate_own',place_id}`
   - 없음 → insert(pending) → `{ok:true,place_id}`
4. `update_my_branch(p_place_id, ...)` → owner 확인 후 해당 지점만 수정(주소변경 시 self 제외 중복 재검사).

> 좌표 거리: PostGIS 없이 haversine(또는 위경도 bounding-box+근사). 한국 위도 보정(cos lat).

## 프론트 (Phase 2)
- **지점 컨텍스트**: `useSelectedBranch()`(URL `?branch=` + localStorage, 기본=첫 지점). 11페이지가
  `get_my_listing` 대신 이걸로 활성 place_id 획득(기계적 치환).
- **Dashboard 상단 지점 선택기** + "+ 새 지점 추가"(→ 등록 폼, create_my_branch).
- **등록 폼(BusinessVendorEdit)**: ① 신규/편집 구분(create_my_branch vs update_my_branch)
  ② "오프라인 매장 있음" 토글 ③ 매장 있음 → 상세주소 입력 + 지오코딩(좌표 확보)
  ④ 저장 전 find_duplicate_place 로 경고/claim 분기.

## Phase 3 — 마토니 기존 중복 1회 정리
멀티지점 허용해도 두 마토니 행은 **같은 지점(둘 다 인천본점)** = 진짜 중복 → 통합 트랜잭션 SQL
(앞서 만든 진단→백업→이동→소프트삭제→검증). 별도 운영 SQL.

## 검증 (sandbox 한계)
- 마이그레이션은 esbuild 대상 아님 → SQL 정합은 라이브 적용 후 introspection + e2e(폼 등록→중복
  케이스 3종→claim 동선) 확인 필요. 단위 가능한 거리/정규화 함수는 SQL 자체검토.
- "정적 통과 ≠ 런타임" — create_my_branch 반환계약을 폼이 정확히 분기하는지 e2e 필수.
