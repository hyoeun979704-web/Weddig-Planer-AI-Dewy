import { describe, it, expect } from "vitest";
import {
  LISTING_GUIDE,
  DEFAULT_LISTING_GUIDE,
  getListingGuide,
} from "./partnerListingGuide";

// DETAIL_SCHEMA(BusinessListingDetailForm) 와 동일한 업종 키 — 가이드 누락 방지.
const CATEGORIES = [
  "wedding_hall", "studio", "dress_shop", "makeup_shop", "hanbok",
  "tailor_shop", "honeymoon", "appliance", "jewelry", "invitation_venue",
];

describe("partnerListingGuide", () => {
  it("주요 업종 전부 가이드를 가진다(빈 항목 없음)", () => {
    for (const c of CATEGORIES) {
      const g = LISTING_GUIDE[c];
      expect(g, c).toBeDefined();
      expect(g.intro.length).toBeGreaterThan(0);
      expect(g.description.good.length).toBeGreaterThan(0);
      expect(g.description.bad.length).toBeGreaterThan(0);
      expect(g.description.placeholder.length).toBeGreaterThan(0);
      expect(g.keywordChips.length).toBeGreaterThan(0);
    }
  });

  it("getListingGuide — 미상/null/etc 는 기본 폴백(빈 신호 폴백)", () => {
    expect(getListingGuide(null)).toBe(DEFAULT_LISTING_GUIDE);
    expect(getListingGuide(undefined)).toBe(DEFAULT_LISTING_GUIDE);
    expect(getListingGuide("etc")).toBe(DEFAULT_LISTING_GUIDE);
    expect(getListingGuide("unknown_x")).toBe(DEFAULT_LISTING_GUIDE);
  });

  it("getListingGuide — 알려진 업종은 해당 가이드", () => {
    expect(getListingGuide("wedding_hall")).toBe(LISTING_GUIDE.wedding_hall);
  });
});
