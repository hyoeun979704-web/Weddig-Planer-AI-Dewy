# 스튜디오 enrichment 프롬프트 (수동 딥리서치용)

아래 전체를 딥리서치 모드(ChatGPT/Gemini/Claude)에 붙여넣고, 마지막 `## 입력 업체 리스트` 부분에 SQL 추출 결과를 채워넣으세요.

---

당신은 한국 웨딩 스튜디오 정보 검증기입니다. 한국 웨딩 도메인 사이트(웨딩북·디테일웨딩·마이리얼웨딩·클로스닷·웨드코지·플렉스웨딩)와 업체 공식 SNS·홈페이지를 검색해 입력된 업체들의 실제 정보를 확인하고, 엄격한 스키마의 JSON 배열을 반환합니다.

## 검증 규칙 (반드시 준수)

1. **검색 결과에 명시된 정보만 사용** — 추측·일반론·사전 지식만으로 답하지 말 것.
2. **불확실하면 null** — "아마도" 수준은 무조건 null. 50% 미만 확신은 null.
3. **업체 동일성 확인 필수** — 입력된 이름·지역과 정확히 일치하는지 먼저 확인. 다른 지역의 동명 업체는 무시.
4. **전화번호 (tel)**: 한국 형식 ("02-123-4567", "1588-1234"). 010-은 사업자 번호가 아니면 거부.
5. **website_url / instagram_url / naver_place_url**: 업체 공식 채널만. 후기 블로그 링크는 거부.
6. **hours**: "10:00-19:00" 형식. 명시적 영업시간이 출처에 있을 때만.
7. **advantage_1/2/3**: 이 업체에 *고유한* 장점 1-2문장. 일반 광고 카피("프리미엄","최고급") 금지.

## 검색 전략

업체 1개당 다음을 시도:
1. `"{업체명}"` — 기본
2. `"{업체명} {지역}"` — 동명 업체 disambiguate
3. `"{업체명} site:wedingbook.com OR site:detailwedding.com OR site:weddoz.co.kr"` — 한국 웨딩 어플
4. `"{업체명} 가격 패키지"` — 패키지 정보
5. `"{업체명} 후기 site:naver.com"` — 네이버 블로그·플레이스

웨딩북·디테일웨딩의 업체 페이지가 검색 결과에 나오면 *우선 활용*.

## 추출할 필드

### 공통 (모든 카테고리 동일)
- `tel`, `website_url`, `instagram_url`, `naver_place_url`
- `hours`: `{mon, tue, wed, thu, fri, sat, sun}` 각 "HH:MM-HH:MM" 또는 null
- `closed_days`: 정기 휴무 요일/날짜
- `advantage_1/2/3`: `{title, content}` 각각, 고유 장점
- `description`: 한 줄 소개
- `image_urls`: 공식 사진 URL 배열 (최대 6장)
- `price_packages`: 패키지 배열 (`{name, price_min, price_max, currency:"KRW", unit:"per_package", includes:[], notes}`)
- `event_info`: 현재 시즌 프로모션 한 줄
- `contract_policy`: 계약/환불 정책 한 줄
- `amenities`: 시설/편의 ["대기실","주차" 등]
- `basic_services`: 패키지 무관 기본 제공 항목
- `tags`: 검색·필터용 키워드 5~12개 (예: ["내추럴","야외","한옥","감성","강남"])

### 스튜디오 카테고리별 (`category_extras` 안에)

**기본 촬영 정보:**
- `shoot_styles` (배열): ["야외","실내","한옥","본식","리허설","스냅","내추럴","빈티지"] 중
- `shoot_locations` (배열): 실제 촬영 가능 장소
- `total_photos` (정수): 기본 패키지 보정본 사진 총 장수
- `original_count` (정수): 원본 제공 장수
- `retouching_included` (bool): 보정 기본 포함
- `includes_originals` (bool): 원본 제공
- `dress_provided` (bool): 드레스 대여 포함
- `frame_included` (bool): 부모님 액자 기본 포함
- `photobook_pages` (정수): 앨범 페이지 수
- `editing_days` (정수): 보정 후 결과물 받기까지 소요 일수

**★ 신규 — 스튜디오 상세:**
- `package_types` (배열): 운영 패키지 종류 — ["본식","리허설","본식+리허설","풀패키지","스냅","데이트스냅","해외","웨딩화보"] 중. 가격표에 등장하는 것만.
- `outdoor_available` (bool): 야외 촬영 운영. 실내 전용이면 false.
- `hanbok_shooting_included` (bool): 한복 촬영이 기본 패키지에 포함.
- `outfit_count` (정수): 기본 패키지에 포함된 의상 갈아입는 횟수(벌수). 보통 2~5벌.
- `hair_makeup_included` (bool): 헤어메이크업이 패키지에 포함.
- `video_included` (bool): 영상 촬영(비하인드/시네마틱)이 기본 포함.
- `video_extra_cost` (정수): 영상 추가 옵션 비용 KRW (별도 옵션일 때).
- `parents_photo_included` (bool): 부모님 함께 사진 촬영이 기본 포함.
- `photographer_choice` (bool): 촬영 작가 선택 가능 (false면 지정).
- `file_format` (배열): 제공 파일 포맷 — ["JPG","RAW","TIFF","PNG"] 중.
- `instagram_discount_available` (bool): 인스타 후기 작성 시 할인/이벤트 운영.

**★ 스드메 공통 — 프로모션/결제/뱃지:**
- `card_partners` (배열): 제휴 카드사 — ["삼성","현대","우리","KB국민","신한","롯데","BC","NH농협","하나","씨티"] 중.
- `installment_months` (정수): 최대 무이자 할부 개월 (없으면 0).
- `gift_items` (배열): 계약 시 사은품 — 예: ["부케","웰컴기프트","예약금 5만원 할인쿠폰"].
- `promotion_text` (문자열): 현재 진행 중인 시즌/이벤트 프로모션 한 줄.
- `package_url` (문자열): 대표 패키지 상세 페이지 URL.
- `is_bestseller` (bool): 한국 웨딩 어플에서 베스트셀러/인기 표기.
- `is_new` (bool): 신규 입점 / 신규 컬렉션 (출시 1년 이내).

## 응답 JSON 스키마

업체 N개 입력 → 길이 N의 **JSON 배열** 반환. 다른 설명·마크다운 절대 금지.

```json
[
  {
    "place_id": "<입력에서 받은 UUID 그대로>",
    "name": "<입력에서 받은 이름 그대로 — 검증용>",
    "tel": "02-123-4567",
    "website_url": "https://...",
    "instagram_url": "https://instagram.com/...",
    "naver_place_url": "https://m.place.naver.com/...",
    "hours": {"mon":"10:00-19:00","tue":"10:00-19:00","wed":"10:00-19:00","thu":"10:00-19:00","fri":"10:00-19:00","sat":"10:00-19:00","sun":null},
    "closed_days": "일요일",
    "advantage_1": {"title":"내추럴 자연광","content":"통창 스튜디오에서 자연광만 사용해 화사한 결과물."},
    "advantage_2": {"title":"...","content":"..."},
    "advantage_3": null,
    "description": "강남 신사동 통창 스튜디오. 내추럴·필름톤 본식·리허설 패키지 운영.",
    "image_urls": ["https://...","https://..."],
    "price_packages": [
      {
        "name":"본식 패키지",
        "price_min":1800000,"price_max":null,
        "currency":"KRW","unit":"per_package",
        "includes":["본식 사진 200장","원본 50장","보정 30장","앨범 1권"],
        "notes":"주말 +20%"
      }
    ],
    "event_info": "5월 신청자 헤어메이크업 무료 업그레이드",
    "contract_policy": "계약금 30%, 행사 60일 전까지 50% 환불.",
    "amenities": ["대기실","파우더룸","주차"],
    "basic_services": ["사진 USB 제공","온라인 갤러리"],
    "tags": ["내추럴","필름톤","감성","강남","본식","리허설"],
    "category_extras": {
      "shoot_styles": ["내추럴","빈티지"],
      "shoot_locations": ["스튜디오","서울숲"],
      "total_photos": 200,
      "original_count": 50,
      "retouching_included": true,
      "includes_originals": true,
      "dress_provided": false,
      "frame_included": false,
      "photobook_pages": 30,
      "editing_days": 14,
      "package_types": ["본식","리허설","본식+리허설"],
      "outdoor_available": true,
      "hanbok_shooting_included": false,
      "outfit_count": 3,
      "hair_makeup_included": false,
      "video_included": false,
      "video_extra_cost": 500000,
      "parents_photo_included": true,
      "photographer_choice": false,
      "file_format": ["JPG","RAW"],
      "instagram_discount_available": true,
      "card_partners": ["삼성","현대","KB국민"],
      "installment_months": 12,
      "gift_items": ["웰컴기프트","예약금 5만원 할인쿠폰"],
      "promotion_text": "5월 계약시 10% 할인 + 영상 추가 무료",
      "package_url": "https://wedingbook.com/studio/...",
      "is_bestseller": true,
      "is_new": false
    }
  }
]
```

**검색 실패 / 동일성 확인 실패 업체**: 해당 객체에서 `place_id`와 `name`만 채우고 나머지 필드는 모두 `null` (또는 배열은 `[]`). 빈 객체는 보내지 말 것.

---

## 입력 업체 리스트

다음 업체들에 대해 위 규칙대로 정보를 검증·추출해주세요. **place_id는 응답 JSON의 `place_id` 필드에 그대로 복사**해야 import에서 매칭됩니다.

```
<여기에 SQL 결과 붙여넣기 — 한 줄에 한 업체>
<예>
- place_id: 11111111-aaaa-bbbb-cccc-222222222222 / name: 비스튜디오 / region: 서울 강남구
- place_id: 33333333-aaaa-bbbb-cccc-444444444444 / name: 위스테리아 / region: 서울 마포구
```
