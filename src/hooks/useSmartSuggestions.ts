import { useMemo } from "react";
import { usePersonaInsights } from "@/hooks/usePersonaInsights";
import { useWeddingContext } from "@/hooks/useWeddingContext";
import { useBudget } from "@/hooks/useBudget";
import {
  deriveSmartSuggestions,
  type SmartSuggestion,
} from "@/lib/smartSuggestions";

/**
 * 유기성 배선 D2 — 기능 간 빈틈(예산·컨설팅·체크리스트)을 감지해 각 기능으로 딥링크하는
 * 크로스-피처 제안을 합성한다. 기존 데이터 소스만 조합(읽기 전용), 순수 랭킹은 lib 가 담당.
 */
export function useSmartSuggestions(limit = 3): SmartSuggestion[] {
  const insights = usePersonaInsights();
  const { context } = useWeddingContext();
  const { settings, summary } = useBudget();

  return useMemo(() => {
    const hasBudgetSettings = !!settings && (settings.total_budget ?? 0) > 0;
    return deriveSmartSuggestions(
      {
        daysUntilWedding: insights.daysUntilWedding,
        hasBudgetSettings,
        budgetRemaining: hasBudgetSettings ? summary.remaining : null,
        hasConsulting: context.hasConsulting,
        openScheduleCount: Math.max(0, insights.totalCount - insights.completedCount),
        progressPercent: insights.progressPercent,
        guestCount: settings?.guest_count ?? null,
        personaMode: context.personaMode,
      },
      limit,
    );
  }, [
    insights.daysUntilWedding,
    insights.totalCount,
    insights.completedCount,
    insights.progressPercent,
    context.hasConsulting,
    context.personaMode,
    settings,
    summary.remaining,
    limit,
  ]);
}
