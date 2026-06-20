import { describe, it, expect } from "vitest";
import {
  CUT_PLAN, SOLO_CUTS, buildPhotoshootCutPrompt, type PhotoshootCut,
} from "./photoshootPrompt";

const byIdx = (i: number) => CUT_PLAN.find((c) => c.index === i)!;

describe("photoshoot CUT_PLAN", () => {
  it("has 8 cuts split 4 solo (pdf1) / 4 couple (pdf2)", () => {
    expect(CUT_PLAN).toHaveLength(8);
    expect(CUT_PLAN.filter((c) => c.pdf === 1)).toHaveLength(4);
    expect(CUT_PLAN.filter((c) => c.pdf === 2)).toHaveLength(4);
  });

  it("solo cuts are 4 bride/groom full+bust (P1 scope)", () => {
    expect(SOLO_CUTS).toHaveLength(4);
    expect(SOLO_CUTS.every((c) => c.subject === "bride" || c.subject === "groom")).toBe(true);
    expect(SOLO_CUTS.every((c) => c.pdf === 1)).toBe(true);
  });

  it("couple cuts go to pdf 2", () => {
    expect(CUT_PLAN.filter((c) => c.subject.startsWith("couple")).every((c) => c.pdf === 2)).toBe(true);
  });
});

describe("buildPhotoshootCutPrompt", () => {
  it("bride solo: bride identity + framing, no groom grooming line", () => {
    const p = buildPhotoshootCutPrompt({ cut: byIdx(1), brideDescription: "mermaid lace gown" });
    expect(p).toContain("the bride alone");
    expect(p).toContain("mermaid lace gown");
    expect(p).toMatch(/full-length/i);            // full framing
    expect(p).not.toContain("subtle natural grooming"); // groom-only line absent
  });

  it("groom solo bust: groom grooming + waist-up framing", () => {
    const p = buildPhotoshootCutPrompt({ cut: byIdx(4), groomDescription: "navy tuxedo" });
    expect(p).toContain("the groom alone");
    expect(p).toContain("subtle natural grooming");
    expect(p).toContain("navy tuxedo");
    expect(p).toMatch(/waist-up/i);               // bust framing
  });

  it("couple cut: both identities + no-blend rule", () => {
    const p = buildPhotoshootCutPrompt({ cut: byIdx(5) });
    expect(p).toContain("the couple together");
    expect(p).toContain("do NOT blend or swap");
    expect(p).toContain("Image 2: the groom");
  });

  it("couple_scene emphasizes scenery", () => {
    const p = buildPhotoshootCutPrompt({ cut: byIdx(7) });
    expect(p).toContain("Emphasize the location/scenery");
  });

  it("injects reference text only when provided", () => {
    const withRef = buildPhotoshootCutPrompt({ cut: byIdx(1), refsText: "soft backlit, candid laugh" });
    expect(withRef).toContain("soft backlit, candid laugh");
    expect(withRef).toContain("do NOT copy any face");
    const without = buildPhotoshootCutPrompt({ cut: byIdx(1) });
    expect(without).not.toContain("REFERENCE STYLE");
  });

  it("long gown omits forced feet; short gown allows legs", () => {
    const long = buildPhotoshootCutPrompt({ cut: byIdx(1), longGown: true });
    expect(long).toContain("hidden under the hem");
    const short = buildPhotoshootCutPrompt({ cut: byIdx(1), longGown: false });
    expect(short).toContain("Legs and feet may be visible");
  });
});
