// 토스트 시스템 단일화 — shadcn toast() 호출은 모두 sonner로 어댑트.
// 기존 use-toast 큐 시스템을 sonner toast 함수로 감싸 시그니처(title·description·variant) 유지.
// 호출처(13개 파일)는 코드 수정 없이 sonner 출력으로 통일.

import * as React from "react";
import { toast as sonnerToast } from "sonner";

type ToastVariant = "default" | "destructive";

interface ToastOptions {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
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

  if (opts.variant === "destructive") {
    sonnerToast.error(message, { description });
  } else {
    sonnerToast(message, { description });
  }
  return { id: "", dismiss: () => {}, update: () => {} };
}

function useToast() {
  return { toast, toasts: [], dismiss: () => {} };
}

export { toast, useToast };
