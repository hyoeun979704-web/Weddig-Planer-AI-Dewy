import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PointTransaction {
  id: string;
  amount: number;
  reason: string;
  ref_id: string | null;
  balance_after: number;
  created_at: string;
}

const REASON_LABELS: Record<string, string> = {
  signup_bonus: "가입 보너스",
  merge_game: "꽃 머지 게임",
  merge_game_doubled: "꽃 머지 게임 (광고 2배)",
  ad_view: "광고 시청",
  daily_attendance: "출석 체크",
  attendance_streak_bonus: "연속 출석 보너스",
  invite_friend: "친구 초대",
  heart_charge: "하트 충전",
  voucher_exchange: "상품권 교환",
  shop_purchase: "쇼핑 구매",
};

export const labelForReason = (reason: string): string =>
  REASON_LABELS[reason] ?? reason;

export const usePoints = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [totalEarned, setTotalEarned] = useState<number>(0);
  const [totalSpent, setTotalSpent] = useState<number>(0);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchAll = useCallback(async () => {
    if (!user) {
      setBalance(0);
      setTotalEarned(0);
      setTotalSpent(0);
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [balRes, txRes] = await Promise.all([
        supabase
          .from("user_points")
          .select("balance, total_earned, total_spent")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("point_transactions")
          .select("id, amount, reason, ref_id, balance_after, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      setBalance(balRes.data?.balance ?? 0);
      setTotalEarned(balRes.data?.total_earned ?? 0);
      setTotalSpent(balRes.data?.total_spent ?? 0);
      setTransactions((txRes.data ?? []) as PointTransaction[]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    balance,
    totalEarned,
    totalSpent,
    transactions,
    isLoading,
    refetch: fetchAll,
  };
};
