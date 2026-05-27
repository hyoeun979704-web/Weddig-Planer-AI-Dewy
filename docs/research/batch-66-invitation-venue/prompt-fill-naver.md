# 청첩장모임장소 — 네이버 신규 570개 보강 프롬프트 (배치 66 / NAVER-FILL)

> `places` 테이블에 `data_source='naver'`, `confidence=30`으로 들어온 570개
> raw 후보를 보강하는 프롬프트. 네이버 로컬 검색 API에서 받아온 거라 이름·주소·
> 전화·네이버 플레이스 URL은 있는데 가격·이미지·수용·분위기·설명·태그가 비어
> 있음. 입력 파일: `fill-targets-naver.json` (570 row).
>
> LLM 부담 줄이려면 한 번에 10~15개씩 끊어서 던질 것. 결과는 그대로 나한테 —
> `place_details` UPSERT + `place_invitation_venues` UPDATE + `places` UPDATE
> (description / tags / main_image_url / lat·lng)로 반영.

## 입력 형식 (각 row)

```json
{
  "place_id": "<UUID>",
  "name": "<상호>",
  "city": "<시·도>",
  "district": "<시·군·구>",
  "naver_category": "음식점>한식>한정식",
  "naver_place_url": "https://m.place.naver.com/restaurant/...",
  "address": "...",
  "tel": "02-..."
}
```

## 프롬프트 본문

```
역할: 한국 결혼 준비 정보 리서처. 양가 상견례·청첩장 모임·양가 식사 자리로
적합한 식당의 정보를 조사해서 정해진 JSON 스키마로 반환.

작업: 아래 place 목록 각각의 공식 정보 조사. 입력에 이미 네이버 플레이스 URL이
있으니 그걸 1차 출처로 사용. 추측·창작 금지. 확인 못 한 필드는 null.

[입력 — 조사 대상]
[
  {
    "place_id":"<UUID>",
    "name":"<상호>",
    "city":"<시도>",
    "district":"<시군구>",
    "naver_category":"<네이버 분류>",
    "naver_place_url":"<네이버 플레이스 URL>",
    "address":"<주소>",
    "tel":"<전화>"
  },
  ...
]

[조사 원칙]
1) 1차 출처: 입력 `naver_place_url` (네이버 플레이스 본문 + 메뉴/사진/리뷰 탭).
   2차 출처: 카카오맵, 망고플레이트, 공식 홈페이지/인스타.
   블로그 후기는 분위기·메뉴 양면 확인용으로만.
2) 폐업/이전한 곳은 `"_closed_or_moved": true` 플래그.
3) place_id는 입력 그대로 유지. name·address·tel은 네이버 플레이스가 더 최신이면
   갱신, 아니면 입력 그대로.
4) 가격은 코스/세트 메뉴 기준 1인 가격(`price_per_person`). 단품 비추천.
   가격 표기가 없거나 "시가"면 null.
5) 수용 인원은 룸/홀 기준 동시 수용 가능한 최소·최대. 가게 전체 좌석 수가 아님.
6) lat·lng는 네이버 플레이스 또는 카카오맵의 좌표. WGS84 십진수 6자리.
7) image_urls는 네이버 플레이스 대표/실내/메뉴 이미지 최대 5장, https 직접 URL.
   네이버 CDN URL이면 그대로 사용 가능.
8) 모든 키 큰따옴표, trailing comma 금지, `"key":,` 빈 토큰 금지.

[출력 — 유효한 단일 JSON 배열]
[
  {
    "place_id": "UUID 입력 그대로",
    "name": "현재 정식 상호",
    "_closed_or_moved": false,

    // places UPDATE (description / tags / main_image_url / lat·lng / min_price)
    "lat": 37.123456,
    "lng": 127.123456,
    "description": "120자 이내, 사실 위주. 분위기·대표 메뉴·룸 유무·상견례 적합성 포함.",
    "tags": ["한식","한정식","룸식당","상견례","가족모임","조용한"],
    "main_image_url": "https://...",

    // place_details UPSERT
    "tel": "02-...",
    "address": "...",
    "website_url": null,
    "instagram_url": null,
    "naver_place_url": "https://m.place.naver.com/...",
    "hours": {
      "mon":"11:30-22:00","tue":"11:30-22:00","wed":"11:30-22:00",
      "thu":"11:30-22:00","fri":"11:30-22:00","sat":"11:30-22:00",
      "sun":"휴무"
    },
    "closed_days": ["일요일"],
    "holiday_notice": null,
    "subway_station": null, "subway_line": null, "walk_minutes": null,
    "parking_free_guest": true, "parking_capacity": 20, "parking_location": "건물 지하",
    "advantage_1_title": "조용한 프라이빗 룸",
    "advantage_1_content": "4~12인 룸 5개. 상견례·양가 식사에 적합.",
    "advantage_2_title": null, "advantage_2_content": null,
    "advantage_3_title": null, "advantage_3_content": null,
    "image_urls": ["https://...", "https://..."],
    "price_packages": [
      {
        "name":"디너 코스 A",
        "price_min":70000, "price_max":100000,
        "currency":"KRW", "unit":"per_person",
        "includes":["전채","메인","후식"],
        "notes":null
      }
    ],
    "event_info": null, "contract_policy": null,
    "amenities": ["주차","발렛","룸"],
    "atmosphere": ["모던","조용한","고급스러운"],
    "pros": ["룸이 넓고 조용함","주차 편함"],
    "cons": ["주말 예약 어려움"],
    "hidden_costs": null,
    "recommended_for": ["상견례","청첩장모임","양가 식사"],

    // place_invitation_venues UPDATE (모임 목적 태그는 이미 시드됨, 세부만)
    "venue": {
      "venue_types": ["한정식","상견례","청첩장모임","양가 식사","프라이빗 룸"],
      "capacity_min": 4,
      "capacity_max": 12,
      "private_room_count": 5,
      "room_charge_separate": false,
      "drinks_included": false,
      "valet_parking": true,
      "signature_dishes": ["갈비찜","전복죽"],
      "corkage_fee_won": null,
      "price_per_person": 70000
    },

    "_sources": [
      "https://m.place.naver.com/...",
      "https://place.map.kakao.com/..."
    ]
  }
]
```

## 한 번에 던지는 chunk 크기

LLM 한 회 응답 토큰 한계 고려:
- Sonnet/Opus: 한 번에 15~20개 안전
- Gemini Pro: 한 번에 10~15개 안전
- ChatGPT-4: 한 번에 10개 안전

`fill-targets-naver.json`에서 슬라이스 떠서 던지고, 응답 받으면 다음 슬라이스로.

## 반영 SQL (참고)

응답 JSON을 받으면 아래 흐름으로 적용:

1. `places`: `description`, `tags`, `main_image_url`, `lat`, `lng`, `min_price`
   (= venue.price_per_person), `confidence=70`, `last_source_date=CURRENT_DATE`
2. `place_details`: 모든 place_details 필드 UPSERT
3. `place_invitation_venues`: venue.* UPDATE
   - venue_types는 기존(이미 시드된 상견례/청첩장모임/양가 식사) + 응답 합집합

```sql
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

UPDATE place_invitation_venues SET
  venue_types = (
    SELECT ARRAY_AGG(DISTINCT vt)
    FROM unnest(COALESCE(venue_types, '{}') || $new_venue_types::text[]) vt
  ),
  capacity_min = $capacity_min,
  capacity_max = $capacity_max,
  private_room_count = $private_room_count,
  room_charge_separate = $room_charge_separate,
  drinks_included = $drinks_included,
  valet_parking = $valet_parking,
  signature_dishes = $signature_dishes,
  corkage_fee_won = $corkage_fee_won,
  price_per_person = $price_per_person
WHERE place_id = $place_id;

INSERT INTO place_details (place_id, ...) VALUES (...)
ON CONFLICT (place_id) DO UPDATE SET ...;
```

## 폐업 처리

`_closed_or_moved: true`로 들어온 row는:
```sql
UPDATE places SET deleted_at = NOW(), is_active = false WHERE place_id = $place_id;
```

## 입력 파일

`fill-targets-naver.json` — 570 row JSON 배열. 한 줄에 한 row.
