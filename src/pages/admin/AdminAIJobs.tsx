import { useEffect, useState, useCallback } from "react";
import { Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// AI 생성 기능 통합 현황 — admin_ai_job_stats RPC(관리자만) 집계.
interface Stat {
  feature: string;
  total: number;
  active: number;
  done: number;
  failed: number;
  stuck: number;
  today: number;
}

interface Failure {
  report_id: string;
  user_id: string;
  status: string;
  error: string | null;
  created_at: string;
  updated_at: string;
}

const fmtTime = (s: string | null) => {
  if (!s) return "";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString("ko-KR");
};

const AdminAIJobs = () => {
  const [stats, setStats] = useState<Stat[]>([]);
  const [failures, setFailures] = useState<Failure[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [statsRes, failRes] = await Promise.all([
      (supabase as any).rpc("admin_ai_job_stats"),
      // 실패 상세(사유 포함) — 미적용 라이브에서도 화면이 안 깨지게 에러는 무시.
      (supabase as any).rpc("admin_list_ai_failures", { p_limit: 50 }),
    ]);
    if (statsRes.error) toast({ title: "불러오기 실패", description: statsRes.error.message, variant: "destructive" });
    else setStats((statsRes.data ?? []) as Stat[]);
    setFailures(failRes.error ? [] : ((failRes.data ?? []) as Failure[]));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const totals = stats.reduce(
    (a, s) => ({
      total: a.total + s.total, active: a.active + s.active,
      done: a.done + s.done, failed: a.failed + s.failed,
      stuck: a.stuck + s.stuck, today: a.today + s.today,
    }),
    { total: 0, active: 0, done: 0, failed: 0, stuck: 0, today: 0 },
  );

  return (
    <AdminGuard>
      <AdminLayout
        title="AI 생성 현황"
        description="컨설팅·사진보정·헤어·드레스·메이크업 잡 통합 모니터링"
        rightAction={
          <Button size="sm" variant="outline" className="gap-1.5" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />새로고침
          </Button>
        }
      >
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-5">
            {totals.stuck > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertTriangle className="w-4 h-4" />
                10분 넘게 멈춘 잡 {totals.stuck}건 — reaper가 곧 환불·실패 처리합니다.
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "전체", v: totals.total },
                { label: "진행중", v: totals.active },
                { label: "완료", v: totals.done },
                { label: "실패", v: totals.failed },
                { label: "멈춤", v: totals.stuck },
                { label: "오늘", v: totals.today },
              ].map((c) => (
                <div key={c.label} className="rounded-xl border border-border bg-background p-4 text-center">
                  <p className="text-[12px] text-muted-foreground">{c.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{c.v}</p>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    {["기능", "전체", "진행중", "완료", "실패", "멈춤", "오늘"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.map((s) => (
                    <tr key={s.feature} className="bg-background">
                      <td className="px-4 py-2.5 font-medium text-foreground whitespace-nowrap">{s.feature}</td>
                      <td className="px-4 py-2.5">{s.total}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{s.active}</td>
                      <td className="px-4 py-2.5 text-primary">{s.done}</td>
                      <td className="px-4 py-2.5 text-destructive">{s.failed}</td>
                      <td className={`px-4 py-2.5 ${s.stuck > 0 ? "text-destructive font-semibold" : "text-muted-foreground"}`}>{s.stuck}</td>
                      <td className="px-4 py-2.5">{s.today}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 최근 실패 상세 — 왜 실패했는지(사유)를 직접 확인. 하트 차감→환불(예: wedding_consulting_refund) 추적용. */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">최근 실패 상세 ({failures.length})</h3>
              {failures.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">표시할 실패 내역이 없어요. (마이그레이션 미적용 시 비어 있을 수 있어요)</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        {["시각", "사용자", "사유"].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {failures.map((f) => (
                        <tr key={f.report_id} className="bg-background align-top">
                          <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">{fmtTime(f.updated_at || f.created_at)}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap"><code className="text-[11px]">{f.user_id.slice(0, 8)}…</code></td>
                          <td className="px-4 py-2.5 text-destructive whitespace-pre-wrap break-all max-w-[480px]">{f.error || "(사유 미기록)"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </AdminLayout>
    </AdminGuard>
  );
};

export default AdminAIJobs;
