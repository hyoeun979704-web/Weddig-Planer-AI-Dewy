// 기업 검토(모더레이션) 데이터 접근 레이어 (Task #3 — console 도메인).
// 패턴: docs/data-access-layer.md. AdminBusinessReview 의 13개 admin_* RPC 를 여기로 모은다.
// 검토 RPC 는 { ok, error } 결과를 반환 — 호출부가 reportReviewFailure 로 원인을 노출(진단 패턴 보존).

import { supabase } from "@/integrations/supabase/client";

export interface PendingBusiness {
  id: string;
  business_name: string;
  business_number: string;
  representative_name: string;
  service_category: string;
  is_verified: boolean | null;
  created_at: string | null;
}
export interface ModListing {
  place_id: string;
  name: string;
  city: string | null;
  category: string;
}
export interface ModEvent {
  id: string;
  title: string;
  description: string | null;
}
export interface ModProduct {
  id: string;
  name: string;
  price: number | null;
}
export interface PartnershipApp {
  id: string;
  business_name: string;
  service_category: string;
  status: string;
  message: string | null;
  created_at: string;
}
export interface BusinessTier {
  id: string;
  business_name: string;
  service_category: string;
  partner_tier: string;
}

export interface PendingModeration {
  businesses: PendingBusiness[];
  listings: ModListing[];
  events: ModEvent[];
  products: ModProduct[];
  applications: PartnershipApp[];
  tiers: BusinessTier[];
  // 핵심 4개 목록(업체·리스팅·이벤트·상품) 중 하나라도 실패하면 true(호출부 토스트용).
  partialError: boolean;
}

/** RPC 결과 표준형 — ok=처리성공, error=원인(forbidden·PGRST 등). */
export interface ReviewResult {
  ok: boolean;
  error?: string;
}

export const businessReviewKeys = {
  all: ["admin", "businessReview"] as const,
  pending: () => [...businessReviewKeys.all, "pending"] as const,
  tiers: () => [...businessReviewKeys.all, "tiers"] as const,
};

const okOf = (data: unknown, error: { message?: string } | null): ReviewResult => {
  const res = data as { ok?: boolean; error?: string } | null;
  if (error || !res?.ok) return { ok: false, error: res?.error || error?.message || "unknown" };
  return { ok: true };
};

/** 검토 대기 6개 목록을 병렬 로드. 목록별 실패는 빈 배열로 격리(부분 실패 허용). */
export async function fetchPendingModeration(): Promise<PendingModeration> {
  const [biz, list, evt, prod, apps, tierList] = await Promise.all([
    supabase.rpc("admin_list_pending_businesses"),
    supabase.rpc("admin_list_pending_listings"),
    supabase.rpc("admin_list_pending_events"),
    supabase.rpc("admin_list_pending_products"),
    supabase.rpc("admin_list_partnership_applications"),
    supabase.rpc("admin_list_business_tiers"),
  ]);
  return {
    businesses: biz.error ? [] : ((biz.data ?? []) as PendingBusiness[]),
    listings: list.error
      ? []
      : ((list.data ?? []) as ModListing[]).map((p) => ({ place_id: p.place_id, name: p.name, city: p.city, category: p.category })),
    events: evt.error
      ? []
      : ((evt.data ?? []) as ModEvent[]).map((e) => ({ id: e.id, title: e.title, description: e.description })),
    products: prod.error
      ? []
      : ((prod.data ?? []) as ModProduct[]).map((p) => ({ id: p.id, name: p.name, price: p.price })),
    applications: apps.error ? [] : ((apps.data ?? []) as PartnershipApp[]),
    tiers: tierList.error ? [] : ((tierList.data ?? []) as BusinessTier[]),
    partialError: Boolean(biz.error || list.error || evt.error || prod.error),
  };
}

/** 제휴 등급 목록만 재조회(제휴 승인·등급변경 후 갱신용). */
export async function fetchBusinessTiers(): Promise<BusinessTier[]> {
  const { data, error } = await supabase.rpc("admin_list_business_tiers");
  if (error) throw error;
  return (data ?? []) as BusinessTier[];
}

/** 제휴(프렌즈) 신청 처리 — 면담/승인/반려. ok 반환. */
export async function reviewPartnership(
  id: string,
  status: "interviewing" | "approved" | "rejected",
): Promise<boolean> {
  const { data, error } = await supabase.rpc("admin_review_partnership", { p_id: id, p_status: status, p_note: null });
  return !error && Boolean((data as { ok?: boolean })?.ok);
}

export async function setBusinessTier(profileId: string, tier: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("admin_set_business_tier", { p_profile_id: profileId, p_tier: tier });
  return !error && Boolean((data as { ok?: boolean })?.ok);
}

export async function reviewProduct(id: string, approved: boolean, note?: string): Promise<ReviewResult> {
  const { data, error } = await supabase.rpc("admin_review_product", { p_id: id, p_approved: approved, p_note: note ?? null });
  return okOf(data, error);
}

export async function reviewEvent(id: string, approved: boolean, note?: string): Promise<ReviewResult> {
  const { data, error } = await supabase.rpc("admin_review_event", { p_id: id, p_approved: approved, p_note: note ?? null });
  return okOf(data, error);
}

export async function reviewListing(placeId: string, approved: boolean, note?: string): Promise<ReviewResult> {
  const { data, error } = await supabase.rpc("admin_review_listing", { p_place_id: placeId, p_approved: approved, p_note: note ?? undefined });
  return okOf(data, error);
}

export async function reviewBusiness(profileId: string, approved: boolean, note?: string): Promise<ReviewResult> {
  const { data, error } = await supabase.rpc("admin_review_business", { p_profile_id: profileId, p_approved: approved, p_note: note ?? undefined });
  return okOf(data, error);
}
