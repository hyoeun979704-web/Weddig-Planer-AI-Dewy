# 메이크업샵 enrichment 프롬프트 (수동 딥리서치용)

아래 전체를 딥리서치 모드(ChatGPT/Gemini/Claude)에 붙여넣고, 마지막 `## 입력 업체 리스트` 부분에 SQL 추출 결과를 채워넣으세요.

---

당신은 한국 웨딩 메이크업샵 정보 검증기입니다. 한국 웨딩 도메인 사이트(웨딩북·디테일웨딩·마이리얼웨딩·클로스닷·웨드코지·플렉스웨딩)와 업체 공식 SNS·홈페이지를 검색해 입력된 업체들의 실제 정보를 확인하고, 엄격한 스키마의 JSON 배열을 반환합니다.

## 검증 규칙 (반드시 준수)

1. **검색 결과에 명시된 정보만 사용** — 추측 금지.
2. **불확실하면 null** — 50% 미만 확신은 null.
3. **업체 동일성 확인 필수** — 입력된 이름·지역과 정확히 일치해야.
4. **전화번호 (tel)**: 한국 형식.
5. **website_url / instagram_url / naver_place_url**: 업체 공식 채널만.
6. **hours**: "10:00-19:00" 형식.
7. **advantage_1/2/3**: 고유한 장점 1-2문장.

## 검색 전략

업체 1개당 다음을 시도:
1. `"{업체명}"`
2. `"{업체명} {지역}"`
3. `"{업체명} site:wedingbook.com OR site:detailwedding.com"`
4. `"{업체명} 가격 본식 리허설"`
5. `"{업체명} 출장비 새벽 site:naver.com"` — 출장 정보

## 추출할 필드

### 공통 필드
- `tel`, `website_url`, `instagram_url`, `naver_place_url`
- `hours`: `{mon,tue,wed,thu,fri,sat,sun}`
- `closed_days`
- `advantage_1/2/3`: `{title, content}`
- `description`: 한 줄 소개
- `image_urls`: 공식 사진 URL (최대 6장)
- `price_packages`: `{name, price_min, price_max, currency:"KRW", unit:"per_session", includes:[], notes}`
- `event_info`, `contract_policy`, `amenities`, `basic_services`, `tags`

### 메이크업샵 카테고리별 (`category_extras` 안에)

**기본 정보:**
- `makeup_styles` (배열): ["내추럴","글램","로맨틱","모던","청순","리허설"] 중
- `includes_rehearsal` (bool): 본식 패키지에 리허설 포함
- `hair_makeup_separate` (bool): 헤어/메이크업 분리 청구
- `rehearsal_count` (정수): 리허설 횟수
- `travel_fee_included` (bool): 웨딩홀 출장비 포함 (한국 결혼식 거의 100% 출장이라 매우 중요)
- `director_level` (문자열): 시술자 레벨 — "원장"/"실장"/"팀장"/"디렉터" 등
- `early_morning_fee` (정수): 새벽(7시 이전) 출장 추가비 KRW. 없으면 0.

**★ 신규 — 메이크업샵 상세:**
- `parents_makeup_available` (bool): 혼주(어머니/시어머니) 메이크업 가능.
- `parents_makeup_price` (정수): 혼주 1인 메이크업 가격 KRW (별도 청구 시).
- `groom_grooming_available` (bool): 신랑 그루밍(메이크업·헤어) 가능.
- `groom_grooming_price` (정수): 신랑 그루밍 가격 KRW.
- `bridesmaid_makeup_available` (bool): 들러리 메이크업 가능.
- `travel_zones` (배열): 출장 가능 지역 — 예: ["강남구","서초구","송파구"] 또는 ["수도권","경기"].
- `wedding_day_helper` (bool): 당일 헬퍼/터치업 동행 포함.
- `false_lashes_included` (bool): 인조 속눈썹 기본 포함.
- `eyelash_extension_available` (bool): 속눈썹 연장 시술 가능.
- `semi_permanent_makeup` (bool): 반영구(눈썹/아이라인/입술) 시술 가능.
- `bestseller_designer` (문자열): 이 샵의 시그니처/예약 1순위 원장님 이름 1명 (예: "김미정 원장").

**★ 스드메 공통 — 프로모션/결제/뱃지:**
- `card_partners` (배열): ["삼성","현대","우리","KB국민","신한","롯데","BC","NH농협","하나","씨티"] 중.
- `installment_months` (정수): 최대 무이자 할부 개월 (없으면 0).
- `gift_items` (배열): 계약 시 사은품.
- `promotion_text` (문자열): 시즌/이벤트 프로모션 한 줄.
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
    "hours": {"mon":"09:00-20:00","tue":"09:00-20:00","wed":"09:00-20:00","thu":"09:00-20:00","fri":"09:00-20:00","sat":"06:00-20:00","sun":"06:00-20:00"},
    "closed_days": null,
    "advantage_1": {"title":"원장 직접 시술","content":"본식·리허설 모두 김미정 원장이 직접 담당."},
    "advantage_2": {"title":"...","content":"..."},
    "advantage_3": null,
    "description": "강남 청담 본식 메이크업 전문샵. 내추럴·글램 동시 운영.",
    "image_urls": ["https://...","https://..."],
    "price_packages": [
      {
        "name":"신부 본식+리허설",
        "price_min":600000,"price_max":null,
        "currency":"KRW","unit":"per_session",
        "includes":["본식 메이크업+헤어","리허설 1회","속눈썹 포함","당일 헬퍼"],
        "notes":"새벽 6시 이전 +5만원, 출장비 포함"
      }
    ],
    "event_info": "5월 신청자 혼주 1인 무료",
    "contract_policy": "예약금 30만원, 7일 전까지 100% 환불.",
    "amenities": ["대기실","파우더룸","주차"],
    "basic_services": ["출장 무료","터치업 1회"],
    "tags": ["내추럴","원장직접","청담","본식","리허설","출장무료"],
    "category_extras": {
      "makeup_styles": ["내추럴","로맨틱"],
      "includes_rehearsal": true,
      "hair_makeup_separate": false,
      "rehearsal_count": 1,
      "travel_fee_included": true,
      "director_level": "원장",
      "early_morning_fee": 50000,
      "parents_makeup_available": true,
      "parents_makeup_price": 250000,
      "groom_grooming_available": true,
      "groom_grooming_price": 150000,
      "bridesmaid_makeup_available": false,
      "travel_zones": ["강남구","서초구","송파구","용산구"],
      "wedding_day_helper": true,
      "false_lashes_included": true,
      "eyelash_extension_available": false,
      "semi_permanent_makeup": false,
      "bestseller_designer": "김미정 원장",
      "card_partners": ["삼성","현대","KB국민"],
      "installment_months": 6,
      "gift_items": ["혼주 메이크업 1인 무료"],
      "promotion_text": "5월 계약시 혼주 1인 무료",
      "package_url": "https://wedingbook.com/makeup/...",
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
- place_id: 11111111-aaaa-bbbb-cccc-222222222222 / name: 청담 헤르 / region: 서울 강남구
- place_id: 33333333-aaaa-bbbb-cccc-444444444444 / name: 라쥬베네 / region: 서울 마포구
```
