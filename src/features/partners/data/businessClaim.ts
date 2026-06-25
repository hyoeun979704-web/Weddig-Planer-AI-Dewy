// 기존 업체 관리권한 요청(claim) 데이터 접근 레이어 (Task #3 — partners 도메인).
// 패턴: docs/data-access-layer.md. BusinessClaim 의 주인 없는 업체 검색 + claim RPC 를 모은다.

import { supabase } from "@/integrations/supabase/client";
import { escapeLikePattern } from "@/lib/postgrestEscape";

export interface PlaceRow {
  place_id: string;
  name: string;
  city: string | null;
  category: string | null;
}

export interface ClaimResult {
  ok?: boolean;
  error?: string;
}

/** 아직 주인 없는(owner_user_id null) 업체를 이름으로 검색(최대 20건). 에러 시 throw. */
export async function searchClaimablePlaces(term: string): Promise<PlaceRow[]> {
  const { data, error } = await supabase
    .from("places")
    .select("place_id,name,city,category,owner_user_id")
    .ilike("name", `%${escapeLikePattern(term)}%`)
    .is("owner_user_id", null)
    .limit(20);
  if (error) throw error;
  return (data ?? []) as PlaceRow[];
}

/** 관리권한(claim) 요청 RPC. 결과 객체({ ok, error })를 그대로 반환 — 전송 에러도 흡수해 reason 분기를 호출부에 맡긴다. */
export async function requestPlaceClaim(placeId: string): Promise<ClaimResult> {
  const { data, error } = await supabase.rpc("request_place_claim", { p_place_id: placeId });
  if (error) return { ok: false, error: error.message };
  return (data as ClaimResult) ?? { ok: false };
}
