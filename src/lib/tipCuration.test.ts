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
