// 운영자 그룹 대시보드 데이터 접근 레이어 (Task #3 — console 도메인).
// 패턴: docs/data-access-layer.md. AdminGroupDashboard 의 그룹별 pending 카운트 집계를 여기로 모은다.
// AdminDashboard 에서 검증된 쿼리만 재사용(컬럼 정확성 리스크 0). 테이블은 types 에 존재 → 캐스트 제거.

import { supabase } from "@/integrations/supabase/client";

export const groupDashboardKeys = {
  all: ["admin", "groupDashboard"] as const,
  pending: (group: string) => [...groupDashboardKeys.all, group, "pending"] as const,
};

/** 그룹별 처리 대기 건수(href → count). 그룹에 해당 없으면 빈 객체. */
export async function fetchGroupPendingCounts(group: string): Promise<Record<string, number>> {
  const next: Record<string, number> = {};
  if (group === "commerce") {
    const [ev, cp] = await Promise.all([
      supabase.from("business_events").select("id", { count: "exact", head: true }).eq("moderation_status", "pending"),
      supabase.from("business_coupons").select("id", { count: "exact", head: true }).eq("moderation_status", "pending"),
    ]);
    next["/admin/content-review"] = (ev.count ?? 0) + (cp.count ?? 0);
  } else if (group === "moderation") {
    const wl = await supabase.from("service_waitlist").select("id", { count: "exact", head: true }).eq("notified", false);
    next["/admin/service-waitlist"] = wl.count ?? 0;
  } else if (group === "ai") {
    const f = await supabase.from("dress_fittings").select("id", { count: "exact", head: true }).eq("status", "pending");
    next["/admin/ai-jobs"] = f.count ?? 0;
  }
  return next;
}
