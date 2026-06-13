import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

/**
 * 명령형 확인 다이얼로그. window.confirm 을 앱 디자인의 AlertDialog 로 대체한다.
 * 사용:  if (await confirm({ title: "삭제할까요?", destructive: true })) { ... }
 *
 * 모듈 싱글톤 — 앱 루트에 <ConfirmDialogHost/> 를 한 번 마운트하면, 어디서든
 * confirm() 을 호출해 Promise<boolean> 을 받는다(웹뷰에서 못생긴 네이티브
 * confirm 제거 + 톤 일관성).
 */

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  /** 파괴적 동작(삭제 등) — 확인 버튼을 위험 색으로 */
  destructive?: boolean;
}

type Resolver = (ok: boolean) => void;
let emit: ((opts: ConfirmOptions, resolve: Resolver) => void) | null = null;

export function confirm(opts: ConfirmOptions): Promise<boolean> {
  if (!emit) {
    // 호스트 미마운트 — 안전 폴백(네이티브 confirm). 정상 앱에선 발생 안 함.
    return Promise.resolve(typeof window !== "undefined" ? window.confirm(opts.title) : false);
  }
  return new Promise<boolean>((resolve) => emit!(opts, resolve));
}

export const ConfirmDialogHost = () => {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<{ fn: Resolver } | null>(null);

  useEffect(() => {
    emit = (o, resolve) => {
      setOpts(o);
      setResolver({ fn: resolve });
      setOpen(true);
    };
    return () => { emit = null; };
  }, []);

  const settle = (ok: boolean) => {
    resolver?.fn(ok);
    setResolver(null);
    setOpen(false);
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => { if (!o) settle(false); }}
    >
      <AlertDialogContent className="max-w-[340px] mx-auto rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{opts?.title}</AlertDialogTitle>
          {opts?.description && (
            <AlertDialogDescription className="whitespace-pre-line">
              {opts.description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => settle(false)}>
            {opts?.cancelText ?? "취소"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => settle(true)}
            className={cn(opts?.destructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
          >
            {opts?.confirmText ?? "확인"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
