import { useCallback, useEffect, useState } from "react";
import { Loader2, Upload, PackageCheck, X } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useBranches } from "@/features/partners/hooks/useBranches";
import { fetchDeliveryInquiries, type DeliveryInquiryRow } from "@/features/partners/data/businessDeliveries";
import { toast } from "sonner";
import {
  useSentDeliveries,
  uploadDeliveryFile,
  createDelivery,
} from "@/hooks/useVendorDeliveries";

const MAX_FILES = 10;

/**
 * 업체 포털 — 결과물(보정본 등) 보내기. 내 업체에 들어온 문의(상담) 중 하나를 골라
 * 그 고객(inquiry.user_id)에게 파일을 인앱 전달한다. 프라이빗 버킷 + RLS.
 */
const BusinessDeliveries = () => {
  const { selectedId, loading: branchesLoading } = useBranches();
  const [loading, setLoading] = useState(true);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [inquiries, setInquiries] = useState<DeliveryInquiryRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [paths, setPaths] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const { items: sent, loading: sentLoading, reload: reloadSent } = useSentDeliveries(placeId ?? undefined);

  const load = useCallback(async () => {
    if (!selectedId) { setPlaceId(null); setLoading(false); return; }
    setLoading(true);
    setPlaceId(selectedId);
    try {
      setInquiries(await fetchDeliveryInquiries(selectedId));
    } catch {
      toast.error("문의를 불러오지 못했어요");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    if (branchesLoading) return;
    void load();
  }, [branchesLoading, load]);

  const resetForm = () => { setTitle(""); setMessage(""); setPaths([]); setOpenId(null); };

  const onPickFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    if (paths.length + files.length > MAX_FILES) {
      toast.error(`파일은 최대 ${MAX_FILES}개까지 보낼 수 있어요`);
      return;
    }
    setUploading(true);
    const next: string[] = [];
    for (const f of files) {
      const p = await uploadDeliveryFile(f);
      if (p) next.push(p);
      else toast.error(`'${f.name}' 업로드 실패`);
    }
    setPaths((prev) => [...prev, ...next]);
    setUploading(false);
  };

  const onSend = async (inq: DeliveryInquiryRow) => {
    if (paths.length === 0) { toast.error("보낼 파일을 먼저 올려주세요"); return; }
    setSending(true);
    const ok = await createDelivery({
      recipientUserId: inq.user_id,
      placeId,
      inquiryId: inq.id,
      title: title.trim() || null,
      message: message.trim() || null,
      filePaths: paths,
    });
    setSending(false);
    if (!ok) { toast.error("결과물 전송에 실패했어요"); return; }
    toast.success("결과물을 보냈어요", { description: "고객이 '받은 결과물'에서 받을 수 있어요." });
    resetForm();
    void reloadSent();
  };

  return (
    <div className="min-h-screen bg-background app-col mx-auto pb-10">
      <PageHeader title="결과물 보내기" />
      <main className="px-4 py-5 space-y-5">
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : !placeId ? (
          <p className="text-sm text-muted-foreground text-center py-20">
            {"연결된 업체가 없어요.\n업체 정보 등록이 끝나면 결과물을 보낼 수 있어요."}
          </p>
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-foreground">문의 고객에게 보내기</h2>
              {inquiries.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">
                  아직 도착한 문의가 없어요. 고객 문의가 오면 그 고객에게 결과물을 보낼 수 있어요.
                </p>
              ) : (
                inquiries.map((inq) => {
                  const expanded = openId === inq.id;
                  return (
                    <div key={inq.id} className="bg-card rounded-2xl border border-border overflow-hidden">
                      <button
                        type="button"
                        className="w-full p-4 text-left"
                        onClick={() => { resetForm(); if (!expanded) setOpenId(inq.id); }}
                      >
                        <p className="text-sm font-semibold text-foreground truncate">{inq.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {new Date(inq.created_at).toLocaleString("ko-KR")}
                        </p>
                      </button>
                      {expanded && (
                        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                          <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="제목 (예: 본식 보정본 1차)"
                            maxLength={100}
                            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                          <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="전달 메시지 (선택)"
                            maxLength={1000}
                            className="w-full h-20 p-3 rounded-md border border-input bg-background text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                          {paths.length > 0 && (
                            <ul className="space-y-1">
                              {paths.map((p) => (
                                <li key={p} className="flex items-center justify-between gap-2 text-[12px] text-foreground bg-muted/50 rounded px-2 py-1">
                                  <span className="truncate">{p.split("/").pop()}</span>
                                  <button type="button" onClick={() => setPaths((prev) => prev.filter((x) => x !== p))}>
                                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                          <label className="flex items-center justify-center gap-2 h-10 rounded-md border border-dashed border-input text-sm text-muted-foreground cursor-pointer">
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            파일 추가 ({paths.length}/{MAX_FILES})
                            <input type="file" multiple className="hidden" onChange={onPickFiles} disabled={uploading} />
                          </label>
                          <Button
                            className="w-full h-10"
                            disabled={sending || uploading || paths.length === 0}
                            onClick={() => onSend(inq)}
                          >
                            {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PackageCheck className="w-4 h-4 mr-1.5" />}
                            결과물 보내기
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-bold text-foreground">보낸 결과물</h2>
              {sentLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ) : sent.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">아직 보낸 결과물이 없어요.</p>
              ) : (
                sent.map((d) => (
                  <div key={d.id} className="bg-card rounded-xl border border-border p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">{d.title || "결과물"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        파일 {d.file_paths.length}개 · {new Date(d.created_at).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${d.status === "received" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {d.status === "received" ? "수령 완료" : "전달됨"}
                    </span>
                  </div>
                ))
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default BusinessDeliveries;
