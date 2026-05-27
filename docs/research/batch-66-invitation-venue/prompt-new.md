# 청첩장모임장소 신규 발굴 프롬프트 (배치 66 / NEW)

> 사용법: 아래 `{{지역}}`과 `{{제외_리스트}}`를 한 광역지자체 단위로 갈아끼우고 LLM에 던짐. 17개 광역지자체 × 12개 = 약 204개 목표.

---

## 프롬프트 본문

```
역할: 한국 결혼 준비 정보 리서처. 양가 상견례·청첩장 전달 모임·가족 식사용
프라이빗 룸 식당을 발굴.

작업: 아래 한 광역지자체에서 12개 발굴 (중복 제외). 폐업·이전·정보 부정확
시 제외.

[지역]
city: "{{지역}}"   ← 예: 서울특별시, 부산광역시, 경기도, 강원특별자치도

[발굴 기준 — 모두 충족]
1) 별실(룸/방/프라이빗 공간) 보유 — 4~20명 수용 가능
2) 격식 있는 분위기: 한정식 / 모던 한식 / 양식 코스 / 일식 카이세키 /
   코스 중식 / 파인다이닝 / 한우 오마카세
3) 네이버 플레이스·카카오맵·망고플레이트에서 "상견례", "청첩장 모임",
   "양가 식사", "가족 모임" 키워드로 추천·검색되는 곳
4) 현재 영업 중 (2025~2026년 후기 확인)
5) 출처 URL 1개 이상 확인 가능

[중복 제외 — 이미 등록된 곳]
{{제외_리스트}}

[출력 — 유효한 단일 JSON 배열. 빈 토큰("key":,) 금지. 모르면 null.]
[
  {
    "name": "정식 상호",
    "city": "{{지역}}",
    "district": "시군구 정식명 (예: 강남구, 수원시, 춘천시)",
    "category": "invitation_venue",

    // place_details
    "tel": "02-1234-5678 or null",
    "address": "도로명 주소 or null",
    "website_url": "URL or null",
    "instagram_url": "URL or null",
    "naver_place_url": "https://naver.me/... or null",
    "naver_blog_url": "URL or null",
    "youtube_url": "URL or null",
    "hours": {
      "mon":"11:30-22:00","tue":"...","wed":"...","thu":"...",
      "fri":"...","sat":"...","sun":"휴무"
    },
    "closed_days": "예: '매주 월요일' or null",
    "holiday_notice": "공휴일 운영 안내 or null",
    "subway_station": "역명 or null",
    "subway_line": "호선 or null",
    "walk_minutes": 5,
    "parking_free_guest": "무료|유료|없음 or null",
    "parking_capacity": 20,
    "parking_location": "건물 지하/별도 부지 등 or null",
    "advantage_1_title": "강점 1 한 줄 or null",
    "advantage_1_content": "강점 1 상세 or null",
    "advantage_2_title": null, "advantage_2_content": null,
    "advantage_3_title": null, "advantage_3_content": null,
    "image_urls": ["https://..."] or null,
    "price_packages": [
      {
        "name": "디너 코스 A",
        "price_min": 70000, "price_max": 100000,
        "currency": "KRW", "unit": "per_person",
        "includes": ["전채","메인","후식"],
        "notes": null
      }
    ] or null,
    "event_info": "현재 이벤트 텍스트 or null",
    "contract_policy": "예약·취소·룸 차지 정책 텍스트 or null",
    "amenities": ["주차","발렛","wifi","개별룸","유아의자"] or null,
    "atmosphere": ["모던","전통","고급","아늑한"] or null,
    "pros": ["룸 8명까지 편안","사진 잘 나옴"] or null,
    "cons": ["주말 예약 어려움"] or null,
    "hidden_costs": ["룸 차지 5만"] or null,
    "recommended_for": ["상견례","청첩장 모임"] or null,

    // place_invitation_venues
    "venue": {
      "venue_types": ["한정식","일식 코스"] or null,
      "capacity_min": 4,
      "capacity_max": 12,
      "private_room_count": 3,
      "room_charge_separate": true,
      "drinks_included": false,
      "valet_parking": true,
      "signature_dishes": ["전복죽","간장게장","갈비찜"] or null,
      "corkage_fee_won": 30000,
      "price_per_person": 70000
    },

    "tags": ["상견례","청첩장모임","프라이빗룸"] or null,
    "description": "120자 이내 정보성 소개. 마케팅 카피·과장 금지. or null",
    "_sources": ["https://m.place.naver.com/..."]
  }
]
```

---

## 17개 광역지자체 작업 순서 권장

1. 서울특별시 (강남·서초·송파·종로·용산·마포 중심)
2. 부산광역시
3. 대구광역시
4. 인천광역시
5. 광주광역시
6. 대전광역시
7. 울산광역시 ← 신규 (0개)
8. 세종특별자치시 ← 신규 (0개)
9. 경기도 (성남·수원·고양·용인 외 확장)
10. 강원특별자치도 ← 신규
11. 충청북도 ← 신규
12. 충청남도 ← 신규
13. 전북특별자치도 ← 신규
14. 전라남도 ← 신규
15. 경상북도 ← 신규
16. 경상남도 ← 신규
17. 제주특별자치도 ← 신규

LLM 결과 JSON 받아서 나한테 던지면 `places` + `place_details` + `place_invitation_venues` 3-테이블 INSERT 트랜잭션으로 처리.
