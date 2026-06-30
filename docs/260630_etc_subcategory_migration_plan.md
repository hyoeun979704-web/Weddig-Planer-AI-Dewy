# etc 세부 분화 — DB 선확인 + 마이그레이션 계획서 (260630)

> S0.5(M2 결정: etc 세부 슬러그 분화)의 **실 스키마 선확인 결과 + 적용 계획**. 코드/DB 변경 없음(읽기 전용 조회만 수행). 실제 적용은 **명시적 승인** 후.
> 조회: Supabase 프로젝트 `dewy_wedding_planer_AI`(qabeywyzjsgyqpjqsvkd), 읽기 전용 SQL.

## 1. 선확인 결과 (실측 260630)

### 1-1. `places.category` = **text + CHECK 제약**(enum 아님)
```
CHECK (category = ANY (ARRAY[
  'wedding_hall','studio','dress_shop','makeup_shop','hanbok','tailor_shop',
  'honeymoon','appliance','jewelry','invitation_venue','planner','etc'
]))
```
- **함의**: 새 세부 값 추가 = **CHECK 제약 ALTER**(enum DROP/ADD VALUE 불필요 — 훨씬 쉽고 안전). 트랜잭션 내 교체 가능.
- ⚠️ 클라 단일소스 `categoryLabels.PLACE_CATEGORY_LABEL`에 **`planner`가 없다**(DB엔 있음) → 드리프트. 분화 시 같이 정리.

### 1-2. 데이터 규모 = **극소**(분화 저위험, 단 공급도 미미)
| 측 | 수치 |
|---|---|
| `places.category='etc'` | **7개**(전부 active) |
| `business_profiles.service_category='etc'` | **14개** |
| business_profiles 전체 | ~19개(etc 14·studio 3·suit 1·wedding_hall 1) |
| `place_media_albums` 전체 | **1개** |
| 앨범 중 style_tags 있는 것 | **0개** |

- **결론**: etc 재분류 대상은 places 7 + profiles 14 = 소수. 마이그레이션 자체는 **분 단위·저위험**.
- **그러나** 포트폴리오/무드 데이터가 사실상 0 → 개인화 루프는 **전부 forward-looking**(아직 프로덕션 수요 없음). 분화의 **우선순위는 낮음**(공급·수요가 생긴 뒤가 효율적).

## 2. 3-레이어 적용 계획 (승인 후)

> 원칙(사용자 확정): ① 이미 있는 걸 연결 ② 점진적. enum 신설 최소화.

**S0.5-1. 카테고리 어휘 확장(택소노미)**
- `SERVICE_CATEGORIES`(business)·`PLACE_CATEGORY_LABEL`(place)에 세부 슬러그 추가. 슬러그명 = `vendorBoard.ts` 기존 키 재사용: `main_snap`·`main_dvd`·`iphone_snap`·`mc`·`bouquet` 등.
- `planner` 라벨 누락도 함께 보정(드리프트 해소).

**S0.5-2. DB CHECK 제약 ALTER(마이그레이션)**
```sql
-- 계획(미적용). 트랜잭션 내 교체.
ALTER TABLE places DROP CONSTRAINT <category_check_name>;
ALTER TABLE places ADD CONSTRAINT places_category_check CHECK (category = ANY (ARRAY[
  ...기존 12값..., 'main_snap','main_dvd','iphone_snap','mc','bouquet'  -- 신규 세부
]));
```
- `_biz_category_to_place` 매핑 함수(있다면)도 세부 슬러그 반영.
- **DETAIL_SCHEMA**(`BusinessListingDetailForm`)에 세부별 경량 스키마 추가(가격·소요시간·출장·당일가능 공통).

**S0.5-3. 기존 etc 재분류 + 소비자 매칭 배선**
- 기존 etc 7 places·14 profiles는 **자동 재분류 불가**(어떤 세부인지 정보 없음) → **운영자 수동 재태깅** 또는 사장 본인 재선택 유도(소수라 감당 가능).
- `vendorBoard.ts` 세부 슬롯에 `quoteCategory` 배선(이제 유효 카테고리 존재) → 소비자 견적·검색 연결.

## 3. 권고
- **저위험·저우선**: 데이터가 적어 마이그레이션은 안전하나, etc 공급(7)·포트폴리오(1)가 미미해 **지금 분화해도 체감 효과 낮음**. **사장님 앱으로 공급이 쌓이기 시작한 뒤** 분화하는 게 ROI 높음.
- 그 전까지: 현행 "둘러보기(기타)" 유지(dead-end 아님). 무드 통제 피커·취향 정렬(이미 구현)이 공급 유입 시 바로 작동.
- 적용을 원하면: 본 계획 §2 순서로 PR(코드 어휘 + 마이그레이션 + 운영자 재분류 안내). **CHECK ALTER는 프로덕션 변경이라 별도 승인.**

## 4. 빈 카테고리·죽은 배선 감사 + 정리 (260630, 사용자 요청 "비어있는 것 연결 확인·정리")

### 4-1. 실측 (읽기 전용)
| 항목 | 수치 | 판정 |
|---|---|---|
| `places.category='planner'` | **0** | 죽은 카테고리(공급 0) |
| `places.category='etc'` | 7 | 희소 |
| `place_media` | 18 | (사진 일부 존재) |
| `place_media_albums` | 1 | 거의 빔 |
| 앨범 style_tags 보유 | **0** | 무드 루프 미사용(신규 기능, forward-looking — 정리 대상 아님) |
| `place_media` style_tags 보유 | 3 | 레거시 per-photo 태그 |
| business_profiles | 19(전부 승인) | — |
| quote_requests | 1 | — |

### 4-2. 발견한 **죽은 배선**(정리함)
- 🔴 **`웨딩플래너` vendor 카테고리 dead-end** — `placeMappers.KOREAN_TO_PLACE_CATEGORY`는 *"웨딩플래너는 Dewy 핵심 제품(AI 플래너)이라 vendor 카테고리 제외"* 라고 명시·제외했는데, `useVendors.VENDOR_CATEGORIES`·`categoryRouteMap`·`vendorBoard`(planner 슬롯 `browseLabel`)엔 **남아 있어** 드리프트. 결과: 소비자 보드 '플래너' 슬롯의 **'둘러보기'→`/vendors/웨딩플래너`→0건 빈 목록**(VendorBoard 주석 "공급 없는 슬롯 죽은 버튼 금지" 위반, 게다가 유효하지 않은 slug 로 조회).
  - **정리(적용)**: vendorBoard planner 슬롯 `browseLabel` 제거(메모 기록 슬롯화) + `useVendors`의 `VENDOR_CATEGORIES`·`categoryRouteMap`에서 `웨딩플래너` 제거. → placeMappers 정책과 일치, dead-end CTA 제거.

### 4-3. etc 분화 = **지금 미루는 게 코드베이스 자체 의도와 일치**
`KOREAN_TO_PLACE_CATEGORY` 주석(기존):
> *"기타 세부 유형은 places.tags 로 구분하고, **업체가 충분히 모이면 단일 카테고리로 분리**한다(분리 시 이 매핑만 추가)."*

즉 §3 권고(공급 쌓인 뒤 분화)는 **새 제안이 아니라 기존 설계가 이미 그렇게 정해둔 것**. etc 7개·앨범 0무드 상태에서 6사이트 분화+프로덕션 마이그레이션은 그 의도에 반함. → **분화 보류 확정**, 공급 신호 생기면 그때 §2.

### 4-4. 안 건드린 것(정리 대상 아님)
- 앨범 무드 0 / etc 7 = **신규 기능의 빈 상태**(데이터가 차야 함) — 배선은 정상(무드 피커·취향 정렬 구현됨), 데이터만 비었을 뿐. 제거 금지.
- vendorBoard 기타 슬롯(main_snap·mc·bouquet…) `browseLabel:"기타"` → `/vendors/기타`(etc 7건) = **공급 있음**, dead-end 아님 — 유지.

---
*문서 끝. 선확인·죽은배선 정리 완료. etc 분화는 기존 설계 의도대로 **공급 축적 후**로 보류(프로덕션 마이그레이션 미적용).*
