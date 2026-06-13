import { useEffect, useState, useCallback } from "react";
import { Loader2, Filter, Trash2, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { confirm } from "@/components/ui/confirm-dialog";

interface ErrorLog {
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

// 같은 digest 오류를 묶어 보여주는 그룹.
interface ErrorGroup {
  key: string;
  message: string;
  count: number;
  lastSeen: string;
  sources: string[];
  sampleUrl: string | null;
  sampleStack: string | null;
  affectedUsers: number;
}

const RANGE_OPTIONS: Record<string, { label: string; days: number | null }> = {
  "1": { label: "최근 24시간", days: 1 },
  "7": { label: "최근 7일", days: 7 },
  "30": { label: "최근 30일", days: 30 },
  all: { label: "전체", days: null },
};

const SOURCE_LABELS: Record<string, string> = {
  errorboundary: "렌더 크래시",
  "window.onerror": "런타임 오류",
  unhandledrejection: "미처리 Promise",
  manual: "수동 기록",
  unknown: "기타",
};

const groupLogs = (logs: ErrorLog[]): ErrorGroup[] => {
  const map = new Map<string, ErrorGroup & { _users: Set<string> }>();
  for (const log of logs) {
    const key = log.digest || log.message;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      if (log.created_at > existing.lastSeen) existing.lastSeen = log.created_at;
      if (!existing.sources.includes(log.source)) existing.sources.push(log.source);
      if (log.user_id) existing._users.add(log.user_id);
    } else {
      const users = new Set<string>();
      if (log.user_id) users.add(log.user_id);
      map.set(key, {
        key,
        message: log.message,
        count: 1,
        lastSeen: log.created_at,
        sources: [log.source],
        sampleUrl: log.url,
        sampleStack: log.stack,
        affectedUsers: 0,
        _users: users,
      });
    }
  }
  return Array.from(map.values())
    .map((g) => ({ ...g, affectedUsers: g._users.size }))
    .sort((a, b) => b.count - a.count || (a.lastSeen < b.lastSeen ? 1 : -1));
};

const AdminErrorLogs = () => {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [range, setRange] = useState<string>("7");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    let query = (supabase as any)
      .from("client_error_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    const days = RANGE_OPTIONS[range]?.days;
    if (days != null) {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte("created_at", since);
    }
    if (sourceFilter !== "all") query = query.eq("source", sourceFilter);

    const { data, error } = await query;
    if (error) {
      toast({ title: "불러오기 실패", description: error.message, variant: "destructive" });
    } else {
      setLogs(data ?? []);
    }
    setIsLoading(false);
  }, [range, sourceFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleCleanup = async () => {
    const ok = await confirm({
      title: "오래된 로그 정리",
      description: "30일이 지난 오류 로그를 모두 삭제할까요? 되돌릴 수 없어요.",
      confirmText: "삭제",
      destructive: true,
    });
    if (!ok) return;
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await (supabase as any)
      .from("client_error_logs")
      .delete()
      .lt("created_at", cutoff);
    if (error) {
      toast({ title: "삭제 실패", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "정리 완료" });
      fetchLogs();
    }
  };

  const groups = groupLogs(logs);

  return (
    <AdminGuard>
      <AdminLayout
        title="오류 모니터링"
        description="앱·웹에서 발생한 클라이언트 오류(크래시·런타임·미처리 Promise)"
        rightAction={
          <Button size="sm" variant="outline" onClick={handleCleanup}>
            <Trash2 className="w-4 h-4 mr-1" />
            30일+ 정리
          </Button>
        }
      >
        {/* 요약 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <SummaryCard label="총 오류 발생" value={logs.length.toLocaleString()} />
          <SummaryCard label="고유 오류 종류" value={groups.length.toLocaleString()} />
          <SummaryCard
            label="영향받은 사용자"
            value={new Set(logs.filter((l) => l.user_id).map((l) => l.user_id)).size.toLocaleString()}
          />
        </div>

        {/* 필터 바 */}
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-background rounded-lg border border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="w-4 h-4" />
            <span>필터:</span>
          </div>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(RANGE_OPTIONS).map(([id, { label }]) => (
                <SelectItem key={id} value={id}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 출처</SelectItem>
              {Object.entries(SOURCE_LABELS).map(([id, label]) => (
                <SelectItem key={id} value={id}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto text-sm text-muted-foreground self-center">
            {RANGE_OPTIONS[range]?.label} · {groups.length}종 / {logs.length}건
          </div>
        </div>

        {/* 그룹 리스트 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : groups.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-2">
            {groups.map((g) => {
              const isOpen = expanded === g.key;
              return (
                <div key={g.key} className="bg-background rounded-lg border border-border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : g.key)}
                    className="w-full flex items-start gap-3 p-3 text-left hover:bg-muted/40 transition-colors"
                  >
                    <span className="mt-0.5 shrink-0">
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </span>
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground break-words line-clamp-2">{g.message}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-muted-foreground">
                        <span className="font-semibold text-destructive">{g.count}회</span>
                        {g.affectedUsers > 0 && <span>사용자 {g.affectedUsers}명</span>}
                        {g.sources.map((s) => (
                          <span key={s} className="px-1.5 py-0.5 rounded bg-muted">
                            {SOURCE_LABELS[s] ?? s}
                          </span>
                        ))}
                        <span>최근 {new Date(g.lastSeen).toLocaleString("ko-KR")}</span>
                      </div>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-3 pt-1 border-t border-border bg-muted/20 space-y-2">
                      {g.sampleUrl && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-semibold">발생 위치:</span> {g.sampleUrl}
                        </p>
                      )}
                      {g.sampleStack && (
                        <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap break-words bg-background rounded p-2 border border-border max-h-60 overflow-auto">
                          {g.sampleStack}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </AdminLayout>
    </AdminGuard>
  );
};

const SummaryCard = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-background rounded-lg border border-border p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-xl font-bold text-foreground mt-0.5">{value}</p>
  </div>
);

const EmptyState = () => (
  <div className="text-center py-20 px-6">
    <h2 className="text-base font-semibold text-foreground mb-2">오류가 없어요 🎉</h2>
    <p className="text-sm text-muted-foreground">선택한 기간에 기록된 클라이언트 오류가 없습니다.</p>
  </div>
);

export default AdminErrorLogs;
