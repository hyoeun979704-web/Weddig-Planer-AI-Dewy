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
import { regions, getRegionalAvgWithMeal, categories, categoryKeys, type BudgetCategory } from "@/data/budgetData";
import { Minus, Plus, MapPin, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const fmt = (n: number) => n.toLocaleString();

interface BudgetSetupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRegion?: string;
  initialGuestCount?: number;
  initialTotalBudget?: number;
  initialCategoryBudgets?: Record<BudgetCategory, number>;
  onSave: (data: {
    region: string;
    guest_count: number;
    total_budget: number;
    category_budgets: Record<BudgetCategory, number>;
  }) => void;
}

const quickBudgets = [2000, 3000, 4000, 5000, 6000];

export default function BudgetSetupSheet({
  open, onOpenChange, initialRegion = "seoul", initialGuestCount = 200,
  initialTotalBudget = 0, initialCategoryBudgets, onSave,
}: BudgetSetupSheetProps) {
  const emptyCatBudgets: Record<BudgetCategory, number> = { venue: 0, meal: 0, sdm: 0, ring: 0, house: 0, honeymoon: 0, etc: 0 };
  const [region, setRegion] = useState(initialRegion);
  const [guestCount, setGuestCount] = useState(initialGuestCount);
  const [totalBudget, setTotalBudget] = useState(initialTotalBudget);
  const [catBudgets, setCatBudgets] = useState<Record<BudgetCategory, number>>(
    initialCategoryBudgets ? { ...emptyCatBudgets, ...initialCategoryBudgets } : emptyCatBudgets
  );
  const [confirmMismatch, setConfirmMismatch] = useState(false);

  useEffect(() => {
    if (open) {
      setRegion(initialRegion);
      setGuestCount(initialGuestCount);
      setTotalBudget(initialTotalBudget);
      if (initialCategoryBudgets) {
        setCatBudgets({ ...emptyCatBudgets, ...initialCategoryBudgets });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialRegion, initialGuestCount, initialTotalBudget, initialCategoryBudgets]);

  const applyRegionalAvg = () => {
    const avg = getRegionalAvgWithMeal(region, guestCount);
    if (!avg) return;
    setTotalBudget(avg.total);
    setCatBudgets({
      venue: avg.venue, meal: avg.meal, sdm: avg.sdm, ring: avg.ring,
      house: avg.house, honeymoon: avg.honeymoon, etc: avg.etc,
    });
  };

  const catSum = Object.values(catBudgets).reduce((a, b) => a + b, 0);
  const avg = getRegionalAvgWithMeal(region, guestCount);
  const hasMismatch = totalBudget > 0 && catSum !== totalBudget;

  const commitSave = () => {
    onSave({ region, guest_count: guestCount, total_budget: totalBudget, category_budgets: catBudgets });
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
      <SheetContent side="bottom" className="max-w-[430px] mx-auto rounded-t-2xl max-h-[90vh] p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-3 shrink-0">
          <SheetTitle className="text-base">예산 설정</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-4">

        {/* Region select */}
        <div className="mb-5">
          <Label className="text-sm font-semibold mb-2 block">📍 지역 선택</Label>
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
          <Label className="text-sm font-semibold mb-2 block">👥 예상 하객 수</Label>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="h-9 w-9"
              onClick={() => setGuestCount(Math.max(50, guestCount - 10))}>
              <Minus className="w-4 h-4" />
            </Button>
            <span className="text-lg font-bold min-w-[60px] text-center">{guestCount}명</span>
            <Button variant="outline" size="icon" className="h-9 w-9"
              onClick={() => setGuestCount(Math.min(500, guestCount + 10))}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Total budget */}
        <div className="mb-4">
          <Label className="text-sm font-semibold mb-2 block">💰 총 예산</Label>
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
          <div className="space-y-2">
            {categoryKeys.map(key => (
              <div key={key}>
                <div className="flex items-center gap-2">
                  <span className="text-sm w-20 shrink-0">{categories[key].emoji} {categories[key].label}</span>
                  <Input type="number" inputMode="numeric" value={catBudgets[key] || ""}
                    onChange={e => setCatBudgets(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                    className="text-right text-sm h-9 no-spinner" />
                  <span className="text-xs text-muted-foreground w-8">만원</span>
                </div>
                {key === "meal" && avg && (
                  <p className="text-[10px] text-muted-foreground pl-[88px] mt-0.5">
                    {guestCount}명 × {avg.per_guest_meal}만원 = {fmt(avg.meal)}만원 권장
                  </p>
                )}
              </div>
            ))}
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
