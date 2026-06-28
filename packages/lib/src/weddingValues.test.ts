import { describe, it, expect } from "vitest";
import {
  filterValidValueTags,
  VALID_VALUE_TAGS,
  WEDDING_VALUE_OPTIONS,
} from "./weddingValues";

describe("WEDDING_VALUE_OPTIONS", () => {
  it("contains unique keys", () => {
    const keys = WEDDING_VALUE_OPTIONS.map((o) => o.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every option has an AI context line", () => {
    for (const o of WEDDING_VALUE_OPTIONS) {
      expect(o.aiContext.length).toBeGreaterThan(10);
    }
  });

  it("VALID_VALUE_TAGS matches option keys", () => {
    for (const o of WEDDING_VALUE_OPTIONS) {
      expect(VALID_VALUE_TAGS.has(o.key)).toBe(true);
    }
  });
});

describe("filterValidValueTags", () => {
  it("drops unknown strings and non-strings", () => {
    expect(filterValidValueTags(["eco", "vegan", "bogus", 123, null])).toEqual([
      "eco",
      "vegan",
    ]);
  });

  it("returns [] for non-arrays", () => {
    expect(filterValidValueTags(null)).toEqual([]);
    expect(filterValidValueTags(undefined)).toEqual([]);
    expect(filterValidValueTags("eco")).toEqual([]);
    expect(filterValidValueTags({})).toEqual([]);
  });

  it("preserves order of valid tags", () => {
    expect(filterValidValueTags(["pet", "eco"])).toEqual(["pet", "eco"]);
  });
});
