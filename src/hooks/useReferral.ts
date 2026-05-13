import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ReferralStats {
  myCode: string | null;
  invitedCount: number;
  hasRedeemed: boolean;
  redeemedCode: string | null;
}

interface RedeemResult {
  redeemed: boolean;
  refereeAmount: number;
  referrerAmount: number;
  message: string;
}

export const useReferral = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ReferralStats>({
    myCode: null,
    invitedCount: 0,
    hasRedeemed: false,
    redeemedCode: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    const [codeRes, asRefereeRes, asReferrerRes] = await Promise.all([
      supabase
        .from("referral_codes")
        .select("code")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("referrals")
        .select("code")
        .eq("referee_user_id", user.id)
        .maybeSingle(),
      supabase
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .eq("referrer_user_id", user.id),
    ]);

    setStats({
      myCode: codeRes.data?.code ?? null,
      invitedCount: asReferrerRes.count ?? 0,
      hasRedeemed: !!asRefereeRes.data,
      redeemedCode: asRefereeRes.data?.code ?? null,
    });
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const generateMyCode = useCallback(async (): Promise<string | null> => {
    if (!user || isWorking) return null;
    setIsWorking(true);
    try {
      const { data, error } = await supabase.rpc("get_or_create_referral_code" as any);
      if (error || !data) return null;
      await fetchStats();
      return data as string;
    } finally {
      setIsWorking(false);
    }
  }, [user, isWorking, fetchStats]);

  const redeemCode = useCallback(
    async (code: string): Promise<RedeemResult | null> => {
      if (!user || isWorking) return null;
      setIsWorking(true);
      try {
        const { data, error } = await supabase.rpc("redeem_referral_code" as any, {
          p_code: code,
        });
        if (error) {
          return {
            redeemed: false,
            refereeAmount: 0,
            referrerAmount: 0,
            message: error.message,
          };
        }
        const row = Array.isArray(data) ? data[0] : (data as any);
        const result: RedeemResult = {
          redeemed: row?.redeemed ?? false,
          refereeAmount: row?.referee_amount ?? 0,
          referrerAmount: row?.referrer_amount ?? 0,
          message: row?.message ?? "",
        };
        if (result.redeemed) {
          await fetchStats();
        }
        return result;
      } finally {
        setIsWorking(false);
      }
    },
    [user, isWorking, fetchStats]
  );

  return {
    ...stats,
    isLoading,
    isWorking,
    generateMyCode,
    redeemCode,
    refetch: fetchStats,
  };
};
