import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarCheck, Loader2, RefreshCw, Link2, Unlink } from "lucide-react";
import { toast } from "sonner";
import { useCalendarSync, type CalendarProvider } from "@/hooks/useCalendarSync";
import { confirm } from "@/components/ui/confirm-dialog";

const LABEL: Record<CalendarProvider, string> = { google: "Google 캘린더", kakao: "카카오 캘린더" };

// 설정 > 캘린더 연동 카드(provider별). 앱 일정 ↔ 외부 캘린더 양방향 동기화.
const CalendarSyncCard = ({ provider }: { provider: CalendarProvider }) => {
  const { connected, loading, syncing, connect, sync, disconnect, refreshStatus } = useCalendarSync(provider);
  const [params, setParams] = useSearchParams();
  const handledRedirect = useRef(false);

  // OAuth 콜백 복귀(?calendar=connected&calprovider=...) — 자기 provider 것만 1회 처리.
  useEffect(() => {
    const status = params.get("calendar");
    const cp = params.get("calprovider");
    if (!status || cp !== provider || handledRedirect.current) return;
    handledRedirect.current = true;
    params.delete("calendar"); params.delete("calprovider");
    setParams(params, { replace: true });
    if (status === "connected") {
      toast.success(`${LABEL[provider]}을 연결했어요. 동기화를 시작합니다…`);
      void (async () => {
        await refreshStatus();
        const r = await sync();
        if (r.ok) toast.success(`동기화 완료 · 보냄 ${r.pushed ?? 0} · 가져옴 ${r.pulled ?? 0}`);
      })();
    } else {
      toast.error("캘린더 연결에 실패했어요. 다시 시도해주세요.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onConnect = async () => {
    const r = await connect("/settings");
    if (!r.ok) {
      toast.error(
        r.error?.endsWith("not_configured") ? `${LABEL[provider]} 연동이 아직 설정되지 않았어요.` : "연결을 시작하지 못했어요.",
      );
    }
  };

  const onSync = async () => {
    const r = await sync();
    if (r.ok) toast.success(`동기화 완료 · 보냄 ${r.pushed ?? 0} · 가져옴 ${r.pulled ?? 0}`);
    else toast.error("동기화에 실패했어요. 잠시 후 다시 시도해주세요.");
  };

  const onDisconnect = async () => {
    const yes = await confirm({
      title: `${LABEL[provider]} 연결 해제`,
      description: "연결을 끊으면 더 이상 자동 동기화되지 않아요. 이미 추가된 일정은 그대로 남아요.",
      confirmText: "연결 해제",
      destructive: true,
    });
    if (!yes) return;
    const ok = await disconnect();
    toast[ok ? "success" : "error"](ok ? "연결을 해제했어요." : "해제에 실패했어요.");
  };

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-start gap-3 min-w-0">
          <CalendarCheck className="w-5 h-5 mt-0.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-sm font-medium">{LABEL[provider]}</p>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              {loading ? "상태 확인 중…" : connected ? "연결됨 · 일정이 양방향으로 동기화돼요" : "내 일정을 양방향으로 동기화"}
            </p>
          </div>
        </div>
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
        ) : connected ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onSync}
              disabled={syncing}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-primary/10 text-primary text-[12px] font-semibold active:scale-95 disabled:opacity-60"
            >
              {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              동기화
            </button>
            <button onClick={onDisconnect} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground" aria-label="연결 해제">
              <Unlink className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button onClick={onConnect} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[12px] font-semibold active:scale-95 shrink-0">
            <Link2 className="w-3.5 h-3.5" /> 연결
          </button>
        )}
      </div>
    </div>
  );
};

export default CalendarSyncCard;
