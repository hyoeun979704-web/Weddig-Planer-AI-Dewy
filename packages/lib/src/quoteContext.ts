// 견적 컨텍스트 표시 헬퍼 — 스레드 상단 요약 카드 + 견적 폼이 공유(스타일 라벨 단일 소스).

/** 견적 요청 컨텍스트(스레드 요약 카드용). 소비자·업체 공유 도메인이라 shared(lib)에 둔다. */
export interface QuoteContext {
  category: string;
  region_city: string | null;
  region_district: string | null;
  budget_min: number | null;
  budget_max: number | null;
  wedding_date: string | null;
  style: string | null;
  note: string | null;
  image_count: number;
}

/** 견적 스타일 라벨(단일 소스). QuoteNew 폼과 컨텍스트 카드가 공유해 드리프트 방지. */
export const QUOTE_STYLE_LABEL: Record<string, string> = {
  general: "일반 예식",
  small: "스몰웨딩",
  self: "셀프웨딩",
  custom: "기타",
};

/**
 * 예산 범위(만원) 표기. 둘 다 없으면 null(표시 생략).
 *   min&max → "100~300만원" · min만 → "100만원 이상" · max만 → "300만원 이하"
 */
export function formatBudgetRange(
  min: number | null | undefined,
  max: number | null | undefined,
): string | null {
  const lo = min && min > 0 ? min : null;
  const hi = max && max > 0 ? max : null;
  if (lo && hi) return `${lo.toLocaleString()}~${hi.toLocaleString()}만원`;
  if (lo) return `${lo.toLocaleString()}만원 이상`;
  if (hi) return `${hi.toLocaleString()}만원 이하`;
  return null;
}
