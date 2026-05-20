import { useState, useCallback, useEffect } from "react";
import { Loader2, Filter, Check, X, Trash2, Eye } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { REPORT_REASON_LABELS, type ReportReasonCode } from "@/hooks/useCommunityModeration";

// 어드민 신고 처리 페이지.
//
// 데이터 소스 : public.admin_reports_overview 뷰
//   - underlying community_reports 의 admin_select_all_reports 정책으로
//     admin 만 조회 가능.
//   - 대상 게시글·댓글의 미리보기·작성자가 조인되어 한 줄로 옴.
//
// 액션 :
//   - pending → reviewing : 검토 시작
//   - reviewing → actioned : 조치 완료 (필요 시 콘텐츠 강제 삭제)
//   - * → dismissed : 신고 기각
//   - 강제 삭제 : admin_delete_any_post / admin_delete_any_comment 정책으로 가능

type ReportStatus = "pending" | "reviewing" | "actioned" | "dismissed";

interface ReportRow {
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

const STATUS_LABELS: Record<ReportStatus, string> = {
  pending: "접수",
  reviewing: "검토 중",
  actioned: "조치 완료",
  dismissed: "기각",
};

const STATUS_COLORS: Record<ReportStatus, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  reviewing: "bg-blue-100 text-blue-800 border-blue-200",
  actioned: "bg-green-100 text-green-800 border-green-200",
  dismissed: "bg-slate-100 text-slate-700 border-slate-200",
};

const AdminReports = () => {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | ReportStatus>("pending");
  const [typeFilter, setTypeFilter] = useState<"all" | "post" | "comment">("all");

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    let query = (supabase as any)
      .from("admin_reports_overview")
      .select("*")
      .order("reported_at", { ascending: false });

    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (typeFilter !== "all") query = query.eq("target_type", typeFilter);

    const { data, error } = await query;
    if (error) {
      toast({
        title: "불러오기 실패",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setReports((data ?? []) as ReportRow[]);
    }
    setIsLoading(false);
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const updateStatus = async (reportId: string, status: ReportStatus) => {
    const { data: userResp } = await supabase.auth.getUser();
    const me = userResp.user?.id;

    const update: Record<string, unknown> = { status };
    if (status === "actioned" || status === "dismissed") {
      update.resolved_at = new Date().toISOString();
      update.resolved_by = me;
    }

    const { error } = await supabase
      .from("community_reports")
      .update(update)
      .eq("id", reportId);

    if (error) {
      toast({
        title: "처리 실패",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: `상태를 '${STATUS_LABELS[status]}' 로 변경했습니다` });
    fetchReports();
  };

  const deleteTargetContent = async (report: ReportRow) => {
    if (!confirm("대상 콘텐츠를 강제 삭제하고 신고를 '조치 완료' 로 처리하시겠어요?\n복구할 수 없습니다.")) return;

    const table = report.target_type === "post" ? "community_posts" : "community_comments";
    const { error } = await supabase.from(table).delete().eq("id", report.target_id);

    if (error) {
      toast({
        title: "삭제 실패",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    await updateStatus(report.report_id, "actioned");
    toast({ title: "콘텐츠 삭제 + 신고 조치 완료" });
  };

  const pendingCount = reports.filter((r) => r.status === "pending").length;

  return (
    <AdminGuard>
      <AdminLayout
        title="커뮤니티 신고 처리"
        description="사용자가 접수한 게시글·댓글 신고 검토"
      >
        {/* 필터 */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                <SelectItem value="pending">접수</SelectItem>
                <SelectItem value="reviewing">검토 중</SelectItem>
                <SelectItem value="actioned">조치 완료</SelectItem>
                <SelectItem value="dismissed">기각</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 유형</SelectItem>
              <SelectItem value="post">게시글</SelectItem>
              <SelectItem value="comment">댓글</SelectItem>
            </SelectContent>
          </Select>
          {pendingCount > 0 && statusFilter !== "pending" && (
            <Badge variant="outline" className="ml-auto">
              미처리 {pendingCount} 건
            </Badge>
          )}
        </div>

        {/* 목록 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : reports.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            해당 조건의 신고가 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <ReportCard
                key={report.report_id}
                report={report}
                onUpdateStatus={updateStatus}
                onDeleteContent={deleteTargetContent}
              />
            ))}
          </div>
        )}
      </AdminLayout>
    </AdminGuard>
  );
};

interface ReportCardProps {
  report: ReportRow;
  onUpdateStatus: (id: string, status: ReportStatus) => Promise<void>;
  onDeleteContent: (report: ReportRow) => Promise<void>;
}

const ReportCard = ({ report, onUpdateStatus, onDeleteContent }: ReportCardProps) => {
  const navigateToTarget = () => {
    if (report.target_type === "post") {
      window.open(`/community/${report.target_id}`, "_blank");
    } else {
      // 댓글은 부모 게시글 자체로 점프 (앵커는 향후 구현).
      // 우선 콘텐츠 미리보기로 검토 가능.
    }
  };

  return (
    <div className="border border-border rounded-2xl p-4 bg-card">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={STATUS_COLORS[report.status]}>
            {STATUS_LABELS[report.status]}
          </Badge>
          <Badge variant="outline">
            {report.target_type === "post" ? "게시글" : "댓글"}
          </Badge>
          <Badge variant="outline">{REPORT_REASON_LABELS[report.reason_code]}</Badge>
        </div>
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {new Date(report.reported_at).toLocaleString("ko-KR")}
        </span>
      </div>

      <div className="bg-muted/50 rounded-lg p-3 mb-3">
        <p className="text-sm text-foreground line-clamp-3">
          {report.target_preview ?? "(대상 콘텐츠가 이미 삭제됨)"}
        </p>
        {report.target_type === "post" && (
          <button
            onClick={navigateToTarget}
            className="text-xs text-primary mt-2 inline-flex items-center gap-1 hover:underline"
          >
            <Eye className="w-3 h-3" /> 원문 새 탭으로 보기
          </button>
        )}
      </div>

      {report.reason_text && (
        <div className="text-sm text-muted-foreground mb-3">
          <span className="font-medium text-foreground">신고자 메모:</span> {report.reason_text}
        </div>
      )}

      {/* 액션 버튼 — 상태별로 다르게 */}
      {(report.status === "pending" || report.status === "reviewing") && (
        <div className="flex flex-wrap gap-2">
          {report.status === "pending" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdateStatus(report.report_id, "reviewing")}
            >
              검토 시작
            </Button>
          )}
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDeleteContent(report)}
            disabled={!report.target_preview}
            className="gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            콘텐츠 삭제 + 조치
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onUpdateStatus(report.report_id, "actioned")}
            className="gap-1"
          >
            <Check className="w-3.5 h-3.5" />
            삭제 없이 조치 완료
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onUpdateStatus(report.report_id, "dismissed")}
            className="gap-1 text-muted-foreground"
          >
            <X className="w-3.5 h-3.5" />
            기각
          </Button>
        </div>
      )}

      {report.resolved_at && (
        <p className="text-xs text-muted-foreground mt-2">
          처리 시각: {new Date(report.resolved_at).toLocaleString("ko-KR")}
        </p>
      )}
    </div>
  );
};

export default AdminReports;
