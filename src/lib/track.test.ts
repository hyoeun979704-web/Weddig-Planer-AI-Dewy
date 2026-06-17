import { describe, it, expect } from "vitest";
import { buildHomeNavProps } from "./track";

describe("buildHomeNavProps", () => {
  it("shapes source/target into properties", () => {
    expect(buildHomeNavProps("quick_links", "/board")).toEqual({
      source: "quick_links",
      target: "/board",
    });
  });
  it("merges extra metadata", () => {
    expect(buildHomeNavProps("smart_suggestion", "/budget", { id: "set-budget" })).toEqual({
      source: "smart_suggestion",
      target: "/budget",
      id: "set-budget",
    });
  });
  it("ignores undefined extra", () => {
    expect(buildHomeNavProps("a", "b", undefined)).toEqual({ source: "a", target: "b" });
  });
});
