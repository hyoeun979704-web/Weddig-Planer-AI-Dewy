import { describe, it, expect } from "vitest";
import {
  normalizeTipCategories,
  orderCategoriesByMatchCount,
} from "./tipNormalize";

describe("normalizeTipCategories", () => {
  it("returns empty for empty input", () => {
    expect(normalizeTipCategories([])).toEqual([]);
  });

  it("keeps a single 'general' as-is (it's the only signal)", () => {
    expect(normalizeTipCategories(["general"])).toEqual(["general"]);
  });

  it("keeps a single specific category as-is", () => {
    expect(normalizeTipCategories(["studio"])).toEqual(["studio"]);
  });

  it("drops 'general' when a specific category is present", () => {
    expect(normalizeTipCategories(["general", "studio"])).toEqual(["studio"]);
  });

  it("drops 'general' regardless of position in the array", () => {
    expect(normalizeTipCategories(["studio", "general"])).toEqual(["studio"]);
    expect(normalizeTipCategories(["studio", "general", "dress_shop"])).toEqual([
      "studio",
      "dress_shop",
    ]);
  });

  it("preserves order of non-general categories", () => {
    expect(
      normalizeTipCategories(["wedding_hall", "dress_shop", "hanbok"])
    ).toEqual(["wedding_hall", "dress_shop", "hanbok"]);
  });

  it("dedupes repeated slugs", () => {
    expect(normalizeTipCategories(["studio", "studio", "dress_shop"])).toEqual([
      "studio",
      "dress_shop",
    ]);
  });

  it("ignores empty strings", () => {
    expect(normalizeTipCategories(["", "studio", ""])).toEqual(["studio"]);
  });
});

describe("orderCategoriesByMatchCount", () => {
  const ORDER = [
    "general",
    "wedding_hall",
    "studio",
    "dress_shop",
    "makeup_shop",
    "hanbok",
  ];

  it("returns empty for empty map", () => {
    expect(orderCategoriesByMatchCount(new Map(), ORDER)).toEqual([]);
  });

  it("higher match count wins (the actual fix)", () => {
    // Dress matched 3 times, wedding-hall once → dress is primary.
    const m = new Map([
      ["wedding_hall", 1],
      ["dress_shop", 3],
      ["hanbok", 1],
    ]);
    expect(orderCategoriesByMatchCount(m, ORDER)).toEqual([
      "dress_shop",
      "wedding_hall",
      "hanbok",
    ]);
  });

  it("ties fall back to tiebreaker order (deterministic)", () => {
    // All tied at 1 — output follows ORDER: wedding_hall < studio < dress_shop.
    const m = new Map([
      ["dress_shop", 1],
      ["studio", 1],
      ["wedding_hall", 1],
    ]);
    expect(orderCategoriesByMatchCount(m, ORDER)).toEqual([
      "wedding_hall",
      "studio",
      "dress_shop",
    ]);
  });

  it("composes with normalizeTipCategories: drops 'general' even when it has matches", () => {
    // A general planning video that also incidentally hit a studio query.
    const m = new Map([
      ["general", 2],
      ["studio", 1],
    ]);
    const sorted = orderCategoriesByMatchCount(m, ORDER); // ['general', 'studio']
    expect(normalizeTipCategories(sorted)).toEqual(["studio"]);
  });

  it("unknown slug (not in tiebreaker) sorts after known ties", () => {
    const m = new Map([
      ["unknown_cat", 1],
      ["studio", 1],
    ]);
    expect(orderCategoriesByMatchCount(m, ORDER)).toEqual([
      "studio",
      "unknown_cat",
    ]);
  });
});
