import type { TipVideo } from "@/hooks/useTipVideos";
import type { WeddingProfilePrefill } from "@/hooks/useWeddingProfile";

// Korean wedding planning timeline: couples typically book vendors in this
// order. Each phase boosts the categories that are most relevant *right now*
// for the couple — so a D-200 user sees wedding-hall tips first, while a
// D-45 user sees 청첩장/허니문 tips at the top.
const PHASE_BOOSTS: ReadonlyArray<{
  minDays: number;
  maxDays: number;
  categories: ReadonlyArray<string>;
}> = [
  { minDays: 180, maxDays: Infinity, categories: ["wedding_hall"] },
  { minDays: 120, maxDays: 180, categories: ["wedding_hall", "studio", "dress_shop"] },
  { minDays: 90, maxDays: 120, categories: ["dress_shop", "makeup_shop", "hanbok"] },
  { minDays: 60, maxDays: 90, categories: ["makeup_shop", "tailor_shop", "appliance"] },
  { minDays: 30, maxDays: 60, categories: ["invitation_venue", "appliance", "honeymoon"] },
  { minDays: 0, maxDays: 30, categories: ["invitation_venue", "honeymoon", "general"] },
  // Past wedding date: honeymoon + general tips only.
  { minDays: -Infinity, maxDays: 0, categories: ["honeymoon", "general"] },
];

const STYLE_HINTS: Record<string, ReadonlyArray<string>> = {
  small: ["스몰", "스몰웨딩", "하우스", "한옥", "small"],
  self: ["셀프", "직접", "self", "diy"],
  general: [],
  custom: [],
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function daysUntilWedding(dateStr: string, now: number = Date.now()): number | null {
  if (!dateStr) return null;
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - now) / MS_PER_DAY);
}

export function phaseCategoriesFor(days: number | null): ReadonlyArray<string> {
  if (days === null) return [];
  const phase = PHASE_BOOSTS.find((p) => days >= p.minDays && days < p.maxDays);
  return phase?.categories ?? [];
}

export interface CurationFactors {
  phaseCategories: ReadonlyArray<string>;
  styleHints: ReadonlyArray<string>;
  hasSignal: boolean; // false → fall back to popularity sort
}

export function buildCurationFactors(
  profile: WeddingProfilePrefill,
  now: number = Date.now()
): CurationFactors {
  const phase = phaseCategoriesFor(daysUntilWedding(profile.weddingDate, now));
  const style = STYLE_HINTS[profile.weddingStyle] ?? [];
  return {
    phaseCategories: phase,
    styleHints: style,
    hasSignal: phase.length > 0 || style.length > 0,
  };
}

// Higher score = more relevant. Popularity is log-normalized so a 10M-view
// video can still lose to a 100k-view video that matches the user's phase.
export function scoreTipVideo(
  video: TipVideo,
  factors: CurationFactors,
  now: number = Date.now()
): number {
  // log10(view_count) / 8 → roughly 0..1 (100M views ≈ 1.0).
  let score = Math.log10(Math.max(video.view_count, 1)) / 8;

  if (factors.phaseCategories.length > 0) {
    const match = video.categories.some((c) => factors.phaseCategories.includes(c));
    if (match) score += 0.6;
  }

  if (factors.styleHints.length > 0) {
    const haystack = [
      video.title.toLowerCase(),
      ...(video.tags ?? []).map((t) => t.toLowerCase()),
    ];
    const hit = factors.styleHints.some((h) =>
      haystack.some((s) => s.includes(h.toLowerCase()))
    );
    if (hit) score += 0.3;
  }

  if (video.published_at) {
    const ageDays = (now - new Date(video.published_at).getTime()) / MS_PER_DAY;
    if (ageDays >= 0 && ageDays < 60) score += 0.15;
  }

  return score;
}

export function rankTipVideosForUser(
  videos: ReadonlyArray<TipVideo>,
  profile: WeddingProfilePrefill,
  opts: { limit?: number; now?: number } = {}
): TipVideo[] {
  const { limit, now = Date.now() } = opts;
  const factors = buildCurationFactors(profile, now);
  // No personalization signal yet → preserve incoming order (popularity).
  if (!factors.hasSignal) {
    return limit ? videos.slice(0, limit) : [...videos];
  }
  const ranked = videos
    .map((v) => ({ v, s: scoreTipVideo(v, factors, now) }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.v);
  return limit ? ranked.slice(0, limit) : ranked;
}
