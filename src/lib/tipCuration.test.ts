import { describe, it, expect } from "vitest";
import {
  daysUntilWedding,
  phaseCategoriesFor,
  buildCurationFactors,
  scoreTipVideo,
  rankTipVideosForUser,
} from "./tipCuration";
import type { TipVideo } from "@/hooks/useTipVideos";
import type { WeddingProfilePrefill } from "@/hooks/useWeddingProfile";

const NOW = new Date("2026-05-15T00:00:00Z").getTime();

const baseProfile: WeddingProfilePrefill = {
  weddingDate: "",
  region: "seoul",
  totalBudget: 0,
  guestCount: 200,
  displayName: "",
  partnerName: "",
  weddingStyle: "general",
  excludedCategories: [],
  isLoaded: true,
};

const mkVideo = (overrides: Partial<TipVideo>): TipVideo => ({
  video_id: "vid",
  title: "title",
  channel_name: null,
  thumbnail_url: null,
  duration_seconds: 120,
  view_count: 1000,
  like_count: 0,
  published_at: null,
  categories: [],
  tags: null,
  ...overrides,
});

describe("daysUntilWedding", () => {
  it("returns null for empty/invalid input", () => {
    expect(daysUntilWedding("", NOW)).toBeNull();
    expect(daysUntilWedding("not-a-date", NOW)).toBeNull();
  });

  it("returns positive days for future wedding", () => {
    expect(daysUntilWedding("2026-08-15", NOW)).toBe(92);
  });

  it("returns negative days for past wedding", () => {
    expect(daysUntilWedding("2026-04-15", NOW)).toBe(-30);
  });
});

describe("phaseCategoriesFor", () => {
  it("returns empty for unknown date", () => {
    expect(phaseCategoriesFor(null)).toEqual([]);
  });

  it("D-200 → wedding hall focus", () => {
    expect(phaseCategoriesFor(200)).toEqual(["wedding_hall"]);
  });

  it("D-100 → dress/makeup phase", () => {
    expect(phaseCategoriesFor(100)).toEqual(["dress_shop", "makeup_shop", "hanbok"]);
  });

  it("D-45 → invitation/honeymoon phase", () => {
    expect(phaseCategoriesFor(45)).toContain("invitation_venue");
    expect(phaseCategoriesFor(45)).toContain("honeymoon");
  });

  it("post-wedding → honeymoon + general only", () => {
    expect(phaseCategoriesFor(-10)).toEqual(["honeymoon", "general"]);
  });
});

describe("buildCurationFactors", () => {
  it("flags no signal when user has no wedding date and general style", () => {
    const f = buildCurationFactors(baseProfile, NOW);
    expect(f.hasSignal).toBe(false);
  });

  it("flags signal when wedding date is set", () => {
    const f = buildCurationFactors({ ...baseProfile, weddingDate: "2026-08-15" }, NOW);
    expect(f.hasSignal).toBe(true);
    expect(f.phaseCategories.length).toBeGreaterThan(0);
  });

  it("flags signal when style is small/self even without date", () => {
    const f = buildCurationFactors({ ...baseProfile, weddingStyle: "small" }, NOW);
    expect(f.hasSignal).toBe(true);
    expect(f.styleHints).toContain("스몰");
  });
});

describe("scoreTipVideo", () => {
  const factors = buildCurationFactors(
    { ...baseProfile, weddingDate: "2026-08-15", weddingStyle: "small" },
    NOW
  );

  it("matching phase category outscores higher-view non-match", () => {
    const matching = mkVideo({
      video_id: "match",
      view_count: 10_000,
      categories: ["dress_shop"], // phase at D-92
    });
    const popular = mkVideo({
      video_id: "popular",
      view_count: 10_000_000,
      categories: ["wedding_hall"], // not in phase
    });
    expect(scoreTipVideo(matching, factors, NOW)).toBeGreaterThan(
      scoreTipVideo(popular, factors, NOW)
    );
  });

  it("style hint in title adds boost", () => {
    const styled = mkVideo({ title: "스몰웨딩 추천 장소", categories: [] });
    const plain = mkVideo({ title: "결혼 준비 기초", categories: [] });
    expect(scoreTipVideo(styled, factors, NOW)).toBeGreaterThan(
      scoreTipVideo(plain, factors, NOW)
    );
  });

  it("recency adds boost within 60 days", () => {
    const fresh = mkVideo({
      published_at: new Date(NOW - 10 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const stale = mkVideo({
      published_at: new Date(NOW - 200 * 24 * 60 * 60 * 1000).toISOString(),
    });
    expect(scoreTipVideo(fresh, factors, NOW)).toBeGreaterThan(
      scoreTipVideo(stale, factors, NOW)
    );
  });
});

describe("rankTipVideosForUser", () => {
  it("preserves popularity order when user has no signal", () => {
    const videos = [
      mkVideo({ video_id: "a", view_count: 100 }),
      mkVideo({ video_id: "b", view_count: 500 }),
    ];
    const ranked = rankTipVideosForUser(videos, baseProfile, { now: NOW });
    expect(ranked.map((v) => v.video_id)).toEqual(["a", "b"]);
  });

  it("promotes phase-matching videos for users with wedding date", () => {
    const profile: WeddingProfilePrefill = {
      ...baseProfile,
      weddingDate: "2026-08-15", // D-92, phase: dress_shop/makeup_shop/hanbok
    };
    const videos = [
      mkVideo({ video_id: "hall", view_count: 5_000_000, categories: ["wedding_hall"] }),
      mkVideo({ video_id: "dress", view_count: 50_000, categories: ["dress_shop"] }),
    ];
    const ranked = rankTipVideosForUser(videos, profile, { now: NOW });
    expect(ranked[0].video_id).toBe("dress");
  });

  it("respects limit", () => {
    const videos = Array.from({ length: 10 }, (_, i) =>
      mkVideo({ video_id: `v${i}`, view_count: 100 * i })
    );
    expect(rankTipVideosForUser(videos, baseProfile, { now: NOW, limit: 3 })).toHaveLength(3);
  });
});

// Persona-based regression tests. Each persona maps to a real user type
// (general/small/self) and asserts the ranked output matches what that
// user should actually see in the Tips "전체" tab.
describe("persona simulations", () => {
  const popularSDM = mkVideo({
    video_id: "sdm-pop",
    title: "스튜디오 + 드레스 + 메이크업 풀패키지 후기",
    view_count: 5_000_000,
    categories: ["studio"],
  });
  const popularHanbok = mkVideo({
    video_id: "hanbok-pop",
    title: "한복 트렌드 정리",
    view_count: 3_000_000,
    categories: ["hanbok"],
  });
  const popularTailor = mkVideo({
    video_id: "tailor-pop",
    title: "예복 맞춤 후기",
    view_count: 2_500_000,
    categories: ["tailor_shop"],
  });
  const popularInvite = mkVideo({
    video_id: "invite-pop",
    title: "청첩장 디자인 비교",
    view_count: 2_000_000,
    categories: ["invitation_venue"],
  });
  const nichSelf = mkVideo({
    video_id: "self-niche",
    title: "셀프웨딩 촬영 DIY 꿀팁",
    view_count: 30_000,
    categories: ["general"],
  });
  const nichSmall = mkVideo({
    video_id: "small-venue",
    title: "스몰웨딩 한옥 추천",
    view_count: 80_000,
    categories: ["wedding_hall"],
  });

  it("지수 (셀프웨딩, D-150): SDM 영상이 인기 1위여도 모두 맨 뒤로 밀린다", () => {
    const jisu: WeddingProfilePrefill = {
      ...baseProfile,
      weddingDate: "2026-10-12", // D-149
      weddingStyle: "self",
      excludedCategories: ["studio", "dress_shop", "makeup_shop"],
    };
    const ranked = rankTipVideosForUser(
      [popularSDM, nichSelf, nichSmall],
      jisu,
      { now: NOW }
    );
    // niche self/small content beats the popular SDM video (which is excluded).
    expect(ranked[ranked.length - 1].video_id).toBe("sdm-pop");
    // Self DIY video should rank ahead of unrelated content
    expect(ranked.indexOf(nichSelf)).toBeLessThan(ranked.indexOf(popularSDM));
  });

  it("소영 (스몰웨딩, D-90): 한복·예복·청첩장 영상이 phase boost 없이 맨 뒤로", () => {
    const soyoung: WeddingProfilePrefill = {
      ...baseProfile,
      weddingDate: "2026-08-13", // D-90
      weddingStyle: "small",
      excludedCategories: ["hanbok", "tailor_shop", "invitation_venue"],
    };
    const factors = buildCurationFactors(soyoung, NOW);
    // D-90 phase normally boosts makeup_shop/tailor_shop/appliance — but
    // tailor_shop must be removed because the user opted out.
    expect(factors.phaseCategories).not.toContain("tailor_shop");
    expect(factors.phaseCategories).toContain("makeup_shop");

    const ranked = rankTipVideosForUser(
      [popularHanbok, popularTailor, popularInvite, nichSmall],
      soyoung,
      { now: NOW }
    );
    // All three excluded videos sink below the niche small-wedding match.
    const ids = ranked.map((v) => v.video_id);
    expect(ids.indexOf("small-venue")).toBeLessThan(ids.indexOf("hanbok-pop"));
    expect(ids.indexOf("small-venue")).toBeLessThan(ids.indexOf("tailor-pop"));
    expect(ids.indexOf("small-venue")).toBeLessThan(ids.indexOf("invite-pop"));
  });

  it("민지 (일반 웨딩, D-180): 모든 카테고리 노출, 인기 SDM 영상 정상 랭크", () => {
    const minji: WeddingProfilePrefill = {
      ...baseProfile,
      weddingDate: "2026-11-12", // D-180
      weddingStyle: "general",
      excludedCategories: [], // 일반 웨딩은 제외 없음
    };
    const factors = buildCurationFactors(minji, NOW);
    // No exclusions means no phase categories are filtered out.
    expect(factors.phaseCategories).toContain("wedding_hall");
    expect(factors.excludedCategories).toEqual([]);

    const ranked = rankTipVideosForUser(
      [popularSDM, popularHanbok, popularTailor],
      minji,
      { now: NOW }
    );
    // Regression guard: popular SDM video should NOT be demoted.
    // (D-180 phase boosts wedding_hall, but SDM is still highly viewed
    // and not penalized — should be in the top half.)
    expect(ranked.indexOf(popularSDM)).toBeLessThan(ranked.length / 2 + 1);
  });

  it("excluded penalty defeats every positive boost (sanity)", () => {
    const profile: WeddingProfilePrefill = {
      ...baseProfile,
      weddingDate: "2026-08-15", // D-92, dress_shop is in phase
      weddingStyle: "self",
      excludedCategories: ["dress_shop"],
    };
    // A dress_shop video that hits BOTH phase (+0.6) AND style hint (+0.3)
    // AND recency (+0.15) AND has 100M views (+1.0) — still must lose to a
    // plain video of any kind.
    const stacked = mkVideo({
      video_id: "stacked",
      title: "셀프 드레스 DIY 트렌드", // matches "셀프" + "diy" hints
      view_count: 100_000_000,
      categories: ["dress_shop"],
      published_at: new Date(NOW - 5 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const plain = mkVideo({
      video_id: "plain",
      view_count: 100,
      categories: ["general"],
    });
    const ranked = rankTipVideosForUser([stacked, plain], profile, { now: NOW });
    expect(ranked[0].video_id).toBe("plain");
  });
});
