// 카테고리별 enum→한국어 라벨 단일 소스.
//
// 이전엔 목록(useCategoryData)과 상세(VendorDetailPage)가 각자 인라인 맵을 들고
// 있어 같은 값이 다르게 표시됐다(드리프트 버그):
//   가전 package "패키지"(목록) vs "신혼 패키지"(상세)
//   예물 online  "온라인"(목록) vs "온라인 판매"(상세)
// 더 서술적인 상세 페이지 표현을 정식으로 채택해 단일화한다.

// 장소 카테고리(enum) → 짧은 한국어 라벨. 추천(PlaceRecommendations)·태그 검색(TagResults)
// 카드의 카테고리 배지 등 '짧은 표시'용 단일 소스. (placeMappers.PLACE_TO_KOREAN_CATEGORY 는
// 드레스샵/메이크업샵/혼수 등 더 긴 표기 + jewelry 누락이라 표시 목적이 달라 분리.)
export const PLACE_CATEGORY_LABEL: Record<string, string> = {
  wedding_hall: "웨딩홀",
  studio: "스튜디오",
  dress_shop: "드레스",
  makeup_shop: "메이크업",
  hanbok: "한복",
  tailor_shop: "예복",
  honeymoon: "허니문",
  appliance: "혼수가전",
  jewelry: "주얼리",
  invitation_venue: "청첩장",
};

// 장소 카테고리(enum) → 예산 카테고리(BudgetCategoryKey). weddingStyle.BUDGET_CATEGORY_COMPOSERS
// 의 역방향(어느 장소가 어느 예산 항목을 구성하나)을 단일 소스로. 예약→예산 자동반영에 사용.
export const PLACE_TO_BUDGET_CATEGORY: Record<string, string> = {
  wedding_hall: "venue",
  studio: "sdm",
  dress_shop: "sdm",
  makeup_shop: "sdm",
  tailor_shop: "suit",
  hanbok: "hanbok",
  appliance: "house",
  honeymoon: "honeymoon",
  jewelry: "ring",
  invitation_venue: "etc",
  etc: "etc",
};

export const APPLIANCE_PRODUCT_TYPE_LABEL: Record<string, string> = {
  store: "매장",
  package: "신혼 패키지",
  single: "단품 모델",
};

export const JEWELRY_STORE_TYPE_LABEL: Record<string, string> = {
  online: "온라인 판매",
  offline: "오프라인 매장만",
  both: "온·오프라인 모두",
};
