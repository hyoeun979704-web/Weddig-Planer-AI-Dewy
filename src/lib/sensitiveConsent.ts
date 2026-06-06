// 민감 정보 안전 setter — set_sensitive_preference RPC v2 wrapper.
// v2 RPC 가 다음을 server 측에서 강제:
//   - p_field → consent_type 매핑 (client 변조 불가)
//   - active 상태 변화 여부 비교 → agreed 자동 도출, 실제 전환 시에만 user_consents INSERT
//   - INSERT … ON CONFLICT (user_id) DO UPDATE — race-safe
//   - extra_patch 키 sub-allowlist (pregnant 만 pregnancy_due_date 허용)
//
// TODO: supabase gen types typescript 재실행 후 (supabase as any) 제거해 컴파일
// 타임 시그니처 검증 회복. 현재는 RPC 신규/시그니처 변경이라 types.ts 미반영.

import { supabase } from "@/integrations/supabase/client";

export type SensitiveField =
  | "pregnant"
  | "marital_history"
  | "has_children"
  | "has_parents_bride"
  | "has_parents_groom";

export interface SetSensitivePreferenceArgs {
  field: SensitiveField;
  /** boolean 또는 marital_history 의 'first'/'remarriage'/null. */
  value: boolean | "first" | "remarriage" | null;
  /** pregnant 일 때 pregnancy_due_date 동시 patch (선택). */
  extraPatch?: Record<string, unknown>;
  /** 동의 정책 버전. 기본 1, v2 정책 도입 시 호출자가 올림. */
  consentVersion?: number;
}

export interface SetSensitivePreferenceResult {
  /** consent 행이 실제 INSERT 됐는지 — server 가 active 상태 전환을 감지했을 때만 true. */
  consentRecorded: boolean;
  oldActive: boolean;
  newActive: boolean;
}

/**
 * 민감 정보 컬럼 + 동의 기록을 single transaction 으로 안전 처리.
 * 실패 시 throw. user_agent 는 navigator.userAgent 자동 캡처 — 호출자가 추가 정보 줄 필요 X.
 */
export async function setSensitivePreference(
  args: SetSensitivePreferenceArgs,
): Promise<SetSensitivePreferenceResult> {
  const userAgent =
    typeof navigator !== "undefined" ? navigator.userAgent?.slice(0, 500) ?? null : null;

  const { data, error } = await (supabase as any).rpc("set_sensitive_preference", {
    p_field: args.field,
    // F#8 — undefined 가 들어오면 supabase-js 가 키 자체를 omit → PostgREST 'function not found'.
    // null coerce 로 항상 명시 전달. RPC 측에도 DEFAULT 'null'::jsonb 있음 (이중 안전).
    p_value: args.value ?? null,
    p_consent_version: args.consentVersion ?? 1,
    p_user_agent: userAgent,
    p_extra_patch: args.extraPatch ?? null,
  });
  if (error) throw error;
  // Round 15 P1 fix — PostgREST RPC 가 function-not-found / RLS 거부 / supabase-js
  // network short-circuit 으로 `{data: null, error: null}` 반환 시 두 가드 모두 통과
  // → silent success. ConfirmFlow 가 markConfirmed + toast.success + reload 실행하지만
  // DB 미반영 → 다음 세션에 또 confirm card 노출(loop). 명시 가드.
  if (data == null) {
    throw new Error("set_sensitive_preference returned no data — RPC may not be deployed");
  }
  if (typeof data === "object" && data.ok === false) {
    const err = new Error(String(data.error ?? "set_sensitive_preference failed"));
    (err as any).rpcError = data;
    throw err;
  }
  return {
    consentRecorded: !!(data && data.consent_recorded),
    oldActive: !!(data && data.old_active),
    newActive: !!(data && data.new_active),
  };
}
