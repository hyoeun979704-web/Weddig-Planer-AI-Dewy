/**
 * 카테고리별 시세 통계 헬퍼
 *
 * places 테이블의 실제 등록 업체 가격으로 시세를 자동 산출.
 * 정적 시세 텍스트 대신 사용하여 데이터가 등록될수록 정확도 향상.
 */

import { supabase } from "@/integrations/supabase/client";

export interface PriceStats {
  count: number;
  min: number;
  median: number;
  avg: number;
  max: number;
  unit: string; // 표시 단위 (예: "원", "만원~")
}

const aggregate = (prices: number[]): Omit<PriceStats, "count" | "unit"> => {
  const sorted = [...prices].sort((a, b) => a - b);
  const sum = sorted.reduce((s, p) => s + p, 0);
  return {
    min: sorted[0],
    median: sorted[Math.floor(sorted.length / 2)],
    avg: Math.round(sum / sorted.length),
    max: sorted[sorted.length - 1],
  };
};

/**
 * places 카테고리별 가격 통계 조회.
 * 표본이 너무 적으면(< 3건) null 반환 → 호출 측에서 폴백 가이드 사용.
 */
export const fetchPriceStats = async (
  category: string,
  region?: string,
): Promise<PriceStats | null> => {
  let query = (supabase as any)
    .from("places")
    .select("min_price, district, city")
    .eq("category", category)
    .eq("is_active", true)
    .not("min_price", "is", null);

  if (region) query = query.or(`district.ilike.%${region}%,city.ilike.%${region}%`);

  const { data } = await query;
  if (!data || data.length < 3) return null;

  const prices = data.map((d: any) => d.min_price).filter((p: number) => p > 0);
  if (prices.length < 3) return null;

  const stats = aggregate(prices);
  return { count: prices.length, ...stats, unit: "원" };
};

/** 가격을 만원 단위 문자열로 포맷 */
export const formatManwon = (n: number): string => `${(n / 10000).toLocaleString()}만원`;

/**
 * 시세 통계를 마크다운 라인으로 변환
 */
export const formatPriceStatsLine = (label: string, stats: PriceStats | null, fallback?: string): string => {
  if (!stats) {
    return fallback ? `• ${label}: ${fallback} *일반 가이드*` : `• ${label}: 데이터 부족`;
  }
  return `• ${label}: ${formatManwon(stats.min)}~${formatManwon(stats.max)} (평균 ${formatManwon(stats.avg)}, 표본 ${stats.count}곳)`;
};
