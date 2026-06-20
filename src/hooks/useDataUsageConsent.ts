import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CONSENT } from "@/lib/consentDefinitions";

/**
 * 마케팅·서비스 개선 목적 데이터 활용 동의(선택).
 *
 * 핵심 서비스 제공 외 목적(이벤트·혜택 안내 등 마케팅, 서비스·AI 추천 품질 개선)에
 * 회원 정보를 활용하려면 PIPA 상 별도(선택) 동의가 필요하다. 이 훅이 그 동의 상태를
 * 관리한다. (외부 AI 모델 학습은 범위에서 제외)
 *
 * user_consents 에 consent_type='data_usage_v1' 로 동의/철회 이력을 누적한다.
 * 가장 최근 row 가 현재 상태이며, row 가 없으면 미동의(false)로 본다(opt-in 기본 OFF).
 */

export const DATA_USAGE_CONSENT_TYPE = CONSENT.dataUsage.type;
export const DATA_USAGE_CONSENT_VERSION = CONSENT.dataUsage.version;

export function useDataUsageConsent() {
  const { user } = useAuth();
  // undefined=loading, boolean=현재 동의 여부(없으면 false)
  const [state, setState] = useState<boolean | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setState(false);
      return;
    }
    const { data } = await (supabase as any)
      .from("user_consents")
      .select("agreed")
      .eq("user_id", user.id)
      .eq("consent_type", DATA_USAGE_CONSENT_TYPE)
      .order("agreed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setState(!!(data as { agreed?: boolean } | null)?.agreed);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const set = useCallback(
    async (agreed: boolean) => {
      if (!user) return;
      setSaving(true);
      try {
        const ua =
          typeof navigator !== "undefined" ? navigator.userAgent?.slice(0, 500) : null;
        const { error } = await (supabase as any).from("user_consents").insert({
          user_id: user.id,
          consent_type: DATA_USAGE_CONSENT_TYPE,
          consent_version: DATA_USAGE_CONSENT_VERSION,
          agreed,
          user_agent: ua,
        });
        if (error) throw error;
        setState(agreed);
      } finally {
        setSaving(false);
      }
    },
    [user],
  );

  return { state, saving, set, refresh };
}
