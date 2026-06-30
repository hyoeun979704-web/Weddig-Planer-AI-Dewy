import { describe, it, expect, beforeEach } from "vitest";
import { loadQuoteTemplates, saveQuoteTemplate, removeQuoteTemplate } from "./quoteTemplates";

describe("quoteTemplates", () => {
  beforeEach(() => localStorage.clear());

  it("저장 없으면 빈 배열", () => {
    expect(loadQuoteTemplates()).toEqual([]);
  });

  it("저장 → 맨 앞, 중복 제거, 공백 무시", () => {
    saveQuoteTemplate("A");
    saveQuoteTemplate("B");
    saveQuoteTemplate("A"); // 중복 → 맨 앞으로
    expect(loadQuoteTemplates()).toEqual(["A", "B"]);
    expect(saveQuoteTemplate("   ")).toEqual(["A", "B"]); // 공백은 저장 안 함
  });

  it("최대 8개로 제한", () => {
    for (let i = 0; i < 12; i++) saveQuoteTemplate(`t${i}`);
    expect(loadQuoteTemplates().length).toBe(8);
    expect(loadQuoteTemplates()[0]).toBe("t11"); // 최신이 맨 앞
  });

  it("삭제", () => {
    saveQuoteTemplate("A");
    saveQuoteTemplate("B");
    expect(removeQuoteTemplate("A")).toEqual(["B"]);
  });
});
