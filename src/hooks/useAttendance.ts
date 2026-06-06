import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const todayKstISO = (): string => {
  // KST 기준 오늘 날짜 (YYYY-MM-DD)
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
  const kst = new Date(utc + 9 * 60 * 60_000);
  return kst.toISOString().slice(0, 10);
};

interface AttendanceState {
  lastDate: string | null;
  currentStreak: number;
  longestStreak: number;
  totalCheckIns: number;
}

interface ClaimResult {
  claimed: boolean;
  baseAmount: number;
  bonusAmount: number;
  currentStreak: number;
  totalEarned: number;
}

const DEFAULT_STATE: AttendanceState = {
  lastDate: null,
  currentStreak: 0,
  longestStreak: 0,
  totalCheckIns: 0,
};

// React Query 로 전환 — 홈(PersonaDashboard)과 Points 페이지가 동시에 마운트해도
// 같은 queryKey 로 캐시 공유 → 중복 fetch 제거. claim 은 성공 시 invalidate.
export const useAttendance = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isClaiming, setIsClaiming] = useState(false);

  const { data: state = DEFAULT_STATE, isLoading, refetch } = useQuery<AttendanceState>({
    queryKey: ["attendance", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      if (!user) return DEFAULT_STATE;
      const { data } = await supabase
        .from("user_attendance")
        .select("last_date, current_streak, longest_streak, total_check_ins")
        .eq("user_id", user.id)
        .maybeSingle();
      return {
        lastDate: data?.last_date ?? null,
        currentStreak: data?.current_streak ?? 0,
        longestStreak: data?.longest_streak ?? 0,
        totalCheckIns: data?.total_check_ins ?? 0,
      };
    },
  });

  const claim = useCallback(async (): Promise<ClaimResult | null> => {
    if (!user || isClaiming) return null;
    setIsClaiming(true);
    try {
      const { data, error } = await supabase.rpc("claim_daily_attendance" as any);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : (data as any);
      const result: ClaimResult = {
        claimed: row?.claimed ?? false,
        baseAmount: row?.base_amount ?? 0,
        bonusAmount: row?.bonus_amount ?? 0,
        currentStreak: row?.current_streak ?? 0,
        totalEarned: row?.total_earned ?? 0,
      };
      await queryClient.invalidateQueries({ queryKey: ["attendance", user.id] });
      return result;
    } catch (e) {
      console.error("claim_daily_attendance failed", e);
      return null;
    } finally {
      setIsClaiming(false);
    }
  }, [user, isClaiming, queryClient]);

  const alreadyClaimedToday = state.lastDate === todayKstISO();

  return {
    ...state,
    isLoading: !!user && isLoading,
    isClaiming,
    alreadyClaimedToday,
    claim,
    refetch,
  };
};
