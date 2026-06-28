import { describe, it, expect } from "vitest";
import {
  PLACE_VALUE_TAG_OPTIONS,
  extractValueTags,
  isValueTag,
} from "./placeValueTags";

describe("PLACE_VALUE_TAG_OPTIONS", () => {
  it("has unique values", () => {
    const values = PLACE_VALUE_TAG_OPTIONS.map((o) => o.value);
    expect(new Set(values).size).toBe(values.length);
  });

  it("every option exposes label + hint", () => {
    for (const o of PLACE_VALUE_TAG_OPTIONS) {
      expect(o.label.length).toBeGreaterThan(0);
      expect(o.hint.length).toBeGreaterThan(0);
    }
  });
});

describe("isValueTag", () => {
  it("returns true only for known value tag strings", () => {
    expect(isValueTag("친환경")).toBe(true);
    expect(isValueTag("비건옵션")).toBe(true);
    expect(isValueTag("호텔웨딩")).toBe(false);
    expect(isValueTag("")).toBe(false);
  });
});

describe("extractValueTags", () => {
  it("returns [] for null/undefined/[]", () => {
    expect(extractValueTags(null)).toEqual([]);
    expect(extractValueTags(undefined)).toEqual([]);
    expect(extractValueTags([])).toEqual([]);
  });

  it("picks only the value-tag entries and preserves order", () => {
    const result = extractValueTags(["호텔웨딩", "친환경", "뷔페", "반려동물"]);
    expect(result.map((o) => o.value)).toEqual(["친환경", "반려동물"]);
  });

  it("de-duplicates repeated value tags", () => {
    const result = extractValueTags(["친환경", "비건옵션", "친환경"]);
    expect(result.map((o) => o.value)).toEqual(["친환경", "비건옵션"]);
  });
});
