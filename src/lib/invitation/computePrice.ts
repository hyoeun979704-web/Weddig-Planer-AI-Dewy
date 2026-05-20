/**
 * 청첩장 가격 계산 — 템플릿 기본가 + 슬롯에서 발생하는 API 호출 비용.
 *
 * 현재 가격표 (Phase 3-A):
 *   · 종이: 0 / 5 / 15
 *   · 모바일: 0 / 10 / 20
 *
 * auto_cutout / auto_illustration 슬롯이 있으면 템플릿 기본가에 이미 포함된
 * 것으로 가정 (운영자가 슬롯 정의 시 가격 책정). 추가 차감 없음.
 *
 * AI 추천 문구는 호출 시점에 1하트씩 별도 차감 (이 함수와 무관).
 */

import type { InvitationLayout } from "./types";

export function computeInvitationPrice(
  templatePriceHearts: number,
  _layout?: InvitationLayout,
): number {
  return Math.max(0, templatePriceHearts ?? 0);
}

/** 디버그 — 어드민에서 layout 검증 시 사용 */
export function inspectLayoutEffects(layout: InvitationLayout) {
  const cutoutSlots = layout.slots.filter((s) => s.auto_cutout);
  const illustSlots = layout.slots.filter((s) => s.auto_illustration);
  const aiPromptable = layout.slots.filter((s) => s.ai_promptable);
  return {
    has_cutout: cutoutSlots.length > 0,
    has_illustration: illustSlots.length > 0,
    cutout_slot_count: cutoutSlots.length,
    illust_slot_count: illustSlots.length,
    ai_promptable_count: aiPromptable.length,
  };
}
