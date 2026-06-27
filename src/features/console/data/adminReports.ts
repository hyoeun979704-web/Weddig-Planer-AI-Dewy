// 커뮤니티 신고 관리 데이터 접근 레이어 (Task #3 — console 도메인).
// 패턴: docs/data-access-layer.md. AdminReports 의 신고 조회(admin_reports_overview 뷰) +
// 상태 변경(community_reports) + 대상 콘텐츠 강제삭제를 모은다. 테이블·뷰 모두 types 에 존재 →
// (supabase as any) 캐스트 제거.

import { supabase } from "@/integrations/supabase/client";
import type { ReportReasonCode } from "@/hooks/useCommunityModeration";

export type ReportStatus = "pending" | "reviewing" | "actioned" | "dismissed";

export interface ReportRow {
  report_id: string;
  reporter_id: string;
  target_type: "post" | "comment";
  target_id: string;
  reason_code: ReportReasonCode;
  reason_text: string | null;
  status: ReportStatus;
  reported_at: string;
  resolved_at: string | null;
  target_preview: string | null;
  target_author_id: string | null;
}

export interface ReportFilters {
  statusFilter: "all" | ReportStatus;
  typeFilter: "all" | "post" | "comment";
}

export const adminReportKeys = {
  all: ["admin", "reports"] as const,
  list: (f: ReportFilters) => [...adminReportKeys.all, "list", f] as const,
};

/** 신고 목록 조회(admin_reports_overview 뷰, 상태·유형 필터). 에러 시 throw. */
export async function fetchReports(f: ReportFilters): Promise<ReportRow[]> {
  let query = supabase.from("admin_reports_overview").select("*").order("reported_at", { ascending: false });
  if (f.statusFilter !== "all") query = query.eq("status", f.statusFilter);
  if (f.typeFilter !== "all") query = query.eq("target_type", f.typeFilter);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as ReportRow[];
}

/**
 * 신고 상태 변경. actioned/dismissed 로 바꾸면 처리자(현재 운영자)·처리시각을 함께 기록.
 * 처리자 식별을 위해 내부에서 auth.getUser 를 호출한다.
 */
export async function updateReportStatus(reportId: string, status: ReportStatus): Promise<void> {
  const { data: userResp } = await supabase.auth.getUser();
  const update: Record<string, unknown> = { status };
  if (status === "actioned" || status === "dismissed") {
    update.resolved_at = new Date().toISOString();
    update.resolved_by = userResp.user?.id;
  }
  const { error } = await supabase.from("community_reports").update(update as never).eq("id", reportId);
  if (error) throw error;
}

/** 신고 대상 콘텐츠(게시글/댓글) 강제 삭제. 에러 시 throw. */
export async function deleteReportTarget(targetType: "post" | "comment", targetId: string): Promise<void> {
  const table = targetType === "post" ? "community_posts" : "community_comments";
  const { error } = await supabase.from(table as never).delete().eq("id" as never, targetId as never);
  if (error) throw error;
}
