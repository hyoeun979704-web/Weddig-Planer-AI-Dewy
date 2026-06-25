// 주문/스토어 결제(orders·order_items + 카카오페이 주문 결제 edge function) 데이터 접근
// 레이어 (Task #3 — consumer 도메인). 패턴: src/features/consumer/data/dressFitting.ts.
// Checkout·Orders·OrderComplete·PaymentSuccess 가 공유하는 주문 조회·결제 준비/승인 호출을 모은다.
// 결제 흐름은 동작을 그대로 보존한다(에러 메시지·필드 접근·idempotency 는 호출부가 책임).

import { supabase } from "@/integrations/supabase/client";

export interface OrderItemRow {
  id: string;
  product_name: string;
  product_price: number;
  quantity: number;
}

export interface OrderListRow {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  shipping_name: string;
  created_at: string;
  paid_at: string | null;
  order_items: OrderItemRow[];
}

export interface OrderCompleteRow {
  id: string;
  order_number: string;
  total_amount: number;
  shipping_name: string;
  shipping_address: string;
  created_at: string;
}

// 결제 준비/승인 edge function 응답은 success 플래그 + 가변 필드를 가진다(호출부가 직접 접근).
export interface EdgeResult {
  success?: boolean;
  error?: string;
  // 결제 edge function 응답에서 호출부가 직접 읽는 동적 필드들(엔드포인트별 일부만 채워짐).
  tid?: string;
  partner_order_id?: string;
  partner_user_id?: string;
  next_redirect_mobile_url?: string;
  next_redirect_pc_url?: string;
  order_number?: string;
  amount?: number;
  final_amount?: number;
  hearts?: number;
  heartsGranted?: number;
  pointsSpent?: number;
  [key: string]: unknown;
}

export const orderKeys = {
  all: ["consumer", "orders"] as const,
  list: (userId: string) => [...orderKeys.all, "list", userId] as const,
  detail: (id: string) => [...orderKeys.all, "detail", id] as const,
};

/** 내 주문 목록(주문상품 포함, 최신순). 에러 시 빈 배열(기존 동작 보존 — error 면 무시). */
export async function fetchOrders(userId: string): Promise<OrderListRow[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as unknown as OrderListRow[];
}

/** 단일 주문 완료 상세 조회. 없으면 null(기존 동작 — error 무시, data 그대로 set). */
export async function fetchOrderComplete(id: string): Promise<OrderCompleteRow | null> {
  const { data } = await supabase
    .from("orders")
    .select("id, order_number, total_amount, shipping_name, shipping_address, created_at")
    .eq("id", id)
    .single();
  return (data as unknown as OrderCompleteRow | null) ?? null;
}

/** 카카오페이 주문 결제 준비(kakao-pay-order-ready). data(EdgeResult) 그대로 반환 — 호출부가
 *  success/tid/redirect URL 등을 직접 분기한다(에러 흡수하지 않음). error 만 그대로 동봉. */
export async function readyOrderPayment(
  body: Record<string, unknown>,
): Promise<{ data: EdgeResult | null; error: { message?: string } | null }> {
  const { data, error } = await supabase.functions.invoke("kakao-pay-order-ready", { body });
  return { data: data as EdgeResult | null, error };
}

/** 결제 승인. 일반 주문=kakao-pay-order-approve, 디자인 마켓 구매=design-purchase-approve.
 *  isDesign 으로 함수명을 분기(세션 type/URL 기반은 호출부가 판단). data 그대로 반환. */
export async function approveOrderPayment(
  isDesign: boolean,
  body: Record<string, unknown>,
): Promise<{ data: EdgeResult | null; error: { message?: string } | null }> {
  const { data, error } = await supabase.functions.invoke(
    isDesign ? "design-purchase-approve" : "kakao-pay-order-approve",
    { body },
  );
  return { data: data as EdgeResult | null, error };
}
