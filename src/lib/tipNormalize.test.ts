import { describe, it, expect } from "vitest";
import { normalizeTipCategories } from "./tipNormalize";

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
