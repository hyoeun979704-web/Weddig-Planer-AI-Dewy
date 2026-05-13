import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { regions, regionalAverages, categories, type BudgetCategory } from "@/data/budgetData";
import { Minus, Plus, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface BudgetSetupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRegion?: string;
  initialGuestCount?: number;
  initialTotalBudget?: number;
  initialCategoryBudgets?: Record<BudgetCategory, number>;
  /** Budget categories the user hasn't excluded via wedding style. Falls back to all 6. */
  visibleCategoryKeys?: BudgetCategory[];
  onSave: (data: {
    region: string;
    guest_count: number;
    total_budget: number;
    category_budgets: Record<BudgetCategory, number>;
  }) => void;
}

const quickBudgets = [2000, 2500, 3000, 3500, 4000];
const DEFAULT_CATEGORY_KEYS: BudgetCategory[] = ["venue", "sdm", "ring", "house", "honeymoon", "etc"];

export default function BudgetSetupSheet({
  open, onOpenChange, initialRegion = "seoul", initialGuestCount = 200,
  initialTotalBudget = 0, initialCategoryBudgets, visibleCategoryKeys, onSave,
}: BudgetSetupSheetProps) {
  const categoryKeys = visibleCategoryKeys ?? DEFAULT_CATEGORY_KEYS;
  const [region, setRegion] = useState(initialRegion);
  const [guestCount, setGuestCount] = useState(initialGuestCount);
  const [totalBudget, setTotalBudget] = useState(initialTotalBudget);
  const [catBudgets, setCatBudgets] = useState<Record<BudgetCategory, number>>(
    initialCategoryBudgets || { venue: 0, sdm: 0, ring: 0, house: 0, honeymoon: 0, etc: 0 }
  );

  useEffect(() => {
    if (open) {
      setRegion(initialRegion);
      setGuestCount(initialGuestCount);
      setTotalBudget(initialTotalBudget);
      if (initialCategoryBudgets) setCatBudgets(initialCategoryBudgets);
    }
  }, [open]);

  // Regional averages are anchored to 200 guests. For smaller weddings the
  // venue cost (which is dominated by meal) shrinks proportionally — small/
  // self-wedding users hitting "지역 평균으로 채우기" should not get a 200-guest
  // venue figure dropped onto their 50-guest plan.
  const REFERENCE_GUEST_COUNT = 200;
  const scaledVenue = (avg: typeof regionalAverages[string]) => {
    const referenceMeal = avg.per_guest_meal * REFERENCE_GUEST_COUNT;
    const fixedVenuePart = Math.max(avg.venue - referenceMeal, 0);
    const userMeal = avg.per_guest_meal * guestCount;
    return Math.round(fixedVenuePart + userMeal);
  };

  const applyRegionalAvg = () => {
    const avg = regionalAverages[region];
    if (!avg) return;
    // Only seed visible categories; hidden ones stay at 0 so the budget total
    // reflects what the user will actually spend.
    const next: Record<BudgetCategory, number> = {
      venue: 0, sdm: 0, ring: 0, house: 0, honeymoon: 0, etc: 0,
    };
    let sum = 0;
    for (const key of categoryKeys) {
      const v = key === "venue" ? scaledVenue(avg) : (avg[key as keyof typeof avg] as number);
      next[key] = v;
      sum += v;
    }
    setCatBudgets(next);
    setTotalBudget(sum);
  };

  const catSum = Object.values(catBudgets).reduce((a, b) => a + b, 0);
  const avg = regionalAverages[region];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-w-[430px] mx-auto rounded-t-2xl max-h-[85vh] overflow-y-auto pb-8">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base">예산 설정</SheetTitle>
        </SheetHeader>

        {/* Region select */}
        <div className="mb-5">
          <Label className="text-sm font-semibold mb-2 block">📍 지역 선택</Label>
          <div className="grid grid-cols-4 gap-1.5">
            {Object.entries(regions).map(([key, r]) => (
              <button
                key={key}
                onClick={() => setRegion(key)}
                className={cn(
                  "text-xs py-2 px-1 rounded-lg border transition-all",
                  region === key
                    ? "bg-primary text-primary-foreground border-primary font-bold"
                    : "bg-card border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Guest count */}
        <div className="mb-5">
          <Label className="text-sm font-semibold mb-2 block">👥 예상 하객 수</Label>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="h-9 w-9"
              onClick={() => setGuestCount(Math.max(20, guestCount - 10))}>
              <Minus className="w-4 h-4" />
            </Button>
            <span className="text-lg font-bold min-w-[60px] text-center">{guestCount}명</span>
            <Button variant="outline" size="icon" className="h-9 w-9"
              onClick={() => setGuestCount(Math.min(500, guestCount + 10))}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {avg && (
            <p className="text-[11px] text-muted-foreground mt-1.5">
              예상 식대 약 <span className="font-semibold text-foreground">{Math.round(avg.per_guest_meal * guestCount).toLocaleString()}만원</span>
              <span className="text-muted-foreground/70"> · 1인 {avg.per_guest_meal}만원 기준</span>
            </p>
          )}
        </div>

        {/* Total budget */}
        <div className="mb-4">
          <Label className="text-sm font-semibold mb-2 block">💰 총 예산</Label>
          <div className="flex gap-1.5 mb-2 flex-wrap">
            {quickBudgets.map(v => (
              <button key={v} onClick={() => setTotalBudget(v)}
                className={cn(
                  "text-xs py-1.5 px-3 rounded-full border",
                  totalBudget === v ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
                )}>
                {v}만
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input type="number" value={totalBudget || ""} onChange={e => setTotalBudget(Number(e.target.value))}
              placeholder="직접 입력" className="text-right" />
            <span className="text-sm text-muted-foreground whitespace-nowrap">만원</span>
          </div>
          {avg && (
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {regions[region]?.label} {guestCount}명 기준 평균 {avg.total}만원
            </p>
          )}
        </div>

        {/* Category budgets */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold">카테고리별 배분</Label>
            <button onClick={applyRegionalAvg} className="text-xs text-primary">지역 평균으로 채우기</button>
          </div>
          <div className="space-y-2">
            {categoryKeys.map(key => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-sm w-20 shrink-0">{categories[key].emoji} {categories[key].label}</span>
                <Input type="number" value={catBudgets[key] || ""}
                  onChange={e => setCatBudgets(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                  className="text-right text-sm h-9" />
                <span className="text-xs text-muted-foreground w-8">만원</span>
              </div>
            ))}
          </div>
          {catSum !== totalBudget && totalBudget > 0 && (
            <p className="text-xs text-destructive mt-1.5">
              합계 {catSum}만원 (총 예산과 {catSum > totalBudget ? `${catSum - totalBudget}만원 초과` : `${totalBudget - catSum}만원 부족`})
            </p>
          )}
        </div>

        <Button className="w-full" onClick={() => {
          onSave({ region, guest_count: guestCount, total_budget: totalBudget, category_budgets: catBudgets });
          onOpenChange(false);
        }}>
          설정 완료
        </Button>
      </SheetContent>
    </Sheet>
  );
}
