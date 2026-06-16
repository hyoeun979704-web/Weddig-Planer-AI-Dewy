import { useState } from "react";
import { Loader2, PackageCheck, Download, Inbox } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useReceivedDeliveries, getDeliveryFileUrl } from "@/hooks/useVendorDeliveries";

const fileName = (path: string) => path.split("/").pop() || path;

/**
 * 소비자 — 업체에게서 받은 결과물(보정본 등). 프라이빗 버킷이라 다운로드는 클릭 시
 * 서명 URL 을 발급해 새 탭으로 연다(권한 없으면 발급 자체가 차단됨).
 */
const MyDeliveries = () => {
  const { items, loading, markReceived } = useReceivedDeliveries();
  const [busy, setBusy] = useState<string | null>(null);

  const openFile = async (path: string) => {
    setBusy(path);
    const url = await getDeliveryFileUrl(path);
    setBusy(null);
    if (!url) {
      toast.error("파일을 열 수 없어요", { description: "잠시 후 다시 시도해주세요." });
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const onMarkReceived = async (id: string) => {
    const ok = await markReceived(id);
    if (ok) toast.success("수령 확인했어요");
    else toast.error("처리에 실패했어요");
  };

  return (
    <div className="min-h-screen bg-background app-col mx-auto pb-10">
      <PageHeader title="받은 결과물" />
      <main className="px-4 py-5 space-y-3">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
              <Inbox className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {"아직 받은 결과물이 없어요.\n업체가 보정본·결과물을 보내면 여기에서 받을 수 있어요."}
            </p>
          </div>
        ) : (
          items.map((d) => (
            <div key={d.id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground truncate">
                  {d.title || "결과물 도착"}
                </p>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                    d.status === "received" ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {d.status === "received" ? "수령 완료" : "새 결과물"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {new Date(d.created_at).toLocaleString("ko-KR")}
              </p>
              {d.message && (
                <p className="text-[13px] text-foreground whitespace-pre-wrap">{d.message}</p>
              )}
              <div className="space-y-2">
                {d.file_paths.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => openFile(p)}
                    disabled={busy === p}
                    className="w-full flex items-center gap-2 p-2.5 rounded-lg border border-border text-left text-[13px] hover:bg-muted/50 disabled:opacity-60"
                  >
                    {busy === p ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                    ) : (
                      <Download className="w-4 h-4 text-primary shrink-0" />
                    )}
                    <span className="truncate">{fileName(p)}</span>
                  </button>
                ))}
              </div>
              {d.status !== "received" && (
                <Button variant="outline" className="w-full h-9" onClick={() => onMarkReceived(d.id)}>
                  <PackageCheck className="w-4 h-4 mr-1.5" /> 수령 확인
                </Button>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  );
};

export default MyDeliveries;
