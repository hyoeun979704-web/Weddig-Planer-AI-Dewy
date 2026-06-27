// 사전알림 신청(service_waitlist) 관리 데이터 접근 레이어 (Task #3 — console 도메인).
// 패턴: docs/data-access-layer.md. AdminServiceWaitlist 의 조회 + 발송처리(단건/일괄)를 모은다.
// service_waitlist 는 types 에 존재 → (supabase as any) 캐스트 제거.

import { supabase } from "@/integrations/supabase/client";

export interface WaitlistEntry {
  id: string;
  user_id: string | null;
  service_id: string;
  contact: string | null;
  notified: boolean;
  created_at: string;
}

export interface WaitlistFilters {
  serviceFilter: "all" | string;
  notifiedFilter: "all" | "pending" | "notified";
}

export const serviceWaitlistKeys = {
  all: ["admin", "serviceWaitlist"] as const,
  list: (f: WaitlistFilters) => [...serviceWaitlistKeys.all, "list", f] as const,
};

/** 사전알림 신청 목록 조회(서비스·발송여부 필터). 에러 시 throw. */
export async function fetchWaitlist(f: WaitlistFilters): Promise<WaitlistEntry[]> {
  let query = supabase.from("service_waitlist").select("*").order("created_at", { ascending: false });
  if (f.serviceFilter !== "all") query = query.eq("service_id", f.serviceFilter);
  if (f.notifiedFilter === "pending") query = query.eq("notified", false);
  else if (f.notifiedFilter === "notified") query = query.eq("notified", true);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as WaitlistEntry[];
}

/** 단건 발송 완료 처리. */
export async function markNotified(id: string): Promise<void> {
  const { error } = await supabase.from("service_waitlist").update({ notified: true } as never).eq("id", id);
  if (error) throw error;
}

/** 미발송 신청 전체를 발송 완료로 일괄 처리. */
export async function markAllNotified(): Promise<void> {
  const { error } = await supabase.from("service_waitlist").update({ notified: true } as never).eq("notified", false);
  if (error) throw error;
}
