// 에이전트 산출물(agent_outputs) 검토 데이터 접근 레이어 (Task #3 — console 도메인).
// 패턴: docs/data-access-layer.md. AdminAgentOutputs 의 조회 + 승인/반려를 모은다.
// agent_outputs 는 types 에 존재 → (supabase as any) 캐스트 제거.

import { supabase } from "@/integrations/supabase/client";

export interface AgentOutput {
  id: string;
  kind: "draft" | "asset";
  source: string | null;
  title: string;
  body: string | null;
  media_url: string | null;
  deslop_score: number | null;
  issues: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export const agentOutputKeys = {
  all: ["admin", "agentOutputs"] as const,
  list: (status: string) => [...agentOutputKeys.all, "list", status] as const,
};

/** 산출물 목록(최대 200, status 필터). 에러 시 throw. */
export async function fetchAgentOutputs(statusFilter: "all" | string): Promise<AgentOutput[]> {
  let query = supabase.from("agent_outputs").select("*").order("created_at", { ascending: false }).limit(200);
  if (statusFilter !== "all") query = query.eq("status", statusFilter);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as AgentOutput[];
}

/** 산출물 승인/반려 — 처리자·처리시각 함께 기록(내부에서 auth.getUser). 에러 시 throw. */
export async function reviewAgentOutput(id: string, status: "approved" | "rejected"): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("agent_outputs")
    .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: auth.user?.id ?? null } as never)
    .eq("id", id);
  if (error) throw error;
}
