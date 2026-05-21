import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * 위치기반서비스 이용 동의 상태 관리 (location_v1).
 *
 * 듀이는 단말기 GPS 를 직접 수집하지 않고, 회원이 선택·입력한 지역
 * (거주 지역·지역 필터)을 기반으로 인근 업체·지역 통계를 제공한다.
 * 위치정보법상 별도 동의가 필요하므로 설정에서 명시적으로 받는다.
 *
 * 동의·철회 모두 user_consents 에 새 row 로 INSERT 되어 이력이 누적된다.
 *
 *   - undefined — 아직 fetch 중
 *   - null      — 동의 row 없음
 *   - true/false — 회원의 현재 동의 상태
 */

export const LOCATION_CONSENT_TYPE = "location_v1";
export const LOCATION_CONSENT_VERSION = 1;

export type ConsentState = undefined | null | boolean;

export function useLocationConsent() {
  const { user } = useAuth();
  const [state, setState] = useState<ConsentState>(undefined);

  const refresh = useCallback(async () => {
    if (!user) {
      setState(null);
      return;
    }
    const { data } = await (supabase as any)
      .from("user_consents")
      .select("agreed")
      .eq("user_id", user.id)
      .eq("consent_type", LOCATION_CONSENT_TYPE)
      .order("agreed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setState(data ? !!(data as { agreed: boolean }).agreed : null);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setConsent = useCallback(
    async (agreed: boolean) => {
      if (!user) return;
      const ua =
        typeof navigator !== "undefined"
          ? navigator.userAgent?.slice(0, 500)
          : null;
      await (supabase as any).from("user_consents").insert({
        user_id: user.id,
        consent_type: LOCATION_CONSENT_TYPE,
        consent_version: LOCATION_CONSENT_VERSION,
        agreed,
        user_agent: ua,
      });
      setState(agreed);
    },
    [user],
  );

  return { state, setConsent, refresh };
}
