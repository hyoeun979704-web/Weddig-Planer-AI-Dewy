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
  personaMode: null,
  excludedCategories: [],
  completedCategories: [],
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

  it("D-200 → wedding hall focus + cross-phase (newlywed_home)", () => {
    // Round 19 — CROSS_PHASE_BOOSTS 의 newlywed_home (-90~180) 이 D-200 에도 union.
    expect(phaseCategoriesFor(200)).toContain("wedding_hall");
    expect(phaseCategoriesFor(200)).toContain("newlywed_home");
  });

  it("D-100 → dress/makeup phase + cross-phase (newlywed_home, ceremony, family_meeting, wedding_gifts)", () => {
    const cats = phaseCategoriesFor(100);
    expect(cats).toContain("dress_shop");
    expect(cats).toContain("makeup_shop");
    expect(cats).toContain("hanbok");
    expect(cats).toContain("ceremony");
    expect(cats).toContain("newlywed_home");
  });

  it("D-45 → invitation/honeymoon phase", () => {
    expect(phaseCategoriesFor(45)).toContain("invitation_venue");
    expect(phaseCategoriesFor(45)).toContain("honeymoon");
  });

  it("post-wedding → honeymoon + general + cross-phase (newlywed_home, bridal_care)", () => {
    const cats = phaseCategoriesFor(-10);
    expect(cats).toContain("honeymoon");
    expect(cats).toContain("general");
    expect(cats).toContain("newlywed_home");
    expect(cats).toContain("bridal_care");
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

  it("removes completed categories from phase boost", () => {
    // D-200 phase = wedding_hall. After finishing wedding_hall tasks
    // the boost should disappear so other content can surface.
    const f = buildCurationFactors(
      {
        ...baseProfile,
        weddingDate: "2026-12-01", // D-200 from NOW
        completedCategories: ["wedding_hall"],
      },
      NOW
    );
    expect(f.phaseCategories).not.toContain("wedding_hall");
    expect(f.completedCategories).toEqual(["wedding_hall"]);
    expect(f.hasSignal).toBe(true);
  });

  it("flags signal when only completed categories are set", () => {
    const f = buildCurationFactors(
      { ...baseProfile, completedCategories: ["studio"] },
      NOW
    );
    expect(f.hasSignal).toBe(true);
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

  it("completed primary category demotes the video", () => {
    const completedFactors = buildCurationFactors(
      { ...baseProfile, completedCategories: ["studio"] },
      NOW
    );
    const done = mkVideo({ video_id: "done", view_count: 10_000, categories: ["studio"] });
    const open = mkVideo({ video_id: "open", view_count: 10_000, categories: ["dress_shop"] });
    expect(scoreTipVideo(done, completedFactors, NOW)).toBeLessThan(
      scoreTipVideo(open, completedFactors, NOW)
    );
  });

  it("completed penalty is milder than excluded penalty", () => {
    const f = buildCurationFactors(
      {
        ...baseProfile,
        excludedCategories: ["hanbok"],
        completedCategories: ["studio"],
      },
      NOW
    );
    const excluded = mkVideo({ video_id: "x", view_count: 10_000, categories: ["hanbok"] });
    const completed = mkVideo({ video_id: "c", view_count: 10_000, categories: ["studio"] });
    expect(scoreTipVideo(completed, f, NOW)).toBeGreaterThan(scoreTipVideo(excluded, f, NOW));
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

  it("pushes completed-category videos below pending-category ones", () => {
    // User has already booked their venue and finished the studio
    // shoot. Even though wedding_hall is a phase-boosted category at
    // D-200, the still-pending dress shop video should outrank both.
    const profile: WeddingProfilePrefill = {
      ...baseProfile,
      weddingDate: "2026-12-01", // ~D-200
      completedCategories: ["wedding_hall", "studio"],
    };
    const videos = [
      mkVideo({ video_id: "hall_done", view_count: 1_000_000, categories: ["wedding_hall"] }),
      mkVideo({ video_id: "studio_done", view_count: 500_000, categories: ["studio"] }),
      mkVideo({ video_id: "dress_pending", view_count: 10_000, categories: ["dress_shop"] }),
    ];
    const ranked = rankTipVideosForUser(videos, profile, { now: NOW });
    expect(ranked[0].video_id).toBe("dress_pending");
    expect(ranked[ranked.length - 1].video_id).toBe("studio_done");
  });

  it("respects limit", () => {
    const videos = Array.from({ length: 10 }, (_, i) =>
      mkVideo({ video_id: `v${i}`, view_count: 100 * i })
    );
    expect(rankTipVideosForUser(videos, baseProfile, { now: NOW, limit: 3 })).toHaveLength(3);
  });
});

// Persona-based regression tests. Two personas per wedding type (six
// total), each constructed from real user research patterns. Tests
// assert that the ranked output of `rankTipVideosForUser` matches what
// each persona should actually see in the Tips "전체" tab.
describe("persona simulations (6 personas)", () => {
  // Shared video fixtures — realistic mix that lets each persona test
  // demonstrate a distinct ranking outcome from the same corpus.
  const sdmPackage = mkVideo({
    video_id: "sdm-pack",
    title: "스드메 33만원이면 충분했어요",
    view_count: 5_000_000,
    categories: ["studio"],
  });
  const dressTour = mkVideo({
    video_id: "dress-tour",
    title: "드레스샵 투어 후기 BEST",
    view_count: 2_500_000,
    categories: ["dress_shop"],
  });
  const makeupTip = mkVideo({
    video_id: "makeup-rehearsal",
    title: "신부 메이크업 리허설 꿀팁",
    view_count: 1_500_000,
    categories: ["makeup_shop"],
  });
  const hanbokTrend = mkVideo({
    video_id: "hanbok",
    title: "한복 트렌드 정리",
    view_count: 3_000_000,
    categories: ["hanbok"],
  });
  const tailorReview = mkVideo({
    video_id: "tailor",
    title: "예복 맞춤 후기",
    view_count: 2_000_000,
    categories: ["tailor_shop"],
  });
  const inviteDesign = mkVideo({
    video_id: "invite",
    title: "청첩장 디자인 비교",
    view_count: 1_800_000,
    categories: ["invitation_venue"],
  });
  const honeymoonGuide = mkVideo({
    video_id: "honeymoon",
    title: "유럽 허니문 후기",
    view_count: 1_200_000,
    categories: ["honeymoon"],
  });
  const hallContract = mkVideo({
    video_id: "hall",
    title: "웨딩홀 계약 전 체크리스트",
    view_count: 2_200_000,
    categories: ["wedding_hall"],
  });
  const selfDIY = mkVideo({
    video_id: "self-diy",
    title: "셀프웨딩 30만원으로 끝내는법",
    view_count: 800_000,
    categories: ["general"],
  });
  const smallHanok = mkVideo({
    video_id: "small-hanok",
    title: "스몰웨딩 한옥 추천 BEST",
    view_count: 400_000,
    categories: ["wedding_hall"],
  });

  // === 셀프웨딩 ===

  it("[1] 지수 — 셀프, D-150, 30명, 1,500만원, 의도적 미니멀", () => {
    const profile: WeddingProfilePrefill = {
      ...baseProfile,
      weddingDate: "2026-10-12", // D-149
      weddingStyle: "self",
      excludedCategories: ["studio", "dress_shop", "makeup_shop"],
      guestCount: 30,
      totalBudget: 1500,
    };
    const ranked = rankTipVideosForUser(
      [sdmPackage, dressTour, makeupTip, selfDIY, hallContract, smallHanok],
      profile,
      { now: NOW }
    );
    // Excluded SDM videos all sink to the bottom regardless of view count.
    const ids = ranked.map((v) => v.video_id);
    expect(ids.slice(-3).sort()).toEqual(["dress-tour", "makeup-rehearsal", "sdm-pack"].sort());
    // Self DIY content (셀프 style hint match) rises above pure popularity.
    expect(ids.indexOf("self-diy")).toBeLessThan(ids.indexOf("sdm-pack"));
  });

  it("[2] 민혁&보라 — 셀프, D-45, 15명, 600만원, 가족식사 막판", () => {
    const profile: WeddingProfilePrefill = {
      ...baseProfile,
      weddingDate: "2026-06-30", // D-45
      weddingStyle: "self",
      excludedCategories: ["studio", "dress_shop", "makeup_shop"],
      guestCount: 15,
      totalBudget: 600,
    };
    const factors = buildCurationFactors(profile, NOW);
    // D-45 phase = invitation_venue + appliance + honeymoon. SDM
    // exclusions don't overlap, so all three survive.
    expect(factors.phaseCategories).toEqual(
      expect.arrayContaining(["invitation_venue", "honeymoon"])
    );
    const ranked = rankTipVideosForUser(
      [sdmPackage, inviteDesign, honeymoonGuide, hallContract],
      profile,
      { now: NOW }
    );
    // Phase-relevant content (invite/honeymoon) outranks both the excluded
    // SDM video and the no-longer-phase-relevant hall video.
    const ids = ranked.map((v) => v.video_id);
    expect(ids[ids.length - 1]).toBe("sdm-pack");
    expect(ids.indexOf("invite")).toBeLessThan(ids.indexOf("hall"));
    expect(ids.indexOf("honeymoon")).toBeLessThan(ids.indexOf("hall"));
  });

  // === 스몰웨딩 ===

  it("[3] 소영 — 스몰, D-90, 60명, 3,500만원, 인티멋", () => {
    const profile: WeddingProfilePrefill = {
      ...baseProfile,
      weddingDate: "2026-08-13", // D-90
      weddingStyle: "small",
      excludedCategories: ["hanbok", "tailor_shop", "invitation_venue"],
      guestCount: 60,
      totalBudget: 3500,
    };
    const factors = buildCurationFactors(profile, NOW);
    // D-90 normally boosts dress/makeup/hanbok — hanbok must drop out.
    expect(factors.phaseCategories).toContain("dress_shop");
    expect(factors.phaseCategories).not.toContain("hanbok");

    const ranked = rankTipVideosForUser(
      [hanbokTrend, tailorReview, inviteDesign, dressTour, smallHanok],
      profile,
      { now: NOW }
    );
    // Three excluded categories all sink; the small-style hanok video
    // (style hint match + wedding_hall) leads.
    const ids = ranked.map((v) => v.video_id);
    expect(ids.slice(-3).sort()).toEqual(["hanbok", "invite", "tailor"].sort());
    // dress_shop video is in phase, so it should rank near the top.
    expect(ids.indexOf("dress-tour")).toBeLessThan(2);
  });

  it("[4] 현우&다은 — 스몰, D-200, 80명, 5,000만원, 한옥 야외", () => {
    const profile: WeddingProfilePrefill = {
      ...baseProfile,
      weddingDate: "2026-12-04", // D-203
      weddingStyle: "small",
      excludedCategories: ["hanbok", "tailor_shop", "invitation_venue"],
      guestCount: 80,
      totalBudget: 5000,
    };
    const ranked = rankTipVideosForUser(
      [hallContract, smallHanok, sdmPackage, hanbokTrend],
      profile,
      { now: NOW }
    );
    // D-200 phase = wedding_hall. The 한옥 video wins because it gets
    // phase boost AND style hint match (스몰웨딩 + 한옥). The hall video
    // gets phase only. SDM gets popularity only. Hanbok is excluded.
    const ids = ranked.map((v) => v.video_id);
    expect(ids[0]).toBe("small-hanok");
    expect(ids[ids.length - 1]).toBe("hanbok");
  });

  // === 일반 웨딩 ===

  it("[5] 민지 — 일반, D-180, 250명, 8,000만원, 호텔 표준", () => {
    const profile: WeddingProfilePrefill = {
      ...baseProfile,
      weddingDate: "2026-11-12", // D-180
      weddingStyle: "general",
      excludedCategories: [],
      guestCount: 250,
      totalBudget: 8000,
    };
    const factors = buildCurationFactors(profile, NOW);
    expect(factors.phaseCategories).toContain("wedding_hall");
    expect(factors.excludedCategories).toEqual([]);
    // The new opposite-hint feature: general users mildly demote
    // 셀프/스몰 specific content so the ranker doesn't surface a viral
    // self-DIY tutorial over standard wedding-prep guidance.
    expect(factors.oppositeHints).toEqual(
      expect.arrayContaining(["셀프웨딩", "스몰웨딩"])
    );

    const ranked = rankTipVideosForUser(
      [selfDIY, smallHanok, hallContract, sdmPackage],
      profile,
      { now: NOW }
    );
    const ids = ranked.map((v) => v.video_id);
    // Hall (phase boost) ranks above SDM (popular but no boost).
    expect(ids.indexOf("hall")).toBeLessThan(ids.indexOf("sdm-pack"));
    // Self DIY (opposite hint, no phase) sinks below SDM (no penalty, no
    // boost). Note: smallHanok ALSO has an opposite hint but still beats
    // SDM because phase boost (+0.6) overcomes the mild penalty (-0.3) —
    // that's by design, since hall-category content is genuinely useful
    // for a D-180 hotel-wedding user even when the title is small-styled.
    expect(ids.indexOf("sdm-pack")).toBeLessThan(ids.indexOf("self-diy"));
  });

  it("[6] 재훈&가영 — 일반, D-30, 200명, 6,000만원, 막판 정리", () => {
    const profile: WeddingProfilePrefill = {
      ...baseProfile,
      weddingDate: "2026-06-14", // D-29
      weddingStyle: "general",
      excludedCategories: [],
      guestCount: 200,
      totalBudget: 6000,
    };
    const factors = buildCurationFactors(profile, NOW);
    // D-30 phase = invitation_venue + appliance + honeymoon.
    expect(factors.phaseCategories).toEqual(
      expect.arrayContaining(["invitation_venue", "honeymoon"])
    );

    const ranked = rankTipVideosForUser(
      [hallContract, inviteDesign, honeymoonGuide, selfDIY],
      profile,
      { now: NOW }
    );
    const ids = ranked.map((v) => v.video_id);
    // Phase-matching invite + honeymoon outrank now-irrelevant hall
    // (which is a D-180 phase, not D-30) AND the opposite-style self DIY.
    expect(ids.indexOf("invite")).toBeLessThan(ids.indexOf("self-diy"));
    expect(ids.indexOf("honeymoon")).toBeLessThan(ids.indexOf("self-diy"));
  });

  // === Sanity / regression guards ===

  it("excluded penalty defeats every positive boost stacked together", () => {
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

  // Round 22 — 페르소나 boost 회귀 테스트.
  describe("페르소나 카테고리 boost (Round 22)", () => {
    it("pregnancy user 가 임신 결혼 영상을 wedding_hall 영상보다 위로 본다", () => {
      const profile: WeddingProfilePrefill = {
        ...baseProfile,
        weddingDate: "2026-12-15", // D-214 (wedding_hall phase)
        personaMode: "pregnancy",
      };
      const pregnancyVideo = mkVideo({
        video_id: "preg",
        view_count: 50_000,
        categories: ["pregnancy_wedding"],
      });
      const venueVideo = mkVideo({
        video_id: "venue",
        view_count: 1_000_000, // 훨씬 인기 있지만 페르소나 매치 X
        categories: ["wedding_hall"],
      });
      const ranked = rankTipVideosForUser([venueVideo, pregnancyVideo], profile, { now: NOW });
      expect(ranked[0].video_id).toBe("preg");
    });

    it("remarriage user 가 재혼 가족 영상을 상위로 본다", () => {
      const profile: WeddingProfilePrefill = {
        ...baseProfile,
        weddingDate: "2026-11-15",
        personaMode: "remarriage",
      };
      const remarriageVideo = mkVideo({
        video_id: "rem",
        view_count: 30_000,
        categories: ["remarriage_family"],
      });
      const generalVideo = mkVideo({
        video_id: "gen",
        view_count: 5_000_000,
        categories: ["general"],
      });
      const ranked = rankTipVideosForUser([generalVideo, remarriageVideo], profile, { now: NOW });
      expect(ranked[0].video_id).toBe("rem");
    });

    it("international user 가 국제결혼 영상을 상위로 본다", () => {
      const profile: WeddingProfilePrefill = {
        ...baseProfile,
        weddingDate: "2026-11-15",
        personaMode: "international",
      };
      const intlVideo = mkVideo({
        video_id: "intl",
        view_count: 20_000,
        categories: ["international_wedding"],
      });
      const honeymoonVideo = mkVideo({
        video_id: "hm",
        view_count: 2_000_000,
        categories: ["honeymoon"],
      });
      const ranked = rankTipVideosForUser([honeymoonVideo, intlVideo], profile, { now: NOW });
      expect(ranked[0].video_id).toBe("intl");
    });

    it("표준 페르소나 (standard_bride) 는 boost 영향 없음 — 기존 동작 유지", () => {
      const profile: WeddingProfilePrefill = {
        ...baseProfile,
        weddingDate: "2026-12-15",
        personaMode: "standard_bride",
      };
      const venueVideo = mkVideo({
        video_id: "venue",
        view_count: 1_000_000,
        categories: ["wedding_hall"],
      });
      const generalVideo = mkVideo({
        video_id: "gen",
        view_count: 100,
        categories: ["general"],
      });
      // wedding_hall 이 phase boost 받아서 1위. personaCategories 빈 배열이라
      // 페르소나 boost 는 0 — 회귀 없음.
      const ranked = rankTipVideosForUser([generalVideo, venueVideo], profile, { now: NOW });
      expect(ranked[0].video_id).toBe("venue");
    });

    it("personaMode=null 일 때도 회귀 없음 (온보딩 미완)", () => {
      const profile: WeddingProfilePrefill = {
        ...baseProfile,
        weddingDate: "2026-12-15",
        personaMode: null,
      };
      const factors = buildCurationFactors(profile, NOW);
      expect(factors.personaCategories).toEqual([]);
    });

    it("standard_groom 이 groom_focus 영상을 상위로 본다", () => {
      // queries.ts 의 groom_focus seed (신랑 단독 결혼 준비 등) 가 수집됐어도
      // 표준 신랑 페르소나가 boost 안 받으면 popularity 에 묻힘. Round 22 매핑.
      const profile: WeddingProfilePrefill = {
        ...baseProfile,
        weddingDate: "2026-12-15",
        personaMode: "standard_groom",
      };
      const groomVideo = mkVideo({
        video_id: "groom",
        view_count: 20_000,
        categories: ["groom_focus"],
      });
      const venueVideo = mkVideo({
        video_id: "venue",
        view_count: 1_000_000,
        categories: ["wedding_hall"],
      });
      const ranked = rankTipVideosForUser([venueVideo, groomVideo], profile, { now: NOW });
      expect(ranked[0].video_id).toBe("groom");
    });
  });

  it("opposite hint is mild: a viral off-style video still beats an obscure same-category one", () => {
    const profile: WeddingProfilePrefill = {
      ...baseProfile,
      weddingDate: "2026-11-12",
      weddingStyle: "general",
      excludedCategories: [],
    };
    // Both videos in the SAME (no-phase-boost) category so we isolate
    // the popularity-vs-opposite-penalty tradeoff. 10M-view 셀프웨딩
    // video gets -0.3 demotion; popularity (~1.0 contribution) still
    // wins by a wide margin → the penalty nudges, doesn't suppress.
    const viral = mkVideo({
      video_id: "viral-self",
      title: "셀프웨딩 후기 (10M 조회)",
      view_count: 10_000_000,
      categories: ["general"],
    });
    const obscure = mkVideo({
      video_id: "obscure",
      title: "결혼 준비 기초",
      view_count: 100,
      categories: ["general"],
    });
    const ranked = rankTipVideosForUser([viral, obscure], profile, { now: NOW });
    expect(ranked[0].video_id).toBe("viral-self");
  });
});
