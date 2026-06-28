import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * 명령형 금액 입력 다이얼로그 — 앱 내 결제가 아닌 '직접 결정'(식장·업체 선택)의 금액을
 * 사용자가 직접 입력해 예산에 반영하게 한다. 금액은 사람마다 달라 자동값이 없으므로
 * 입력받되, 모르면 '건너뛰기'로 넘어갈 수 있다(강제 아님).
 *
 * 사용:  const amount = await promptAmount({ title: "계약 금액", ... });
 *        if (amount != null) { ...예산 기록... }   // null = 건너뜀/취소
 *
 * confirm-dialog 와 동일한 모듈 싱글톤 패턴 — App 루트에 <AmountPromptHost/> 하나만 마운트.
 */

export interface AmountPromptOptions {
  title: string;
  description?: string;
  /** 입력칸 위 라벨(기본 "금액(만원)"). */
  label?: string;
  confirmText?: string;
  skipText?: string;
}

type Resolver = (amount: number | null) => void;
let emit: ((opts: AmountPromptOptions, resolve: Resolver) => void) | null = null;

export function promptAmount(opts: AmountPromptOptions): Promise<number | null> {
  if (!emit) return Promise.resolve(null); // 호스트 미마운트 — 조용히 건너뜀
  return new Promise<number | null>((resolve) => emit!(opts, resolve));
}

export const AmountPromptHost = () => {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<AmountPromptOptions | null>(null);
  const [value, setValue] = useState("");
  const resolverRef = useRef<Resolver | null>(null);

  useEffect(() => {
    emit = (o, resolve) => {
      setOpts(o);
      setValue("");
      resolverRef.current = resolve;
      setOpen(true);
    };
    return () => { emit = null; };
  }, []);

  // 한 번만 resolve 되도록 보장(바깥클릭·건너뛰기·기록이 동시에 호출돼도 1회).
  const settle = (amount: number | null) => {
    const fn = resolverRef.current;
    resolverRef.current = null;
    setOpen(false);
    fn?.(amount);
  };

  const submit = () => {
    const n = parseInt(value, 10);
    settle(Number.isFinite(n) && n > 0 ? n : null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) settle(null); }}>
      <DialogContent className="max-w-[340px] mx-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>{opts?.title}</DialogTitle>
          {opts?.description && (
            <DialogDescription className="whitespace-pre-line">{opts.description}</DialogDescription>
          )}
        </DialogHeader>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{opts?.label ?? "금액(만원)"}</label>
          <Input
            autoFocus
            type="number"
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder="예: 1500"
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => settle(null)} className="flex-1">
            {opts?.skipText ?? "건너뛰기"}
          </Button>
          <Button onClick={submit} className="flex-1">
            {opts?.confirmText ?? "예산에 기록"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
