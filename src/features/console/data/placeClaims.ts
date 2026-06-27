// 업체 소유권 주장(place claims) 검토 데이터 접근 레이어 (Task #3 — console 도메인).
// 패턴: docs/data-access-layer.md. AdminPlaceClaims 의 목록·검토 RPC 를 모은다.
// RPC 는 types 에 존재 → (supabase as any) 캐스트 제거.

import { supabase } from "@/integrations/supabase/client";

export interface Claim {
  id: string;
  place_id: string;
  place_name: string;
  place_city: string | null;
  user_id: string;
  business_number: string | null;
  note: string | null;
  created_at: string;
}

export interface ReviewResult {
  ok: boolean;
  error?: string;
}

export const placeClaimKeys = {
  all: ["admin", "placeClaims"] as const,
  list: () => [...placeClaimKeys.all, "list"] as const,
};

/** 대기 중 소유권 주장 목록 — admin_list_place_claims RPC. 에러 시 throw. */
export async function fetchPlaceClaims(): Promise<Claim[]> {
  const { data, error } = await supabase.rpc("admin_list_place_claims");
  if (error) throw error;
  return (data ?? []) as unknown as Claim[];
}

/** 소유권 주장 승인/반려 — admin_review_place_claim RPC. { ok, error } 반환. */
export async function reviewPlaceClaim(claimId: string, approved: boolean): Promise<ReviewResult> {
  const { data, error } = await supabase.rpc("admin_review_place_claim", { p_claim_id: claimId, p_approved: approved });
  const res = data as { ok?: boolean; error?: string } | null;
  if (error || !res?.ok) return { ok: false, error: res?.error || error?.message };
  return { ok: true };
}
