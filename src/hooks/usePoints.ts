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

// 포인트 적립/사용 사유 → 한글 라벨 (단일 소스).
// 주의: 키(영문 reason)는 DB·유니크 인덱스의 매칭 값이므로 절대 바꾸지 않는다.
// 표시(라벨)만 한글로 통일한다. (label vs value 분리)
const REASON_LABELS: Record<string, string> = {
  // 적립
  signup_bonus: "가입 보너스",
  signup_bonus_backfill: "가입 보너스",
  merge_game: "꽃 머지 게임",
  merge_game_doubled: "꽃 머지 게임 (광고 2배)",
  ad_view: "광고 시청",
  daily_attendance: "출석 체크",
  attendance_streak_bonus: "연속 출석 보너스",
  mission_bonus: "오늘의 미션 보너스",
  invite_friend: "친구 초대",
  referral_redeemed: "초대 코드 입력",
  referral_reward: "친구 초대 보상",
  first_post: "첫 게시물 작성",
  first_like: "첫 좋아요",
  first_comment: "첫 댓글",
  place_review_first: "첫 업체 후기 작성",
  tutorial_master: "튜토리얼 마스터 보너스",
  // 사용(차감)
  heart_charge: "하트 충전",
  voucher_exchange: "상품권 교환",
  shop_purchase: "쇼핑 구매",
};

// 튜토리얼 완료 사유는 'feature_<레슨/챕터 id>' 로 동적이라 개별 매핑 대신
// 접두사로 통일한다(드리프트 방지).
export const labelForReason = (reason: string): string => {
  if (reason in REASON_LABELS) return REASON_LABELS[reason];
  if (reason.startsWith("feature_")) return "튜토리얼 완료";
  // 미정의 사유도 영문 코드가 그대로 노출되지 않도록 한글 일반 라벨로.
  return "포인트 내역";
};

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
