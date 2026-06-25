// 기업회원 등록(온보딩) 데이터 접근 레이어 (Task #3 — partners 도메인).
// 패턴: docs/data-access-layer.md. BusinessOnboard 의 사업자 인증(verify-business edge
// function 호출)과 제휴(프렌즈) 신청 접수를 모은다.

import { supabase } from "@/integrations/supabase/client";

export interface VerifyBusinessPayload {
  business_number: string;
  business_name: string;
  representative_name: string;
  open_date: string;
  business_type: string;
  service_category: string;
  phone: string;
}

export interface VerifyBusinessResult {
  is_verified?: boolean;
  verification_failed?: boolean;
  message?: string;
  error?: string;
}

/**
 * 사업자 정보를 verify-business edge function 으로 보내 국세청 자동 인증 + 프로필 생성.
 * 네트워크 응답은 { ok, data } 로 수렴 — ok=false 면 data.error 가 사유. fetch 자체 예외는 throw.
 */
export async function verifyBusiness(
  payload: VerifyBusinessPayload,
): Promise<{ ok: boolean; data: VerifyBusinessResult }> {
  const { data: { session } } = await supabase.auth.getSession();
  const baseUrl = (import.meta as { env?: { VITE_SUPABASE_URL?: string } }).env?.VITE_SUPABASE_URL ?? "";
  const resp = await fetch(`${baseUrl}/functions/v1/verify-business`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = (await resp.json()) as VerifyBusinessResult;
  return { ok: resp.ok, data };
}

/**
 * 제휴(프렌즈) 신청 접수 — verify-business 가 서버에서 만든 business_profiles 를 조회해
 * partnership_applications 행을 추가한다. 프로필이 아직 없으면 아무것도 안 함.
 * 신청 실패는 가입 흐름을 막지 않도록 호출부가 try/catch 로 감싼다(여기선 에러 throw).
 */
export async function applyPartnership(userId: string): Promise<void> {
  const { data: bp } = await supabase
    .from("business_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!bp?.id) return;
  await supabase.from("partnership_applications").insert({
    business_profile_id: bp.id,
    user_id: userId,
    message: "가입 시 신청",
  });
}
