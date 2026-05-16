import type { TipVideo } from "@/hooks/useTipVideos";
import type { WeddingProfilePrefill } from "@/hooks/useWeddingProfile";
import type { WeddingStyle } from "@/lib/weddingStyle";

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

// Hint values are stored already-lowercased (matching uses a lowercased
// haystack), so Korean tokens look unchanged while English ones are flat.
const STYLE_HINTS: Record<WeddingStyle, ReadonlyArray<string>> = {
  small: ["스몰", "스몰웨딩", "하우스", "한옥", "small"],
  self: ["셀프", "직접", "self", "diy"],
  general: [],
  custom: [],
};

// Phrases that signal a video targets a wedding type DIFFERENT from the
// user's. Matching one in the title or tags mildly demotes the video so
// stylistically-aligned content of similar popularity rises above it —
// the user can still find the video by search, but it won't dominate
// their default feed.
//
// Only "general" is populated: small/self users already have positive
// style hints (+ exclusion penalty) doing the work, and our corpus has
// almost no hotel/premium-tagged content for "small" opposites anyway.
// A general-wedding user has no positive style hint (general is the
// unmarked default), so without this signal a viral 셀프웨딩 video can
// outrank standard wedding-prep content purely on popularity.
const STYLE_OPPOSITE_HINTS: Record<WeddingStyle, ReadonlyArray<string>> = {
  general: ["셀프웨딩", "diy 웨딩", "스몰웨딩"],
  small: [],
  self: [],
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
  // Phrases that mark a video as targeting a DIFFERENT wedding type than
  // the user's. Matching adds OPPOSITE_HINT_PENALTY.
  oppositeHints: ReadonlyArray<string>;
  // Categories the user opted out of (small-wedding skips hanbok/tailor;
  // self-wedding skips studio/dress/makeup, etc). Videos in these
  // categories are pushed to the bottom — see EXCLUDED_PENALTY.
  excludedCategories: ReadonlyArray<string>;
  hasSignal: boolean; // false → fall back to popularity sort
}

export function buildCurationFactors(
  profile: WeddingProfilePrefill,
  now: number = Date.now()
): CurationFactors {
  const rawPhase = phaseCategoriesFor(daysUntilWedding(profile.weddingDate, now));
  const excluded = profile.excludedCategories ?? [];
  // Phase boost should never push a category the user explicitly opted out
  // of — e.g. a D-90 small-wedding user shouldn't see "tailor_shop" boosted.
  const phase = excluded.length > 0
    ? rawPhase.filter((c) => !excluded.includes(c))
    : rawPhase;
  // Record<WeddingStyle, ...> covers every enum variant, so no fallback
  // needed — TS guarantees the lookup is total.
  const style = STYLE_HINTS[profile.weddingStyle];
  const opposite = STYLE_OPPOSITE_HINTS[profile.weddingStyle];
  return {
    phaseCategories: phase,
    styleHints: style,
    oppositeHints: opposite,
    excludedCategories: excluded,
    // Personalization activates only when the user has expressed a
    // preference (date, style, or exclusions). Opposite hints are a
    // *modifier* on existing ranking — they fire when something else
    // already triggers scoring, but on their own they shouldn't override
    // popularity for a brand-new profile that hasn't set anything yet.
    hasSignal: phase.length > 0 || style.length > 0 || excluded.length > 0,
  };
}

// Strong negative score so excluded videos sink below every realistic
// positive score (popularity ≤ 1 + phase 0.6 + style 0.3 + recency 0.15).
// Using -10 rather than filtering keeps the video reachable if the user
// explicitly navigates to the excluded category tab — the chip filter
// (Tips.tsx) is the user-facing hide; this is for ranking inside the
// "전체" / mixed lists.
const EXCLUDED_PENALTY = -10;

// Mild demotion: opposite-style videos are still legitimate content,
// just lower priority. Tuned so popularity (up to ~1.0) can still
// promote a viral off-style video above an obscure on-style one — we
// nudge the order, not suppress.
const OPPOSITE_HINT_PENALTY = -0.3;

// Higher score = more relevant. Popularity is log-normalized so a 10M-view
// video can still lose to a 100k-view video that matches the user's phase.
export function scoreTipVideo(
  video: TipVideo,
  factors: CurationFactors,
  now: number = Date.now()
): number {
  // log10(view_count) / 8 → roughly 0..1 (100M views ≈ 1.0).
  let score = Math.log10(Math.max(video.view_count, 1)) / 8;

  // Hard demotion for opted-out categories. Applied first so the rest of
  // the boosts can't accidentally rescue an excluded video. We check only
  // the PRIMARY category (badge slot) — a multi-category video like
  // [dress_shop, wedding_hall, hanbok] should still surface for a
  // small-wedding user who only excluded hanbok, because it's primarily
  // about dresses.
  if (factors.excludedCategories.length > 0) {
    const primary = video.categories[0];
    if (primary && factors.excludedCategories.includes(primary)) {
      score += EXCLUDED_PENALTY;
    }
  }

  if (factors.phaseCategories.length > 0) {
    const match = video.categories.some((c) => factors.phaseCategories.includes(c));
    if (match) score += 0.6;
  }

  if (factors.styleHints.length > 0 || factors.oppositeHints.length > 0) {
    // Build the haystack once and reuse for both positive and negative
    // phrase matching — each does a substring check against title + tags.
    const haystack = [
      video.title.toLowerCase(),
      ...(video.tags ?? []).map((t) => t.toLowerCase()),
    ];
    if (factors.styleHints.length > 0) {
      const hit = factors.styleHints.some((h) =>
        haystack.some((s) => s.includes(h.toLowerCase()))
      );
      if (hit) score += 0.3;
    }
    if (factors.oppositeHints.length > 0) {
      const hit = factors.oppositeHints.some((h) =>
        haystack.some((s) => s.includes(h.toLowerCase()))
      );
      if (hit) score += OPPOSITE_HINT_PENALTY;
    }
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
