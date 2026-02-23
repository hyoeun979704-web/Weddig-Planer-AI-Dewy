import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { categories, paidByOptions, type BudgetCategory } from "@/data/budgetData";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { BudgetItem } from "@/hooks/useBudget";

interface BudgetAddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: BudgetItem | null;
  onSave: (item: Omit<BudgetItem, "id" | "user_id" | "created_at">) => void;
}

const categoryKeys: BudgetCategory[] = ["venue", "sdm", "ring", "house", "honeymoon", "etc"];

export default function BudgetAddSheet({ open, onOpenChange, editItem, onSave }: BudgetAddSheetProps) {
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState<BudgetCategory>("venue");
  const [title, setTitle] = useState("");
  const [itemDate, setItemDate] = useState<Date>(new Date());
  const [paidBy, setPaidBy] = useState("shared");
  const [memo, setMemo] = useState("");
  const [hasBalance, setHasBalance] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState(0);
  const [balanceDueDate, setBalanceDueDate] = useState<Date | undefined>();

  useEffect(() => {
    if (open && editItem) {
      setAmount(editItem.amount);
      setCategory(editItem.category as BudgetCategory);
      setTitle(editItem.title);
      setItemDate(new Date(editItem.item_date));
      setPaidBy(editItem.paid_by);
      setMemo(editItem.memo || "");
      setHasBalance(editItem.has_balance);
      setBalanceAmount(editItem.balance_amount || 0);
      setBalanceDueDate(editItem.balance_due_date ? new Date(editItem.balance_due_date) : undefined);
    } else if (open) {
      setAmount(0); setCategory("venue"); setTitle(""); setItemDate(new Date());
      setPaidBy("shared"); setMemo(""); setHasBalance(false); setBalanceAmount(0); setBalanceDueDate(undefined);
    }
  }, [open, editItem]);

  const subItems = categories[category]?.sub_items || [];

  const handleSave = () => {
    if (!title || amount <= 0) return;
    onSave({
      category, title, amount, paid_by: paidBy,
      item_date: format(itemDate, "yyyy-MM-dd"),
      memo: memo || null,
      has_balance: hasBalance,
      balance_amount: hasBalance ? balanceAmount : null,
      balance_due_date: hasBalance && balanceDueDate ? format(balanceDueDate, "yyyy-MM-dd") : null,
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-w-[430px] mx-auto rounded-t-2xl max-h-[85vh] overflow-y-auto pb-8">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base">{editItem ? "지출 수정" : "지출 기록하기"}</SheetTitle>
        </SheetHeader>

        {/* Amount */}
        <div className="mb-4">
          <Label className="text-sm font-semibold mb-1.5 block">금액</Label>
          <div className="flex items-center gap-2">
            <Input type="number" value={amount || ""} onChange={e => setAmount(Number(e.target.value))}
              placeholder="0" className="text-right text-lg font-bold" />
            <span className="text-sm text-muted-foreground">만원</span>
          </div>
        </div>

        {/* Category */}
        <div className="mb-4">
          <Label className="text-sm font-semibold mb-1.5 block">카테고리</Label>
          <div className="flex gap-1.5 flex-wrap">
            {categoryKeys.map(key => (
              <button key={key} onClick={() => setCategory(key)}
                className={cn(
                  "text-xs py-1.5 px-3 rounded-full border transition-all",
                  category === key
                    ? "border-primary bg-primary/10 text-foreground font-bold"
                    : "border-border text-muted-foreground"
                )}>
                {categories[key].emoji} {categories[key].label}
              </button>
            ))}
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
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(itemDate, "yyyy-MM-dd")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={itemDate} onSelect={d => d && setItemDate(d)}
                className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
        </div>

        {/* Paid by */}
        <div className="mb-4">
          <Label className="text-sm font-semibold mb-1.5 block">누가 냈나요?</Label>
          <div className="flex gap-2">
            {paidByOptions.map(opt => (
              <button key={opt.value} onClick={() => setPaidBy(opt.value)}
                className={cn(
                  "flex-1 text-xs py-2 rounded-lg border transition-all",
                  paidBy === opt.value
                    ? "border-primary bg-primary/10 font-bold"
                    : "border-border text-muted-foreground"
                )}>
                {opt.emoji} {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Memo */}
        <div className="mb-4">
          <Label className="text-sm font-semibold mb-1.5 block">메모 (선택)</Label>
          <Textarea value={memo} onChange={e => setMemo(e.target.value)}
            placeholder="예: 잔금 200만원 D-30 전까지" rows={2} />
        </div>

        {/* Balance toggle */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold">잔금이 있나요?</Label>
            <Switch checked={hasBalance} onCheckedChange={setHasBalance} />
          </div>
          {hasBalance && (
            <div className="space-y-3 pl-2 border-l-2 border-primary/20">
              <div className="flex items-center gap-2">
                <Input type="number" value={balanceAmount || ""} onChange={e => setBalanceAmount(Number(e.target.value))}
                  placeholder="잔금 금액" className="text-right" />
                <span className="text-sm text-muted-foreground">만원</span>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal text-sm">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {balanceDueDate ? format(balanceDueDate, "yyyy-MM-dd") : "잔금 납부일 선택"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={balanceDueDate} onSelect={setBalanceDueDate}
                    className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        <Button className="w-full" onClick={handleSave} disabled={!title || amount <= 0}>
          {editItem ? "수정 완료" : "기록하기"}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
