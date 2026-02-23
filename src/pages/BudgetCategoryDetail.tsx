import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trash2, Lightbulb } from "lucide-react";
import { useBudget } from "@/hooks/useBudget";
import { categories, savingTips, regions, type BudgetCategory } from "@/data/budgetData";
import BudgetAddSheet from "@/components/budget/BudgetAddSheet";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import type { BudgetItem } from "@/hooks/useBudget";

const BudgetCategoryDetail = () => {
  const navigate = useNavigate();
  const { category } = useParams<{ category: string }>();
  const cat = category as BudgetCategory;
  const { settings, items, summary, regionalAverage, updateItem, deleteItem, addItem } = useBudget();
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<BudgetItem | null>(null);

  const catInfo = categories[cat];
  if (!catInfo) return null;

  const spent = summary.categoryTotals[cat] || 0;
  const budget = settings?.category_budgets?.[cat] || 0;
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const avgVal = regionalAverage ? (regionalAverage as any)[cat] : 0;
  const diff = spent - avgVal;
  const diffPct = avgVal > 0 ? Math.round((Math.abs(diff) / avgVal) * 100) : 0;
  const catItems = items.filter(i => i.category === cat);
  const tips = savingTips[cat] || [];

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <div className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
          <h1 className="text-base font-bold text-foreground">{catInfo.emoji} {catInfo.label}</h1>
          <div className="w-5" />
        </div>
      </div>

      <div className="px-4 py-4 pb-24 space-y-4">
        {/* Summary */}
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-foreground">사용 현황</span>
            <span className={cn("text-sm font-bold", spent > budget && budget > 0 ? "text-destructive" : "text-foreground")}>
              {spent}만원 {budget > 0 && `/ ${budget}만원`}
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
            <p className="text-xs font-semibold text-foreground mb-3">📍 {regions[settings?.region || "seoul"]?.label} 지역 평균 비교</p>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">내 지출</span>
              <span className="font-bold">{spent}만원</span>
            </div>
            <div className="flex justify-between text-sm mb-3">
              <span className="text-muted-foreground">지역 평균</span>
              <span className="font-bold">{avgVal}만원</span>
            </div>
            <p className={cn("text-xs font-medium text-center py-2 rounded-lg",
              diff <= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500")}>
              {diff <= 0
                ? `평균 대비 ${diffPct}% 절약 중이에요 👍`
                : `평균보다 ${diffPct}% 높아요`}
            </p>
          </div>
        )}

        {/* Tips */}
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
                      <p className="text-[10px] text-muted-foreground">{format(new Date(item.item_date), "yyyy.M.d")}</p>
                    </div>
                    <span className="text-sm font-bold text-foreground">{item.amount}만원</span>
                  </button>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    onClick={() => deleteItem.mutate(item.id, { onSuccess: () => toast({ title: "삭제되었습니다" }) })}>
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add button */}
      <div className="fixed bottom-6 left-0 right-0 max-w-[430px] mx-auto px-4 z-30">
        <button onClick={() => { setEditItem(null); setAddOpen(true); }}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm shadow-lg">
          + {catInfo.label} 지출 기록하기
        </button>
      </div>

      <BudgetAddSheet open={addOpen} onOpenChange={setAddOpen} editItem={editItem}
        onSave={data => {
          if (editItem) {
            updateItem.mutate({ id: editItem.id, ...data } as any, { onSuccess: () => toast({ title: "수정되었습니다" }) });
          } else {
            addItem.mutate({ ...data, category: cat }, { onSuccess: () => toast({ title: "기록되었습니다" }) });
          }
        }} />
    </div>
  );
};

export default BudgetCategoryDetail;
