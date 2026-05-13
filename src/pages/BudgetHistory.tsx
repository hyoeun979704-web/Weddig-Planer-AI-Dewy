import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useBudget } from "@/hooks/useBudget";
import { categories, categoryKeys, paidByOptions, paymentStageOptions, paymentMethodOptions, type BudgetCategory } from "@/data/budgetData";
import BudgetAddSheet from "@/components/budget/BudgetAddSheet";
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
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { BudgetItem } from "@/hooks/useBudget";

const fmt = (n: number) => n.toLocaleString();

const sortOptions = ["최신순", "오래된순", "금액 높은순", "금액 낮은순"] as const;

const BudgetHistory = () => {
  const navigate = useNavigate();
  const { items, updateItem, deleteItem, addItem } = useBudget();
  const [catFilter, setCatFilter] = useState<string>("all");
  const [paidFilter, setPaidFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<typeof sortOptions[number]>("최신순");
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<BudgetItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BudgetItem | null>(null);

  let filtered = [...items];
  if (catFilter !== "all") filtered = filtered.filter(i => i.category === catFilter);
  if (paidFilter !== "all") filtered = filtered.filter(i => i.paid_by === paidFilter);

  if (sortBy === "오래된순") filtered.sort((a, b) => a.item_date.localeCompare(b.item_date));
  else if (sortBy === "금액 높은순") filtered.sort((a, b) => b.amount - a.amount);
  else if (sortBy === "금액 낮은순") filtered.sort((a, b) => a.amount - b.amount);

  // Group by month
  const grouped: Record<string, BudgetItem[]> = {};
  filtered.forEach(item => {
    const key = format(new Date(item.item_date), "yyyy년 M월");
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  const filteredTotal = filtered.reduce((s, i) => s + i.amount, 0);
  const filteredAvg = filtered.length > 0 ? Math.round(filteredTotal / filtered.length) : 0;
  const isFiltering = catFilter !== "all" || paidFilter !== "all";

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <div className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate(-1)} className="active:scale-90 transition-transform">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-base font-bold text-foreground">지출 내역</h1>
          <div className="w-5" />
        </div>
      </div>

      {/* Summary */}
      <div className="px-4 pt-3">
        <div className="rounded-2xl bg-card border border-border p-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">
              {isFiltering ? "필터 합계" : "전체 합계"} · {filtered.length}건
            </p>
            <p className="text-lg font-bold text-foreground tabular-nums">{fmt(filteredTotal)}만원</p>
          </div>
          {filtered.length > 0 && (
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">건당 평균</p>
              <p className="text-sm font-semibold text-foreground tabular-nums">{fmt(filteredAvg)}만원</p>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 pt-3 pb-2 space-y-2">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          <button type="button" onClick={() => setCatFilter("all")}
            className={cn("text-xs py-1 px-3 rounded-full border whitespace-nowrap transition-all active:scale-95",
              catFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground")}>
            전체
          </button>
          {categoryKeys.map(k => (
            <button key={k} type="button" onClick={() => setCatFilter(k)}
              className={cn("text-xs py-1 px-3 rounded-full border whitespace-nowrap transition-all active:scale-95",
                catFilter === k ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground")}>
              {categories[k].emoji} {categories[k].label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["all", ...paidByOptions.map(p => p.value)].map(v => {
            const opt = paidByOptions.find(p => p.value === v);
            return (
              <button key={v} type="button" onClick={() => setPaidFilter(v)}
                className={cn("text-xs py-1 px-3 rounded-full border transition-all active:scale-95",
                  paidFilter === v ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground")}>
                {v === "all" ? "전체" : `${opt?.emoji} ${opt?.label}`}
              </button>
            );
          })}
        </div>
        <div className="flex gap-1.5">
          {sortOptions.map(s => (
            <button key={s} type="button" onClick={() => setSortBy(s)}
              className={cn("text-[10px] py-1 px-2 rounded-full border transition-all active:scale-95",
                sortBy === s ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground")}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="px-4 pb-24">
        {Object.entries(grouped).map(([month, monthItems]) => (
          <div key={month} className="mb-4">
            <div className="flex items-center justify-between py-2">
              <span className="text-xs font-bold text-muted-foreground">{month}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {fmt(monthItems.reduce((s, i) => s + i.amount, 0))}만원
              </span>
            </div>
            <div className="space-y-1">
              {monthItems.map(item => {
                const cat = categories[item.category as BudgetCategory];
                const pb = paidByOptions.find(p => p.value === item.paid_by);
                return (
                  <div key={item.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0 group">
                    <button className="flex-1 flex items-center gap-3 text-left"
                      onClick={() => { setEditItem(item); setAddOpen(true); }}>
                      <span className="text-lg">{cat?.emoji || "📋"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 flex-wrap">
                          {format(new Date(item.item_date), "M.d")} · {pb?.emoji} {pb?.label}
                          {item.payment_stage && (
                            <span className="bg-accent text-accent-foreground px-1.5 py-0.5 rounded">
                              {paymentStageOptions.find(s => s.value === item.payment_stage)?.label || item.payment_stage}
                            </span>
                          )}
                          {item.payment_method && item.payment_method !== "cash" && (
                            <span className="bg-muted px-1.5 py-0.5 rounded">
                              {paymentMethodOptions.find(m => m.value === item.payment_method)?.emoji}
                            </span>
                          )}
                          {item.memo && ` · ${item.memo}`}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-foreground tabular-nums">{fmt(item.amount)}만원</span>
                    </button>
                    <button className="p-1.5 rounded-lg hover:bg-muted transition-colors md:opacity-0 md:group-hover:opacity-100"
                      onClick={() => setDeleteTarget(item)}
                      aria-label="삭제">
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-16">해당 조건의 지출 내역이 없어요</p>
        )}
      </div>

      <BudgetAddSheet open={addOpen} onOpenChange={setAddOpen} editItem={editItem}
        onSave={data => {
          if (editItem) {
            updateItem.mutate({ id: editItem.id, ...data } as any, { onSuccess: () => toast({ title: "수정되었습니다" }) });
          } else {
            addItem.mutate(data, { onSuccess: () => toast({ title: "기록되었습니다" }) });
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

export default BudgetHistory;
