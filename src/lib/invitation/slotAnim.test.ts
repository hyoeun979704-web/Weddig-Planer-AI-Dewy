import { describe, it, expect } from "vitest";
import { resolveSlotAnim, animOptionsFor } from "./slotAnim";
import type { InvitationSlot } from "./types";

const mk = (over: Partial<InvitationSlot>): InvitationSlot => ({
  id: "slot",
  type: "text",
  x: 0,
  y: 0,
  w: 100,
  h: 40,
  ...over,
});

describe("resolveSlotAnim", () => {
  it("명시 anim 이 항상 우선 (휴리스틱 무시)", () => {
    expect(resolveSlotAnim(mk({ id: "heart_1", anim: "none" }))).toBe("none");
    expect(resolveSlotAnim(mk({ type: "image", anim: "fade" }))).toBe("fade");
  });

  it("레거시 휴리스틱: love_story_intro 타이핑, heart/decor 하트비트", () => {
    expect(resolveSlotAnim(mk({ id: "love_story_intro" }))).toBe("typing");
    expect(resolveSlotAnim(mk({ id: "heart_main", type: "asset" }))).toBe("heartbeat");
    expect(resolveSlotAnim(mk({ id: "decor_top", type: "asset" }))).toBe("heartbeat");
  });

  it("레거시 휴리스틱: 이미지·프레임 에셋 스프링, 그 외 없음", () => {
    expect(resolveSlotAnim(mk({ id: "photo_1", type: "image" }))).toBe("spring");
    expect(resolveSlotAnim(mk({ id: "frame_a", type: "asset" }))).toBe("spring");
    expect(resolveSlotAnim(mk({ id: "greeting", type: "text" }))).toBe("none");
  });
});

describe("animOptionsFor", () => {
  it("타이핑은 텍스트 슬롯에만 제공", () => {
    expect(animOptionsFor(mk({ type: "text" }))).toContain("typing");
    expect(animOptionsFor(mk({ type: "image" }))).not.toContain("typing");
  });
});
