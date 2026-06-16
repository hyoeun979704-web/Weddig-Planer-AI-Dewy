import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWeddingProfile } from "@/hooks/useWeddingProfile";
import {
  buildPersonalizationContext,
  type ConsultingAnalysis,
  type MemoryFactLite,
  type PersonalizationContext,
} from "@/lib/weddingContext";

export interface UseWeddingContextResult {
  context: PersonalizationContext;
  isLoaded: boolean;
}

/**
 * 유기성 배선 Wave 0 — 흩어진 사용자 신호(페르소나·예산·퍼스널컬러 컨설팅·선호 메모리)를
 * 단일 PersonalizationContext 로 합성해 추천 surface 가 재사용하게 한다.
 *
 * 합성 소스:
 *  - useWeddingProfile: persona_mode, wedding_style, total_budget, guest_count
 *  - wedding_consulting_reports(최근 completed 1건).analysis: 퍼스널컬러/실루엣/메탈/메이크업
 *  - user_ai_memory(preference): 스타일 선호 태그
 *
 * 개인화는 **부가 정보**다 — 쿼리 실패·미인증·데이터 없음이면 빈 컨텍스트로 우아하게
 * 떨어져(hasData=false) 호출부는 조건 없이 사용할 수 있다.
 */
export function useWeddingContext(): UseWeddingContextResult {
  const { user } = useAuth();
  const profile = useWeddingProfile();
  const [analysis, setAnalysis] = useState<ConsultingAnalysis | null>(null);
  const [facts, setFacts] = useState<MemoryFactLite[]>([]);
  const [extrasLoaded, setExtrasLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setAnalysis(null);
      setFacts([]);
      setExtrasLoaded(true);
      return;
    }
    setExtrasLoaded(false);
    (async () => {
      try {
        const [reportRes, factRes] = await Promise.all([
          supabase
            .from("wedding_consulting_reports")
            .select("analysis, status, created_at")
            .eq("user_id", user.id)
            .eq("status", "completed")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("user_ai_memory")
            .select("fact_type, fact_text")
            .eq("user_id", user.id)
            .eq("fact_type", "preference")
            .limit(20),
        ]);
        if (cancelled) return;
        setAnalysis((reportRes.data?.analysis as ConsultingAnalysis | undefined) ?? null);
        setFacts(((factRes.data as MemoryFactLite[] | null) ?? []));
      } catch {
        // 개인화는 부가 — 실패 시 빈 컨텍스트로 진행(추천 자체는 동작).
        if (!cancelled) {
          setAnalysis(null);
          setFacts([]);
        }
      } finally {
        if (!cancelled) setExtrasLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const context = useMemo(
    () =>
      buildPersonalizationContext({
        personaMode: profile.personaMode,
        weddingStyle: profile.weddingStyle,
        totalBudget: profile.totalBudget,
        guestCount: profile.guestCount,
        consultingAnalysis: analysis,
        memoryFacts: facts,
      }),
    [
      profile.personaMode,
      profile.weddingStyle,
      profile.totalBudget,
      profile.guestCount,
      analysis,
      facts,
    ],
  );

  return { context, isLoaded: profile.isLoaded && extrasLoaded };
}
