// 민감 정보 동의 기록 헬퍼 — PIPA 의무 + v2 §5 Sensitive Info.
//
// 단일 SECURITY DEFINER RPC(set_sensitive_preference) 호출로 column upsert +
// consent INSERT 를 한 트랜잭션에서 처리 — 둘 중 하나 실패 시 rollback 되어
// PIPA orphan(column 만 저장된 채 consent 없는 상태) 회피. F#1 회귀 수정.

import { supabase } from "@/integrations/supabase/client";

export type SensitiveConsentType =
  | "sensitive_health_pregnancy_v1"
  | "sensitive_family_remarriage_v1"
  // bride/groom 분리 — 한 consent_type 으로 두 컬럼 토글하면 audit 가 어느 쪽
  // 변경인지 구별 못함(F#10). 별도 enum 으로 분리.
  | "sensitive_family_no_parents_bride_v1"
  | "sensitive_family_no_parents_groom_v1";

/**
 * 사용자 wedding settings 의 민감 필드 한 개를 안전하게 토글.
 * RPC 가 column + consent 를 atomic 처리. 실패 시 throw — 호출자가 catch.
 *
 * @param recordConsent — false 시 consent INSERT 생략. 같은 ON 상태에서 다른 컬럼
 *   patch 만 갱신할 때(예: pregnancy_due_date 추가 입력) 사용. 중복 consent 회피.
 */
export async function setSensitivePreference(args: {
  field: "pregnant" | "marital_history" | "has_parents_bride" | "has_parents_groom";
  value: boolean | "first" | "remarriage" | null;
  consentType: SensitiveConsentType;
  agreedForConsent: boolean;
  recordConsent?: boolean;
  extraPatch?: Record<string, unknown>;
}): Promise<void> {
  const {
    field,
    value,
    consentType,
    agreedForConsent,
    recordConsent = true,
    extraPatch,
  } = args;

  const { data, error } = await (supabase as any).rpc("set_sensitive_preference", {
    p_field: field,
    p_value: value,
    p_consent_type: consentType,
    p_agreed_for_consent: agreedForConsent,
    p_record_consent: recordConsent,
    p_extra_patch: extraPatch ?? null,
  });
  if (error) throw error;
  if (data && typeof data === "object" && data.ok === false) {
    throw new Error(String(data.error ?? "set_sensitive_preference failed"));
  }
}

