// 하객 사진 → Google Drive 자동 백업 카드(청첩장 사진 관리 페이지).
// 연결/해제 · 자동 업로드 토글 · 지금 동기화 · 진행 현황 · 폴더 열기.
// OAuth 콜백 복귀(?drive=connected)를 1회 처리해 자동 업로드를 켜고 즉시 동기화한다.
import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Cloud, ExternalLink, FolderOpen, Loader2, RefreshCw, Unlink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { confirm } from "@/components/ui/confirm-dialog";
import { useInvitationDrive } from "@/hooks/useInvitationDrive";

const DriveBackupCard = ({ invitationId }: { invitationId: string }) => {
  const { info, loading, busy, refresh, connect, disconnect, setAuto, syncNow } = useInvitationDrive(invitationId);
  const [params, setParams] = useSearchParams();
  const handledRedirect = useRef(false);

  // OAuth 콜백 복귀(?drive=connected|error) — 1회만 처리.
  useEffect(() => {
    const status = params.get("drive");
    if (!status || handledRedirect.current) return;
    handledRedirect.current = true;
    params.delete("drive");
    setParams(params, { replace: true });
    if (status === "connected") {
      toast.success("구글 드라이브를 연결했어요. 자동 업로드를 시작합니다…");
      void (async () => {
        await refresh();
        await setAuto(true);
        const r = await syncNow();
        if (r.ok) toast.success(`드라이브에 ${r.uploaded ?? 0}장 백업했어요${r.remaining ? ` (${r.remaining}장은 곧 이어서)` : ""}`);
      })();
    } else {
      toast.error("드라이브 연결에 실패했어요. 다시 시도해주세요.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onConnect = async () => {
    const r = await connect();
    if (!r.ok) {
      toast.error(
        r.error === "drive_not_configured"
          ? "드라이브 연동이 아직 설정되지 않았어요."
          : "연결을 시작하지 못했어요.",
      );
    }
  };

  const onToggleAuto = async (next: boolean) => {
    const r = await setAuto(next);
    if (!r.ok) {
      toast.error(r.error === "not_connected" ? "먼저 드라이브를 연결해주세요." : "변경에 실패했어요.");
      return;
    }
    toast.success(next ? "자동 업로드를 켰어요. 새 사진이 드라이브에 자동 백업돼요." : "자동 업로드를 껐어요.");
  };

  const onSync = async () => {
    const r = await syncNow();
    if (r.ok) {
      toast.success(
        r.uploaded
          ? `드라이브에 ${r.uploaded}장 백업했어요${r.remaining ? ` (${r.remaining}장 남음 — 곧 이어서)` : ""}`
          : "이미 모두 백업돼 있어요.",
      );
    } else {
      toast.error(r.error === "not_connected" ? "먼저 드라이브를 연결해주세요." : "동기화에 실패했어요. 잠시 후 다시 시도해주세요.");
    }
  };

  const onDisconnect = async () => {
    const yes = await confirm({
      title: "구글 드라이브 연결 해제",
      description: "연결을 끊으면 더 이상 자동 백업되지 않아요. 이미 드라이브에 올라간 사진은 그대로 남아요.",
      confirmText: "연결 해제",
      destructive: true,
    });
    if (!yes) return;
    const ok = await disconnect();
    if (ok) toast.success("드라이브 연결을 해제했어요.");
    else toast.error("연결 해제에 실패했어요.");
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Cloud className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold">구글 드라이브 백업</h2>
      </div>

      {loading ? (
        <div className="py-4 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : !info.connected ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            하객들이 보낸 사진을 신랑신부의 구글 드라이브에 자동으로 백업해요. 앱이 만든 전용 폴더에만 올라가며,
            드라이브의 다른 파일에는 접근하지 않아요.
          </p>
          <Button onClick={onConnect} className="w-full gap-1.5">
            <Cloud className="w-4 h-4" />
            구글 드라이브 연결
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {info.email && <p className="text-xs text-muted-foreground truncate">{info.email}</p>}

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">자동 업로드</p>
              <p className="text-xs text-muted-foreground">새 하객 사진을 주기적으로 백업</p>
            </div>
            <Switch checked={info.autoSync} disabled={busy} onCheckedChange={onToggleAuto} aria-label="자동 업로드" />
          </div>

          <p className="text-xs text-muted-foreground">
            백업됨 <span className="font-medium text-foreground">{info.synced}</span> / 총 {info.total}장
          </p>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onSync} disabled={busy} className="flex-1 gap-1.5">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              지금 동기화
            </Button>
            {info.folderId && (
              <Button variant="outline" size="sm" asChild className="gap-1.5">
                <a href={`https://drive.google.com/drive/folders/${info.folderId}`} target="_blank" rel="noreferrer">
                  <FolderOpen className="w-4 h-4" />
                  폴더 <ExternalLink className="w-3 h-3" />
                </a>
              </Button>
            )}
          </div>

          <button
            type="button"
            onClick={onDisconnect}
            disabled={busy}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            <Unlink className="w-3 h-3" />
            연결 해제
          </button>
        </div>
      )}
    </div>
  );
};

export default DriveBackupCard;
