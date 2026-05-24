// 민감 정보 동의 기록 헬퍼 — PIPA 의무 + v2 §5 Sensitive Info.
//
// 사용자가 임신·재혼·부모 부재 같은 민감 신호를 ON/OFF 할 때마다 user_consents 에
// agreed=true/false 행을 적어 감사 추적 보장. 여러 진입 경로(모달·MyPage·확인 카드)
// 가 같은 동의 로깅 의무를 지므로 단일 헬퍼로 통일.

import { supabase } from "@/integrations/supabase/client";

export type SensitiveConsentType =
  | "sensitive_health_pregnancy_v1"
  | "sensitive_family_remarriage_v1"
  | "sensitive_family_no_parents_v1";

/**
 * 사용자 동의 기록 INSERT. 실패 시 throw — 호출자가 catch.
 * Supabase 응답의 error 필드를 명시적으로 throw 로 변환.
 */
export async function recordSensitiveConsent(
  userId: string,
  consentType: SensitiveConsentType,
  agreed: boolean,
): Promise<void> {
  const { error } = await (supabase as any).from("user_consents").insert({
    user_id: userId,
    consent_type: consentType,
    consent_version: 1,
    agreed,
    user_agent:
      typeof navigator !== "undefined"
        ? navigator.userAgent?.slice(0, 500)
        : null,
  });
  if (error) throw error;
}

/**
 * 사용자 wedding settings 의 민감 필드 한 개를 안전하게 토글.
 * - upsert (onConflict=user_id) — user_wedding_settings 행이 없어도 신규 생성
 * - Supabase {error} 명시 체크 — await 만으론 안 throw 됨
 * - 동의 기록(agreed=true/false) 함께 INSERT
 *
 * 호출자는 try/catch 로 감싸 toast 분기. 본 함수는 에러 던지기 책임만.
 */
export async function setSensitivePreference(args: {
  userId: string;
  field: "pregnant" | "marital_history" | "has_parents_bride" | "has_parents_groom";
  value: boolean | "first" | "remarriage" | null;
  consentType: SensitiveConsentType;
  /** true = ON 전환(agreed=true) / false = OFF 전환(agreed=false) */
  agreedForConsent: boolean;
  /** 추가 패치 — pregnancy_due_date 같이 같이 저장. 선택. */
  extraPatch?: Record<string, unknown>;
}): Promise<void> {
  const { userId, field, value, consentType, agreedForConsent, extraPatch } = args;
  const patch: Record<string, unknown> = { user_id: userId, [field]: value, ...(extraPatch ?? {}) };
  const { error } = await (supabase as any)
    .from("user_wedding_settings")
    .upsert(patch, { onConflict: "user_id" });
  if (error) throw error;
  // 동의 기록은 본 트랜잭션과 별도 — 일단 컬럼 저장 성공 후 기록. 실패해도
  // 컬럼은 저장된 상태이므로 caller 가 retry 가능.
  await recordSensitiveConsent(userId, consentType, agreedForConsent);
}
