import { Utensils, Users, TriangleAlert, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMealCostEstimate } from "@/hooks/useMealCostEstimate";
import { useBudget } from "@/hooks/useBudget";
import { fmt, wonPreview } from "@/lib/budgetFormat";
import { MEAL_HEADS_SOURCE_LABEL, MEAL_PRICE_SOURCE_LABEL } from "@/lib/mealCost";
import { mealShortfallCoaching } from "@/lib/personaCoaching";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/**
 * 식대(피로연) 추정 카드 — 식수 × 1인 단가로 예상 식대를 보여주고, 한국 결혼식 최대 페인인
 * **보증인원 미달 부담**을 경고한다. 단순 지역평균이 아니라 내 신호(하객수·식장 실단가·
 * 보증인원·예산·페르소나·D-day)로 개인화. 식장 단가가 없거나 비현실치면 지역평균으로 폴백.
 */
const MealCostCalculator = () => {
  const navigate = useNavigate();
  const {
    estimate: e,
    usingVenuePrice,
    venueName,
    regionLabel,
    isBudgetPersona,
    planningStyle,
    daysUntilWedding,
    isLoading,
  } = useMealCostEstimate();
  const { settings, saveSettings } = useBudget();

  if (isLoading) {
    return <div className="rounded-xl bg-card border border-border p-4 h-28 animate-pulse" />;
  }

  const mealBudget = settings?.category_budgets?.meal ?? 0;
  const canApply = !!settings && e.totalManwon > 0 && mealBudget !== e.totalManwon;
  const applyToBudget = () => {
    if (!settings) return;
    saveSettings.mutate(
      { category_budgets: { ...settings.category_budgets, meal: e.totalManwon } },
      { onSuccess: () => toast({ title: "식대 예산에 반영했어요", description: `${fmt(e.totalManwon)}만원` }) },
    );
  };

  // 정확도 안내 — 실집계(하객명단)가 아니면 더 정확히 만들 여지를 알린다(빈 신호 폴백).
  const showAccuracyHint = e.headsSource === "default" || e.headsSource === "guarantee";
  // D-day 임박 + 인원 미확정이면 최종 인원 확정 리마인더.
  const showDdayReminder =
    daysUntilWedding != null && daysUntilWedding >= 0 && daysUntilWedding <= 45 && e.headsSource !== "guestlist";

  return (
    <div className="rounded-xl bg-card border border-border p-4 space-y-3">
      <div className="flex items-center gap-1.5">
        <Utensils className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-bold text-foreground">예상 식대</h2>
      </div>

      {/* Hero — 총액 */}
      <div>
        <p className="text-2xl font-extrabold text-foreground tabular-nums">
          ≈ {fmt(e.totalManwon)}<span className="text-base font-bold">만원</span>
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">약 {wonPreview(e.totalManwon)}원</p>
        <p className="text-xs text-muted-foreground mt-1.5 flex items-center flex-wrap gap-x-1">
          <Users className="w-3.5 h-3.5 inline" />
          <span className="font-medium text-foreground">{e.billedHeads}명</span>
          <span>× {e.unitPriceManwon}만원</span>
          <span className="text-muted-foreground/70">
            · {MEAL_HEADS_SOURCE_LABEL[e.headsSource]} · {MEAL_PRICE_SOURCE_LABEL[e.priceSource]}
          </span>
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">
          {usingVenuePrice
            ? `내 식장${venueName ? `(${venueName})` : ""} 실단가로 계산했어요.`
            : `${regionLabel} 지역 평균 단가예요. 식장을 등록하면 실단가로 계산돼요.`}
        </p>
      </div>

      {/* 보증인원 미달 경고 — 핵심 페인. 예산형 페르소나는 강조. */}
      {e.guaranteeShortfall > 0 && (
        <div className={cn(
          "rounded-lg p-3 text-xs flex gap-2",
          isBudgetPersona ? "bg-red-50 border border-red-200 text-red-700" : "bg-amber-50 border border-amber-200 text-amber-800",
        )}>
          <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            식장 보증인원이 예상 참석({e.expectedHeads}명)보다 <b>{e.guaranteeShortfall}명</b> 많아요.
            덜 와도 <b>{fmt(e.shortfallCostManwon)}만원</b>은 그대로 식대로 나가요
            {mealShortfallCoaching(planningStyle)}
          </span>
        </div>
      )}

      {/* 최대 수용 초과 */}
      {e.overCapacity > 0 && (
        <div className="rounded-lg p-3 text-xs flex gap-2 bg-amber-50 border border-amber-200 text-amber-800">
          <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>예상 인원이 식장 최대 수용보다 <b>{e.overCapacity}명</b> 많아요. 좌석·회차 분리를 확인하세요.</span>
        </div>
      )}

      {/* 예산 대비 */}
      {e.budgetDeltaManwon != null && mealBudget > 0 && (
        <p className="text-xs text-muted-foreground">
          식대 예산 {fmt(mealBudget)}만원 대비{" "}
          <span className={cn("font-semibold", e.budgetDeltaManwon > 0 ? "text-red-500" : "text-emerald-600")}>
            {e.budgetDeltaManwon > 0 ? `${fmt(e.budgetDeltaManwon)}만원 초과` : e.budgetDeltaManwon < 0 ? `${fmt(-e.budgetDeltaManwon)}만원 여유` : "딱 맞아요"}
          </span>
        </p>
      )}

      {/* D-day 리마인더 */}
      {showDdayReminder && (
        <p className="text-[11px] text-primary">
          D-{daysUntilWedding} · 최종 참석 인원이 확정되면 식대가 더 정확해져요.
        </p>
      )}

      {/* 정확도 안내 — 빈 신호 폴백 */}
      {showAccuracyHint && (
        <button
          type="button"
          onClick={() => navigate("/budget")}
          className="text-[11px] text-primary font-medium inline-flex items-center gap-0.5 py-2 min-h-[44px]"
        >
          예상 하객수를 설정하면 더 정확해져요 <ArrowRight className="w-3 h-3" />
        </button>
      )}

      {/* CTA — 예산 반영 */}
      {canApply && (
        <button
          type="button"
          onClick={applyToBudget}
          disabled={saveSettings.isPending}
          className="w-full h-11 rounded-xl bg-primary/10 text-primary font-semibold text-sm disabled:opacity-60"
        >
          이 금액 식대 예산으로 반영
        </button>
      )}
    </div>
  );
};

export default MealCostCalculator;
