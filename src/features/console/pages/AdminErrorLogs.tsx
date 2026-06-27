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
import AdminGuard from "@/features/console/components/AdminGuard";
import AdminLayout from "@/features/console/components/AdminLayout";
import {
  fetchErrorLogs,
  cleanupOldLogs,
  type ErrorLog,
} from "@/features/console/data/errorLogs";
import { toast } from "@/hooks/use-toast";
import { confirm } from "@/components/ui/confirm-dialog";

// ErrorLog 타입은 features/console/data/errorLogs 에서 import.

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

// 개발자 영문 에러 메시지를 운영자가 이해할 평이한 한글 설명 + 조치로 변환.
// (원문은 접이식으로 그대로 보존 — 이건 '추정 원인' 보조 라인.)
const ERROR_EXPLAIN: { re: RegExp; ko: string; action: string }[] = [
  { re: /load failed|failed to fetch|networkerror|err_network|fetch.*aborted/i, ko: "네트워크/서버 연결이 끊겼어요", action: "일시적일 수 있어요. 반복되면 서버·API 상태 확인" },
  { re: /chunkloaderror|loading chunk|failed to fetch dynamically imported|importing a module script failed/i, ko: "새 배포 후 옛 캐시와 안 맞아요", action: "사용자에게 새로고침 안내(보통 자동 해결)" },
  { re: /cannot read propert|undefined is not an object|null is not an object|reading '|is not a function/i, ko: "특정 화면에서 비어있는 데이터를 읽었어요", action: "발생 위치 화면의 데이터/쿼리 누락 확인" },
  { re: /pgrst|supabase|jwt|row-level security|permission denied|42501/i, ko: "DB 권한/쿼리(서버) 오류예요", action: "RLS 정책·RPC 인자·컬럼 존재 확인" },
  { re: /quota|exceeded|storage.*full|localstorage/i, ko: "저장공간 한도/접근 오류(주로 iOS 프라이빗)", action: "safeLocalStorage 경로 확인 — 보통 사용자 환경 문제" },
  { re: /timeout|timed out|deadline/i, ko: "응답이 너무 늦어 시간 초과됐어요", action: "느린 네트워크/무거운 쿼리 — 반복 시 성능 점검" },
  { re: /script error|cross-origin|cors/i, ko: "외부 스크립트/도메인 차단(CORS)", action: "외부 위젯·도메인 허용 설정 확인" },
  { re: /out of memory|maximum call stack|too much recursion/i, ko: "메모리/무한루프로 화면이 멈췄어요", action: "해당 화면 렌더 루프·큰 목록 확인" },
  { re: /payment|kakao|toss|결제/i, ko: "결제 흐름에서 오류가 났어요", action: "결제 리다이렉트/PG 연동 상태 확인" },
  { re: /aborterror|the operation was aborted|canceled/i, ko: "사용자 이탈/취소로 중단됐어요", action: "대개 무해(화면 전환 중 취소)" },
];
function explainError(message: string): { ko: string; action: string } | null {
  return ERROR_EXPLAIN.find((e) => e.re.test(message || "")) ?? null;
}

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
    try {
      setLogs(await fetchErrorLogs({ days: RANGE_OPTIONS[range]?.days ?? null, source: sourceFilter }));
    } catch (e) {
      toast({ title: "불러오기 실패", description: e instanceof Error ? e.message : "오류", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
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
    try {
      await cleanupOldLogs(30);
      toast({ title: "정리 완료" });
      fetchLogs();
    } catch (e) {
      toast({ title: "삭제 실패", description: e instanceof Error ? e.message : "오류", variant: "destructive" });
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
                      {(() => {
                        const ex = explainError(g.message);
                        return ex ? (
                          <p className="text-[12px] text-foreground mt-1">
                            <span className="font-semibold text-primary">추정: {ex.ko}</span>
                            <span className="text-muted-foreground"> · {ex.action}</span>
                          </p>
                        ) : null;
                      })()}
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
