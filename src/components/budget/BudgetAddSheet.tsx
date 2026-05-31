import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { categories, categoryKeys, paidByOptions, paymentStageOptions, paymentMethodOptions, type BudgetCategory } from "@/data/budgetData";
import { CalendarIcon, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { format, differenceInDays, isAfter, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { fmt, manwonToWon } from "@/lib/budgetFormat";
import type { BudgetItem } from "@/hooks/useBudget";

// 50,000만원 = 5억원. Catches unit-confusion oopses (typing 100000 thinking
// 1억원) without nagging legitimate big-ticket entries like a 1억원 신혼집
// down payment.
const LARGE_AMOUNT_THRESHOLD = 50000;
const FAR_FUTURE_THRESHOLD_DAYS = 540; // ~1.5y — wedding prep often starts D-365+

interface BudgetAddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: BudgetItem | null;
  initialCategory?: BudgetCategory;
  initialTitle?: string;
  /** When provided, "far future" date warning uses this instead of the
   *  static 540-day threshold. Lets us be tolerant of legitimate D-365+
   *  early bookings but still flag obvious year-typo mistakes. */
  weddingDate?: string | null;
  onSave: (item: Omit<BudgetItem, "id" | "user_id" | "created_at" | "updated_at">) => void;
  /** Budget categories the user hasn't excluded via wedding style. Falls back to all 6. */
  visibleCategoryKeys?: BudgetCategory[];
}

const LAST_CATEGORY_KEY = "dewy.budget.lastCategory";

const getRememberedCategory = (allowed: BudgetCategory[]): BudgetCategory => {
  if (typeof window === "undefined") return allowed[0] ?? "venue";
  const stored = window.localStorage.getItem(LAST_CATEGORY_KEY) as BudgetCategory | null;
  return stored && allowed.includes(stored) ? stored : (allowed[0] ?? "venue");
};

export default function BudgetAddSheet({
  open, onOpenChange, editItem, initialCategory, initialTitle, weddingDate, onSave, visibleCategoryKeys,
}: BudgetAddSheetProps) {
  // When the caller passes a filtered category list, restrict picker rendering
  // + "remembered last category" fallback to those. Defaults to all 10.
  const visibleKeys = visibleCategoryKeys ?? categoryKeys;
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState<BudgetCategory>("venue");
  const [title, setTitle] = useState("");
  const [itemDate, setItemDate] = useState<Date>(new Date());
  const [paidBy, setPaidBy] = useState("shared");
  const [paymentStage, setPaymentStage] = useState("full");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [memo, setMemo] = useState("");
  const [hasBalance, setHasBalance] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState(0);
  const [balanceDueDate, setBalanceDueDate] = useState<Date | undefined>();
  const [dateOpen, setDateOpen] = useState(false);
  const [balanceDateOpen, setBalanceDateOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

  useEffect(() => {
    if (open && editItem) {
      setAmount(editItem.amount);
      setCategory(editItem.category as BudgetCategory);
      setTitle(editItem.title);
      setItemDate(new Date(editItem.item_date));
      setPaidBy(editItem.paid_by);
      setPaymentStage(editItem.payment_stage || "full");
      setPaymentMethod(editItem.payment_method || "cash");
      setMemo(editItem.memo || "");
      setHasBalance(editItem.has_balance);
      setBalanceAmount(editItem.balance_amount || 0);
      setBalanceDueDate(editItem.balance_due_date ? new Date(editItem.balance_due_date) : undefined);
      const hasNonDefault =
        (editItem.payment_stage && editItem.payment_stage !== "full") ||
        (editItem.payment_method && editItem.payment_method !== "cash") ||
        !!editItem.memo;
      setAdvancedOpen(!!hasNonDefault);
    } else if (open) {
      setAmount(0);
      setCategory(initialCategory || getRememberedCategory(visibleKeys));
      setTitle(initialTitle || ""); setItemDate(new Date());
      setPaidBy("shared"); setPaymentStage("full"); setPaymentMethod("cash");
      setMemo(""); setHasBalance(false); setBalanceAmount(0); setBalanceDueDate(undefined);
      setAdvancedOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editItem, initialCategory, initialTitle]);

  const subItems = categories[category]?.sub_items || [];

  // Validation flags. When we know wedding_date, "far future" = item_date
  // beyond the wedding (the user almost certainly mistyped a year). When we
  // don't, fall back to a static ~1.5y window (wedding prep can start at
  // D-365+; we don't want to nag legitimate early bookings).
  const today = startOfDay(new Date());
  const itemDateIsFuture = isAfter(startOfDay(itemDate), today);
  const itemDateDaysAhead = itemDateIsFuture ? differenceInDays(startOfDay(itemDate), today) : 0;
  const weddingTs = weddingDate ? startOfDay(new Date(weddingDate + "T00:00:00")) : null;
  const isFarFuture = weddingTs
    ? isAfter(startOfDay(itemDate), weddingTs)
    : itemDateDaysAhead > FAR_FUTURE_THRESHOLD_DAYS;
  const isLargeAmount = amount >= LARGE_AMOUNT_THRESHOLD;
  const needsConfirmation = isLargeAmount || isFarFuture;

  const commitSave = () => {
    if (typeof window !== "undefined" && !editItem) {
      window.localStorage.setItem(LAST_CATEGORY_KEY, category);
    }
    onSave({
      category, title, amount, paid_by: paidBy,
      payment_stage: paymentStage,
      payment_method: paymentMethod,
      item_date: format(itemDate, "yyyy-MM-dd"),
      memo: memo || null,
      has_balance: hasBalance,
      balance_amount: hasBalance ? balanceAmount : null,
      balance_due_date: hasBalance && balanceDueDate ? format(balanceDueDate, "yyyy-MM-dd") : null,
    });
    onOpenChange(false);
  };

  const handleSave = () => {
    if (!title || amount <= 0) return;
    if (needsConfirmation) {
      setConfirmSaveOpen(true);
      return;
    }
    commitSave();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-w-[430px] mx-auto rounded-t-2xl max-h-[85dvh] overflow-y-auto pb-8">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base">{editItem ? "지출 수정" : "지출 기록하기"}</SheetTitle>
        </SheetHeader>

        {/* Amount */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <Label className="text-sm font-semibold">금액</Label>
            <span className="text-[10px] text-muted-foreground">1만원 단위 · 32만 5천원 → 32.5</span>
          </div>
          <div className="flex items-center gap-2">
            <Input type="number" inputMode="decimal" step="0.1" value={amount || ""}
              onChange={e => setAmount(Number(e.target.value))}
              placeholder="0" className="text-right text-lg font-bold no-spinner" />
            <span className="text-sm text-muted-foreground">만원</span>
          </div>
          {amount > 0 && (
            <p className="text-[10px] text-muted-foreground mt-1 text-right tabular-nums">
              = {manwonToWon(amount).toLocaleString()}원
              {amount >= 10000 && <span className="text-yellow-700"> · 금액이 너무 큰 건 아닌가요?</span>}
              {amount > 0 && amount < 0.1 && <span className="text-yellow-700"> · 금액이 너무 작은 건 아닌가요?</span>}
            </p>
          )}
        </div>

        {/* Category — render all 10. Hidden-by-style categories show dimmed
            but stay selectable so the user can record one-off expenses
            (예: 셀프웨딩 + 친구 스튜디오 살짝 이용한 경우) without going
            to the schedule tab to unexclude first. */}
        <div className="mb-4">
          <Label className="text-sm font-semibold mb-1.5 block">카테고리</Label>
          <div className="flex gap-1.5 flex-wrap">
            {categoryKeys.map(key => {
              const isHidden = !visibleKeys.includes(key);
              return (
                <button key={key} type="button" onClick={() => setCategory(key)}
                  className={cn(
                    "text-xs py-1.5 px-3 rounded-full border transition-all active:scale-95",
                    category === key
                      ? "border-primary bg-primary/10 text-foreground font-bold"
                      : isHidden
                        ? "border-dashed border-muted-foreground/30 text-muted-foreground/60"
                        : "border-border text-muted-foreground"
                  )}>
                  {categories[key].emoji} {categories[key].label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Title with sub-item suggestions */}
        <div className="mb-4">
          <Label className="text-sm font-semibold mb-1.5 block">항목명</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 웨딩홀 계약금" />
          {subItems.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-1.5">
              {subItems.map(s => (
                <button key={s} onClick={() => setTitle(s)}
                  className="text-[10px] py-0.5 px-2 rounded-full bg-muted text-muted-foreground hover:bg-primary/10">
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date */}
        <div className="mb-4">
          <Label className="text-sm font-semibold mb-1.5 block">날짜</Label>
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn(
                "w-full justify-start text-left font-normal",
                itemDateIsFuture && "border-yellow-400 bg-yellow-50"
              )}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(itemDate, "yyyy-MM-dd")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={itemDate}
                onSelect={d => { if (d) { setItemDate(d); setDateOpen(false); } }}
                className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          {itemDateIsFuture && (
            <p className="text-[11px] text-yellow-700 mt-1 flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              미래 날짜({itemDateDaysAhead}일 뒤)예요. 실제 결제일이 맞나요?
            </p>
          )}
        </div>

        {/* Paid by */}
        <div className="mb-4">
          <Label className="text-sm font-semibold mb-1.5 block">누가 냈나요?</Label>
          <div className="flex gap-2">
            {paidByOptions.map(opt => (
              <button key={opt.value} type="button" onClick={() => setPaidBy(opt.value)}
                className={cn(
                  "flex-1 text-xs py-2 rounded-lg border transition-all active:scale-95",
                  paidBy === opt.value
                    ? "border-primary bg-primary/10 font-bold"
                    : "border-border text-muted-foreground"
                )}>
                {opt.emoji} {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <button
            type="button"
            onClick={() => setAdvancedOpen(o => !o)}
            className="flex items-center justify-between w-full text-left py-1"
          >
            <span className="text-xs font-medium text-muted-foreground">
              결제 단계 · 결제수단 · 메모
            </span>
            {advancedOpen
              ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
              : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
          {advancedOpen && (
            <div className="mt-3 space-y-4">
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">결제 단계</Label>
                <div className="flex gap-2">
                  {paymentStageOptions.map(opt => (
                    <button key={opt.value} type="button" onClick={() => setPaymentStage(opt.value)}
                      className={cn(
                        "flex-1 text-xs py-2 rounded-lg border transition-all active:scale-95",
                        paymentStage === opt.value
                          ? "border-primary bg-primary/10 font-bold"
                          : "border-border text-muted-foreground"
                      )}>
                      {opt.emoji} {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1.5 block">결제수단</Label>
                <div className="flex gap-1.5 flex-wrap">
                  {paymentMethodOptions.map(opt => (
                    <button key={opt.value} type="button" onClick={() => setPaymentMethod(opt.value)}
                      className={cn(
                        "text-xs py-1.5 px-3 rounded-full border transition-all active:scale-95",
                        paymentMethod === opt.value
                          ? "border-primary bg-primary/10 font-bold"
                          : "border-border text-muted-foreground"
                      )}>
                      {opt.emoji} {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1.5 block">메모</Label>
                <Textarea value={memo} onChange={e => setMemo(e.target.value)}
                  placeholder="예: 잔금 200만원 D-30 전까지" rows={2} />
              </div>
            </div>
          )}
        </div>

        {/* Balance toggle */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold">잔금이 있나요?</Label>
            <Switch checked={hasBalance} onCheckedChange={setHasBalance} />
          </div>
          {hasBalance && (
            <div className="space-y-3 pl-2 border-l-2 border-primary/20">
              <div>
                <div className="flex items-center gap-2">
                  <Input type="number" inputMode="decimal" step="0.1" value={balanceAmount || ""}
                    onChange={e => setBalanceAmount(Number(e.target.value))}
                    placeholder="잔금 금액 (만원)" className="text-right no-spinner" />
                  <span className="text-sm text-muted-foreground">만원</span>
                </div>
                {balanceAmount > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 text-right tabular-nums">
                    = {manwonToWon(balanceAmount).toLocaleString()}원
                  </p>
                )}
              </div>
              <Popover open={balanceDateOpen} onOpenChange={setBalanceDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal text-sm">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {balanceDueDate ? format(balanceDueDate, "yyyy-MM-dd") : "잔금 납부일 선택"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={balanceDueDate}
                    onSelect={d => { setBalanceDueDate(d); if (d) setBalanceDateOpen(false); }}
                    className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
              {balanceAmount > 0 && amount > 0 && (
                <p className="text-[11px] text-muted-foreground px-2">
                  계약 총액 약 <b className="text-foreground tabular-nums">{fmt(amount + balanceAmount)}만원</b>
                  {balanceAmount > amount && (
                    <span> · 잔금이 더 큰 건 결혼 업계에서 일반적이에요</span>
                  )}
                </p>
              )}
            </div>
          )}
        </div>

        {(!title || amount <= 0) && (
          <p className="text-[11px] text-muted-foreground text-center mb-2">
            {!title && amount <= 0
              ? "항목명과 금액을 입력해주세요"
              : !title ? "항목명을 입력해주세요" : "금액을 입력해주세요"}
          </p>
        )}
        <Button className="w-full" onClick={handleSave} disabled={!title || amount <= 0}>
          {editItem ? "수정 완료" : "기록하기"}
        </Button>
      </SheetContent>

      <AlertDialog open={confirmSaveOpen} onOpenChange={setConfirmSaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>입력 내용을 다시 확인해주세요</AlertDialogTitle>
            <AlertDialogDescription className="space-y-1.5">
              {isLargeAmount && (
                <span className="block">
                  · 금액이 <b className="text-foreground">{fmt(amount)}만원</b> ({manwonToWon(amount).toLocaleString()}원)이에요.
                  단위가 맞나요? (1만원 단위 입력)
                </span>
              )}
              {isFarFuture && (
                <span className="block">
                  · 날짜가 <b className="text-foreground">{itemDateDaysAhead}일 뒤</b>({format(itemDate, "yyyy-MM-dd")})로
                  설정돼 있어요. 너무 먼 미래는 아닌가요?
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>다시 확인</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmSaveOpen(false); commitSave(); }}>
              이대로 저장
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
