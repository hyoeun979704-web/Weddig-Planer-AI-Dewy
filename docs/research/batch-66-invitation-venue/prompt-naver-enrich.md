# 청첩장모임장소 — 네이버 후보 보강 프롬프트 (Gemini용)

> 사용법: 아래 프롬프트 + `candidates-by-region/{지역}.json` 한 파일의 내용을 함께 Gemini에 던지기. 결과 JSON을 채팅에 그대로 던지면 내가 MCP로 반영.

---

```
역할: 한국 결혼 준비 정보 리서처.

작업: 아래 네이버 플레이스 후보 리스트의 각 업체를 조사해서, 청첩장
전달 모임·양가 상견례·가족 식사용으로 적합한지 판단하고 상세 정보를
채워라.

[적합 기준 — 모두 충족]
1) 별실(룸/방/프라이빗 공간) 보유 — 4~20명 수용 가능
2) 격식 있는 분위기: 한정식 / 모던 한식 / 양식 코스 / 일식 카이세키 /
   코스 중식 / 파인다이닝 / 한우 오마카세
3) "상견례", "청첩장 모임", "가족 모임"으로 검색 노출되는 곳
4) 현재 영업 중

[조사 출처]
네이버 플레이스 (입력에 URL 있음), 카카오맵, 공식 홈페이지·인스타.
블로그 후기는 보조용. 폐업·이전 확인 필수.

[출력 — 유효한 단일 JSON 배열, 추가 텍스트 금지]
[
  {
    // 입력 그대로 유지
    "name": "...",
    "city": "...",
    "district": "...",
    "address": "...",
    "tel": "...",
    "naver_place_url": "...",

    // 평가
    "_suitable": true,    // 적합 여부
    "_reason": "한 줄로 왜 적합/부적합 (예: '룸 6명·한정식·상견례 후기')",

    // 적합한 경우(_suitable: true)만 아래 채움. 모르는 건 null.
    "website_url": null,
    "instagram_url": null,
    "naver_blog_url": null,
    "hours": {
      "mon":"11:30-22:00","tue":"...","wed":"...","thu":"...",
      "fri":"...","sat":"...","sun":"휴무"
    },
    "closed_days": null,
    "subway_station": null,
    "subway_line": null,
    "walk_minutes": null,
    "parking_free_guest": null,
    "parking_capacity": null,
    "advantage_1_title": null,
    "advantage_1_content": null,
    "advantage_2_title": null,
    "advantage_2_content": null,
    "advantage_3_title": null,
    "advantage_3_content": null,
    "price_packages": [
      {
        "name": "디너 코스 A",
        "price_min": 70000, "price_max": 100000,
        "currency": "KRW", "unit": "per_person",
        "includes": ["전채","메인","후식"],
        "notes": null
      }
    ],
    "amenities": ["주차","발렛","wifi","개별룸"],
    "pros": ["..."],
    "cons": ["..."],
    "recommended_for": ["상견례","청첩장 모임"],

    // place_invitation_venues
    "venue": {
      "venue_types": ["한정식","일식 코스"],
      "capacity_min": 4,
      "capacity_max": 12,
      "private_room_count": 3,
      "room_charge_separate": true,
      "drinks_included": false,
      "valet_parking": true,
      "signature_dishes": ["갈비찜","간장게장"],
      "corkage_fee_won": null,
      "price_per_person": 70000
    },

    "tags": ["상견례","청첩장모임","프라이빗룸"],
    "description": "120자 이내 정보성 소개. 마케팅 카피·과장 금지.",
    "_sources": ["https://m.place.naver.com/..."]
  }
]

[규칙]
- 출력은 JSON 배열만. 앞뒤 설명·해설 텍스트 금지.
- trailing comma 금지. `"key":,` 빈 토큰 금지. 모르는 값은 항상 null.
- 폐업·이전·정보 부정확 시 _suitable: false + _reason에 명시.
- 추측·창작 절대 금지.

[입력 후보 리스트]
<<여기에 candidates-by-region/{지역}.json 내용 붙여넣기>>
```

---

## 워크플로우

1. `candidates-by-region/` 디렉터리에서 한 지역 JSON 파일 열기
2. 위 프롬프트 + 그 JSON을 Gemini에 한 번에 던지기
3. 결과 JSON을 채팅에 던지기 → 내가 `places` + `place_details` + `place_invitation_venues` 트랜잭션 INSERT
4. 다음 지역 반복
