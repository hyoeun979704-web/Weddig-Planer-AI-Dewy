/**
 * "만원" 단위 가격 표기 — suffix(~) 없이 순수 금액만 반환한다(호출부가 ~/+ 를 제어).
 *
 * 1억 이상은 억 단위로 표기한다. 이전엔 `${(won/10000).toFixed(0)}만원` 인라인이
 * 8곳에 복붙돼 있어 ≥1억 매물이 상세에선 "12000만원", 카드에선 "1.2억원~"으로
 * 다르게 보였다(드리프트 버그). 이 함수로 단일화한다.
 *
 *   formatManwon(1_200_000)   → "120만원"
 *   formatManwon(120_000_000) → "1.2억원"
 *   formatManwon(5_000)       → "5,000원"
 */
export const formatManwon = (won: number): string => {
  if (won >= 100_000_000) return `${(won / 100_000_000).toFixed(1).replace(/\.0$/, "")}억원`;
  if (won >= 10_000) return `${(won / 10_000).toFixed(0)}만원`;
  return `${won.toLocaleString()}원`;
};

/** 범위 표기용 — 뒤에 "~"를 붙인 버전(`formatManwon(x) + "~"`). */
export const formatManwonRange = (won: number): string => `${formatManwon(won)}~`;
