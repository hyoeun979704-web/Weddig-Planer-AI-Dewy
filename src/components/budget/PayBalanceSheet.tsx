import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { paymentMethodOptions } from "@/data/budgetData";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { fmt, manwonToWon } from "@/lib/budgetFormat";
import type { BudgetItem } from "@/hooks/useBudget";

interface PayBalanceSheetProps {
  item: BudgetItem | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: { payDate: string; paymentMethod: string; memo: string | null }) => void;
}

export default function PayBalanceSheet({ item, onOpenChange, onConfirm }: PayBalanceSheetProps) {
  const [payDate, setPayDate] = useState<Date>(new Date());
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [memo, setMemo] = useState("");
  const [dateOpen, setDateOpen] = useState(false);

  useEffect(() => {
    if (item) {
      setPayDate(new Date());
      setPaymentMethod(item.payment_method || "cash");
      setMemo("");
    }
  }, [item]);

  if (!item) return null;
  const balance = item.balance_amount || 0;

  return (
    <Sheet open={!!item} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="app-col mx-auto rounded-t-2xl max-h-[85dvh] overflow-y-auto pb-8">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base">잔금 결제</SheetTitle>
        </SheetHeader>

        <div className="rounded-xl bg-muted p-3 mb-4">
          <p className="text-xs text-muted-foreground mb-0.5">{item.title}</p>
          <p className="text-lg font-bold text-foreground tabular-nums">
            {fmt(balance)}만원
            <span className="text-xs font-normal text-muted-foreground ml-1.5">
              = {manwonToWon(balance).toLocaleString()}원
            </span>
          </p>
        </div>

        <div className="mb-4">
          <Label className="text-sm font-semibold mb-1.5 block">결제일</Label>
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(payDate, "yyyy-MM-dd")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={payDate}
                onSelect={d => { if (d) { setPayDate(d); setDateOpen(false); } }}
                className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>

        <div className="mb-4">
          <Label className="text-sm font-semibold mb-1.5 block">결제수단</Label>
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

        <div className="mb-4">
          <Label className="text-sm font-semibold mb-1.5 block">메모 (선택)</Label>
          <Textarea
            value={memo}
            onChange={e => setMemo(e.target.value)}
            placeholder="예: 카드 할부 6개월"
            rows={2}
          />
        </div>

        <Button
          className="w-full"
          onClick={() => {
            onConfirm({
              payDate: format(payDate, "yyyy-MM-dd"),
              paymentMethod,
              memo: memo.trim() || null,
            });
          }}
        >
          결제 완료로 기록하기
        </Button>
      </SheetContent>
    </Sheet>
  );
}
