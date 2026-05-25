import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * 데이터 수집 동의 상태 관리.
 *
 * consent_type='data_collection_v1' 의 가장 최근 row 를 확인:
 *   - undefined (loading) — 아직 fetch 중
 *   - null    — 동의 row 없음 (첫 사용자, 모달 띄워야 함)
 *   - true    — 동의함, 정보 수집 진행
 *   - false   — 거부함, 정보 수집 모달 띄우지 말 것
 *
 * agree() / refuse() 호출 시 새 row 가 user_consents 에 INSERT 되어
 * 이력이 누적된다 (PIPA 준수).
 */

export const DATA_COLLECTION_CONSENT_TYPE = "data_collection_v1";
export const DATA_COLLECTION_CONSENT_VERSION = 1;

export type ConsentState = undefined | null | boolean;

export function useDataCollectionConsent() {
  const { user } = useAuth();
  const [state, setState] = useState<ConsentState>(undefined);

  const refresh = useCallback(async () => {
    if (!user) {
      setState(null);
      return;
    }
    // Round 10 — canonical view 로 reads 통일. backfill synthesized + 레거시 분리
    // 전 type 제외. data_collection_v1 자체는 backfill 대상 아니지만 reader 규약 일관성.
    const { data } = await (supabase as any)
      .from("user_consents_canonical")
      .select("agreed, consent_version")
      .eq("user_id", user.id)
      .eq("consent_type", DATA_COLLECTION_CONSENT_TYPE)
      .order("agreed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) {
      setState(null);
      return;
    }
    // 버전이 더 낮으면 재동의 필요 → null 로 취급
    if ((data as { consent_version?: number }).consent_version <
      DATA_COLLECTION_CONSENT_VERSION) {
      setState(null);
      return;
    }
    setState(!!(data as { agreed: boolean }).agreed);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const writeConsent = useCallback(
    async (agreed: boolean) => {
      if (!user) return;
      const ua =
        typeof navigator !== "undefined"
          ? navigator.userAgent?.slice(0, 500)
          : null;
      // Round 15 P1 fix — insert error 미체크 회귀. RLS / network / unique violation
      // 실패 시 silent → UI 는 consent 완료로 보이지만 DB 미반영 → PIPA-gated 다운스트림
      // 코드가 false premise 로 실행. error throw 로 caller 가 catch 하도록.
      const { error: insertError } = await (supabase as any).from("user_consents").insert({
        user_id: user.id,
        consent_type: DATA_COLLECTION_CONSENT_TYPE,
        consent_version: DATA_COLLECTION_CONSENT_VERSION,
        agreed,
        user_agent: ua,
      });
      if (insertError) throw insertError;
      setState(agreed);
    },
    [user],
  );

  return {
    /** undefined=loading, null=no consent yet, true/false=user decision */
    state,
    agree: () => writeConsent(true),
    refuse: () => writeConsent(false),
    refresh,
  };
}
