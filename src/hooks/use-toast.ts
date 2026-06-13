// 토스트 시스템 단일화 — 앱의 유일한 렌더러는 sonner(App.tsx 의 <Sonner/>) 하나다.
// 이 파일은 레거시 shadcn `toast({ title, description, variant })` 시그니처를 sonner 로
// 어댑트하는 호환 shim(단일 소스). 신규 코드는 `import { toast } from "sonner"` 직접 사용,
// 기존 호출처는 이 shim 으로 동일하게 sonner 출력. (구 shadcn Toaster/toast 프리미티브는 제거됨.)

import * as React from "react";
import { toast as sonnerToast } from "sonner";

type ToastVariant = "default" | "destructive";

interface ToastOptions {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
  /** 토스트 우측 액션 버튼 (예: "충전하기"). sonner action 으로 전달. */
  action?: { label: string; onClick: () => void };
}

const titleString = (val: React.ReactNode): string => {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  return "";
};

function toast(opts: ToastOptions = {}) {
  const titleText = titleString(opts.title);
  const message = titleText || titleString(opts.description);
  const description = titleText ? opts.description : undefined;
  const action = opts.action
    ? { label: opts.action.label, onClick: opts.action.onClick }
    : undefined;

  if (opts.variant === "destructive") {
    sonnerToast.error(message, { description, action });
  } else {
    sonnerToast(message, { description, action });
  }
  return { id: "", dismiss: () => {}, update: () => {} };
}

function useToast() {
  return { toast, toasts: [], dismiss: () => {} };
}

export { toast, useToast };
