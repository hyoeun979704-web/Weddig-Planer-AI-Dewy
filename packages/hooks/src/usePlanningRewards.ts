// 준비 진행 리워드 훅 — check_planning_milestones RPC 호출(진행 조회 + 미보상분 자동 지급).
// referral 패턴처럼 best-effort. 지급되면 토스트 + 포인트 캐시 무효화.

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  summarizePlanningRewards,
  type PlanningMilestoneRow,
  type PlanningRewardsSummary,
} from "@/lib/planningRewards";

export function usePlanningRewards(): { summary: PlanningRewardsSummary; isLoading: boolean } {
  const { user } = useAuth();
  const qc = useQueryClient();
  const toastedRef = useRef(false);

  const query = useQuery<PlanningMilestoneRow | null>({
    queryKey: ["planning-rewards", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("check_planning_milestones");
      if (error) throw error;
      return (Array.isArray(data) ? data[0] : data) as PlanningMilestoneRow | null;
    },
  });

  // 이번 호출에서 새로 지급된 하트가 있으면 1회 안내 + 잔액 갱신.
  useEffect(() => {
    const granted = query.data?.granted ?? 0;
    if (granted > 0 && !toastedRef.current) {
      toastedRef.current = true;
      toast.success(`준비 보상! 하트 ${granted}개 적립 🎉`, {
        description: "준비 단계를 진행해 하트를 받았어요.",
      });
      void qc.invalidateQueries({ queryKey: ["user-points-full"] });
    }
  }, [query.data?.granted, qc]);

  return {
    summary: summarizePlanningRewards(query.data ?? null),
    isLoading: query.isLoading,
  };
}
