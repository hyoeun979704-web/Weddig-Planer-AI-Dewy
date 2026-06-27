// 기업 쿠폰(business_coupons) 데이터 접근 레이어 (Task #3 — partners 도메인).
// 패턴: docs/data-access-layer.md. BusinessCoupons 의 쿠폰 조회·발행·삭제를 모은다.
// business_coupons 는 types 에 존재 → 페이지의 (supabase as any) 캐스트 제거.

import { supabase } from "@/integrations/supabase/client";

export interface Coupon {
  id: string;
  title: string;
  discount_text: string;
  min_order_won: number | null;
  expires_at: string | null;
  is_active: boolean;
  moderation_status: string;
  moderation_note: string | null;
}

export interface NewCoupon {
  place_id: string;
  owner_user_id: string;
  title: string;
  discount_text: string;
  min_order_won: number | null;
  expires_at: string | null;
}

export const businessCouponKeys = {
  all: ["partners", "businessCoupons"] as const,
  place: (placeId: string) => [...businessCouponKeys.all, placeId] as const,
};

/** 한 업체의 쿠폰 목록(최신순) 조회. 에러 시 throw. */
export async function fetchBusinessCoupons(placeId: string): Promise<Coupon[]> {
  const { data, error } = await supabase
    .from("business_coupons")
    .select("id, title, discount_text, min_order_won, expires_at, is_active, moderation_status, moderation_note")
    .eq("place_id", placeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Coupon[];
}

/** 쿠폰 발행. 운영자 검토 대기 상태로 저장. 에러 시 throw. */
export async function addBusinessCoupon(payload: NewCoupon): Promise<void> {
  const { error } = await supabase.from("business_coupons").insert(payload as never);
  if (error) throw error;
}

/** 쿠폰 삭제. 에러 시 throw. */
export async function deleteBusinessCoupon(id: string): Promise<void> {
  const { error } = await supabase.from("business_coupons").delete().eq("id", id);
  if (error) throw error;
}
