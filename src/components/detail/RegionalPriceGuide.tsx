import { useNavigate } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { useBudget } from "@/hooks/useBudget";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { regionalAverages, regions, resolveRegionKey } from "@/data/budgetData";
import { PLACE_TO_BUDGET_CATEGORY } from "@/lib/categoryLabels";
import { BUDGET_GUIDE_LABEL, priceDeltaPct, pricePositionLabel } from "@/lib/regionalPriceGuide";
import { fmt } from "@/lib/budgetFormat";
import { cn } from "@/lib/utils";

/**
 * 지역 가격 가이드 — "이 지역 이 카테고리 평균 예산"과 내 예산 위치(가격 투명성).
 * 더러운 실거래가(min_price 단위혼재) 대신 큐레이션된 지역 평균을 "참고 평균"으로 노출.
 * 내 예산은 같은 budget-category 단위로 비교(사과-사과). 신호 없으면 우아하게 평균만.
 */
const RegionalPriceGuide = ({ place }: { place: { category: string; city: string | null } }) => {
  const navigate = useNavigate();
  const { settings } = useBudget();
  const { weddingSettings } = useWeddingSchedule();

  const bc = PLACE_TO_BUDGET_CATEGORY[place.category];
  const guide = bc ? BUDGET_GUIDE_LABEL[bc] : undefined;
  const regionKey =
    resolveRegionKey(place.city) ||
    resolveRegionKey(weddingSettings.wedding_region) ||
    "seoul";
  const avg = regionalAverages[regionKey];
  const avgManwon = bc && avg ? (avg as unknown as Record<string, number>)[bc] : undefined;

  // 매핑 안 되거나 평균이 없으면(예: bc 미존재) 렌더 안 함 — dead-end 방지.
  if (!bc || !guide || !avgManwon || avgManwon <= 0) return null;

  const regionLabel = regions[regionKey]?.label ?? "지역";
  const userBudget = settings?.category_budgets?.[bc as keyof typeof settings.category_budgets] ?? null;
  const deltaPct = priceDeltaPct(userBudget, avgManwon);
  const position = pricePositionLabel(deltaPct);
  const isBudgetPersona = weddingSettings.planning_style === "budget_analytic";

  return (
    <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <TrendingUp className="w-3.5 h-3.5 text-primary" />
        <p className="text-xs font-semibold text-foreground">
          {regionLabel} {guide.label} 평균 예산
        </p>
      </div>
      <p className="text-lg font-bold text-foreground tabular-nums">
        {fmt(avgManwon)}<span className="text-sm font-semibold">만원</span>
      </p>
      {guide.bundle && guide.note && (
        <p className="text-[11px] text-muted-foreground mt-0.5">{guide.note}</p>
      )}

      {position ? (
        <p
          className={cn(
            "text-xs mt-2 font-medium",
            position.tone === "low" ? "text-emerald-600" : position.tone === "high" ? "text-amber-600" : "text-muted-foreground",
          )}
        >
          내 예산 {fmt(userBudget as number)}만원 · {position.text}
          {isBudgetPersona && position.tone === "low" ? " — 알뜰하게 잡으셨어요." : ""}
        </p>
      ) : (
        <button
          type="button"
          onClick={() => navigate("/budget")}
          className="text-[11px] text-primary font-medium mt-2 py-2 inline-flex min-h-[44px] items-center"
        >
          내 예산을 설정하면 평균과 비교해드려요 →
        </button>
      )}

      <p className="text-[10px] text-muted-foreground/80 mt-2">
        참고용 지역 평균이에요. 실제 견적은 업체·시즌마다 달라요.
      </p>
    </div>
  );
};

export default RegionalPriceGuide;
