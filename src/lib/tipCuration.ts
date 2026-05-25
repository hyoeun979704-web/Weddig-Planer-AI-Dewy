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

// Round 19 — PHASE_BOOSTS 사각지대 (ceremony 221건 / newlywed_home 108 / bridal_care 65
// / family_meeting 32 / legal_paperwork 20 — 코퍼스의 ~50%) 가 어느 phase 에서도 부스트
// 못 받아 순수 viewcount 로만 떠올라 페르소나 부적합 콘텐츠 상위 노출 회귀 (시뮬레이션
// S3 셀프웨딩 user 가 신혼집 7/10 받은 사례). 결혼 준비 D-day 와 의미상 광범위하게 관련된
// 카테고리들 cross-phase 부스트 별도 정의. phaseCategoriesFor 가 두 set 의 union 반환.
const CROSS_PHASE_BOOSTS: ReadonlyArray<{
  minDays: number;
  maxDays: number;
  categories: ReadonlyArray<string>;
}> = [
  // 신혼집 — 결혼 준비 전반 광범위 관련 (계약·인테리어·가구 6개월+ 소요 가능).
  { minDays: -90, maxDays: Infinity, categories: ["newlywed_home"] },
  // 결혼식 진행 — 식 4개월 전부터 식 당일까지 (식순/혼주 한복/축의/혼인신고 등).
  { minDays: 0, maxDays: 120, categories: ["ceremony"] },
  // 신부 관리 — 식 3개월 전부터 식 후 1개월까지 (다이어트·피부·시술).
  { minDays: -30, maxDays: 90, categories: ["bridal_care"] },
  // 상견례 — 식 5개월 ~ 1개월 전 (상견례 시기).
  { minDays: 30, maxDays: 150, categories: ["family_meeting"] },
  // 혼인신고 — 식 임박 + 식 후.
  { minDays: -30, maxDays: 60, categories: ["legal_paperwork"] },
  // 예단·예물 — 식 4개월 ~ 1개월 전.
  { minDays: 30, maxDays: 120, categories: ["wedding_gifts"] },
];

// Round 19 — 사전 확장 (시뮬레이션 P3: small 1.6%, self 4.3% hit rate 너무 낮음).
// 자주 쓰이는 동의어/변형 추가 → small/self user 가 자기 정체성 콘텐츠 더 자주 만남.
const STYLE_HINTS: Record<WeddingStyle, ReadonlyArray<string>> = {
  small: ["스몰", "스몰웨딩", "하우스", "한옥", "small", "소규모", "가족웨딩", "직계만", "하우스웨딩", "10명", "20명", "30명"],
  self: ["셀프", "직접", "self", "diy", "셀프웨딩", "셀프촬영", "직접만든", "노웨딩"],
  general: [],
  custom: [],
};

// Phrases that signal a video targets a wedding type DIFFERENT from the
// user's. Matching one in the title or tags mildly demotes the video so
// stylistically-aligned content of similar popularity rises above it —
// the user can still find the video by search, but it won't dominate
// their default feed.
//
// Round 19 — 토큰 정규화 (normalizeTok) 로 공백/하이픈 변형까지 매칭 ('셀프 웨딩' 도
// '셀프웨딩' 으로 normalize 되어 매칭). 시뮬레이션 P2: 이전엔 '셀프 웨딩' 공백 변형이
// hit 안 돼 셀프 웨딩드레스 영상이 general user top10 에 침투했던 회귀.
const STYLE_OPPOSITE_HINTS: Record<WeddingStyle, ReadonlyArray<string>> = {
  general: ["셀프웨딩", "diy웨딩", "스몰웨딩"],
  small: [],
  self: [],
  custom: [],
};

/** 공백/하이픈/언더스코어 제거 + 소문자. 토큰 사전과 haystack 양쪽에 적용해 변형 매칭. */
const normalizeTok = (s: string): string =>
  s.toLowerCase().replace(/[\s\-_]/g, "");

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
  // Round 19 — cross-phase 카테고리 union. dedupe 위해 Set.
  const cross = CROSS_PHASE_BOOSTS
    .filter((c) => days >= c.minDays && days < c.maxDays)
    .flatMap((c) => c.categories);
  const all = new Set<string>([...(phase?.categories ?? []), ...cross]);
  return Array.from(all);
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
  // Categories the user has already finished (venue booked, shoot done,
  // honeymoon paid for, etc). Videos in these categories are mildly
  // demoted — still findable, but they shouldn't dominate the feed when
  // the work is behind the user. See COMPLETED_PENALTY.
  completedCategories: ReadonlyArray<string>;
  hasSignal: boolean; // false → fall back to popularity sort
}

export function buildCurationFactors(
  profile: WeddingProfilePrefill,
  now: number = Date.now()
): CurationFactors {
  const rawPhase = phaseCategoriesFor(daysUntilWedding(profile.weddingDate, now));
  const excluded = profile.excludedCategories ?? [];
  const completed = profile.completedCategories ?? [];
  // Phase boost should never push a category the user opted out of OR has
  // already finished — e.g. a D-90 small-wedding user shouldn't see
  // "tailor_shop" boosted, and a D-200 user whose venue is booked
  // shouldn't see "wedding_hall" boosted either. The completed-category
  // penalty below handles ranking; this filter just prevents the
  // contradictory "boost + penalty on the same video" pile-up.
  const phase = (excluded.length > 0 || completed.length > 0)
    ? rawPhase.filter((c) => !excluded.includes(c) && !completed.includes(c))
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
    completedCategories: completed,
    // Personalization activates only when the user has expressed a
    // preference (date, style, exclusions, or completed schedule items).
    // Opposite hints are a *modifier* on existing ranking — they fire
    // when something else already triggers scoring, but on their own
    // they shouldn't override popularity for a brand-new profile that
    // hasn't set anything yet.
    hasSignal:
      phase.length > 0 ||
      style.length > 0 ||
      excluded.length > 0 ||
      completed.length > 0,
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

// Moderate demotion for categories the user has finished. Sized so it
// fully offsets a phase boost (+0.6) and outweighs the recency bonus
// (+0.15) — a completed-category video stays in the list but sinks
// below any phase-relevant content of similar popularity. Weaker than
// EXCLUDED_PENALTY so a viral completed-category video can still rise
// above an obscure unrelated one (the work is done, not unwanted).
const COMPLETED_PENALTY = -0.8;

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

  // Same primary-only check as excluded: a video tagged
  // [studio, wedding_hall, makeup_shop] is "primarily about studios", so
  // a user who has finished studio gets it demoted even if wedding_hall
  // is still pending. Keeps the demotion crisp and predictable.
  if (factors.completedCategories.length > 0) {
    const primary = video.categories[0];
    if (primary && factors.completedCategories.includes(primary)) {
      score += COMPLETED_PENALTY;
    }
  }

  // Round 19 — primary phase 매칭이면 full boost, secondary 만 매칭이면 half. 시뮬레이션
  // P4 회귀: 멀티카테고리 영상 [ceremony, wedding_hall, hanbok] 이 wedding_hall phase
  // boost 흡수해 ceremony 영상이 상위 노출. primary 가 phase 카테고리일 때만 강하게 boost.
  // 또 P0 회귀 (셀프 user 가 신혼집만 봄) 대응 — 0.6 → 0.9 강화로 viewcount 차 이기게.
  if (factors.phaseCategories.length > 0) {
    const primary = video.categories[0];
    if (primary && factors.phaseCategories.includes(primary)) {
      score += 0.9;
    } else if (video.categories.some((c) => factors.phaseCategories.includes(c))) {
      score += 0.4;
    }
  }

  if (factors.styleHints.length > 0 || factors.oppositeHints.length > 0) {
    // Round 19 — normalizeTok 으로 공백/하이픈 변형 매칭. 이전엔 '셀프 웨딩' (공백)
    // 같은 변형이 '셀프웨딩' opp_hint 와 매칭 안 돼 회귀 발생.
    const haystackRaw = [video.title, ...(video.tags ?? [])];
    const haystackNorm = haystackRaw.map(normalizeTok);
    if (factors.styleHints.length > 0) {
      const hit = factors.styleHints.some((h) => {
        const nh = normalizeTok(h);
        return haystackNorm.some((s) => s.includes(nh));
      });
      // P3 강화: style hit 0.3 → 0.5. small/self user 가 자기 정체성 콘텐츠 더 강하게 받음.
      if (hit) score += 0.5;
    }
    if (factors.oppositeHints.length > 0) {
      const hit = factors.oppositeHints.some((h) => {
        const nh = normalizeTok(h);
        return haystackNorm.some((s) => s.includes(nh));
      });
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
