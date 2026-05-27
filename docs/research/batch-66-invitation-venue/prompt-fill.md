# 청첩장모임장소 기존 빈 곳 채우기 프롬프트 (배치 66 / FILL)

> 67개 빈 곳 대상. LLM 부담 줄이려면 10~15개씩 끊어서 던질 것. 결과는 그대로 나한테 — `place_details` INSERT + `place_invitation_venues` UPDATE로 반영.

## 프롬프트 본문

```
역할: 한국 결혼 준비 정보 리서처. 양가 상견례·청첩장 모임 식당의 정보를
조사해서 정해진 JSON 스키마로 반환.

작업: 아래 place 목록 각각의 공식 정보 조사. 추측·창작 금지. 확인 못 한
필드는 null.

[입력 — 조사 대상]
[
  {"place_id":"<UUID>", "name":"<상호>", "city":"<시도>", "district":"<시군구>"},
  ...
]

[조사 원칙]
1) 출처는 네이버 플레이스, 카카오맵, 망고플레이트, 공식 홈페이지/인스타만.
   블로그 후기는 양면 확인용으로만.
2) 폐업/이전한 곳은 `"_closed_or_moved": true` 플래그.
3) place_id는 입력 그대로 유지.
4) 모든 키 큰따옴표, trailing comma 금지, `"key":,` 빈 토큰 금지.

[출력 — 유효한 단일 JSON 배열]
[
  {
    "place_id": "UUID 입력 그대로",
    "name": "현재 정식 상호 (입력과 다르면 갱신)",
    "_closed_or_moved": false,

    // place_details
    "tel": "...", "address": "...", "website_url": "...",
    "instagram_url": "...", "naver_place_url": "...",
    "hours": { "mon":"...","tue":"...","wed":"...","thu":"...",
               "fri":"...","sat":"...","sun":"..." },
    "closed_days": null, "holiday_notice": null,
    "subway_station": null, "subway_line": null, "walk_minutes": null,
    "parking_free_guest": null, "parking_capacity": null, "parking_location": null,
    "advantage_1_title": null, "advantage_1_content": null,
    "advantage_2_title": null, "advantage_2_content": null,
    "advantage_3_title": null, "advantage_3_content": null,
    "image_urls": null,
    "price_packages": [
      {"name":"디너 코스 A","price_min":70000,"price_max":100000,
       "currency":"KRW","unit":"per_person","includes":["전채","메인"],"notes":null}
    ],
    "event_info": null, "contract_policy": null,
    "amenities": ["주차","발렛"],
    "atmosphere": ["모던"],
    "pros": ["..."], "cons": ["..."],
    "hidden_costs": null, "recommended_for": ["상견례","청첩장 모임"],

    // place_invitation_venues
    "venue": {
      "venue_types": ["한정식"],
      "capacity_min": 4, "capacity_max": 12,
      "private_room_count": null,
      "room_charge_separate": null,
      "drinks_included": null,
      "valet_parking": null,
      "signature_dishes": null,
      "corkage_fee_won": null,
      "price_per_person": null
    },

    "tags": ["상견례","청첩장모임"],
    "description": "120자 이내, 사실 위주",
    "_sources": ["https://..."]
  }
]
```

## 입력 리스트는 `fill-targets.json` 참조
