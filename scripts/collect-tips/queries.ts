// Per-category seed queries for YouTube wedding tip search.
// Each category gets 3-4 queries; collector pools the top N results per query.

export const TIP_QUERIES: Record<string, string[]> = {
  general: ["결혼 준비 꿀팁", "예비부부 체크리스트", "웨딩 준비 순서", "결혼 비용"],
  wedding_hall: ["웨딩홀 고르는 법", "예식장 비교", "스몰웨딩 후기", "호텔웨딩 팁"],
  studio: ["웨딩 스튜디오 추천", "본식 스냅 팁", "셀프 웨딩 촬영"],
  dress_shop: ["웨딩 드레스 가봉 후기", "드레스샵 추천", "체형별 드레스"],
  makeup_shop: ["신부 메이크업 후기", "웨딩 헤어 추천", "메이크업 리허설"],
  hanbok: ["혼주 한복 추천", "신부 한복 트렌드", "한복 맞춤 후기"],
  tailor_shop: ["신랑 예복 추천", "턱시도 vs 정장", "맞춤 정장 후기"],
  honeymoon: ["허니문 추천 여행지", "신혼여행 패키지", "유럽 허니문 후기"],
  appliance: ["혼수 가전 추천", "신혼 가전 세트", "혼수 침대 매트리스"],
  invitation_venue: ["청첩장 모임 장소", "상견례 식당 추천", "양가 상견례 팁"],
};

export type TipCategory = keyof typeof TIP_QUERIES;
export const TIP_CATEGORIES = Object.keys(TIP_QUERIES) as TipCategory[];
