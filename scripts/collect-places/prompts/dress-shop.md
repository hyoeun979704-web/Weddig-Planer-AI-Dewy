# 드레스샵 enrichment 프롬프트 (수동 딥리서치용)

아래 전체를 딥리서치 모드(ChatGPT/Gemini/Claude)에 붙여넣고, 마지막 `## 입력 업체 리스트` 부분에 SQL 추출 결과를 채워넣으세요.

---

당신은 한국 웨딩 드레스샵 정보 검증기입니다. 한국 웨딩 도메인 사이트(웨딩북·디테일웨딩·마이리얼웨딩·클로스닷·웨드코지·플렉스웨딩)와 업체 공식 SNS·홈페이지를 검색해 입력된 업체들의 실제 정보를 확인하고, 엄격한 스키마의 JSON 배열을 반환합니다.

## 검증 규칙 (반드시 준수)

1. **검색 결과에 명시된 정보만 사용** — 추측 금지.
2. **불확실하면 null** — 50% 미만 확신은 null.
3. **업체 동일성 확인 필수** — 입력된 이름·지역과 정확히 일치해야.
4. **전화번호 (tel)**: 한국 형식 ("02-123-4567"). 010-은 사업자 번호가 아니면 거부.
5. **website_url / instagram_url / naver_place_url**: 업체 공식 채널만.
6. **hours**: "10:00-19:00" 형식. 명시적 영업시간만.
7. **advantage_1/2/3**: 이 업체에 *고유한* 장점.

## 검색 전략

업체 1개당 다음을 시도:
1. `"{업체명}"`
2. `"{업체명} {지역}"`
3. `"{업체명} site:wedingbook.com OR site:detailwedding.com"`
4. `"{업체명} 가격 대여 맞춤"`
5. `"{업체명} 가봉비 헬퍼 site:naver.com"` — 숨겨진 비용 정보

## 추출할 필드

### 공통 필드
- `tel`, `website_url`, `instagram_url`, `naver_place_url`
- `hours`: `{mon,tue,wed,thu,fri,sat,sun}`
- `closed_days`
- `advantage_1/2/3`: `{title, content}`
- `description`: 한 줄 소개
- `image_urls`: 공식 사진 URL 배열 (최대 6장)
- `price_packages`: `{name, price_min, price_max, currency:"KRW", unit:"per_rental"|"per_custom", includes:[], notes}`
- `event_info`: 시즌 프로모션
- `contract_policy`: 계약/환불 정책
- `amenities`: 시설 ["피팅룸","프라이빗 룸","주차"]
- `basic_services`: 기본 제공 항목
- `tags`: 5~12개 (예: ["머메이드","수입","프리미엄","강남"])

### 드레스샵 카테고리별 (`category_extras` 안에)

**기본 정보:**
- `dress_styles` (배열): ["머메이드","미니","볼가운","에이라인","프린세스","로맨틱","빈티지","모던","심플"] 중
- `rental_only` (bool): 대여만 (false면 맞춤도 가능)
- `fitting_count` (정수): 가봉 횟수
- `rental_includes_alterations` (bool): 대여에 가봉비 포함
- `designer_brands` (배열): 취급 디자이너/브랜드
- `helper_included` (bool): 헬퍼이모(당일 헬퍼) 비용 포함
- `inner_included` (bool): 이너·페티코트·베일 등 소품 기본 포함
- `dress_count_included` (정수): 패키지에 포함된 드레스 벌수

**★ 신규 — 드레스샵 상세:**
- `main_dress_count` (정수): 본식 드레스 보유 벌수 (전체 컬렉션 규모, 1~3 정도가 일반).
- `sub_dress_count` (정수): 2부·리허설 등 서브 드레스 보유 벌수.
- `dress_size_range` (문자열): 사이즈 범위 — 예: "44~66", "55~88", "XS~XL".
- `alteration_count` (정수): 수선 가능 횟수 (가봉과 별개로 계약 후 무료 수선 횟수).
- `veil_included` (bool): 베일 기본 포함.
- `gloves_included` (bool): 장갑 기본 포함.
- `shoes_included` (bool): 구두 대여 기본 포함.
- `bouquet_included` (bool): 부케 기본 포함.
- `tiara_included` (bool): 티아라/헤어피스 기본 포함.
- `mother_dress_available` (bool): 혼주복(어머니 드레스) 대여/취급 가능.
- `private_room` (bool): 프라이빗 피팅룸/단독룸 운영.
- `bestseller_designer` (문자열): 이 샵의 베스트셀러 디자이너/브랜드 1명.

**★ 스드메 공통 — 프로모션/결제/뱃지:**
- `card_partners` (배열): 제휴 카드사 — ["삼성","현대","우리","KB국민","신한","롯데","BC","NH농협","하나","씨티"] 중.
- `installment_months` (정수): 최대 무이자 할부 개월 (없으면 0).
- `gift_items` (배열): 계약 시 사은품.
- `promotion_text` (문자열): 현재 진행 중인 시즌/이벤트 프로모션 한 줄.
- `package_url` (문자열): 대표 패키지 상세 페이지 URL.
- `is_bestseller` (bool): 한국 웨딩 어플에서 베스트셀러/인기 표기.
- `is_new` (bool): 신규 입점 / 신규 컬렉션 (출시 1년 이내).

## 응답 JSON 스키마

업체 N개 입력 → 길이 N의 **JSON 배열**. 다른 설명 금지.

```json
[
  {
    "place_id": "<입력에서 받은 UUID 그대로>",
    "name": "<입력 그대로 — 검증용>",
    "tel": "02-123-4567",
    "website_url": "https://...",
    "instagram_url": "https://instagram.com/...",
    "naver_place_url": "https://m.place.naver.com/...",
    "hours": {"mon":"11:00-20:00","tue":"11:00-20:00","wed":"11:00-20:00","thu":"11:00-20:00","fri":"11:00-20:00","sat":"10:00-19:00","sun":null},
    "closed_days": "일요일",
    "advantage_1": {"title":"수입 드레스 전문","content":"Vera Wang·Pronovias 등 정식 수입 라인업 30+ 보유."},
    "advantage_2": {"title":"...","content":"..."},
    "advantage_3": null,
    "description": "강남 청담동 수입 드레스 전문 부티크. 본식·리허설 통합 패키지 운영.",
    "image_urls": ["https://...","https://..."],
    "price_packages": [
      {
        "name":"본식+리허설 패키지",
        "price_min":1500000,"price_max":null,
        "currency":"KRW","unit":"per_rental",
        "includes":["본식 1벌","리허설 1벌","가봉 2회","이너 포함"],
        "notes":"헬퍼 별도 30만원"
      }
    ],
    "event_info": "5월 신청자 베일 무료 제공",
    "contract_policy": "계약금 50만원, 가봉 시작 후 환불 불가.",
    "amenities": ["프라이빗 룸","파우더룸","주차"],
    "basic_services": ["피팅 음료 무료"],
    "tags": ["머메이드","수입","프리미엄","청담","Vera Wang"],
    "category_extras": {
      "dress_styles": ["머메이드","에이라인","모던"],
      "rental_only": false,
      "fitting_count": 2,
      "rental_includes_alterations": true,
      "designer_brands": ["Vera Wang","Pronovias","Galia Lahav"],
      "helper_included": false,
      "inner_included": true,
      "dress_count_included": 2,
      "main_dress_count": 2,
      "sub_dress_count": 1,
      "dress_size_range": "44~77",
      "alteration_count": 2,
      "veil_included": true,
      "gloves_included": false,
      "shoes_included": false,
      "bouquet_included": false,
      "tiara_included": true,
      "mother_dress_available": true,
      "private_room": true,
      "bestseller_designer": "Vera Wang",
      "card_partners": ["삼성","현대","신한"],
      "installment_months": 12,
      "gift_items": ["베일","미니부케"],
      "promotion_text": "5월 계약 시 헬퍼 무료",
      "package_url": "https://wedingbook.com/dress/...",
      "is_bestseller": true,
      "is_new": false
    }
  }
]
```

**검색 실패 / 동일성 확인 실패 업체**: 해당 객체에서 `place_id`와 `name`만 채우고 나머지 필드는 모두 `null` (또는 배열은 `[]`).

---

## 입력 업체 리스트

다음 업체들에 대해 위 규칙대로 정보를 검증·추출해주세요. **place_id는 응답 JSON의 `place_id` 필드에 그대로 복사**해야 import에서 매칭됩니다.

```
<여기에 SQL 결과 붙여넣기 — 한 줄에 한 업체>
<예>
- place_id: 11111111-aaaa-bbbb-cccc-222222222222 / name: 베라하우스 / region: 서울 강남구
- place_id: 33333333-aaaa-bbbb-cccc-444444444444 / name: 블랑카 청담 / region: 서울 강남구
```
