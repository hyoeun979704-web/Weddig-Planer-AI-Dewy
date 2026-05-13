// Wedding style presets + skippable prep categories.
// Lets users tailor the schedule/checklist for small or self weddings by
// hiding categories they don't need (스튜디오, 메이크업샵, 한복 등).

export type WeddingStyle = "general" | "small" | "self" | "custom";

// Category keys here align with the `category` values used in
// src/data/checklistTemplate.ts when seeding template items.
// Keep in sync if you add a new category there.
export const SKIPPABLE_CATEGORIES = [
  "wedding_hall",
  "studio",
  "dress_shop",
  "makeup_shop",
  "hanbok",
  "tailor_shop",
  "honeymoon",
  "appliance",
  "invitation_venue",
] as const;

export type SkippableCategory = (typeof SKIPPABLE_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<SkippableCategory, { label: string; hint: string }> = {
  wedding_hall: { label: "웨딩홀", hint: "예식장 답사·계약·시연" },
  studio: { label: "스튜디오 촬영", hint: "본식·리허설 스냅" },
  dress_shop: { label: "드레스샵", hint: "드레스 투어·피팅" },
  makeup_shop: { label: "메이크업샵", hint: "헤어·메이크업 예약" },
  hanbok: { label: "한복", hint: "혼주·신부 한복 준비" },
  tailor_shop: { label: "예복", hint: "예복 맞춤·가봉" },
  honeymoon: { label: "신혼여행", hint: "여행지·항공·숙박 예약" },
  appliance: { label: "혼수 가전·가구", hint: "혼수 구매 일정" },
  invitation_venue: { label: "청첩장", hint: "디자인·발송" },
};

export const WEDDING_STYLE_PRESETS: Record<
  Exclude<WeddingStyle, "custom">,
  { label: string; description: string; excluded: SkippableCategory[] }
> = {
  general: {
    label: "일반 결혼식",
    description: "표준 준비 과정 전체 포함",
    excluded: [],
  },
  small: {
    label: "스몰웨딩",
    description: "가까운 가족·지인 중심, 한복/대규모 청첩장 등 생략",
    excluded: ["hanbok"],
  },
  self: {
    label: "셀프웨딩",
    description: "촬영·메이크업·드레스 등을 직접 진행",
    excluded: ["studio", "makeup_shop", "dress_shop"],
  },
};

export const WEDDING_STYLE_LABEL: Record<WeddingStyle, string> = {
  general: WEDDING_STYLE_PRESETS.general.label,
  small: WEDDING_STYLE_PRESETS.small.label,
  self: WEDDING_STYLE_PRESETS.self.label,
  custom: "직접 선택",
};

// Returns the preset's default exclusions; 'custom' returns an empty array
// so callers can fall back to the user's own list.
export const defaultExclusionsFor = (style: WeddingStyle | null): SkippableCategory[] => {
  if (!style || style === "custom") return [];
  return WEDDING_STYLE_PRESETS[style].excluded;
};

// Compares two exclusion arrays as sets (order-independent).
export const sameExclusions = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every(x => set.has(x));
};

// Given user-selected exclusions, infer the wedding_style preset they
// match (or 'custom' if no preset matches exactly).
export const inferStyleFromExclusions = (excluded: string[]): WeddingStyle => {
  for (const style of ["general", "small", "self"] as const) {
    if (sameExclusions(excluded, WEDDING_STYLE_PRESETS[style].excluded)) return style;
  }
  return "custom";
};

// Filter helper for hiding excluded-category items from UI.
// `null`/missing category is never filtered out (general items always show).
export const isHiddenByExclusion = (
  category: string | null | undefined,
  excluded: string[]
): boolean => {
  if (!category) return false;
  return excluded.includes(category);
};
