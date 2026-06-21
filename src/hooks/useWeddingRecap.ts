import { useMemo } from "react";
import { usePersonaInsights } from "@/hooks/usePersonaInsights";
import { useBudget } from "@/hooks/useBudget";
import { useFavorites } from "@/hooks/useFavorites";

// "결혼준비 Wrapped" 리캡 데이터 집계 — Spotify Wrapped 패턴(여정 회고 + 공유).
//
// 규칙(AGENTS.md): 모든 수치는 **실데이터(client query)** 로만 채운다(허위/추정 금지).
// 데이터가 없는 지표는 available=false 로 표시해 해당 슬라이드를 **숨긴다**(빈 카드·dead-end 방지).
// 만원 단위·label vs value 주의. 비로그인/온보딩 전이면 hasAny=false.

export interface RecapMetric {
  key: string;
  available: boolean;
}

export interface WeddingRecap {
  isLoaded: boolean;
  /** 인트로 외에 보여줄 실데이터 지표가 1개 이상 있는가. false면 Wrapped 진입 자체를 막는다. */
  hasAny: boolean;
  hasOnboarded: boolean;
  // 지표(각각 available 일 때만 슬라이드 노출)
  dDay: { available: boolean; days: number };
  checklist: { available: boolean; done: number; total: number; percent: number };
  vendors: { available: boolean; count: number };
  budget: { available: boolean; spentManwon: number };
  persona: { available: boolean; label: string; styleLabel: string };
}

export function useWeddingRecap(): WeddingRecap {
  const insights = usePersonaInsights();
  const { summary, isLoading: budgetLoading } = useBudget();
  const { favorites, isLoading: favLoading } = useFavorites();

  return useMemo(() => {
    const isLoaded = insights.isLoaded && !budgetLoading && !favLoading;

    const dDayDays = insights.daysUntilWedding;
    const dDay = { available: typeof dDayDays === "number" && dDayDays >= 0, days: dDayDays ?? 0 };

    const checklist = {
      available: insights.totalCount > 0 && insights.completedCount > 0,
      done: insights.completedCount,
      total: insights.totalCount,
      percent: insights.progressPercent,
    };

    const vendors = { available: favorites.length > 0, count: favorites.length };

    // summary.totalSpent 는 '원' 단위. 만원으로 환산(반올림)해 표시.
    const spentManwon = Math.round((summary?.totalSpent ?? 0) / 10000);
    const budget = { available: spentManwon > 0, spentManwon };

    const persona = {
      available: insights.hasOnboarded,
      label: insights.personaLabel,
      styleLabel: insights.styleLabel,
    };

    const hasAny =
      insights.hasOnboarded &&
      (checklist.available || vendors.available || budget.available || dDay.available);

    return { isLoaded, hasAny, hasOnboarded: insights.hasOnboarded, dDay, checklist, vendors, budget, persona };
  }, [
    insights.isLoaded,
    insights.hasOnboarded,
    insights.daysUntilWedding,
    insights.totalCount,
    insights.completedCount,
    insights.progressPercent,
    insights.personaLabel,
    insights.styleLabel,
    summary?.totalSpent,
    favorites.length,
    budgetLoading,
    favLoading,
  ]);
}
