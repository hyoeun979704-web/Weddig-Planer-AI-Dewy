// 식대(피로연 식사비) 추정 — 한국 결혼식 최대 변수 중 하나.
// 핵심 인사이트: 식장은 **보증인원(min_guarantee)** 미만이 참석해도 그 인원만큼 청구한다.
// 따라서 실제 청구 식수 = max(예상 참석, 보증인원). 미달분은 "그냥 내는 돈"이라
// 예산형 사용자에게 가장 큰 페인 → 별도로 경고한다.
//
// 단위 주의(verification-lessons 만원-단위 함정): 지역 평균 단가(per_guest_meal)는 "만원"
// 단위(예: 8.5 = 85,000원). 반면 업체가 입력한 place_halls.meal_price 는 데이터가 더럽다
// (원/만원/오입력 혼재: 실측 min 20 ~ max 2,450,000). 그래서 raw 를 그대로 쓰지 않고
// 만원으로 정규화 + 현실범위 게이트를 통과한 값만 쓰고, 아니면 지역 평균으로 폴백한다.

export type MealHeadsSource = "guestlist" | "guestcount" | "guarantee" | "default";
export type MealPriceSource = "venue" | "regional";

/** 1인 식대 현실범위(만원). 이 밖이면 오입력으로 보고 폐기 → 지역평균 폴백. */
export const MEAL_PRICE_MIN_MANWON = 3;
export const MEAL_PRICE_MAX_MANWON = 25;

/**
 * 업체 입력 1인 식대(raw)를 만원 단위로 정규화. 신뢰 못 할 값이면 null(→ 지역평균 폴백).
 * - raw >= 1000 → 원 단위로 간주(/10000). (예: 70000 → 7)
 * - raw <  1000 → 이미 만원 단위로 간주. (예: 7.5 → 7.5)
 * - 정규화 결과가 [3, 25]만원 밖이면 폐기(null). (예: 2,450,000 → 245 → 폐기)
 */
export function normalizeMealPriceManwon(raw: number | null | undefined): number | null {
  if (raw == null || !Number.isFinite(raw) || raw <= 0) return null;
  const manwon = raw >= 1000 ? raw / 10000 : raw;
  if (manwon < MEAL_PRICE_MIN_MANWON || manwon > MEAL_PRICE_MAX_MANWON) return null;
  return Math.round(manwon * 10) / 10;
}

export interface MealCostInput {
  /** 예상 참석 식수(본인+동행 합). */
  expectedHeads: number;
  headsSource: MealHeadsSource;
  /** 1인 단가(만원). 호출부에서 venue 정규화 or 지역평균으로 이미 결정. */
  unitPriceManwon: number;
  priceSource: MealPriceSource;
  /** 식장 보증인원. 없으면 null. */
  minGuarantee: number | null;
  /** 식장 최대 수용(보증 상한 or 좌석). 없으면 null. */
  maxCapacity: number | null;
  /** 현재 식대 예산(category_budgets.meal, 만원). 없으면 null. */
  budgetedManwon: number | null;
}

export interface MealCostEstimate {
  expectedHeads: number;
  /** 실제 청구 식수 = max(예상, 보증인원). */
  billedHeads: number;
  unitPriceManwon: number;
  /** 예상 식대 총액(만원) = billedHeads × 단가. */
  totalManwon: number;
  /** 보증인원 미달 인원(>0 이면 그만큼 헛돈). */
  guaranteeShortfall: number;
  /** 미달분 추가 부담액(만원). */
  shortfallCostManwon: number;
  /** 최대 수용 초과 인원(>0 이면 좌석/회차 분리 필요). */
  overCapacity: number;
  /** 예산 대비 차액(만원, 양수=예산 초과). 예산 없으면 null. */
  budgetDeltaManwon: number | null;
  headsSource: MealHeadsSource;
  priceSource: MealPriceSource;
}

/** 식대 추정 순수 계산. 모든 분기·null 가드 포함 — 컴포넌트는 표시만. */
export function computeMealCost(input: MealCostInput): MealCostEstimate {
  const expectedHeads = Math.max(0, Math.round(input.expectedHeads || 0));
  const minGuarantee = input.minGuarantee != null ? Math.max(0, input.minGuarantee) : 0;
  const billedHeads = Math.max(expectedHeads, minGuarantee);
  const unit = Math.max(0, input.unitPriceManwon || 0);
  const totalManwon = Math.round(billedHeads * unit);
  const guaranteeShortfall = Math.max(0, minGuarantee - expectedHeads);
  const shortfallCostManwon = Math.round(guaranteeShortfall * unit);
  const overCapacity =
    input.maxCapacity != null ? Math.max(0, expectedHeads - input.maxCapacity) : 0;
  const budgetDeltaManwon =
    input.budgetedManwon != null ? totalManwon - input.budgetedManwon : null;

  return {
    expectedHeads,
    billedHeads,
    unitPriceManwon: unit,
    totalManwon,
    guaranteeShortfall,
    shortfallCostManwon,
    overCapacity,
    budgetDeltaManwon,
    headsSource: input.headsSource,
    priceSource: input.priceSource,
  };
}

export const MEAL_HEADS_SOURCE_LABEL: Record<MealHeadsSource, string> = {
  guestlist: "하객 명단 기준",
  guestcount: "예상 하객수 기준",
  guarantee: "식장 보증인원 기준",
  default: "일반 평균 기준",
};

export const MEAL_PRICE_SOURCE_LABEL: Record<MealPriceSource, string> = {
  venue: "내 식장 단가",
  regional: "지역 평균 단가",
};
