// 지역 가격 가이드 — 상세페이지에서 "이 지역 이 카테고리 평균 예산"과 내 예산 위치를 보여준다.
//
// 데이터 정직성(260630 실측): 실거래가 소스는 비어있거나(avg_total_estimate=0,
// quote_requests=1) 더럽다(places.min_price 는 카테고리 내 단위 혼재 — 1인가/총액/보증금).
// 그래서 **개별 업체 실가격 백분위는 제공하지 않는다**(오추정 방지). 대신 큐레이션된
// 지역×카테고리 평균(regionalAverages, 완전·정합)을 "참고 평균"으로 노출하고, 같은 예산
// 카테고리 단위로 사용자 예산과 비교(사과-사과: 둘 다 budget-category 단위).
// 실거래 분포/백분위는 가격 데이터가 정제·수집된 뒤로 이월(docs 계획서).

/** 예산 카테고리별 가이드 라벨. bundle=여러 place 카테고리 합산(정직 표기 필요). */
export const BUDGET_GUIDE_LABEL: Record<
  string,
  { label: string; bundle?: boolean; note?: string }
> = {
  venue: { label: "예식장 대관" },
  // meal 은 PLACE_TO_BUDGET_CATEGORY 매핑 대상이 없어(식대는 per_guest_meal 별도) 여기선 미도달.
  sdm: { label: "스드메", bundle: true, note: "스튜디오·드레스·메이크업 합산 평균" },
  suit: { label: "예복" },
  hanbok: { label: "한복" },
  ring: { label: "예물" },
  house: { label: "혼수·가전" },
  honeymoon: { label: "허니문" },
  etc: { label: "기타 준비" },
};

/** 내 예산이 지역 평균 대비 몇 % 차이인지(양수=평균보다 높음). 입력 부족 시 null. */
export function priceDeltaPct(
  userManwon: number | null | undefined,
  avgManwon: number | null | undefined,
): number | null {
  if (!userManwon || userManwon <= 0 || !avgManwon || avgManwon <= 0) return null;
  return Math.round(((userManwon - avgManwon) / avgManwon) * 100);
}

export interface PricePosition {
  text: string;
  tone: "low" | "mid" | "high";
}

/**
 * 평균 대비 위치 라벨. ±10% 이내는 "평균 수준". 낮으면 알뜰(저), 높으면 여유(고).
 * deltaPct null 이면 null.
 */
export function pricePositionLabel(deltaPct: number | null): PricePosition | null {
  if (deltaPct == null) return null;
  if (deltaPct <= -10) return { text: `평균보다 ${Math.abs(deltaPct)}% 낮은 예산이에요`, tone: "low" };
  if (deltaPct >= 10) return { text: `평균보다 ${deltaPct}% 높은 예산이에요`, tone: "high" };
  return { text: "지역 평균과 비슷한 예산이에요", tone: "mid" };
}
