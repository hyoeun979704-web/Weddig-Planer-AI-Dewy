// 페르소나(성향) 맞춤 코칭 카피 — 가격 가이드·식대 등에서 planning_style 별로 조언을 분기.
// 기존엔 budget_analytic 1개만 차등했는데, 4개 성향(표준·예산형·디자이너·초보) × 상황으로 확장.
// 담백체: 구체적 행동 제안, 과장·보장 금지. null = 덧붙일 코칭 없음(중립).

import type { PlanningStyle } from "./weddingPersona";

/** 내 예산이 지역 평균 대비 어디쯤인지(낮음/비슷/높음)로 요약. */
export type PriceBand = "low" | "mid" | "high";

export function priceBandFromDelta(deltaPct: number | null | undefined): PriceBand | null {
  if (deltaPct == null) return null;
  if (deltaPct <= -10) return "low";
  if (deltaPct >= 10) return "high";
  return "mid";
}

/**
 * 가격 가이드 페르소나 코칭 — (성향 × 예산대). 없으면 null(중립 → 카피 생략).
 * 톤: 구체적 다음 행동. 예산형=추가금 점검, 디자이너=퀄리티 값어치, 초보=비교 견적.
 */
export function pricePersonaCoaching(
  style: PlanningStyle | null | undefined,
  band: PriceBand | null,
): string | null {
  if (!band) return null;
  switch (style) {
    case "budget_analytic":
      if (band === "low") return "알뜰하게 잡으셨어요. 추가금·옵션까지 합산해 확인하세요.";
      if (band === "high") return "평균보다 높아요. 포함 내역과 추가금을 항목별로 따져보세요.";
      return "평균과 비슷해요. 숨은 추가금까지 합산해 비교하세요.";
    case "designer":
      if (band === "high") return "퀄리티 중시라면 합리적일 수 있어요. 포트폴리오로 값어치를 확인하세요.";
      if (band === "low") return "원하는 스타일이 분명하면 평균보다 올려잡아도 괜찮아요.";
      return "취향이 분명하면 가격보다 스타일 적합도를 먼저 보세요.";
    case "beginner":
      return "처음이라면 평균이 출발점이에요. 견적 2~3곳을 비교해보세요.";
    case "standard":
    default:
      if (band === "high") return "평균보다 높은 편이에요. 우선순위를 정해 배분하세요.";
      if (band === "low") return "평균보다 여유 있게 잡으셨어요.";
      return null;
  }
}

/**
 * 식대 보증인원 미달 경고에 덧붙일 성향별 한 줄. 미달분은 "그냥 나가는 돈"이라 성향별로 강조.
 */
export function mealShortfallCoaching(style: PlanningStyle | null | undefined): string {
  switch (style) {
    case "budget_analytic":
      return " — 보증인원을 낮출 수 있는지 식장에 꼭 확인하세요.";
    case "beginner":
      return " — 보증인원은 계약 전 꼭 확인하세요. 덜 와도 그만큼 나가요.";
    case "designer":
    case "standard":
    default:
      return " — 보증인원 조정이나 다른 시간대를 문의해보세요.";
  }
}
