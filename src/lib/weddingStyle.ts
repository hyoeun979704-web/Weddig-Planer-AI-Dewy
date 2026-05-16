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
    description: "표준 준비 과정 전체 포함 — 호텔/예식장 + 풀패키지",
    excluded: [],
  },
  small: {
    label: "스몰웨딩",
    // Realistic small-wedding scope: 50명 안팎, 한옥/하우스/카페형. 예복은
    // 정장으로 대체, 청첩장은 모바일 위주. 한복은 혼주(부모) 한복 수요가
    // 적지 않아 기본 제외에서 빼고, 필요 없으면 사용자가 직접 토글하도록.
    description: "30~80명 소규모 · 예복·대규모 청첩장 생략",
    excluded: ["tailor_shop", "invitation_venue"],
  },
  self: {
    label: "셀프웨딩",
    description: "촬영·드레스·메이크업을 직접 진행 (예산은 작지만 손이 많이 가요)",
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

// Maps each budget category to the set of schedule-side categories that
// compose it. A budget category is hidden only when EVERY composing schedule
// category is in `excluded_categories` — so e.g. excluding `studio` alone
// keeps SDM visible (드레스/메이크업도 그 카테고리), but excluding studio +
// dress_shop + makeup_shop together hides SDM entirely.
//
// Categories with no schedule-side composers (meal/ring/meetup) are never
// auto-hidden by exclusions — they're general budget rows that users may
// always need.
export const BUDGET_CATEGORY_COMPOSERS: Record<string, readonly string[]> = {
  venue: ["wedding_hall"],
  meal: [],
  sdm: ["studio", "dress_shop", "makeup_shop"],
  suit: ["tailor_shop"],
  hanbok: ["hanbok"],
  ring: [],
  meetup: [],
  house: ["appliance"],
  honeymoon: ["honeymoon"],
  etc: ["invitation_venue"],
};

const ALL_BUDGET_CATEGORIES = [
  "venue", "meal", "sdm", "suit", "hanbok", "ring", "meetup", "house", "honeymoon", "etc",
] as const;
export type BudgetCategoryKey = (typeof ALL_BUDGET_CATEGORIES)[number];

export const isBudgetCategoryHidden = (
  budgetCategory: string,
  excludedScheduleCategories: string[]
): boolean => {
  const composers = BUDGET_CATEGORY_COMPOSERS[budgetCategory] ?? [];
  if (composers.length === 0) return false;
  return composers.every(c => excludedScheduleCategories.includes(c));
};

export const visibleBudgetCategories = (
  excludedScheduleCategories: string[]
): BudgetCategoryKey[] =>
  ALL_BUDGET_CATEGORIES.filter(
    c => !isBudgetCategoryHidden(c, excludedScheduleCategories)
  );
