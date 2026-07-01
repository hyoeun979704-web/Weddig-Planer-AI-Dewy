// 견적 요청 개인화(깊이 ④) — 페르소나별 "업체에 전달할 내 상황" 한 줄. 견적 폼에서 사용자가
// 직접 안 적어도 매칭 신호가 되도록 제출 시 note 에 첨부(토글·수정 가능). 표준/특성 없는 모드는 null.
// note state 에 직접 넣지 않는다(draft hasContent 오염·오인 복원토스트 방지) — 제출 시에만 합친다.

import type { WeddingPersonaMode } from "./weddingPersona";

const CONTEXT: Partial<Record<WeddingPersonaMode, string>> = {
  remarriage: "재혼이라 작고 담백한 진행을 원해요.",
  remarriage_with_children: "재혼이며 자녀가 함께해요. 자녀 동반을 고려한 진행이면 좋겠어요.",
  pregnancy: "임신 중이라 컨디션·동선을 배려한 진행을 원해요.",
  small_intimate: "가족 중심 소규모 예식을 준비 중이에요.",
  small_budget: "합리적 비용의 소규모 예식을 준비 중이에요.",
  small_outdoor: "야외 소규모 예식을 고려 중이에요.",
  small_luxury: "호텔 스몰웨딩을 고려 중이에요.",
  luxury_hotel: "호텔·프리미엄 웨딩을 준비 중이에요.",
  budget_analytic: "예산을 꼼꼼히 맞추는 편이에요. 항목별 상세 견적을 부탁드려요.",
  regional: "지방 예식이라 이동·일정에 여유가 필요해요.",
  international: "국제결혼 관련 조건이 있어요.",
  remote_overseas: "해외 예식/원거리라 원격 상담이 편해요.",
  single_household: "혼자 준비하고 있어 명확한 안내가 도움돼요.",
  self_no_ceremony: "예식 없이 셀프로 준비 중이에요.",
  no_wedding_travel: "예식 대신 신혼여행·혼수 중심으로 준비 중이에요.",
  snap_only: "스냅·촬영 중심으로 준비 중이에요.",
  // standard_bride/standard_groom/first_timer/designer_late: 매칭에 쓸 특성 없음 → null.
};

/** 페르소나별 견적 첨부 컨텍스트 한 줄. 없으면 null. */
export function quotePersonaContext(mode: WeddingPersonaMode | null | undefined): string | null {
  if (!mode) return null;
  return CONTEXT[mode] ?? null;
}
