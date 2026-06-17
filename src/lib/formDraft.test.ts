import { describe, it, expect, beforeEach } from "vitest";
import { draftKey, loadDraft, saveDraft, clearDraft, shallowEqual, jsonEqual } from "./formDraft";

describe("draftKey", () => {
  it("namespaces by scope and userId", () => {
    expect(draftKey("biz-listing", "u1")).toBe("dewy:draft:biz-listing:u1");
  });
  it("falls back to anon when userId missing", () => {
    expect(draftKey("biz-listing", null)).toBe("dewy:draft:biz-listing:anon");
    expect(draftKey("biz-listing", undefined)).toBe("dewy:draft:biz-listing:anon");
  });
});

describe("shallowEqual", () => {
  it("true for equal flat objects", () => {
    expect(shallowEqual({ a: "1", b: "2" }, { a: "1", b: "2" })).toBe(true);
  });
  it("false when a value or key differs", () => {
    expect(shallowEqual({ a: "1" }, { a: "2" })).toBe(false);
    expect(shallowEqual({ a: "1" }, { a: "1", b: "2" })).toBe(false);
  });
});

describe("jsonEqual", () => {
  it("compares nested objects/arrays", () => {
    expect(jsonEqual({ a: [1, 2], b: { c: 3 } }, { a: [1, 2], b: { c: 3 } })).toBe(true);
    expect(jsonEqual({ a: [1, 2] }, { a: [1, 3] })).toBe(false);
  });
  it("false on different shapes", () => {
    expect(jsonEqual({ x: 1 }, {})).toBe(false);
  });
});

describe("draft persistence round-trip", () => {
  const key = draftKey("test", "u1");
  beforeEach(() => clearDraft(key));

  it("saves and loads a value", () => {
    saveDraft(key, { name: "에피소드1022", city: "서울" });
    expect(loadDraft<{ name: string; city: string }>(key)).toEqual({
      name: "에피소드1022",
      city: "서울",
    });
  });

  it("returns null when absent", () => {
    expect(loadDraft(key)).toBeNull();
  });

  it("clears a draft", () => {
    saveDraft(key, { x: 1 });
    clearDraft(key);
    expect(loadDraft(key)).toBeNull();
  });

  it("returns null on corrupt JSON instead of throwing", () => {
    localStorage.setItem(key, "{not json");
    expect(loadDraft(key)).toBeNull();
  });
});
