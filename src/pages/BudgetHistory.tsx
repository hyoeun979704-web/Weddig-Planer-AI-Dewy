import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Search, Download, ChevronDown, ChevronRight } from "lucide-react";
import PageHeader from "@/components/PageHeader";
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
import { parseLocalDate } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { fmt } from "@/lib/budgetFormat";
import { relativeTime } from "@/lib/relativeTime";
import type { BudgetItem } from "@/hooks/useBudget";

const sortOptions = ["최신순", "오래된순", "금액 높은순", "금액 낮은순"] as const;
type GroupMode = "month" | "vendor";

const csvEscape = (v: string | number | null | undefined) => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const BudgetHistory = () => {
  const navigate = useNavigate();
  const { items, updateItem, deleteItem, addItem } = useBudget();
  const [catFilter, setCatFilter] = useState<string>("all");
  const [paidFilter, setPaidFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<typeof sortOptions[number]>("최신순");
  const [searchQuery, setSearchQuery] = useState("");
  const [groupMode, setGroupMode] = useState<GroupMode>("month");
  const [expandedVendors, setExpandedVendors] = useState<Record<string, boolean>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<BudgetItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BudgetItem | null>(null);

  let filtered = [...items];
  if (catFilter !== "all") filtered = filtered.filter(i => i.category === catFilter);
  if (paidFilter !== "all") filtered = filtered.filter(i => i.paid_by === paidFilter);

  const q = searchQuery.trim().toLowerCase();
  if (q) {
    filtered = filtered.filter(i =>
      i.title.toLowerCase().includes(q) ||
      (i.memo || "").toLowerCase().includes(q)
    );
  }

  if (sortBy === "오래된순") filtered.sort((a, b) => a.item_date.localeCompare(b.item_date));
  else if (sortBy === "금액 높은순") filtered.sort((a, b) => b.amount - a.amount);
  else if (sortBy === "금액 낮은순") filtered.sort((a, b) => a.amount - b.amount);

  /**
   * Extracts a "vendor key" by stripping payment-stage suffixes like "계약금", "잔금",
   * "예약금" so that "스튜디오A 계약금" and "스튜디오A 잔금" collapse into one group.
   */
  const vendorKeyOf = (title: string) => {
    const stage = paymentStageOptions.map(s => s.label).concat(["잔금", "추가", "추가금", "추가비"]);
    let key = title.trim();
    for (const word of stage) {
      key = key.replace(new RegExp(`\\s*${word}$`), "");
    }
    return key || title;
  };

  // Build groups
  const monthGroups: Record<string, BudgetItem[]> = {};
  const vendorGroups: Record<string, BudgetItem[]> = {};
  filtered.forEach(item => {
    const monthKey = format(parseLocalDate(item.item_date), "yyyy년 M월");
    (monthGroups[monthKey] ||= []).push(item);
    const vkey = `${item.category}|${vendorKeyOf(item.title)}`;
    (vendorGroups[vkey] ||= []).push(item);
  });

  const filteredTotal = filtered.reduce((s, i) => s + i.amount, 0);
  const filteredAvg = filtered.length > 0 ? Math.round(filteredTotal / filtered.length) : 0;
  const isFiltering = catFilter !== "all" || paidFilter !== "all" || q.length > 0;

  const handleExportCsv = () => {
    if (filtered.length === 0) {
      toast({ title: "내보낼 내역이 없어요" });
      return;
    }
    const headers = ["날짜", "카테고리", "항목명", "금액(만원)", "지급자", "결제단계", "결제수단", "잔금(만원)", "잔금일", "메모"];
    const rows = filtered.map(i => [
      i.item_date,
      categories[i.category as BudgetCategory]?.label || i.category,
      i.title,
      i.amount,
      paidByOptions.find(p => p.value === i.paid_by)?.label || i.paid_by,
      paymentStageOptions.find(s => s.value === i.payment_stage)?.label || i.payment_stage || "",
      paymentMethodOptions.find(m => m.value === i.payment_method)?.label || i.payment_method || "",
      i.has_balance && i.balance_amount ? i.balance_amount : "",
      i.balance_due_date || "",
      i.memo || "",
    ]);
    const csv = "﻿" + [headers, ...rows].map(r => r.map(csvEscape).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dewy_budget_${format(new Date(), "yyyyMMdd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "CSV 파일로 내려받았어요" });
  };

  const toggleVendor = (key: string) => {
    setExpandedVendors(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderItemRow = (item: BudgetItem, compact = false) => {
    const cat = categories[item.category as BudgetCategory];
    const pb = paidByOptions.find(p => p.value === item.paid_by);
    const wasEdited = !!item.updated_at && !!item.created_at &&
      new Date(item.updated_at).getTime() - new Date(item.created_at).getTime() > 60_000;
    const editedAgo = wasEdited ? relativeTime(item.updated_at!) : null;
    return (
      <div key={item.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0 group">
        <button className="flex-1 flex items-center gap-3 text-left min-w-0"
          onClick={() => { setEditItem(item); setAddOpen(true); }}>
          {!compact && (
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: cat?.color || "#6B7280" }}
              aria-hidden
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 flex-wrap">
              {format(parseLocalDate(item.item_date), "M.d")} · {pb?.emoji} {pb?.label}
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
              {item.has_balance && item.balance_amount && (
                <span className="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">
                  잔금 {fmt(item.balance_amount)}만
                </span>
              )}
              {editedAgo && (
                <span className="text-muted-foreground/70 italic">· 수정 {editedAgo}</span>
              )}
              {item.memo && ` · ${item.memo}`}
            </p>
          </div>
          <span className="text-sm font-bold text-foreground tabular-nums shrink-0">{fmt(item.amount)}만원</span>
        </button>
        <button className="p-1.5 rounded-lg hover:bg-muted transition-colors md:opacity-0 md:group-hover:opacity-100"
          onClick={() => setDeleteTarget(item)}
          aria-label="삭제">
          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background app-col mx-auto relative">
      <PageHeader
        title="지출 내역"
        rightExtra={
          <button
            onClick={handleExportCsv}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted active:bg-muted/80 transition-colors"
            aria-label="CSV로 내려받기"
            title="CSV 내보내기"
          >
            <Download className="w-5 h-5 text-muted-foreground" />
          </button>
        }
      />

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

      {/* Search */}
      <div className="px-4 pt-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="항목명·메모 검색"
            className="w-full pl-9 pr-3 h-9 rounded-lg border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
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
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5">
            {sortOptions.map(s => (
              <button key={s} type="button" onClick={() => setSortBy(s)}
                className={cn("text-[10px] py-1 px-2 rounded-full border transition-all active:scale-95",
                  sortBy === s ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground")}>
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-muted rounded-full p-0.5">
            <button type="button" onClick={() => setGroupMode("month")}
              className={cn("text-[10px] py-1 px-2.5 rounded-full transition-all active:scale-95",
                groupMode === "month" ? "bg-background text-foreground font-bold shadow-sm" : "text-muted-foreground")}>
              월별
            </button>
            <button type="button" onClick={() => setGroupMode("vendor")}
              className={cn("text-[10px] py-1 px-2.5 rounded-full transition-all active:scale-95",
                groupMode === "vendor" ? "bg-background text-foreground font-bold shadow-sm" : "text-muted-foreground")}>
              항목별
            </button>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="px-4 pb-24">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-16">
            {q ? `'${searchQuery}'에 해당하는 내역이 없어요` : "해당 조건의 지출 내역이 없어요"}
          </p>
        ) : groupMode === "month" ? (
          Object.entries(monthGroups).map(([month, monthItems]) => (
            <div key={month} className="mb-4">
              <div className="flex items-center justify-between py-2">
                <span className="text-xs font-bold text-muted-foreground">{month}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {fmt(monthItems.reduce((s, i) => s + i.amount, 0))}만원 · {monthItems.length}건
                </span>
              </div>
              <div className="space-y-1">
                {monthItems.map(item => renderItemRow(item))}
              </div>
            </div>
          ))
        ) : (
          /* Vendor (title) groups */
          Object.entries(vendorGroups)
            .map(([key, vItems]) => ({ key, items: vItems, total: vItems.reduce((s, i) => s + i.amount, 0) }))
            .sort((a, b) => b.total - a.total)
            .map(({ key, items: vItems, total }) => {
              const first = vItems[0];
              const cat = categories[first.category as BudgetCategory];
              const vendorName = vendorKeyOf(first.title);
              const expanded = expandedVendors[key] ?? (vItems.length === 1);
              const balanceTotal = vItems
                .filter(i => i.has_balance && i.balance_amount)
                .reduce((s, i) => s + (i.balance_amount || 0), 0);
              return (
                <div key={key} className="mb-2 rounded-xl border border-border bg-card">
                  <button
                    type="button"
                    onClick={() => toggleVendor(key)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left active:bg-muted/40 transition-colors"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat?.color || "#6B7280" }}
                      aria-hidden
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{vendorName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {vItems.length}건
                        {balanceTotal > 0 && <> · 잔금 {fmt(balanceTotal)}만원 남음</>}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-foreground tabular-nums">{fmt(total)}만원</span>
                    {expanded
                      ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                      : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                  {expanded && (
                    <div className="border-t border-border px-3 pb-1">
                      {vItems.map(item => renderItemRow(item, true))}
                    </div>
                  )}
                </div>
              );
            })
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
