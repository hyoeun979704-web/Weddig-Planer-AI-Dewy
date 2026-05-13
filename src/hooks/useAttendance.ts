import { useCallback, useEffect, useState } from "react";
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

export const useAttendance = () => {
  const { user } = useAuth();
  const [state, setState] = useState<AttendanceState>({
    lastDate: null,
    currentStreak: 0,
    longestStreak: 0,
    totalCheckIns: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);

  const fetchState = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data } = await supabase
      .from("user_attendance")
      .select("last_date, current_streak, longest_streak, total_check_ins")
      .eq("user_id", user.id)
      .maybeSingle();
    setState({
      lastDate: data?.last_date ?? null,
      currentStreak: data?.current_streak ?? 0,
      longestStreak: data?.longest_streak ?? 0,
      totalCheckIns: data?.total_check_ins ?? 0,
    });
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

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
      await fetchState();
      return result;
    } catch (e) {
      console.error("claim_daily_attendance failed", e);
      return null;
    } finally {
      setIsClaiming(false);
    }
  }, [user, isClaiming, fetchState]);

  const alreadyClaimedToday = state.lastDate === todayKstISO();

  return {
    ...state,
    isLoading,
    isClaiming,
    alreadyClaimedToday,
    claim,
    refetch: fetchState,
  };
};
