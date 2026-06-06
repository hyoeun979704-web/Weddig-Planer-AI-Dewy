// 카테고리별 enum→한국어 라벨 단일 소스.
//
// 이전엔 목록(useCategoryData)과 상세(VendorDetailPage)가 각자 인라인 맵을 들고
// 있어 같은 값이 다르게 표시됐다(드리프트 버그):
//   가전 package "패키지"(목록) vs "신혼 패키지"(상세)
//   예물 online  "온라인"(목록) vs "온라인 판매"(상세)
// 더 서술적인 상세 페이지 표현을 정식으로 채택해 단일화한다.

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
