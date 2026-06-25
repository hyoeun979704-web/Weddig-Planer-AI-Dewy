// 기업 콘텐츠 검토(이벤트·쿠폰) 데이터 접근 레이어 (Task #3 — console 도메인).
// 패턴: docs/data-access-layer.md. AdminContentReview 의 business_events/business_coupons 조회 +
// 검토(이벤트=admin_review_event RPC, 쿠폰=직접 update)를 여기로 모은다.

import { supabase } from "@/integrations/supabase/client";

export interface BusinessEvent {
  id: string;
  place_id: string;
  owner_user_id: string;
  title: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  banner_image_url: string | null;
  detail_images: string[] | null;
  moderation_status: string;
  moderation_note: string | null;
  created_at: string;
}

export interface BusinessCoupon {
  id: string;
  place_id: string;
  owner_user_id: string;
  title: string;
  discount_text: string;
  min_order_won: number | null;
  expires_at: string | null;
  is_active: boolean;
  moderation_status: string;
  moderation_note: string | null;
  created_at: string;
}

export interface ReviewResult {
  ok: boolean;
  error?: string;
}

const COUPON_SELECT =
  "id, place_id, owner_user_id, title, discount_text, min_order_won, expires_at, is_active, moderation_status, moderation_note, created_at";

export const contentReviewKeys = {
  all: ["admin", "contentReview"] as const,
  pending: (filter: "pending" | "all") => [...contentReviewKeys.all, filter] as const,
};

/** 검토 대기(또는 전체) 이벤트·쿠폰 병렬 조회. events 는 컬럼 드리프트 방어로 select(*). */
export async function fetchPendingContent(filter: "pending" | "all"): Promise<{
  events: BusinessEvent[];
  coupons: BusinessCoupon[];
}> {
  let eventsQ = supabase.from("business_events").select("*").order("created_at", { ascending: false });
  if (filter === "pending") eventsQ = eventsQ.eq("moderation_status", "pending");

  let couponsQ = supabase.from("business_coupons").select(COUPON_SELECT).order("created_at", { ascending: false });
  if (filter === "pending") couponsQ = couponsQ.eq("moderation_status", "pending");

  const [eRes, cRes] = await Promise.all([eventsQ, couponsQ]);
  return {
    events: (eRes.data ?? []) as unknown as BusinessEvent[],
    coupons: (cRes.data ?? []) as unknown as BusinessCoupon[],
  };
}

/**
 * 이벤트 검토 — admin_review_event RPC(SECURITY DEFINER, has_role 강제).
 * business_events 에 admin UPDATE RLS 가 없어 직접 update 는 무동작(dead-end)이라 RPC 경로.
 */
export async function reviewEvent(id: string, approved: boolean, note: string | null): Promise<ReviewResult> {
  const { data, error } = await supabase.rpc("admin_review_event", { p_id: id, p_approved: approved, p_note: note });
  const res = data as { ok?: boolean; error?: string } | null;
  if (error || res?.ok === false) return { ok: false, error: error?.message || res?.error };
  return { ok: true };
}

/**
 * 쿠폰 검토 — 직접 update. (admin_review_coupon RPC·admin UPDATE RLS 미구현으로 현재 동작 제한적,
 * 백엔드 확정 전까지 기존 동작 유지 — docs/audit-surface-console.md P0.)
 */
export async function setCouponModeration(id: string, status: "approved" | "rejected", note: string | null): Promise<void> {
  const { error } = await supabase
    .from("business_coupons")
    .update({ moderation_status: status, moderation_note: note } as never)
    .eq("id", id);
  if (error) throw error;
}
