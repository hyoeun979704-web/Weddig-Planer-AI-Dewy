// 클라이언트 오류 로그(client_error_logs) 관리 데이터 접근 레이어 (Task #3 — console 도메인).
// 패턴: docs/data-access-layer.md. AdminErrorLogs 의 조회 + 오래된 로그 정리를 모은다.
// client_error_logs 는 types 에 존재 → (supabase as any) 캐스트 제거.

import { supabase } from "@/integrations/supabase/client";

export interface ErrorLog {
  id: string;
  user_id: string | null;
  message: string;
  stack: string | null;
  source: string;
  url: string | null;
  user_agent: string | null;
  digest: string | null;
  created_at: string;
}

export interface ErrorLogFilters {
  days: number | null; // null = 전체 기간
  source: "all" | string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const errorLogKeys = {
  all: ["admin", "errorLogs"] as const,
  list: (f: ErrorLogFilters) => [...errorLogKeys.all, "list", f] as const,
};

/** 최근 오류 로그(최대 1000건, 기간·소스 필터). 에러 시 throw. */
export async function fetchErrorLogs(f: ErrorLogFilters): Promise<ErrorLog[]> {
  let query = supabase.from("client_error_logs").select("*").order("created_at", { ascending: false }).limit(1000);
  if (f.days != null) {
    const since = new Date(Date.now() - f.days * DAY_MS).toISOString();
    query = query.gte("created_at", since);
  }
  if (f.source !== "all") query = query.eq("source", f.source);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as ErrorLog[];
}

/** retentionDays 가 지난 로그를 모두 삭제. 에러 시 throw. */
export async function cleanupOldLogs(retentionDays = 30): Promise<void> {
  const cutoff = new Date(Date.now() - retentionDays * DAY_MS).toISOString();
  const { error } = await supabase.from("client_error_logs").delete().lt("created_at", cutoff);
  if (error) throw error;
}
