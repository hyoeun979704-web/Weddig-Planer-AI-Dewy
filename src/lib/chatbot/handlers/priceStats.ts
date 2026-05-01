/**
 * 카테고리별 시세 통계 헬퍼
 *
 * places 테이블의 실제 등록 업체 가격으로 시세를 자동 산출.
 * 데이터 신선도(updated_at)도 함께 추적하여 답변에 표시.
 */

import { supabase } from "@/integrations/supabase/client";

export interface PriceStats {
  count: number;
  min: number;
  median: number;
  avg: number;
  max: number;
  unit: string;
  /** 표본 중 가장 최근 업데이트 시점 */
  latestUpdate: string;
  /** 표본 평균 업데이트 일자로부터 경과 일수 */
  daysAgoMedian: number;
  /** 신선도 등급 */
  freshness: "fresh" | "ok" | "stale";
}

const aggregate = (prices: number[]): { min: number; median: number; avg: number; max: number } => {
  const sorted = [...prices].sort((a, b) => a - b);
  const sum = sorted.reduce((s, p) => s + p, 0);
  return {
    min: sorted[0],
    median: sorted[Math.floor(sorted.length / 2)],
    avg: Math.round(sum / sorted.length),
    max: sorted[sorted.length - 1],
  };
};

const daysSince = (iso: string): number => {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
};

const median = (nums: number[]): number => {
  const sorted = [...nums].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

const classifyFreshness = (daysAgo: number): "fresh" | "ok" | "stale" => {
  if (daysAgo <= 14) return "fresh";   // 2주 이내
  if (daysAgo <= 60) return "ok";      // 2개월 이내
  return "stale";                       // 그 이상 — 갱신 권장
};

/**
 * places 카테고리별 가격 + 신선도 통계.
 * 표본 < 3건 시 null 반환 (호출 측에서 폴백 가이드 사용).
 */
export const fetchPriceStats = async (
  category: string,
  region?: string,
): Promise<PriceStats | null> => {
  let query = (supabase as any)
    .from("places")
    .select("min_price, district, city, updated_at")
    .eq("category", category)
    .eq("is_active", true)
    .not("min_price", "is", null);

  if (region) query = query.or(`district.ilike.%${region}%,city.ilike.%${region}%`);

  const { data } = await query;
  if (!data || data.length < 3) return null;

  const valid = data.filter((d: any) => d.min_price > 0 && d.updated_at);
  if (valid.length < 3) return null;

  const prices = valid.map((d: any) => d.min_price);
  const stats = aggregate(prices);

  const updateDays = valid.map((d: any) => daysSince(d.updated_at));
  const daysAgoMedian = median(updateDays);
  const latestUpdate = valid
    .map((d: any) => d.updated_at)
    .sort()
    .reverse()[0];

  return {
    count: valid.length,
    ...stats,
    unit: "원",
    latestUpdate,
    daysAgoMedian,
    freshness: classifyFreshness(daysAgoMedian),
  };
};

/** 가격을 만원 단위 문자열로 포맷 */
export const formatManwon = (n: number): string => `${(n / 10000).toLocaleString()}만원`;

/** 신선도 라벨 (사용자 친화) */
export const formatFreshness = (stats: PriceStats): string => {
  const days = stats.daysAgoMedian;
  let timeLabel: string;
  if (days <= 7) timeLabel = "최근 1주 내";
  else if (days <= 14) timeLabel = "최근 2주 내";
  else if (days <= 30) timeLabel = "최근 1달 내";
  else if (days <= 60) timeLabel = "최근 2달 내";
  else if (days <= 90) timeLabel = "약 3달 전";
  else if (days <= 180) timeLabel = `약 ${Math.round(days / 30)}달 전`;
  else timeLabel = `약 ${Math.round(days / 30)}달 전 (오래됨)`;

  const icon = stats.freshness === "fresh" ? "🟢" : stats.freshness === "ok" ? "🟡" : "🔴";
  return `${icon} ${timeLabel} 갱신`;
};

/**
 * 시세 통계를 마크다운 라인으로 변환 (신선도 포함)
 */
export const formatPriceStatsLine = (label: string, stats: PriceStats | null, fallback?: string): string => {
  if (!stats) {
    return fallback ? `• ${label}: ${fallback} *일반 가이드*` : `• ${label}: 데이터 부족`;
  }
  const fresh = formatFreshness(stats);
  return `• ${label}: ${formatManwon(stats.min)}~${formatManwon(stats.max)} (평균 ${formatManwon(stats.avg)}, 표본 ${stats.count}곳, ${fresh})`;
};
