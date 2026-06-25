// AI 생성 현황(agent/AI jobs) 데이터 접근 레이어 (Task #3 — console 도메인).
// 패턴: docs/data-access-layer.md. AdminAIJobs 의 통계·실패목록 RPC 를 모은다.
// RPC 는 types 에 존재 → (supabase as any) 캐스트 제거.

import { supabase } from "@/integrations/supabase/client";

export interface Stat {
  feature: string;
  total: number;
  active: number;
  done: number;
  failed: number;
  stuck: number;
  today: number;
}

export interface Failure {
  report_id: string;
  user_id: string;
  status: string;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export const aiJobKeys = {
  all: ["admin", "aiJobs"] as const,
  overview: () => [...aiJobKeys.all, "overview"] as const,
};

/**
 * AI 잡 통계 + 최근 실패 상세를 병렬 조회.
 * 통계 실패는 throw(화면에 토스트), 실패목록 실패는 빈 배열로 격리(미적용 라이브 방어).
 */
export async function fetchAiJobOverview(): Promise<{ stats: Stat[]; failures: Failure[] }> {
  const [statsRes, failRes] = await Promise.all([
    supabase.rpc("admin_ai_job_stats"),
    supabase.rpc("admin_list_ai_failures", { p_limit: 50 }),
  ]);
  if (statsRes.error) throw statsRes.error;
  return {
    stats: (statsRes.data ?? []) as unknown as Stat[],
    failures: failRes.error ? [] : ((failRes.data ?? []) as unknown as Failure[]),
  };
}
