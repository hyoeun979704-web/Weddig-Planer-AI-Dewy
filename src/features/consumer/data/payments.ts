// 하트 충전·구독 결제(카카오페이 charge/subscription edge function + heart_transactions 조회)
// 데이터 접근 레이어 (Task #3 — consumer 도메인). 패턴: dressFitting.ts.
// HeartCharge·HeartChargeSuccess·SubscriptionCheckout·SubscriptionPaymentSuccess 가 공유하는
// 결제 준비/승인 호출과 스타터 패키지 사용여부 조회를 모은다. IAP(in-app purchase)는 @/lib/payments
// 헬퍼가 별도 담당(여기는 카카오페이 edge function + DB 만). 결제 흐름·필드 접근은 그대로 보존.

import { supabase } from "@/integrations/supabase/client";
import type { EdgeResult } from "./orders";

export type { EdgeResult };

export const paymentKeys = {
  all: ["consumer", "payments"] as const,
  starterUsed: (userId: string) => [...paymentKeys.all, "starterUsed", userId] as const,
};

/** 스타터(1회 한정) 하트 패키지를 이미 충전했는지 조회. reason=charge_starter 행 존재 여부. */
export async function fetchStarterUsed(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("heart_transactions")
    .select("id")
    .eq("user_id", userId)
    .eq("reason", "charge_starter")
    .limit(1);
  return (data?.length ?? 0) > 0;
}

/** 하트 충전 결제 준비(kakao-pay-charge-ready). data(EdgeResult) 그대로 반환 — 호출부 분기. */
export async function readyHeartCharge(
  body: Record<string, unknown>,
): Promise<{ data: EdgeResult | null; error: { message?: string } | null }> {
  const { data, error } = await supabase.functions.invoke("kakao-pay-charge-ready", { body });
  return { data: data as EdgeResult | null, error };
}

/** 하트 충전 결제 승인(kakao-pay-charge-approve). data 그대로 반환. */
export async function approveHeartCharge(
  body: Record<string, unknown>,
): Promise<{ data: EdgeResult | null; error: { message?: string } | null }> {
  const { data, error } = await supabase.functions.invoke("kakao-pay-charge-approve", { body });
  return { data: data as EdgeResult | null, error };
}

/** 구독 결제 준비(kakao-pay-ready). data 그대로 반환. */
export async function readySubscription(
  body: Record<string, unknown>,
): Promise<{ data: EdgeResult | null; error: { message?: string } | null }> {
  const { data, error } = await supabase.functions.invoke("kakao-pay-ready", { body });
  return { data: data as EdgeResult | null, error };
}

/** 구독 결제 승인(kakao-pay-approve). data 그대로 반환. */
export async function approveSubscription(
  body: Record<string, unknown>,
): Promise<{ data: EdgeResult | null; error: { message?: string } | null }> {
  const { data, error } = await supabase.functions.invoke("kakao-pay-approve", { body });
  return { data: data as EdgeResult | null, error };
}
