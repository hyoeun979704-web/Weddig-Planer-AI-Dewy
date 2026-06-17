import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Trash2, Lightbulb } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useBudget } from "@/hooks/useBudget";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { categories, savingTips, regions, getRegionalAvgWithMeal, resolveRegionKey, type BudgetCategory } from "@/data/budgetData";
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

import BudgetAddSheet from "@/components/budget/BudgetAddSheet";
import { fmt } from "@/lib/budgetFormat";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import type { BudgetItem } from "@/hooks/useBudget";
import { useDefaultRegion } from "@/hooks/useDefaultRegion";

const BudgetCategoryDetail = () => {
  const navigate = useNavigate();
  const { category } = useParams<{ category: string }>();
  const cat = category as BudgetCategory;
  const { defaultRegion } = useDefaultRegion();
  const profileRegionKey = resolveRegionKey(defaultRegion);
  const { settings, items, summary, regionalAverage, updateItem, deleteItem, addItem } = useBudget(profileRegionKey);
  const { weddingSettings } = useWeddingSchedule();
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<BudgetItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BudgetItem | null>(null);

  const catInfo = categories[cat];
  if (!catInfo) return null;

  const spent = summary.categoryTotals[cat] || 0;
  const budget = settings?.category_budgets?.[cat] || 0;
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const guestCount = settings?.guest_count || 200;
  const effectiveRegionKey = settings?.region || profileRegionKey || "seoul";
  const avgWithMeal = getRegionalAvgWithMeal(effectiveRegionKey, guestCount);
  const avgVal = cat === "meal"
    ? (avgWithMeal?.meal ?? 0)
    : (regionalAverage ? (regionalAverage as any)[cat] : 0);
  const diff = spent - avgVal;
  const diffPct = avgVal > 0 ? Math.round((Math.abs(diff) / avgVal) * 100) : 0;
  const catItems = items.filter(i => i.category === cat);
  const tips = savingTips[cat] || [];

  /**
   * Tips tailored to the user's wedding_style + excluded sub-categories.
   * Shown above the generic savingTips so style-specific guidance lands first.
   */
  const styleTips: string[] = (() => {
    const out: string[] = [];
    const excluded = weddingSettings.excluded_categories || [];
    const isSelf = weddingSettings.wedding_style === "self";
    const isSmall = weddingSettings.wedding_style === "small";

    if (cat === "sdm" && isSelf) {
      if (excluded.includes("studio")) out.push("셀프 촬영 비용은 카메라/렌즈 대여비, 보정 외주비, 원본 보관 비용까지 포함해 잡으세요");
      if (excluded.includes("dress_shop")) out.push("드레스 구매·중고·해외 직구 시 가봉비와 보관비가 추가될 수 있어요");
      if (excluded.includes("makeup_shop")) out.push("셀프 메이크업도 리허설용 제품·헬퍼 인건비는 별도로 잡아두세요");
      out.push("부케·본식스냅·헬퍼는 셀프웨딩에서도 살리는 분이 많아요. 별도로 예산을 남겨두세요");
    }
    if (cat === "venue" && isSmall) {
      out.push("스몰웨딩홀은 평일·오전 대관료가 컨벤션 대비 30~50% 저렴해요");
      out.push("하우스/가든은 우천 대비 실내 옵션 비용을 미리 확인하세요");
    }
    if (cat === "meal" && isSmall) {
      out.push("50인 이하는 인당 단가 협상 여지가 적어요. 어린이/축의금 답례 식대 인원도 포함해 카운트하세요");
    }
    if (cat === "suit" && isSelf) {
      out.push("셀프웨딩에서도 신랑 예복은 살리는 경우가 많아요. 본식+신혼여행에 다시 입을 정장이라면 구매가 합리적");
    }
    if (cat === "hanbok" && isSmall) {
      out.push("스몰웨딩은 신부·신랑만 한복 입고 양가 부모는 정장으로 가는 경우도 많아요");
    }
    if (cat === "meetup") {
      out.push("상견례 시기를 결혼식 6~9개월 전으로 잡으면 양가가 부담 없이 일정 조율할 수 있어요");
    }
    if (cat === "house" && excluded.includes("appliance")) {
      out.push("가전 구매를 생략한다면 가구·생활용품·인테리어 비중이 늘어날 수 있어요");
    }
    return out;
  })();

  return (
    <div className="min-h-screen bg-background app-col mx-auto relative">
      <PageHeader
        title={
          <>
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: catInfo.color }}
              aria-hidden
            />
            <span className="truncate">{catInfo.label}</span>
          </>
        }
      />

      <div className="px-4 py-4 pb-24 space-y-4">
        {/* Summary */}
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-foreground">사용 현황</span>
            <span className={cn("text-sm font-bold tabular-nums", spent > budget && budget > 0 ? "text-destructive" : "text-foreground")}>
              {fmt(spent)}만원 {budget > 0 && `/ ${fmt(budget)}만원`}
            </span>
          </div>
          <Progress value={pct} className="h-3 mb-1" />
          {budget > 0 && (
            <p className="text-[10px] text-muted-foreground text-right">{Math.round(pct)}% 사용</p>
          )}
        </div>

        {/* Regional comparison */}
        {avgVal > 0 && (
          <div className="rounded-xl bg-card border border-border p-4">
            <p className="text-xs font-semibold text-foreground mb-3"> {regions[effectiveRegionKey]?.label} 지역 평균 비교</p>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">내 지출</span>
              <span className="font-bold tabular-nums">{fmt(spent)}만원</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">지역 평균</span>
              <span className="font-bold tabular-nums">{fmt(avgVal)}만원</span>
            </div>
            {cat === "meal" && avgWithMeal && (
              <p className="text-[10px] text-muted-foreground text-right mb-3">
                {guestCount}명 × {avgWithMeal.per_guest_meal}만원 기준
              </p>
            )}
            <p className={cn("text-xs font-medium text-center py-2 rounded-lg mt-3",
              diff <= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500")}>
              {diff <= 0
                ? `평균 대비 ${diffPct}% 절약 중이에요 `
                : `평균보다 ${diffPct}% 높아요`}
            </p>
          </div>
        )}

        {/* Style-specific tips — wedding_style/excluded-aware */}
        {styleTips.length > 0 && (
          <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4">
            <p className="text-xs font-semibold text-yellow-900 mb-2 flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5 text-yellow-700" />
              {weddingSettings.wedding_style === "self" ? "셀프웨딩 가이드"
                : weddingSettings.wedding_style === "small" ? "스몰웨딩 가이드"
                : "맞춤 가이드"}
            </p>
            <ul className="space-y-1.5">
              {styleTips.map((tip, i) => (
                <li key={i} className="text-xs text-yellow-900 flex gap-1.5">
                  <span className="shrink-0">•</span> {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Generic saving tips */}
        {tips.length > 0 && (
          <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
            <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5 text-primary" /> 절약 팁
            </p>
            <ul className="space-y-1.5">
              {tips.map((tip, i) => (
                <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                  <span className="text-primary shrink-0">•</span> {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Items */}
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-xs font-semibold text-foreground mb-3">지출 내역</p>
          {catItems.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              아직 기록된 내역이 없어요
            </p>
          ) : (
            <div className="space-y-1">
              {catItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0 group">
                  <button className="flex-1 flex items-center gap-3 text-left"
                    onClick={() => { setEditItem(item); setAddOpen(true); }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground">{format(parseLocalDate(item.item_date), "yyyy.M.d")}</p>
                    </div>
                    <span className="text-sm font-bold text-foreground">{item.amount}만원</span>
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-muted transition-colors md:opacity-0 md:group-hover:opacity-100"
                    onClick={() => setDeleteTarget(item)}
                    aria-label="삭제">
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add button */}
      <div className="fixed bottom-[calc(1.5rem+var(--safe-bottom))] left-0 right-0 app-col mx-auto px-4 z-30">
        <button onClick={() => { setEditItem(null); setAddOpen(true); }}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm shadow-lg">
          + {catInfo.label} 지출 기록하기
        </button>
      </div>

      <BudgetAddSheet open={addOpen} onOpenChange={setAddOpen} editItem={editItem}
        initialCategory={cat}
        weddingDate={weddingSettings.wedding_date}
        onSave={data => {
          if (editItem) {
            updateItem.mutate({ id: editItem.id, ...data } as any, { onSuccess: () => toast({ title: "수정되었습니다" }) });
          } else {
            addItem.mutate({ ...data, category: cat }, { onSuccess: () => toast({ title: "기록되었습니다" }) });
          }
        }} />

      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>이 지출을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  <span className="font-medium text-foreground">{deleteTarget.title}</span>
                  {" "}({fmt(deleteTarget.amount)}만원)을 삭제하면 복구할 수 없어요.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleteTarget) return;
                deleteItem.mutate(deleteTarget.id, {
                  onSuccess: () => toast({ title: "삭제되었습니다" }),
                });
                setDeleteTarget(null);
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BudgetCategoryDetail;
