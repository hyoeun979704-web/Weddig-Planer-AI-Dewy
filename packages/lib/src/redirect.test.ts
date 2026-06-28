import { describe, it, expect } from "vitest";
import { safeInternalPath, authLinkWithRedirect } from "./redirect";

describe("safeInternalPath", () => {
  it("allows internal paths", () => {
    expect(safeInternalPath("/board")).toBe("/board");
    expect(safeInternalPath("/quote/new?category=studio")).toBe("/quote/new?category=studio");
  });
  it("rejects external / protocol-relative / scheme tricks", () => {
    expect(safeInternalPath("https://evil.com")).toBe("/");
    expect(safeInternalPath("//evil.com")).toBe("/");
    expect(safeInternalPath("/\\evil.com")).toBe("/");
    expect(safeInternalPath("javascript://alert(1)")).toBe("/");
    expect(safeInternalPath("board")).toBe("/"); // 상대경로 거부
  });
  it("falls back on empty/null", () => {
    expect(safeInternalPath(null)).toBe("/");
    expect(safeInternalPath("")).toBe("/");
    expect(safeInternalPath(undefined, "/home")).toBe("/home");
  });
});

describe("authLinkWithRedirect", () => {
  it("encodes the destination into a redirect query", () => {
    expect(authLinkWithRedirect("/board")).toBe("/auth?redirect=%2Fboard");
    expect(authLinkWithRedirect("/quote/new?category=studio")).toBe(
      "/auth?redirect=%2Fquote%2Fnew%3Fcategory%3Dstudio",
    );
  });
  it("omits query for home / unsafe paths", () => {
    expect(authLinkWithRedirect("/")).toBe("/auth");
    expect(authLinkWithRedirect("https://evil.com")).toBe("/auth");
    expect(authLinkWithRedirect(null)).toBe("/auth");
  });
});
