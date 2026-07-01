// 준비 진행 리워드 훅 — check_planning_milestones RPC 호출(진행 조회 + 미보상분 자동 지급).
// referral 패턴처럼 best-effort. 지급되면 토스트 + 포인트 캐시 무효화.

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  summarizePlanningRewards,
  type PlanningMilestoneRow,
  type PlanningRewardsSummary,
} from "@/lib/planningRewards";

// 모듈 스코프 — 카드 언마운트/재마운트로도 유지된다. 같은 fetch(dataUpdatedAt)의 granted 를
// 두 번 토스트하지 않도록 (userId:dataUpdatedAt) 키로 1회만 처리한다. 컴포넌트 스코프 ref 는
// 재마운트 시 리셋돼 react-query 캐시가 재생하는 옛 granted 를 다시 토스트하는 오탐이 있었다.
const handledGrants = new Set<string>();

export function usePlanningRewards(): { summary: PlanningRewardsSummary; isLoading: boolean } {
  const { user } = useAuth();
  const qc = useQueryClient();

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

  // 새로 지급된 하트가 있으면 1회 안내 + 잔액 갱신. dataUpdatedAt 로 "이번 fetch" 를 식별해
  // 캐시 재생(같은 dataUpdatedAt)에는 재토스트하지 않는다 — 실제 새 지급(새 fetch)만 알린다.
  const grantedAt = query.dataUpdatedAt;
  useEffect(() => {
    const granted = query.data?.granted ?? 0;
    if (granted <= 0 || !user) return;
    const key = `${user.id}:${grantedAt}`;
    if (handledGrants.has(key)) return;
    handledGrants.add(key);
    toast.success(`준비 보상! 하트 ${granted}개 적립 🎉`, {
      description: "준비 단계를 진행해 하트를 받았어요.",
    });
    void qc.invalidateQueries({ queryKey: ["user-points-full"] });
  }, [query.data?.granted, grantedAt, user, qc]);

  return {
    summary: summarizePlanningRewards(query.data ?? null),
    isLoading: query.isLoading,
  };
}
