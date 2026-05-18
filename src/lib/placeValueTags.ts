// 가치 기반 장소 태그 — 페르소나 시뮬레이션 v2의 S-2 (비건 카페·환경 NGO)
// 케이스를 위한 후속 PR. user_wedding_settings.value_tags 와 짝을 이루지만
// 별도 키로 관리한다:
//   - 사용자 쪽 키(영문 eco/vegan/pet/foreign_guests)는 AI Planner 컨텍스트용
//   - 장소(places.tags) 쪽 값(한글)은 데이터 수집·벤더 입력 컨벤션을 따름
//
// 두 키 공간이 분리되어 있어 어느 한쪽 PR이 먼저 머지돼도 다른 쪽이 깨지지
// 않는다. 향후 카탈로그 자동 매칭이 필요하면 이 매핑 테이블이 다리 역할.

export interface PlaceValueTag {
  /** places.tags 배열에 저장되는 실제 한글 태그 값. */
  value: string;
  label: string;
  emoji: string;
  hint: string;
  /** 사용자 쪽 weddingValues 키 (있을 때만). 카탈로그 추천 가중치에 사용 가능. */
  userKey?: "eco" | "vegan" | "pet" | "foreign_guests";
}

export const PLACE_VALUE_TAG_OPTIONS: readonly PlaceValueTag[] = [
  { value: "친환경",     label: "친환경",       emoji: "", hint: "재사용 소품·제로웨이스트 친화",   userKey: "eco" },
  { value: "비건옵션",   label: "비건",         emoji: "", hint: "비건·채식 옵션 제공",              userKey: "vegan" },
  { value: "반려동물",   label: "반려동물 동반", emoji: "", hint: "반려동물 동반 가능",               userKey: "pet" },
  { value: "영문안내",   label: "영문 안내",     emoji: "", hint: "외국인 하객용 영문 안내 지원",     userKey: "foreign_guests" },
] as const;

const VALUE_TO_OPTION: Record<string, PlaceValueTag> = Object.fromEntries(
  PLACE_VALUE_TAG_OPTIONS.map((o) => [o.value, o]),
);

/** 한 장소의 tags 배열에서 가치 태그만 추출. UI에 emoji+label로 표시할 때 사용. */
export const extractValueTags = (tags: readonly string[] | null | undefined): PlaceValueTag[] => {
  if (!tags) return [];
  const seen = new Set<string>();
  const out: PlaceValueTag[] = [];
  for (const t of tags) {
    const opt = VALUE_TO_OPTION[t];
    if (opt && !seen.has(opt.value)) {
      seen.add(opt.value);
      out.push(opt);
    }
  }
  return out;
};

export const isValueTag = (tag: string): boolean => tag in VALUE_TO_OPTION;
