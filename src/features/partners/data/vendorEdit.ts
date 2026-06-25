// 기업 리스팅(업체/지점) 편집 데이터 접근 레이어 (Task #3 — partners 도메인).
// 패턴: docs/data-access-layer.md. BusinessVendorEdit 의 리스팅 조회·저장·claim RPC 를 모은다.
// 일부 RPC 는 생성 타입에 시그니처가 없어 호출 캐스트가 필요(원 페이지 관용구 유지) — data 레이어에 격리.
// 중복 가드 reason 분기 등 UX 로직은 호출부(페이지)가 그대로 담당.

import { supabase } from "@/integrations/supabase/client";

export interface SaveListingResult {
  ok?: boolean;
  error?: string;
  reason?: string;
  place_id?: string;
  name?: string;
}

export type ListingSaveMode = "new" | "branch" | "single";

/** 현재 리스팅 행 조회. branchParam 있으면 내 지점 목록에서 해당 지점, 없으면 단일 리스팅. 에러 시 throw. */
export async function fetchListingRow(branchParam: string | null): Promise<Record<string, unknown> | null> {
  if (branchParam) {
    const res = await supabase.rpc("get_my_listings" as never);
    if (res.error) throw res.error;
    return Array.isArray(res.data)
      ? ((res.data as Array<Record<string, unknown>>).find((r) => r.place_id === branchParam) ?? null)
      : null;
  }
  const res = await supabase.rpc("get_my_listing");
  if (res.error) throw res.error;
  return Array.isArray(res.data) ? ((res.data[0] as Record<string, unknown>) ?? null) : ((res.data as Record<string, unknown>) ?? null);
}

/**
 * 리스팅 저장 — 모드별 RPC 라우팅.
 *  new=create_my_branch / branch=update_my_branch / single=upsert_my_listing.
 * 전송에러는 { ok:false, error } 로 수렴. 중복/claim reason 은 호출부가 분기.
 */
export async function saveListing(
  mode: ListingSaveMode,
  branchParam: string | null,
  base: Record<string, unknown>,
  branchExtra: Record<string, unknown>,
): Promise<SaveListingResult> {
  let data: unknown;
  let error: { message?: string } | null = null;
  if (mode === "new") {
    ({ data, error } = await supabase.rpc("create_my_branch" as never, { ...base, ...branchExtra } as never));
  } else if (mode === "branch") {
    ({ data, error } = await supabase.rpc("update_my_branch" as never, { p_place_id: branchParam, ...base, ...branchExtra } as never));
  } else {
    ({ data, error } = await supabase.rpc("upsert_my_listing", base as never));
  }
  if (error) return { ok: false, error: error.message };
  return (data as SaveListingResult) ?? { ok: false };
}

/** 기존 업체 소유권 등록(claim) 요청. 성공 여부(boolean) 반환. */
export async function requestPlaceClaim(placeId: string): Promise<boolean> {
  const res = await supabase.rpc("request_place_claim", { p_place_id: placeId } as never);
  return !res.error;
}
