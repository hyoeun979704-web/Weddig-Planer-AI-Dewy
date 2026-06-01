/**
 * 청첩장 가격 계산 (2026-06 개정 규칙).
 *
 *   · 사용자가 직접 사진을 등록/배치하는 것 = 무료(0).
 *   · 누끼(auto_cutout) 또는 일러스트 변환(auto_illustration) 같은 AI 이미지
 *     처리가 있는 디자인만 유료:  종이 5하트 / 모바일 10하트.
 *   · 첫 사용(사용자의 첫 청첩장)은 반값:  종이 3 / 모바일 5  (= ceil(base/2)).
 *   · AI 추천 문구·약도 일러스트 변환 등은 호출 시점 별도 차감(이 함수와 무관).
 *
 * 템플릿 price_hearts 는 위 규칙(누끼/일러스트 유무)에 따라 0 또는 5/10 으로
 * 책정돼 저장된다. 이 함수는 첫 사용 반값만 적용한다.
 */

import type { InvitationLayout } from "./types";

/** 가격 규칙상 유료 디자인인가 (누끼/일러스트 변환 슬롯 보유) */
export function isPaidDesign(layout?: InvitationLayout): boolean {
  if (!layout?.slots) return false;
  return layout.slots.some((s) => s.auto_cutout || s.auto_illustration);
}

export function computeInvitationPrice(
  templatePriceHearts: number,
  opts?: { firstUse?: boolean },
): number {
  const base = Math.max(0, templatePriceHearts ?? 0);
  if (base === 0) return 0;
  // 첫 사용 반값 (올림): 5→3, 10→5
  return opts?.firstUse ? Math.ceil(base / 2) : base;
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
