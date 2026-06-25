// 예산 잔금 결제 기록(pay_balance RPC) 데이터 접근 레이어 (Task #3 — consumer 도메인).
// 패턴: docs/data-access-layer.md. Budget 페이지의 잔금 결제 처리를 모은다.
// 대부분의 예산 CRUD 는 useBudget 훅이 담당하고, 여기는 페이지가 직접 호출하던
// pay_balance RPC 만 추출한다(잔금 항목 INSERT + 원본 balance 해제를 한 트랜잭션 처리).

import { supabase } from "@/integrations/supabase/client";

export const budgetKeys = {
  all: ["consumer", "budget"] as const,
  payBalance: (itemId: string) => [...budgetKeys.all, "payBalance", itemId] as const,
};

/** 잔금 결제 페이로드 — pay_balance RPC 인자와 1:1 대응(named-arg 매칭). */
export interface PayBalanceInput {
  itemId: string;
  payDate: string;
  paymentMethod: string;
  memo: string | null;
}

/**
 * 잔금 결제 기록 — pay_balance RPC 호출. 잔금 항목 INSERT 와 원본 balance 해제를
 * 한 트랜잭션에서 처리하므로 부분 실패로 인한 고아 데이터가 없다. 에러 시 throw
 * (호출부가 토스트로 분기). RPC 시그니처: p_item_id·p_memo·p_pay_date·p_payment_method.
 */
export async function payBalance(input: PayBalanceInput): Promise<void> {
  const { error } = await supabase.rpc("pay_balance", {
    p_item_id: input.itemId,
    p_pay_date: input.payDate,
    p_payment_method: input.paymentMethod,
    p_memo: input.memo as string,
  });
  if (error) throw error;
}
