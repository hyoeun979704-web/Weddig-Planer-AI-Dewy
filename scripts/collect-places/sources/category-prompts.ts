// Per-category extraction guidance + schema. Each entry contains:
// - prompt: Korean addendum appended to the universal SYSTEM prompt. Spells
//   out the *unique* characteristics of the category — pricing model
//   (per_person/per_event/per_rental/per_couple/etc), what dimensions vary
//   business-to-business, what to capture in price_packages.includes.
// - cardColumns: column names this prompt may produce. Used by the
//   orchestrator to filter category_extras before card-table upsert.

import type { CategoryLabel } from "../utils/categories";

export interface CategoryPromptSpec {
  prompt: string;
  cardColumns: string[];
}

const ENUM = (arr: string[]) => arr.map((v) => `"${v}"`).join("/");

export const CATEGORY_PROMPTS: Record<CategoryLabel, CategoryPromptSpec> = {
  웨딩홀: {
    prompt:
      `\n\n[웨딩홀 — 카테고리 특성]\n` +
      `★ 가격 모델: 보통 식대(per_person, 인당 7~15만원) + 대관료(per_event, 100~500만원)가 분리. 둘 다 명시되어 있으면 패키지 2개로 분리해서 반환 (예: "식대 패키지" unit=per_person, "대관료" unit=per_event).\n` +
      `★ 시즌별 가격 차이(주말/평일, 성수기/비수기)는 notes에 명시.\n` +
      `★ 보증인원 미충족 페널티(추가 비용)가 있으면 notes에.\n` +
      `★ price_packages.includes 예: ["식대 1인 7만원", "신부대기실 2시간", "폐백실", "주차 무료", "답례품"].\n` +
      `[추가 추출 필드 → category_extras 객체]\n` +
      `- min_guarantee (정수): 최소 보증인원.\n` +
      `- max_guarantee (정수): 최대 수용인원.\n` +
      `- hall_styles (배열): [${ENUM(["호텔", "하우스", "컨벤션", "채플", "야외", "가든", "한옥", "클래식", "모던"])}] 중.\n` +
      `- meal_types (배열): [${ENUM(["뷔페", "코스", "한식", "양식", "중식", "일식"])}] 중.\n` +
      `- food_tasting_available (bool): 음식 시연 가능.\n` +
      `- outdoor_available (bool): 야외 예식 가능.\n` +
      `- ceremony_only_available (bool): 예식만(식사 없이) 가능.\n` +
      `- hall_count (정수): 보유 홀 개수.\n` +
      `- dress_code (문자열): 드레스 코드 명시 시.`,
    cardColumns: [
      "min_guarantee", "max_guarantee", "hall_styles", "meal_types",
      "food_tasting_available", "outdoor_available", "ceremony_only_available",
      "hall_count", "dress_code",
    ],
  },

  스튜디오: {
    prompt:
      `\n\n[스튜디오 — 카테고리 특성]\n` +
      `★ 가격 모델: per_package (패키지 정액). 본식 / 리허설 / 본식+리허설 / 풀패키지 등 패키지별 가격이 보통 다름 → 각 패키지를 별도 항목으로.\n` +
      `★ price_packages.includes 예: ["본식 사진 200장", "원본 50장", "보정 30장", "야외 촬영 1시간", "한복 촬영 포함", "앨범 1권"].\n` +
      `★ 출장비/추가 보정/원본 추가 옵션은 notes에.\n` +
      `[추가 추출 필드 → category_extras]\n` +
      `- shoot_styles (배열): 촬영 컨셉 [${ENUM(["야외", "실내", "한옥", "본식", "리허설", "스냅", "내추럴", "빈티지"])}] 중.\n` +
      `- shoot_locations (배열): 실제 촬영 가능 장소.\n` +
      `- total_photos (정수): 기본 패키지 보정본 사진 총 장수.\n` +
      `- original_count (정수): 원본 제공 장수.\n` +
      `- retouching_included (bool): 보정 기본 포함.\n` +
      `- includes_originals (bool): 원본 제공.\n` +
      `- dress_provided (bool): 드레스 대여 포함.\n` +
      `- frame_included (bool): 부모님 액자 기본 포함 (별도면 false).\n` +
      `- photobook_pages (정수): 앨범 페이지 수.\n` +
      `- editing_days (정수): 보정 후 결과물 받기까지 소요 일수.`,
    cardColumns: [
      "shoot_styles", "shoot_locations", "total_photos", "original_count",
      "retouching_included", "includes_originals", "dress_provided",
      "frame_included", "photobook_pages", "editing_days",
    ],
  },

  드레스샵: {
    prompt:
      `\n\n[드레스샵 — 카테고리 특성]\n` +
      `★ 가격 모델: 대여(per_rental, 보통 50~200만원)와 맞춤(per_custom, 200~1000만원)이 별도. 둘 다 운영하면 *패키지 2개로 분리*.\n` +
      `★ 본식 / 리허설 / 2부 드레스 별로 가격이 다를 수 있음.\n` +
      `★ price_packages.includes 예: ["본식 1벌", "리허설 1벌", "이너 포함", "가봉 2회", "당일 헬퍼 포함"].\n` +
      `★ 가봉비/이너/베일 별도 여부는 notes 또는 includes에 명시.\n` +
      `[추가 추출 필드 → category_extras]\n` +
      `- dress_styles (배열): [${ENUM(["머메이드", "미니", "볼가운", "에이라인", "프린세스", "로맨틱", "빈티지", "모던", "심플"])}] 중.\n` +
      `- rental_only (bool): 대여만 (false면 맞춤도 가능).\n` +
      `- fitting_count (정수): 가봉 횟수.\n` +
      `- rental_includes_alterations (bool): 대여에 가봉비 포함.\n` +
      `- designer_brands (배열): 취급 디자이너/브랜드 (예: ["Vera Wang", "Pronovias", "Galia Lahav"]).\n` +
      `- helper_included (bool): 헬퍼이모(당일 헬퍼) 비용 포함. 별도면 false (보통 별도 25~35만원).\n` +
      `- inner_included (bool): 이너·페티코트·베일 등 소품 기본 포함.\n` +
      `- dress_count_included (정수): 패키지에 포함된 드레스 벌수 (본식+리허설 합산).`,
    cardColumns: [
      "dress_styles", "rental_only", "fitting_count",
      "rental_includes_alterations", "designer_brands",
      "helper_included", "inner_included", "dress_count_included",
    ],
  },

  메이크업샵: {
    prompt:
      `\n\n[메이크업샵 — 카테고리 특성]\n` +
      `★ 가격 모델: per_session (1회 시술 정액). 본식과 리허설이 별도, 신부와 혼주가 별도 → 패키지 분리.\n` +
      `★ price_packages.includes 예: ["신부 본식 메이크업+헤어", "리허설 1회", "혼주 1인 포함", "당일 출장"].\n` +
      `★ 헤어/메이크업 분리비 청구 여부, 출장비 별도 여부는 notes에.\n` +
      `[추가 추출 필드 → category_extras]\n` +
      `- makeup_styles (배열): [${ENUM(["내추럴", "글램", "로맨틱", "모던", "청순", "리허설"])}] 중.\n` +
      `- includes_rehearsal (bool): 본식 패키지에 리허설 포함.\n` +
      `- hair_makeup_separate (bool): 헤어/메이크업 분리 청구.\n` +
      `- rehearsal_count (정수): 리허설 횟수.\n` +
      `- travel_fee_included (bool): 웨딩홀 출장비 포함 (한국 결혼식 거의 100% 출장이라 매우 중요).\n` +
      `- director_level (문자열): 시술자 레벨 — "원장"/"실장"/"팀장"/"디렉터" 등.\n` +
      `- early_morning_fee (정수): 새벽(7시 이전) 출장 추가비 KRW. 없으면 0.`,
    cardColumns: [
      "makeup_styles", "includes_rehearsal", "hair_makeup_separate", "rehearsal_count",
      "travel_fee_included", "director_level", "early_morning_fee",
    ],
  },

  한복: {
    prompt:
      `\n\n[한복 — 카테고리 특성]\n` +
      `★ 가격 모델: 대여(per_rental, 10~50만원)와 맞춤(per_custom, 50~300만원)이 별도. 혼주/신부/폐백별로도 가격이 다름 → 패키지 여러 개.\n` +
      `★ price_packages.includes 예: ["혼주 한복 2벌 대여", "신부 폐백 한복 1벌", "수선 포함", "노리개·뒷꽂이 포함"].\n` +
      `★ 보관비/세탁비/지방 배송비 등은 notes에.\n` +
      `[추가 추출 필드 → category_extras]\n` +
      `- hanbok_types (배열): 취급 한복 [${ENUM(["혼주", "신부", "신랑", "폐백", "어머님", "아버님", "맞춤", "대여"])}] 중.\n` +
      `- custom_available (bool): 맞춤 제작 가능 (false면 대여만).\n` +
      `- accessories_included (bool): 노리개·뒷꽂이·속바지·버선 등 액세서리 기본 포함.\n` +
      `- delivery_available (bool): 지방 배송 / 택배 대여 가능.`,
    cardColumns: ["hanbok_types", "custom_available", "accessories_included", "delivery_available"],
  },

  예복: {
    prompt:
      `\n\n[예복(턱시도/정장) — 카테고리 특성]\n` +
      `★ 가격 모델: 대여(per_rental, 20~50만원)와 맞춤(per_custom, 50~300만원)이 별도. 신랑 본식 / 양가 부친 별로도 다를 수 있음.\n` +
      `★ price_packages.includes 예: ["신랑 본식 1벌", "리허설 1벌", "수선 포함", "셔츠·구두 별도/포함"].\n` +
      `★ 가봉 횟수, 수선 포함 여부, 셔츠/구두 포함 여부 명시.\n` +
      `[추가 추출 필드 → category_extras]\n` +
      `- suit_styles (배열): [${ENUM(["턱시도", "정장", "모닝", "클래식", "모던", "슬림핏", "쓰리피스"])}] 중.\n` +
      `- custom_available (bool): 맞춤 제작 가능.\n` +
      `- fitting_count (정수): 가봉 횟수.\n` +
      `- designer_brands (배열): 취급 브랜드.\n` +
      `- accessories_included (bool): 셔츠·구두·넥타이·커프스 등 액세서리 기본 포함.`,
    cardColumns: ["suit_styles", "custom_available", "fitting_count", "designer_brands", "accessories_included"],
  },

  허니문: {
    prompt:
      `\n\n[허니문 — 카테고리 특성 (※ 행 단위 = 여행 "상품" 1개. 여행사가 아님!)]\n` +
      `★ 한 행 = 한 패키지/상품. places.name = 패키지 상품명 (예: "발리 5박7일 풀빌라 허니문 with 가루다항공").\n` +
      `★ ※ places.city / places.district 채우는 규칙 (필수):\n` +
      `   - places.city = region_group 값 ("일본"/"동남아"/"유럽" 등 광역 구분)\n` +
      `   - places.district = representative_city 값 ("도쿄"/"발리"/"파리" 등 대표 도시)\n` +
      `   허니문은 "여행사 본사 위치"가 아니라 "여행하는 곳"이 검색 기준이 됨.\n` +
      `★ category_extras.agency_name = 판매 여행사 (하나투어/모두투어/노랑풍선/마이리얼트립/클룩/인터파크투어 등).\n` +
      `★ product_type 필수: ${ENUM(["package", "free_travel", "flight", "pass"])}\n` +
      `   - package: 항공+숙박+가이드 묶음 패키지\n` +
      `   - free_travel: 항공+숙박만 묶고 일정은 자유\n` +
      `   - flight: 항공권 단품 (편도/왕복)\n` +
      `   - pass: 교통패스(JR패스/유레일) 또는 관광지 이용권(디즈니/유니버설/Klook/KKday류)\n` +
      `★ 가격 모델: 보통 per_person (1인 KRW). 통화 USD/EUR 표기되어 있으면 그대로 currency에 명시.\n` +
      `★ price_packages.includes 예: ["왕복 항공권 비즈니스", "리조트 5성 5박", "공항 픽업", "조식 5회", "투어 1일"].\n` +
      `★ price_packages.notes 에는 성수기/비수기 가격 차이, 유류할증료 명시.\n` +
      `[기본 식별/분류 → category_extras]\n` +
      `- agency_name (문자열, 필수): 판매 여행사명.\n` +
      `- agency_product_url (문자열): 여행사 상품 상세 페이지 URL.\n` +
      `- product_code (문자열): 여행사 상품 코드 (예: "Q-BLI24001"). 예약·문의 시 사용.\n` +
      `- product_type (enum, 필수): ${ENUM(["package", "free_travel", "flight", "pass"])}.\n` +
      `- departure_type (enum): ${ENUM(["매일출발", "지정일출발", "단독출발"])}.\n` +
      `[목적지]\n` +
      `- countries (배열): 방문 국가. 예: ["일본"], ["프랑스","스위스","이탈리아"].\n` +
      `- cities (배열): 방문 도시. 예: ["도쿄","교토","긴자"].\n` +
      `- representative_city (문자열): 대표 도시(검색·필터 키). 보통 cities[0]이지만 패키지명상의 메인 도시.\n` +
      `- region_group (enum): ${ENUM(["일본", "동남아", "괌사이판", "유럽", "미주", "대양주", "중화권", "국내", "기타"])} 중.\n` +
      `[일정]\n` +
      `- nights (정수): 박. 예: 5박7일이면 5.\n` +
      `- days (정수): 일. 예: 5박7일이면 7.\n` +
      `- itinerary_summary (문자열): 일정 한 줄 요약 (예: "Day1 인천→발리, Day2-5 자유시간/풀빌라, Day6 우붓 투어, Day7 출국").\n` +
      `- itinerary_highlights (배열): 주요 일정 (예: ["스미냑 비치 디너", "우붓 라이스테라스", "스파 1회"]).\n` +
      `[가격]\n` +
      `- price_per_person (정수): 최저가 KRW. (places.min_price와 동기화)\n` +
      `- avg_budget (정수): 1인 평균 경비 KRW (성수기 포함, 옵션 투어 1~2개 가정한 현실 비용).\n` +
      `- single_supplement (정수): 1인 1실 추가요금 KRW. 보통 50~150만원.\n` +
      `- child_price (정수): 아동(만 2~12세) 가격 KRW.\n` +
      `- infant_price (정수): 유아(만 0~2세) 가격 KRW.\n` +
      `- price_includes (배열): 포함 항목 (예: ["왕복 직항 항공", "5성 호텔 5박", "조식 5회"]).\n` +
      `- price_excludes (배열): 불포함 항목 (예: ["선택관광", "가이드 팁", "유류할증료"]).\n` +
      `- promotion_text (문자열): 현재 진행 중인 시즌 프로모션 (예: "5월 출발 7만원 할인", "조기예약 15% 할인").\n` +
      `[항공]\n` +
      `- airline (문자열): 대표 항공사 (예: "대한항공", "아시아나", "가루다인도네시아").\n` +
      `- direct_flight (bool): 직항 여부.\n` +
      `- departure_airport (문자열): 출발 공항 — "인천"/"김포"/"부산"/"대구".\n` +
      `- layover_cities (배열): 경유 도시 (direct_flight=false일 때 필수). 예: ["나리타"].\n` +
      `- flight_hours (정수): 편도 비행시간(시간 단위, 반올림). 경유면 환승 대기 포함.\n` +
      `[숙박]\n` +
      `- hotel_grade (문자열): "3성"/"4성"/"5성"/"풀빌라"/"리조트"/"부티크".\n` +
      `- room_type (문자열): 객실 타입 — "스탠다드"/"디럭스"/"스위트"/"풀빌라"/"오션뷰"/"파티오".\n` +
      `- hotel_names (배열): 실제 사용 호텔명 (예: ["더 리츠칼튼 발리","아야나 리조트"]).\n` +
      `- meal_plan (문자열): 식사 — "조식 5회"/"2식 조·석"/"올인클루시브"/"미포함".\n` +
      `[키워드/특성]\n` +
      `- themes (배열): ${ENUM(["가성비", "럭셔리", "랜드마크", "휴양", "도심관광", "자연·액티비티", "미식", "쇼핑", "효도", "신혼", "가족"])} 중. 1~3개.\n` +
      `- honeymoon_perks (배열, 허니문 패키지의 핵심 차별점): 신혼 특전 (예: ["룸 업그레이드","웰컴 케이크","허니문 디너","스파 1회","조식 인룸 서비스","꽃장식","샴페인"]).\n` +
      `- shopping_required (bool): 쇼핑센터 의무방문 (패키지 단점).\n` +
      `- guide_included (bool): 한국어 인솔자/가이드 동행.\n` +
      `- visa_required (bool): 한국 여권 기준 비자 필요 여부.\n` +
      `[product_type=pass 전용]\n` +
      `- validity_days (정수): 유효기간(일). 예: JR패스 7일권이면 7.\n` +
      `- usage_count (정수): 사용 가능 횟수. 0=무제한, 1=1회 입장, 등.`,
    cardColumns: [
      "agency_name", "agency_product_url", "product_type", "product_code",
      "countries", "cities", "representative_city", "region_group",
      "nights", "days", "itinerary_summary", "itinerary_highlights",
      "price_per_person", "avg_budget", "single_supplement", "child_price", "infant_price",
      "price_includes", "price_excludes", "promotion_text",
      "airline", "direct_flight", "departure_airport", "layover_cities", "flight_hours",
      "hotel_grade", "room_type", "hotel_names", "meal_plan",
      "themes", "honeymoon_perks", "shopping_required", "guide_included", "visa_required",
      "departure_type", "validity_days", "usage_count",
    ],
  },

  혼수: {
    prompt:
      `\n\n[혼수(가전·가구) — 카테고리 특성]\n` +
      `★ 가격 모델: per_set (세트 가격, 보통 500~3000만원). 단품 가격이면 per_event로.\n` +
      `★ price_packages.includes 예: ["냉장고", "세탁기", "건조기", "TV 65인치", "에어컨 2대", "무료 배송·설치"].\n` +
      `★ 가전 업체 비교 시 무료 배송/설치, 폐가전 무료 수거, 카드 할인 등이 핵심.\n` +
      `[추가 추출 필드 → category_extras]\n` +
      `- product_categories (배열): [${ENUM(["TV", "냉장고", "세탁기", "에어컨", "가구", "침대", "소파", "건조기"])}] 중.\n` +
      `- brand_options (배열): 취급 브랜드 (예: ["LG", "삼성", "한샘", "에넥스"]).\n` +
      `- installment_months (정수): 무이자 할부 최대 개월수 (없으면 0).\n` +
      `- warranty_years (정수): 기본 보증 기간 (년).\n` +
      `- free_delivery (bool): 무료 배송 제공.\n` +
      `- free_installation (bool): 무료 설치 (예: 에어컨 설치 무료).\n` +
      `- old_appliance_pickup (bool): 폐가전 무료 수거.\n` +
      `- card_discount_available (bool): 카드사 제휴 할인 운영.`,
    cardColumns: [
      "product_categories", "brand_options", "installment_months", "warranty_years",
      "free_delivery", "free_installation", "old_appliance_pickup", "card_discount_available",
    ],
  },

  예물: {
    prompt:
      `\n\n[예물(주얼리/예물세트) — 카테고리 특성 (※ 행 단위 = 한 브랜드의 베스트셀러 1개)]\n` +
      `★ 한 행 = 1 브랜드의 대표 베스트셀러 컬렉션/라인 (예: "제이에스티나 미니멀 결혼반지", "디디에두보 골든니클라스").\n` +
      `★ places.name = 브랜드 + 컬렉션명. places.tel/places.address = 본사 또는 대표 매장.\n` +
      `★ 매장 형태(store_type) 구분 필수: ${ENUM(["online", "offline", "both"])} \n` +
      `   - online: 자체 사이트 또는 백화점몰만 운영 (오프라인 매장 X)\n` +
      `   - offline: 오프라인 매장만 운영 (인터넷 판매 X)\n` +
      `   - both: 양쪽 다\n` +
      `★ 가격 모델: 1개 반지 가격(price_per_person)과 커플 2인 세트 가격(price_couple_set) 둘 다 베스트셀러 기준 추출.\n` +
      `★ price_packages.includes 예: ["결혼반지 2개 (남여)", "다이아몬드 0.3캐럿", "GIA 인증서", "사이즈 조절 평생 무료"].\n` +
      `★ ※ SNS 정보 채울 것 (places.tel, place_details: instagram_url, naver_place_url, naver_blog_url, kakao_channel_url, website_url, youtube_url, facebook_url).\n` +
      `[식별 → category_extras]\n` +
      `- brand_name (문자열, 필수): 브랜드명 (제이에스티나/골든듀/디디에두보/스톤헨지/티파니/까르띠에 등).\n` +
      `- product_url (문자열, 필수): 베스트셀러 상품 페이지 URL — 브랜드 공식 사이트, 백화점몰, 또는 네이버 플레이스 매장 URL.\n` +
      `- product_code (문자열): 브랜드 상품번호.\n` +
      `- product_type (enum): ${ENUM(["결혼반지", "예물세트", "예단", "시계", "단품주얼리"])}.\n` +
      `- sub_category (문자열): 컬렉션·라인명 (예: "솔리테어", "트리니티", "엔드리스", "라피네").\n` +
      `- store_type (enum): online/offline/both.\n` +
      `[가격 (베스트셀러 기준)]\n` +
      `- price_per_person (정수): 1인 결혼반지 1개 가격 KRW.\n` +
      `- price_couple_set (정수): 커플 2인 세트 가격 KRW.\n` +
      `[메탈]\n` +
      `- metals (배열): [${ENUM(["골드", "화이트골드", "로즈골드", "플래티넘", "실버"])}] 중.\n` +
      `- gold_karat (문자열): 금 함량 — ${ENUM(["14K", "18K", "24K", "플래티넘950", "플래티넘900"])}. 메탈 종류만큼 가격 차이 큼.\n` +
      `- product_categories (배열): [${ENUM(["결혼반지", "예물세트", "시계", "네크리스", "이어링", "팔찌"])}] 중.\n` +
      `[다이아 (4C 분리 입력 — 비교사이트 표준)]\n` +
      `- carat_diamond (소수): 메인 스톤 캐럿 (0.3/0.5/1.0…). 다이아 없으면 null.\n` +
      `- diamond_certified (bool): 인증서 발급 여부.\n` +
      `- diamond_cert_org (문자열): 인증기관 ${ENUM(["GIA", "IGI", "HRD", "한국감정원", "현대주얼리"])}.\n` +
      `- diamond_color (문자열): 컬러 등급 — D/E/F/G/H/I/J… (D 무색에 가까울수록 고가).\n` +
      `- diamond_clarity (문자열): 투명도 — ${ENUM(["FL", "IF", "VVS1", "VVS2", "VS1", "VS2", "SI1", "SI2", "I1"])}.\n` +
      `- diamond_cut (문자열): 컷 등급 — ${ENUM(["Excellent", "Very Good", "Good", "Fair", "Poor"])}.\n` +
      `- diamond_shape (문자열): 형태 — ${ENUM(["라운드", "프린세스", "오벌", "페어", "마키스", "하트", "에메랄드", "쿠션"])}.\n` +
      `- diamond_origin (enum): ${ENUM(["natural", "lab_grown"])} (천연/랩그로운). 랩그로운은 30~50% 저렴.\n` +
      `- side_stones_count (정수): 사이드 스톤 개수. 솔리테어면 0, 멜리/할로면 5~30개 등.\n` +
      `- side_stones_total_carat (소수): 사이드 스톤 총 캐럿.\n` +
      `[밴드 (반지 치수·디자인)]\n` +
      `- band_design (문자열): 밴드 형태 — 예: "심플밴드", "볼륨", "트위스트", "에터니티".\n` +
      `- band_width_mm (소수): 반지 폭 mm. 결혼반지 보통 2~4mm.\n` +
      `- band_thickness_mm (소수): 반지 두께 mm. 보통 1.5~2.5mm.\n` +
      `- band_profile (문자열): 단면 — ${ENUM(["코트", "D-shape", "플랫"])}.\n` +
      `- band_finishing (문자열): 마감 — ${ENUM(["폴리시", "매트", "해머링", "밀그레인"])}.\n` +
      `- stone_setting (문자열): 세팅 방식 — ${ENUM(["프롱", "베젤", "채널", "파브"])}.\n` +
      `[서비스]\n` +
      `- engraving_available (bool): 이니셜·문구 각인 가능.\n` +
      `- size_resize_free (bool): 사이즈 조절 무료.\n` +
      `- custom_design_available (bool): 맞춤 디자인 가능.\n` +
      `- delivery_days (정수): 제작·배송 소요 일수 (재고면 1, 주문제작이면 14~30 등).\n` +
      `- lifetime_warranty (bool): 평생 A/S.\n` +
      `- couple_set_available (bool): 커플 세트 구성 가능.\n` +
      `- aftercare_includes (배열): 평생 케어 항목 (예: ["클리닝", "리폴리싱", "재세팅", "사이즈조절"]).\n` +
      `- package_includes (배열): 패키지 포함 항목 (예: ["감정서", "벨벳 케이스", "예물함"]).\n` +
      `[브랜드 메타]\n` +
      `- brand_tier (enum): ${ENUM(["대중", "프리미엄", "럭셔리", "하이엔드"])} 가격대 분류.\n` +
      `   대중: 50~150만원 (제이에스티나/디디에두보 등)\n` +
      `   프리미엄: 150~400만원 (스톤헨지/예작/예이츠 등)\n` +
      `   럭셔리: 400~1000만원 (까르띠에/불가리/티파니 입문)\n` +
      `   하이엔드: 1000만원+ (반클리프/쇼파드/그라프)\n` +
      `- brand_origin (문자열): 브랜드 국가 (한국/미국/프랑스/이탈리아 등).\n` +
      `- brand_history_year (정수): 설립 연도 (예: 1837).\n` +
      `- showroom_count (정수): 국내 오프라인 매장 수.\n` +
      `- promotion_text (문자열): 시즌 프로모션/할인.`,
    cardColumns: [
      "brand_name", "brand_tier", "product_url", "product_code", "product_type", "sub_category", "store_type",
      "metals", "gold_karat", "product_categories",
      "price_per_person", "price_couple_set",
      "carat_diamond", "diamond_certified", "diamond_cert_org",
      "diamond_color", "diamond_clarity", "diamond_cut", "diamond_shape", "diamond_origin",
      "side_stones_count", "side_stones_total_carat",
      "band_design", "band_width_mm", "band_thickness_mm", "band_profile", "band_finishing",
      "stone_setting", "engraving_available",
      "custom_design_available", "delivery_days", "size_resize_free",
      "aftercare_includes", "package_includes",
      "couple_set_available", "lifetime_warranty",
      "brand_origin", "brand_history_year", "showroom_count", "promotion_text",
    ],
  },

  청첩장: {
    prompt:
      `\n\n[청첩장 모임장소(상견례·청첩장 모임 식당) — 카테고리 특성]\n` +
      `★ 가격 모델: per_person (1인 코스 가격, 보통 5~15만원).\n` +
      `★ 룸 단위 운영이면 룸 최소 인원 / 룸 차지가 별도 있을 수 있음 → notes에.\n` +
      `★ price_packages.includes 예: ["1인 코스 7품", "음료 무제한", "프라이빗 룸 4시간"].\n` +
      `★ 레스토랑 비교 시 분위기, 발렛파킹, 시그니처 메뉴, 콜키지가 핵심.\n` +
      `[추가 추출 필드 → category_extras]\n` +
      `- venue_types (배열): [${ENUM(["한식", "일식", "중식", "양식", "이탈리안", "코스", "프라이빗", "룸"])}] 중.\n` +
      `- capacity_min (정수): 룸 최소 수용 인원.\n` +
      `- capacity_max (정수): 룸 최대 수용 인원.\n` +
      `- room_charge_separate (bool): 룸 차지(룸 사용료)가 1인 코스값과 별도로 청구되는지.\n` +
      `- drinks_included (bool): 음료/주류가 코스 가격에 포함되는지.\n` +
      `- atmosphere (배열): 분위기 [${ENUM(["데이트", "비즈니스", "가족모임", "회식", "프라이빗", "캐주얼"])}] 중.\n` +
      `- valet_parking (bool): 발렛파킹 제공.\n` +
      `- signature_dishes (배열): 시그니처/대표 메뉴 (예: ["도미스시", "오마카세 코스"]).\n` +
      `- corkage_fee_won (정수): 콜키지(외부 와인 반입) 비용 KRW. 무료면 0, 미허용이면 null.\n` +
      `- private_room_count (정수): 단독 룸 개수.`,
    cardColumns: [
      "venue_types", "capacity_min", "capacity_max", "room_charge_separate", "drinks_included",
      "atmosphere", "valet_parking", "signature_dishes", "corkage_fee_won", "private_room_count",
    ],
  },
};

export const CARD_TABLE: Record<CategoryLabel, string> = {
  웨딩홀: "place_wedding_halls",
  스튜디오: "place_studios",
  드레스샵: "place_dress_shops",
  메이크업샵: "place_makeup_shops",
  한복: "place_hanboks",
  예복: "place_tailor_shops",
  허니문: "place_honeymoons",
  혼수: "place_appliances",
  예물: "place_jewelry",
  청첩장: "place_invitation_venues",
};
