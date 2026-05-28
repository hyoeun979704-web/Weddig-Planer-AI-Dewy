# 네이버 신규 4 카테고리 보강 프롬프트 (배치 67 / NAVER-FILL-4CAT)

> `places`에 `data_source='naver'`, `confidence=30`으로 들어온 4 카테고리 신규
> 1,283개 보강용 프롬프트.
> 자동 보강 완료 상태: 이미지 99%, 블로그 출처 81%, 카드 row(빈 styles 시드) 1:1
> 매칭. 이름·주소·전화·네이버 분류는 있고 가격·스펙·태그·설명·디자이너 정보 등이
> 비어 있음.
>
> | 카테고리 | row | 입력 파일 |
> |---|---|---|
> | tailor_shop (예복) | 433 | `fill-targets-tailor-shop.json` |
> | dress_shop (드레스) | 220 | `fill-targets-dress-shop.json` |
> | makeup_shop (메이크업) | 246 | `fill-targets-makeup-shop.json` |
> | jewelry (예물) | 384 | `fill-targets-jewelry.json` |
>
> 한 번에 10~15개씩 끊어서 던질 것. 응답은 그대로 받아서:
> `places` UPDATE + `place_details` UPSERT + `place_<cat>` UPDATE.

## 입력 형식 (모든 카테고리 공통)

```json
{
  "place_id": "<UUID>",
  "name": "<상호>",
  "city": "<시·도>",
  "district": "<시·군·구>",
  "naver_category": "예: 패션잡화>예복",
  "naver_place_url": "https://...",
  "address": "...",
  "tel": "02-..."
}
```

## 공통 조사 원칙

```
역할: 한국 결혼 준비 정보 리서처. 신랑 예복 / 신부 드레스 / 신부 메이크업 /
예물(반지) 매장 정보를 조사해서 정해진 JSON 스키마로 반환.

작업: 아래 place 목록 각각의 공식 정보 조사. 입력에 네이버 플레이스 URL이
있으면 그걸 1차 출처로 사용. 추측·창작 금지. 확인 못 한 필드는 null.

[조사 원칙]
1) 1차 출처: 입력 `naver_place_url` (네이버 플레이스 본문 + 상품/가격/리뷰 탭).
   2차 출처: 공식 홈페이지, 인스타, 카카오톡 채널, 블로그 후기(스펙 확인용).
2) 폐업/이전한 곳은 `"_closed_or_moved": true` 플래그.
3) place_id는 입력 그대로. name·address·tel은 더 최신 정보가 있으면 갱신,
   아니면 입력 그대로.
4) 가격은 1인 기준 패키지/세트 가격 (`price_per_person`).
   - 드레스: 본식+촬영 통합 패키지 / 본식 단독 / 촬영 단독 — 가장 일반적인
     "본식 1회" 기준 가격. 표기 없으면 null.
   - 메이크업: 신부 본식 메이크업 1회 + 헤어 기준.
   - 예복: 정장 1벌 기준 (재킷+바지). 패키지면 표기.
   - 예물: 커플 반지 세트 가격 (`price_couple_set`). 단품이면 `price_per_person`.
5) lat·lng는 네이버 플레이스 또는 카카오맵 좌표. WGS84 십진수 6자리.
6) image_urls는 네이버 플레이스 대표/매장/상품 이미지 최대 5장, https 직접 URL.
7) 디자이너/브랜드 라인업은 `designer_brands` JSONB에 저장.
   형식: `{"디자이너명":"라인 설명", "...":"..."}` 또는 객체 배열.
8) 모든 키 큰따옴표, trailing comma 금지, `"key":,` 빈 토큰 금지.
```

## 출력 스키마 — TAILOR_SHOP (예복)

```json
{
  "place_id": "UUID",
  "name": "정식 상호",
  "_closed_or_moved": false,

  "lat": 37.123456,
  "lng": 127.123456,
  "description": "120자 이내. 매장 위치·취급 브랜드·맞춤 가능 여부·예약 방식.",
  "tags": ["예복","맞춤정장","수트","신랑","압구정"],
  "main_image_url": "https://...",
  "min_price": 800000,

  "details": {
    "tel": "02-...", "address": "...",
    "website_url": null, "instagram_url": null,
    "naver_place_url": "https://m.place.naver.com/...",
    "hours": {"mon":"10:00-19:00","sun":"휴무"},
    "closed_days": ["일요일"],
    "subway_station": "압구정로데오역", "subway_line": "수인분당선", "walk_minutes": 5,
    "parking_free_guest": false, "parking_capacity": null,
    "advantage_1_title": "맞춤 제작 가능",
    "advantage_1_content": "원단·핏 직접 선택, 가봉 2~3회.",
    "image_urls": ["https://..."],
    "price_packages": [
      {"name":"클래식 수트 (재킷+바지)","price_min":800000,"price_max":1500000,
       "currency":"KRW","unit":"per_item","includes":["재킷","바지","가봉 2회"]}
    ],
    "amenities": ["주차","피팅룸","예약제"],
    "atmosphere": ["모던","클래식"],
    "pros": ["디자이너 직접 상담"],
    "cons": ["주말 예약 어려움"]
  },

  "tailor": {
    "price_per_person": 800000,
    "suit_styles": ["클래식","모던","슬림핏","쓰리피스","턱시도"],
    "custom_available": true,
    "fitting_count": 2,
    "designer_brands": {"갤럭시":"수입 원단","로가디스":"베이직 라인"},
    "accessories_included": false
  },

  "_sources": ["https://m.place.naver.com/..."]
}
```

## 출력 스키마 — DRESS_SHOP (드레스)

```json
{
  "place_id": "UUID",
  "name": "정식 상호",
  "_closed_or_moved": false,

  "lat": 37.123456, "lng": 127.123456,
  "description": "120자 이내. 위치·취급 디자이너·렌탈/판매·피팅·룸.",
  "tags": ["웨딩드레스","청담","머메이드","렌탈"],
  "main_image_url": "https://...",
  "min_price": 1200000,

  "details": {
    "tel":"02-...", "address":"...", "website_url":null, "instagram_url":null,
    "naver_place_url":"https://m.place.naver.com/...",
    "hours":{"mon":"10:00-20:00"}, "closed_days":["일요일"],
    "subway_station":"압구정로데오역","subway_line":"수인분당선","walk_minutes":7,
    "parking_free_guest":true,"parking_capacity":5,
    "advantage_1_title":"프라이빗 룸 운영","advantage_1_content":"...",
    "image_urls":["https://..."],
    "price_packages":[
      {"name":"본식 1회 렌탈","price_min":1200000,"price_max":2500000,
       "currency":"KRW","unit":"per_event","includes":["메인드레스","서브드레스","베일"]}
    ],
    "amenities":["주차","피팅룸","프라이빗 룸"],
    "atmosphere":["로맨틱","모던","고급스러운"]
  },

  "dress": {
    "price_per_person": 1200000,
    "dress_styles": ["머메이드","A라인","볼가운","미니멀","빈티지"],
    "rental_only": true,
    "fitting_count": 3,
    "rental_includes_alterations": true,
    "designer_brands": {"베라왕":"수입","임유나":"국내 디자이너"},
    "helper_included": true,
    "inner_included": true,
    "dress_count_included": 3,
    "main_dress_count": 1,
    "sub_dress_count": 2,
    "dress_size_range": "44~77",
    "alteration_count": 2,
    "veil_included": true,
    "gloves_included": true,
    "shoes_included": false,
    "bouquet_included": false,
    "tiara_included": true,
    "mother_dress_available": false,
    "private_room": true,
    "bestseller_designer": "임유나",
    "card_partners": ["삼성카드","현대카드"],
    "installment_months": 12,
    "gift_items": ["부케","티아라"],
    "promotion_text": "5월 예약 시 부케 무료",
    "package_url": "https://...",
    "is_bestseller": false,
    "is_new": true
  },

  "_sources": ["https://..."]
}
```

## 출력 스키마 — MAKEUP_SHOP (메이크업)

```json
{
  "place_id": "UUID",
  "name": "정식 상호",
  "_closed_or_moved": false,

  "lat": 37.123456, "lng": 127.123456,
  "description": "120자 이내. 위치·디렉터·헤어메이크업 분리/통합·출장 가능 여부.",
  "tags": ["신부메이크업","청담","자연스러운","출장"],
  "main_image_url": "https://...",
  "min_price": 350000,

  "details": {
    "tel":"02-...", "address":"...", "website_url":null, "instagram_url":null,
    "naver_place_url":"https://m.place.naver.com/...",
    "hours":{"mon":"08:00-21:00"}, "closed_days":[],
    "subway_station":"청담역","subway_line":"7호선","walk_minutes":3,
    "parking_free_guest":false,"parking_capacity":null,
    "advantage_1_title":"리허설 1회 포함","advantage_1_content":"...",
    "image_urls":["https://..."],
    "price_packages":[
      {"name":"신부 본식 메이크업 + 헤어","price_min":350000,"price_max":700000,
       "currency":"KRW","unit":"per_person","includes":["본식 메이크업","헤어","리허설 1회"]}
    ],
    "amenities":["원장 직접 시술","조기 새벽 가능"],
    "atmosphere":["고급스러운","프라이빗"]
  },

  "makeup": {
    "price_per_person": 350000,
    "makeup_styles": ["자연스러운","화려한","웨딩","로맨틱"],
    "includes_rehearsal": true,
    "hair_makeup_separate": false,
    "rehearsal_count": 1,
    "travel_fee_included": false,
    "director_level": "원장",
    "early_morning_fee": 30000,
    "parents_makeup_available": true,
    "parents_makeup_price": 150000,
    "groom_grooming_available": true,
    "groom_grooming_price": 80000,
    "bridesmaid_makeup_available": true,
    "travel_zones": ["서울","경기"],
    "wedding_day_helper": true,
    "false_lashes_included": true,
    "eyelash_extension_available": false,
    "semi_permanent_makeup": false,
    "bestseller_designer": "박서원 원장",
    "card_partners": ["신한카드","삼성카드"],
    "installment_months": 6,
    "gift_items": ["립스틱","쿠션"],
    "promotion_text": null,
    "package_url": null,
    "is_bestseller": false,
    "is_new": true
  },

  "_sources": ["https://..."]
}
```

## 출력 스키마 — JEWELRY (예물)

```json
{
  "place_id": "UUID",
  "name": "정식 상호",
  "_closed_or_moved": false,

  "lat": 37.123456, "lng": 127.123456,
  "description": "120자 이내. 위치·브랜드·취급 카테고리(반지/팔찌/목걸이)·다이아 인증.",
  "tags": ["예물","결혼반지","종로","18K","다이아"],
  "main_image_url": "https://...",
  "min_price": 1500000,

  "details": {
    "tel":"02-...", "address":"...", "website_url":null, "instagram_url":null,
    "naver_place_url":"https://m.place.naver.com/...",
    "hours":{"mon":"10:00-19:00","sun":"휴무"}, "closed_days":["일요일"],
    "subway_station":"종각역","subway_line":"1호선","walk_minutes":4,
    "parking_free_guest":false,"parking_capacity":null,
    "advantage_1_title":"GIA 인증 다이아","advantage_1_content":"...",
    "image_urls":["https://..."],
    "price_packages":[
      {"name":"커플링 (18K + 0.3ct)","price_min":2500000,"price_max":4000000,
       "currency":"KRW","unit":"per_set","includes":["남자 밴드","여자 밴드","0.3ct 다이아"]}
    ],
    "amenities":["A/S 평생","사이즈 조정 무료"],
    "atmosphere":["고급스러운","클래식"]
  },

  "jewelry": {
    "price_per_person": 1500000,
    "price_couple_set": 2500000,
    "metals": ["18K","14K","백금","로즈골드"],
    "product_categories": ["결혼반지","예물","목걸이","팔찌"],
    "diamond_certified": true,
    "diamond_cert_org": "GIA",
    "engraving_available": true,
    "size_resize_free": true,
    "lifetime_warranty": true,
    "couple_set_available": true,
    "brand_name": "골든듀",
    "brand_origin": "한국",
    "brand_history_year": 35,
    "brand_tier": "프리미엄",
    "showroom_count": 12,
    "product_url": "https://...",
    "product_code": "GD-001",
    "product_type": "커플링",
    "sub_category": "결혼반지",
    "store_type": "단독 매장",
    "carat_diamond": 0.30,
    "band_design": "심플",
    "band_profile": "라운드",
    "band_width_mm": 2.5,
    "band_thickness_mm": 1.8,
    "band_finishing": "유광",
    "stone_setting": "프롱",
    "diamond_color": "G",
    "diamond_clarity": "VS1",
    "diamond_cut": "Excellent",
    "diamond_shape": "라운드",
    "diamond_origin": "천연",
    "side_stones_count": 0,
    "side_stones_total_carat": null,
    "gold_karat": "18K",
    "custom_design_available": true,
    "delivery_days": 14,
    "aftercare_includes": ["사이즈 조정","광택 복원","로듐 도금"],
    "package_includes": ["반지 케이스","감정서","청결 키트"],
    "partnership_dept_stores": ["롯데","현대","신세계"],
    "signature_collection": "이터널",
    "promotion_text": "5월 결혼반지 10% 할인"
  },

  "_sources": ["https://..."]
}
```

## 한 번에 던지는 chunk 크기

LLM 한 회 응답 토큰 한계 고려:
- Sonnet/Opus: 10~15개 안전 (jewelry는 5~10개)
- Gemini Pro: 10개 안전 (jewelry는 5~8개)
- ChatGPT-4: 8개 안전 (jewelry는 5개)

jewelry는 출력 스키마가 워낙 길어서 chunk 작게.

## 반영 SQL (참고)

```sql
-- 모든 카테고리 공통: places UPDATE
UPDATE places SET
  description = $description,
  tags = $tags,
  main_image_url = $main_image_url,
  lat = $lat, lng = $lng,
  min_price = $min_price,
  confidence = 70,
  last_source_date = CURRENT_DATE,
  updated_at = NOW()
WHERE place_id = $place_id;

-- place_details UPSERT (details.* 사용)
INSERT INTO place_details (place_id, ...) VALUES (...)
ON CONFLICT (place_id) DO UPDATE SET ...;

-- 카테고리별 UPDATE — 카드 row는 이미 시드돼서 INSERT가 아닌 UPDATE
-- tailor:
UPDATE place_tailor_shops SET
  price_per_person = $tailor.price_per_person,
  suit_styles = (
    SELECT ARRAY_AGG(DISTINCT s)
    FROM unnest(COALESCE(suit_styles,'{}') || $tailor.suit_styles::text[]) s
  ),
  custom_available = $tailor.custom_available,
  fitting_count = $tailor.fitting_count,
  designer_brands = $tailor.designer_brands::jsonb,
  accessories_included = $tailor.accessories_included
WHERE place_id = $place_id;

-- dress: dress_styles는 기존 시드 + 응답 합집합
UPDATE place_dress_shops SET
  price_per_person = $dress.price_per_person,
  dress_styles = (
    SELECT ARRAY_AGG(DISTINCT s)
    FROM unnest(COALESCE(dress_styles,'{}') || $dress.dress_styles::text[]) s
  ),
  rental_only = $dress.rental_only,
  fitting_count = $dress.fitting_count,
  ... -- 나머지 필드 동일 패턴
WHERE place_id = $place_id;

-- makeup, jewelry도 동일 패턴 (배열은 합집합, 스칼라는 직접 대입)
```

## 폐업 처리

```sql
UPDATE places SET deleted_at = NOW(), is_active = false WHERE place_id = $place_id;
```

## 우선순위 권장

1. **tailor_shop** (433개, 가장 가벼움 — 컬럼 6개)
2. **makeup_shop** (246개, 컬럼 27개)
3. **dress_shop** (220개, 컬럼 30개)
4. **jewelry** (384개, 컬럼 60+개 — 가장 무거움)

jewelry는 다이아 4C·밴드 디테일 등 매장에서 공개 안 한 정보가 많을 것 — 확인된
것만 채우고 나머지 null.
