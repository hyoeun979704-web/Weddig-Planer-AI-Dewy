// 가치 기반 태그 정의 — 페르소나 시뮬레이션 v2의 S-2 (비건 카페 운영자)
// 케이스를 위해 도입. MVP는 4종으로 시작; 후속 PR에서 종교·식문화 등
// 세분 태그를 추가할 수 있다.
//
// 태그는 user_wedding_settings.value_tags 배열에 저장되고, AI Planner
// system prompt에 사용자 가치축으로 주입된다. 향후 카탈로그(places,
// products)에 동일 키로 태깅하여 필터링·가중치에 활용 예정.

export type WeddingValueTag = "eco" | "vegan" | "pet" | "foreign_guests";

export const WEDDING_VALUE_OPTIONS: ReadonlyArray<{
  key: WeddingValueTag;
  label: string;
  hint: string;
  emoji: string;
  /** AI Planner 컨텍스트에 그대로 들어가는 한국어 가이드 문장. */
  aiContext: string;
}> = [
  {
    key: "eco",
    label: "친환경·제로웨이스트",
    hint: "재사용 가능 소품, 친환경 답례품 위주",
    emoji: "🌱",
    aiContext:
      "친환경·제로웨이스트 지향: 일회용 인쇄·플라스틱 답례품을 피하고, 재사용 가능한 소품과 친환경 SKU를 우선 제안하세요.",
  },
  {
    key: "vegan",
    label: "비건·채식 친화",
    hint: "비건 케이터링, 채식 옵션 위주",
    emoji: "🥬",
    aiContext:
      "비건·채식 친화: 식단·답례품·웰컴키트 추천 시 비건 옵션을 명시하고, 동물성 재료를 피한 케이터링을 우선 제안하세요.",
  },
  {
    key: "pet",
    label: "반려동물 동반",
    hint: "반려견 동반 가능 베뉴 선호",
    emoji: "🐾",
    aiContext:
      "반려동물 동반 의향: 야외·하우스 베뉴 중 반려동물 동반이 가능한 곳 위주로 추천하고, 호텔식·실내 위주 추천은 그 점을 명시하세요.",
  },
  {
    key: "foreign_guests",
    label: "외국인 하객 다수",
    hint: "영문 안내·이중 언어 청첩장",
    emoji: "🌐",
    aiContext:
      "외국인 하객 비중이 높음: 식순·청첩장·안내문에 영문 동시 표기를 권하고, 한국 결혼 문화에 익숙하지 않은 하객을 위한 안내(축의금, 식사 매너 등) 가이드를 제안하세요.",
  },
] as const;

export const VALID_VALUE_TAGS = new Set<WeddingValueTag>(
  WEDDING_VALUE_OPTIONS.map((o) => o.key),
);

export const filterValidValueTags = (input: unknown): WeddingValueTag[] => {
  if (!Array.isArray(input)) return [];
  return input.filter((t): t is WeddingValueTag =>
    typeof t === "string" && VALID_VALUE_TAGS.has(t as WeddingValueTag),
  );
};
