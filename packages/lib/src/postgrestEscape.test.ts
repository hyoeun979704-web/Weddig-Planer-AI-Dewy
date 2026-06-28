import { describe, it, expect } from "vitest";
import { escapeLikePattern, quoteForOr } from "./postgrestEscape";

describe("escapeLikePattern", () => {
  it("escapes percent so '50%' is literal, not wildcard", () => {
    expect(escapeLikePattern("50%")).toBe("50\\%");
  });

  it("escapes underscore so 'cat_dog' doesn't match 'catXdog'", () => {
    expect(escapeLikePattern("cat_dog")).toBe("cat\\_dog");
  });

  it("escapes backslash (must come first to avoid double-escaping)", () => {
    expect(escapeLikePattern("path\\to")).toBe("path\\\\to");
  });

  it("passes Korean text through untouched", () => {
    expect(escapeLikePattern("스튜디오")).toBe("스튜디오");
  });

  it("handles empty string", () => {
    expect(escapeLikePattern("")).toBe("");
  });

  it("escapes a value that mixes every special char", () => {
    expect(escapeLikePattern("a%b_c\\d")).toBe("a\\%b\\_c\\\\d");
  });
});

describe("quoteForOr", () => {
  it("wraps a plain value in quotes", () => {
    expect(quoteForOr("스튜디오")).toBe('"스튜디오"');
  });

  it("makes a comma literal (the critical case for .or() parsing)", () => {
    // Without wrapping, PostgREST would split "스튜디오, 드레스" into two
    // broken filter expressions and reject the request.
    expect(quoteForOr("스튜디오, 드레스")).toBe('"스튜디오, 드레스"');
  });

  it("makes parens literal", () => {
    expect(quoteForOr("(셀프)")).toBe('"(셀프)"');
  });

  it("escapes an internal double quote", () => {
    expect(quoteForOr('say "hi"')).toBe('"say \\"hi\\""');
  });

  it("escapes backslash before quote so the unescape is unambiguous", () => {
    expect(quoteForOr("a\\b")).toBe('"a\\\\b"');
  });

  it("composes with escapeLikePattern: LIKE backslash gets URL-doubled inside quotes", () => {
    // escapeLikePattern("50%") → "50\%" (one backslash, telling SQL LIKE
    // to treat the percent as literal). Then quoteForOr must also double
    // that backslash because the .or() URL layer strips one level of
    // escaping before the value reaches the LIKE engine.
    const pattern = `%${escapeLikePattern("50%")}%`;
    expect(quoteForOr(pattern)).toBe('"%50\\\\%%"');
  });

  it("handles empty string", () => {
    expect(quoteForOr("")).toBe('""');
  });
});
