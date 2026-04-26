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
      `- dress_provided (bool): 드레스 대여 포함.`,
    cardColumns: [
      "shoot_styles", "shoot_locations", "total_photos", "original_count",
      "retouching_included", "includes_originals", "dress_provided",
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
      `- designer_brands (배열): 취급 디자이너/브랜드 (예: ["Vera Wang", "Pronovias", "Galia Lahav"]).`,
    cardColumns: [
      "dress_styles", "rental_only", "fitting_count",
      "rental_includes_alterations", "designer_brands",
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
      `- rehearsal_count (정수): 리허설 횟수.`,
    cardColumns: [
      "makeup_styles", "includes_rehearsal", "hair_makeup_separate", "rehearsal_count",
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
      `- custom_available (bool): 맞춤 제작 가능 (false면 대여만).`,
    cardColumns: ["hanbok_types", "custom_available"],
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
      `- designer_brands (배열): 취급 브랜드.`,
    cardColumns: ["suit_styles", "custom_available", "fitting_count", "designer_brands"],
  },

  허니문: {
    prompt:
      `\n\n[허니문 — 카테고리 특성]\n` +
      `★ 가격 모델: per_couple (2인 패키지 가격, 보통 200~1500만원)이 일반적. per_person으로 표기되어 있으면 그대로 per_person.\n` +
      `★ 통화: KRW가 보통이지만 USD/EUR로 표기되어 있으면 그대로 USD/EUR. (currency 필드 명시 필수)\n` +
      `★ 패키지는 보통 여행지+박일수 단위로 묶임 ("발리 5박 7일", "유럽 8박 10일").\n` +
      `★ price_packages.includes 예: ["왕복 항공권 비즈니스", "리조트 5성 5박", "공항 픽업", "조식 포함", "투어 1일"].\n` +
      `★ 항공편 등급(이코노미/비즈니스), 호텔 등급(3성/4성/5성), 보험 포함 여부는 notes 또는 includes에.\n` +
      `[추가 추출 필드 → category_extras]\n` +
      `- destinations (배열): 여행지 (예: ["발리", "몰디브", "유럽"]).\n` +
      `- duration_days (정수): 패키지 기본 일수.\n` +
      `- includes_flights (bool): 항공편 포함.\n` +
      `- includes_hotel (bool): 숙박 포함.\n` +
      `- travel_agency_partner (문자열): 제휴 여행사명.`,
    cardColumns: [
      "destinations", "duration_days", "includes_flights", "includes_hotel",
      "travel_agency_partner",
    ],
  },

  혼수: {
    prompt:
      `\n\n[혼수(가전·가구) — 카테고리 특성]\n` +
      `★ 가격 모델: per_set (세트 가격, 보통 500~3000만원). 단품 가격이면 per_event로.\n` +
      `★ price_packages.includes 예: ["냉장고", "세탁기", "건조기", "TV 65인치", "에어컨 2대", "무료 배송·설치"].\n` +
      `★ 세트 할인율, 무이자 할부 개월수, 무료 배송/설치 여부는 notes에.\n` +
      `[추가 추출 필드 → category_extras]\n` +
      `- product_categories (배열): [${ENUM(["TV", "냉장고", "세탁기", "에어컨", "가구", "침대", "소파", "건조기"])}] 중.\n` +
      `- brand_options (배열): 취급 브랜드 (예: ["LG", "삼성", "한샘", "에넥스"]).`,
    cardColumns: ["product_categories", "brand_options"],
  },

  청첩장: {
    prompt:
      `\n\n[청첩장 모임장소(상견례·청첩장 모임 식당) — 카테고리 특성]\n` +
      `★ 가격 모델: per_person (1인 코스 가격, 보통 5~15만원).\n` +
      `★ 룸 단위 운영이면 룸 최소 인원 / 룸 차지가 별도 있을 수 있음 → notes에.\n` +
      `★ price_packages.includes 예: ["1인 코스 7품", "음료 무제한", "프라이빗 룸 4시간"].\n` +
      `[추가 추출 필드 → category_extras]\n` +
      `- venue_types (배열): [${ENUM(["한식", "일식", "중식", "양식", "이탈리안", "코스", "프라이빗", "룸"])}] 중.\n` +
      `- capacity_min (정수): 룸 최소 수용 인원.\n` +
      `- capacity_max (정수): 룸 최대 수용 인원.`,
    cardColumns: ["venue_types", "capacity_min", "capacity_max"],
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
  청첩장: "place_invitation_venues",
};
