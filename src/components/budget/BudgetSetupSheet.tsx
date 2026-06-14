import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { regions, regionalAverages, getRegionalAvgWithMeal, categories, categoryKeys as ALL_CATEGORY_KEYS, type BudgetCategory } from "@/data/budgetData";
import { WEDDING_STYLE_LABEL, clearHiddenBudgetValues, type WeddingStyle } from "@/lib/weddingStyle";
import { Minus, Plus, MapPin, Info, Sparkle } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmt } from "@/lib/budgetFormat";

interface BudgetSetupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRegion?: string;
  weddingStyle?: WeddingStyle | null;
  /** Categories the user has excluded via the schedule's style picker.
   *  Used to selectively reduce sdm (drops only when studio/dress/makeup
   *  are in the list) rather than a blanket 50% cut. */
  excludedCategories?: string[];
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

// Quick-pick budget chips, in 만원. Style-aware so a self/small couple
// isn't anchored to general-wedding numbers when they tap a chip — the
// usual 셀프웨딩 range (300~2000만) is wildly different from a typical
// hotel wedding (5000~10000만).
const QUICK_BUDGETS_BY_STYLE: Record<WeddingStyle, number[]> = {
  general: [3000, 5000, 7000, 9000, 12000],
  small: [1500, 2500, 3500, 4500, 6000],
  self: [500, 1000, 1500, 2000, 3000],
  custom: [2000, 3000, 4000, 5000, 6000],
};

export default function BudgetSetupSheet({
  open, onOpenChange, initialRegion = "seoul", initialGuestCount,
  initialTotalBudget = 0, initialCategoryBudgets, weddingStyle,
  excludedCategories = [], visibleCategoryKeys, onSave,
}: BudgetSetupSheetProps) {
  // Render-time category list. When the caller passes a filtered subset
  // (Budget.tsx does this via visibleBudgetCategories) we honor it; otherwise
  // show all 10. The applyRegionalAvg logic still emits a full 10-key Record
  // so categories the user re-enables later keep their average.
  const visibleKeys = visibleCategoryKeys ?? ALL_CATEGORY_KEYS;
  const quickBudgets = QUICK_BUDGETS_BY_STYLE[weddingStyle ?? "custom"];
  const styleDefaultGuests = weddingStyle === "small" ? 50 : 200;
  const effectiveInitialGuests = initialGuestCount ?? styleDefaultGuests;
  const emptyCatBudgets: Record<BudgetCategory, number> = {
    venue: 0, meal: 0, sdm: 0, suit: 0, hanbok: 0, ring: 0,
    meetup: 0, house: 0, honeymoon: 0, etc: 0,
  };
  const [region, setRegion] = useState(initialRegion);
  const [guestCount, setGuestCount] = useState(effectiveInitialGuests);
  const [totalBudget, setTotalBudget] = useState(initialTotalBudget);
  const [catBudgets, setCatBudgets] = useState<Record<BudgetCategory, number>>(
    initialCategoryBudgets ? { ...emptyCatBudgets, ...initialCategoryBudgets } : emptyCatBudgets
  );
  const [confirmMismatch, setConfirmMismatch] = useState(false);
  const [pendingMealRecalc, setPendingMealRecalc] = useState<{ newGuestCount: number; newMeal: number } | null>(null);

  useEffect(() => {
    if (open) {
      setRegion(initialRegion);
      setGuestCount(effectiveInitialGuests);
      setTotalBudget(initialTotalBudget);
      if (initialCategoryBudgets) {
        setCatBudgets({ ...emptyCatBudgets, ...initialCategoryBudgets });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialRegion, effectiveInitialGuests, initialTotalBudget, initialCategoryBudgets]);

  /**
   * Apply regional averages to all category inputs, adjusting for the user's
   * wedding style + excluded shop categories:
   *
   *  - small wedding: venue × 0.7 (가든/하우스 가정). Meal already scales
   *    with the smaller guestCount via getRegionalAvgWithMeal.
   *  - self / excluded sub-categories: drop sdm proportionally based on
   *    which of studio/dress_shop/makeup_shop is excluded (each ≈ 1/3 of
   *    sdm now that tailor_shop has its own budget row). Avoids blanket
   *    50% cuts that misprice when only one piece is DIY.
   *  - excluded tailor_shop → suit = 0
   *  - excluded hanbok → hanbok = 0
   *  - excluded honeymoon → honeymoon = 0
   *  - excluded appliance → house × 0.5 (house also covers furniture/move-in)
   */
  const applyRegionalAvg = () => {
    const avg = getRegionalAvgWithMeal(region, guestCount);
    if (!avg) return;
    const excludedSet = new Set(excludedCategories);
    const isSmall = weddingStyle === "small";

    // sdm sub-share: studio + dress + makeup (~1/3 each after tailor_shop
    // moved out into its own 'suit' budget row).
    const sdmDrop = ["studio", "dress_shop", "makeup_shop"]
      .filter(c => excludedSet.has(c)).length * (1 / 3);
    const sdmAdjust = Math.max(0.2, 1 - sdmDrop);

    const venueAdjust = isSmall ? 0.7 : 1;
    const houseAdjust = excludedSet.has("appliance") ? 0.5 : 1;

    const next = {
      venue: Math.round(avg.venue * venueAdjust),
      meal: avg.meal,
      sdm: Math.round(avg.sdm * sdmAdjust),
      suit: excludedSet.has("tailor_shop") ? 0 : avg.suit,
      hanbok: excludedSet.has("hanbok") ? 0 : avg.hanbok,
      ring: avg.ring,
      meetup: avg.meetup,
      house: Math.round(avg.house * houseAdjust),
      honeymoon: excludedSet.has("honeymoon") ? 0 : avg.honeymoon,
      etc: avg.etc,
    };
    setTotalBudget(Object.values(next).reduce((a, b) => a + b, 0));
    setCatBudgets(next);
  };

  /**
   * Pro-rata rescale of all non-zero, non-meal category budgets so the full
   * sum equals totalBudget. Meal is intentionally excluded from the scaling
   * because it's hard-anchored to (guest_count × per_guest_meal) — scaling
   * it would create an unrealistic per-guest amount.
   *
   * If meal alone already exceeds totalBudget we bail (the user needs to
   * either reduce guest count or raise the total).
   */
  const rebalanceToTotal = () => {
    if (totalBudget <= 0) return;
    const meal = catBudgets.meal || 0;
    const remainingBudget = totalBudget - meal;
    if (remainingBudget <= 0) return;
    const otherSum = Object.entries(catBudgets)
      .filter(([k]) => k !== "meal")
      .reduce((a, [, v]) => a + v, 0);
    if (otherSum === 0) return;
    const ratio = remainingBudget / otherSum;
    const scaled = (Object.entries(catBudgets) as [BudgetCategory, number][]).reduce(
      (acc, [k, v]) => {
        acc[k] = k === "meal" ? v : Math.round(v * ratio);
        return acc;
      },
      {} as Record<BudgetCategory, number>
    );
    // Fix rounding drift on the largest non-meal, non-zero category so the
    // sum lands exactly on totalBudget.
    const drift = totalBudget - Object.values(scaled).reduce((a, b) => a + b, 0);
    if (drift !== 0) {
      const biggest = (Object.entries(scaled) as [BudgetCategory, number][])
        .filter(([k, v]) => k !== "meal" && v > 0)
        .sort(([, a], [, b]) => b - a)[0]?.[0];
      if (biggest) scaled[biggest] += drift;
    }
    setCatBudgets(scaled);
  };

  /**
   * Adjusts guest count and keeps meal budget in sync.
   * If the current meal value matches the auto-computed amount for the *previous*
   * guest count (i.e. user hasn't customized it), we silently recalculate.
   * If it differs, we ask before overwriting so we don't blow away manual input.
   */
  const setGuestCountWithMealSync = (newCount: number) => {
    const clamped = Math.max(50, Math.min(500, newCount));
    if (clamped === guestCount) return;

    const perGuestMeal = regionalAverages[region]?.per_guest_meal;
    if (!perGuestMeal) {
      setGuestCount(clamped);
      return;
    }

    const newMeal = Math.round(perGuestMeal * clamped);
    const currentMeal = catBudgets.meal;
    const previousAutoMeal = Math.round(perGuestMeal * guestCount);
    const isUntouched = currentMeal === 0 || currentMeal === previousAutoMeal;

    if (isUntouched) {
      setGuestCount(clamped);
      setCatBudgets(prev => ({ ...prev, meal: newMeal }));
    } else {
      setGuestCount(clamped);
      setPendingMealRecalc({ newGuestCount: clamped, newMeal });
    }
  };

  const catSum = Object.values(catBudgets).reduce((a, b) => a + b, 0);
  const avg = getRegionalAvgWithMeal(region, guestCount);
  const hasMismatch = totalBudget > 0 && catSum !== totalBudget;

  const commitSave = () => {
    // Strip residue from categories the user has opted out of via wedding
    // style. The sheet's visible chip set already hides them, but the
    // underlying state record still carries any prior value (e.g. a 200만
    // hanbok budget set before the user switched to a small-wedding
    // preset). Zeroing here keeps the saved breakdown consistent with
    // what the user actually sees and edits.
    const cleaned = clearHiddenBudgetValues(catBudgets, visibleKeys);
    onSave({ region, guest_count: guestCount, total_budget: totalBudget, category_budgets: cleaned });
    onOpenChange(false);
  };

  const handleSaveClick = () => {
    if (hasMismatch) {
      setConfirmMismatch(true);
      return;
    }
    commitSave();
  };

  const sumPct = totalBudget > 0 ? Math.min((catSum / totalBudget) * 100, 100) : 0;
  const sumBarColor = !totalBudget ? "bg-muted" :
    catSum === totalBudget ? "bg-emerald-500" :
    catSum > totalBudget ? "bg-destructive" : "bg-yellow-500";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="app-col mx-auto rounded-t-2xl max-h-[90dvh] p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-3 shrink-0">
          <SheetTitle className="text-base flex items-center gap-2">
            예산 설정
            {weddingStyle && weddingStyle !== "general" && weddingStyle !== "custom" && (
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                <Sparkle className="w-2.5 h-2.5" /> {WEDDING_STYLE_LABEL[weddingStyle]} 모드
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-4">

        {/* Region select */}
        <div className="mb-5">
          <Label className="text-sm font-semibold mb-2 block"> 지역 선택</Label>
          <div className="grid grid-cols-4 gap-1.5">
            {Object.entries(regions).map(([key, r]) => (
              <button
                key={key}
                type="button"
                onClick={() => setRegion(key)}
                className={cn(
                  "text-xs py-2 px-1 rounded-lg border transition-all active:scale-95",
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
          <Label className="text-sm font-semibold mb-2 block"> 예상 하객 수</Label>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0"
              onClick={() => setGuestCountWithMealSync(guestCount - 10)}>
              <Minus className="w-4 h-4" />
            </Button>
            <div className="flex-1 flex items-center gap-1">
              <Input
                type="number"
                inputMode="numeric"
                value={guestCount || ""}
                onChange={e => setGuestCountWithMealSync(Number(e.target.value) || 0)}
                className="text-center text-lg font-bold h-10 no-spinner"
              />
              <span className="text-sm text-muted-foreground shrink-0">명</span>
            </div>
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0"
              onClick={() => setGuestCountWithMealSync(guestCount + 10)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {avg && catBudgets.meal > 0 && (
            <p className="text-[10px] text-muted-foreground mt-1.5">
              식대는 하객 수 × {avg.per_guest_meal}만원으로 자동 계산돼요
            </p>
          )}
        </div>

        {/* Total budget */}
        <div className="mb-4">
          <Label className="text-sm font-semibold mb-2 block"> 총 예산</Label>
          <div className="flex gap-1.5 mb-2 flex-wrap">
            {quickBudgets.map(v => (
              <button key={v} type="button" onClick={() => setTotalBudget(v)}
                className={cn(
                  "text-xs py-1.5 px-3 rounded-full border transition-all active:scale-95",
                  totalBudget === v ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
                )}>
                {fmt(v)}만
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input type="number" inputMode="numeric" value={totalBudget || ""} onChange={e => setTotalBudget(Number(e.target.value))}
              placeholder="직접 입력" className="text-right no-spinner" />
            <span className="text-sm text-muted-foreground whitespace-nowrap">만원</span>
          </div>
          {avg && (
            <div className="mt-1.5 space-y-0.5">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {regions[region]?.label} {guestCount}명 기준 평균 <span className="font-semibold text-foreground tabular-nums">{fmt(avg.total)}만원</span>
              </p>
              <p className="text-[10px] text-muted-foreground pl-4">
                · 식대 포함 ({guestCount}명 × {avg.per_guest_meal}만원 = {fmt(avg.meal)}만원)
              </p>
            </div>
          )}
        </div>

        {/* Category budgets */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold">카테고리별 배분</Label>
            <button type="button" onClick={applyRegionalAvg} className="text-xs text-primary active:scale-95 transition-transform">
              지역 평균으로 채우기
            </button>
          </div>
          {totalBudget > 0 && (
            <div className="mb-2 flex items-center justify-between gap-2 text-[11px] tabular-nums">
              <span className="text-muted-foreground">
                합계 <span className={cn("font-bold",
                  catSum === totalBudget ? "text-emerald-600" :
                  catSum > totalBudget ? "text-destructive" : "text-foreground"
                )}>{fmt(catSum)}만원</span>
                <span> / {fmt(totalBudget)}만원</span>
              </span>
              {hasMismatch && (
                <div className="flex items-center gap-1.5">
                  <span className={cn("font-medium",
                    catSum > totalBudget ? "text-destructive" : "text-yellow-700"
                  )}>
                    {catSum > totalBudget
                      ? `+${fmt(catSum - totalBudget)}만원`
                      : `-${fmt(totalBudget - catSum)}만원`}
                  </span>
                  <button
                    type="button"
                    onClick={rebalanceToTotal}
                    className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold active:scale-95 transition-transform"
                    title="총 예산에 맞게 비율 유지하며 자동 조정"
                  >
                    비율 맞추기
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="space-y-2">
            {ALL_CATEGORY_KEYS.map(key => {
              const isHidden = !visibleKeys.includes(key);
              return (
              <div key={key} className={cn(isHidden && "opacity-50")}>
                <div className="flex items-center gap-2">
                  <span className="text-sm w-20 shrink-0">{categories[key].emoji} {categories[key].label}</span>
                  <Input type="number" inputMode="numeric" value={catBudgets[key] || ""}
                    onChange={e => setCatBudgets(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                    className="text-right text-sm h-9 no-spinner"
                    placeholder={isHidden ? "스타일에서 제외됨 · 0 권장" : undefined} />
                  <span className="text-xs text-muted-foreground w-8">만원</span>
                </div>
                {key === "meal" && avg && (
                  <div className="pl-[88px] mt-0.5 space-y-0.5">
                    <p className="text-[10px] text-muted-foreground">
                      {guestCount}명 × {avg.per_guest_meal}만원 = {fmt(avg.meal)}만원 권장
                    </p>
                    {weddingStyle === "small" && guestCount <= 60 && (
                      <p className="text-[10px] text-yellow-700">
                        ⓘ 50명 이하는 인당 단가가 평균보다 10~20% 비쌀 수 있어요 (대량 할인 어려움)
                      </p>
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>
          <div className="mt-3 rounded-lg bg-yellow-50 border border-yellow-200 p-2.5 flex gap-2">
            <Info className="w-3.5 h-3.5 text-yellow-700 shrink-0 mt-0.5" />
            <div className="text-[11px] text-yellow-900 leading-relaxed">
              <p className="font-semibold mb-0.5">잊기 쉬운 숨은 비용</p>
              <p>· <b>스드메</b>에 헬퍼비(20~30만원), 부케, 본식스냅, 원본 추가비가 별도예요</p>
              <p>· <b>식대</b>에 어린이 식대(50% 할인)·주류·코너메뉴 추가비가 포함됐는지 확인하세요</p>
              <p>· <b>웨딩홀</b>의 주차/세팅/폐백실 비용이 계약에 포함됐는지 체크하세요</p>
              <p>· <b>기타</b>에 청첩장·답례품·축가비 등을 미리 잡아두는 게 좋아요</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground/70 mt-2 text-center">
            * 평균 데이터는 2026년 상반기 기준 · 실제 견적은 업체마다 다를 수 있어요
          </p>
        </div>
        </div>

        {/* Sticky footer with live sum bar + save */}
        <div className="shrink-0 border-t border-border bg-background px-6 pt-3 pb-6">
          {totalBudget > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs mb-1.5 tabular-nums">
                <span className="text-muted-foreground">
                  합계 <span className={cn("font-bold",
                    catSum === totalBudget ? "text-emerald-600" :
                    catSum > totalBudget ? "text-destructive" : "text-foreground"
                  )}>{fmt(catSum)}만원</span>
                  <span className="text-muted-foreground"> / {fmt(totalBudget)}만원</span>
                </span>
                {hasMismatch && (
                  <span className={cn("text-[11px] font-medium",
                    catSum > totalBudget ? "text-destructive" : "text-yellow-700"
                  )}>
                    {catSum > totalBudget
                      ? `${fmt(catSum - totalBudget)}만원 초과`
                      : `${fmt(totalBudget - catSum)}만원 남음`}
                  </span>
                )}
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={cn("h-full transition-all", sumBarColor)}
                  style={{ width: `${sumPct}%` }} />
              </div>
            </div>
          )}
          <Button className="w-full" onClick={handleSaveClick}>
            설정 완료
          </Button>
        </div>
      </SheetContent>

      <AlertDialog
        open={!!pendingMealRecalc}
        onOpenChange={open => { if (!open) setPendingMealRecalc(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>식대를 다시 계산할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              직접 입력하신 식대 {fmt(catBudgets.meal)}만원이 있어요.
              {pendingMealRecalc && (
                <> {pendingMealRecalc.newGuestCount}명 기준 평균은 {fmt(pendingMealRecalc.newMeal)}만원이에요.</>
              )}
              <br />
              자동 계산으로 바꾸시면 직접 입력하신 금액이 덮어써져요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingMealRecalc(null)}>입력 금액 유지</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (pendingMealRecalc) {
                setCatBudgets(prev => ({ ...prev, meal: pendingMealRecalc.newMeal }));
              }
              setPendingMealRecalc(null);
            }}>
              자동 계산으로 변경
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmMismatch} onOpenChange={setConfirmMismatch}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>합계가 총 예산과 달라요</AlertDialogTitle>
            <AlertDialogDescription>
              카테고리 합계는 {fmt(catSum)}만원, 총 예산은 {fmt(totalBudget)}만원이에요.
              {catSum > totalBudget
                ? ` ${fmt(catSum - totalBudget)}만원 초과된 상태로 저장할까요?`
                : ` ${fmt(totalBudget - catSum)}만원이 비어있어요. 그대로 저장할까요?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>다시 확인</AlertDialogCancel>
            <AlertDialogAction onClick={commitSave}>저장</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
