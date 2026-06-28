// 슬롯 인터랙션(애니메이션) 단일 소스 — 캔버스 렌더와 스튜디오 편집 UI가 공유.
// 우선순위: 사용자 override(face.animOverrides) > 템플릿 slot.anim > 레거시 휴리스틱.

import type { InvitationSlot } from "./types";

export type SlotAnim = "none" | "spring" | "heartbeat" | "fade" | "typing";

export const SLOT_ANIM_LABEL: Record<SlotAnim, string> = {
  none: "없음",
  spring: "스프링 등장",
  fade: "페이드 인",
  heartbeat: "두근두근",
  typing: "타이핑",
};

/** 슬롯 종류별 선택 가능한 효과 (typing 은 텍스트 전용). */
export const animOptionsFor = (slot: InvitationSlot): SlotAnim[] =>
  slot.type === "text"
    ? ["none", "fade", "spring", "typing", "heartbeat"]
    : ["none", "spring", "fade", "heartbeat"];

/**
 * 슬롯의 유효 애니메이션. anim 미지정 템플릿은 기존 id/type 휴리스틱으로
 * 하위호환 (love_story_intro 타이핑, heart/decor 하트비트, 이미지·프레임 스프링).
 */
export function resolveSlotAnim(slot: InvitationSlot): SlotAnim {
  if (slot.anim) return slot.anim;
  if (slot.id === "love_story_intro") return "typing";
  if (slot.id.includes("heart") || slot.id.includes("decor")) return "heartbeat";
  if (
    slot.type === "image" ||
    (slot.type === "asset" &&
      (slot.id.includes("frame") || slot.id.includes("decor")))
  ) {
    return "spring";
  }
  return "none";
}
