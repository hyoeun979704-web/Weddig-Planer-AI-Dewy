import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Megaphone, Loader2, Calendar, X } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ImageUploader from "@/components/ImageUploader";
import { useAuth } from "@/contexts/AuthContext";
import { useBranches } from "@/features/partners/hooks/useBranches";
import { fetchBusinessEvents, addBusinessEvent, deleteBusinessEvent, type EventItem } from "@/features/partners/data/businessEvents";
import { toast } from "sonner";
import { confirm } from "@/components/ui/confirm-dialog";

const fmtDate = (s: string | null) => {
  if (!s) return "";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("ko-KR");
};

const STATUS: Record<string, { label: string; color: string }> = {
  approved: { label: "노출중", color: "bg-green-100 text-green-700" },
  pending: { label: "검토 중", color: "bg-amber-100 text-amber-700" },
  rejected: { label: "반려됨", color: "bg-destructive/10 text-destructive" },
};

// 업체 이벤트 등록. 운영자 검토 필수 — 저장 시 검토 대기, 승인 시 공개.
const BusinessEvents = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedId, loading: branchesLoading } = useBranches();
  const [loading, setLoading] = useState(true);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [items, setItems] = useState<EventItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [detailImages, setDetailImages] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [uploaderKey, setUploaderKey] = useState(0);

  const loadEvents = useCallback(async (pid: string) => {
    try {
      setItems(await fetchBusinessEvents(pid));
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    if (branchesLoading) return;
    if (!selectedId) { setLoading(false); return; }
    setPlaceId(selectedId);
    (async () => { await loadEvents(selectedId); setLoading(false); })();
  }, [branchesLoading, selectedId, loadEvents]);

  const handleAdd = async () => {
    if (!user || !placeId) return;
    if (!title.trim()) { toast.error("이벤트명을 입력해주세요"); return; }
    // 상세 이미지로 된 이벤트는 내용·배너 따로 없어도 OK. 배너가 없으면 상세 첫 장을
    // 썸네일로 쓴다(둘 다 없을 때만 막음). 내용(description)은 항상 선택.
    const banner = bannerUrl.trim() || detailImages[0] || "";
    if (!banner) { toast.error("대표 이미지나 상세 이미지를 한 장 이상 올려주세요"); return; }
    setAdding(true);
    try {
      await addBusinessEvent({
        place_id: placeId,
        owner_user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        starts_at: startsAt || null,
        ends_at: endsAt || null,
        banner_image_url: banner,
        detail_images: detailImages,
      });
    } catch {
      setAdding(false);
      toast.error("등록에 실패했어요");
      return;
    }
    setAdding(false);
    setTitle(""); setDescription(""); setStartsAt(""); setEndsAt("");
    setBannerUrl(""); setDetailImages([]); setUploaderKey((k) => k + 1);
    toast.success("이벤트를 등록했어요. 운영자 검토 후 노출됩니다");
    await loadEvents(placeId);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: "이 이벤트를 삭제할까요?", confirmText: "삭제", destructive: true }))) return;
    try {
      await deleteBusinessEvent(id);
    } catch {
      toast.error("삭제에 실패했어요");
      return;
    }
    setItems((prev) => prev.filter((e) => e.id !== id));
    toast.success("삭제했어요");
  };

  if (loading) {
    return <div className="min-h-screen bg-background app-col mx-auto flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }
  if (!placeId) {
    return (
      <div className="min-h-screen bg-background app-col mx-auto">
        <PageHeader title="이벤트 관리" />
        <div className="px-5 py-20 text-center">
          <p className="text-muted-foreground">먼저 업체 기본 정보를 저장해주세요.</p>
          <Button className="mt-6" onClick={() => navigate("/business/edit")}>업체 정보 입력</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background app-col mx-auto">
      <PageHeader title="이벤트 관리" />
      <main className="p-4 pb-24 space-y-5">
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">이벤트 등록</h2>
            <span className="text-[11px] text-muted-foreground">· 운영자 검토 후 노출</span>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">이벤트명</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 봄맞이 예약 할인" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">내용 (선택)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="이벤트 상세 내용 (이미지로 대신해도 돼요)" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">시작일</Label>
              <Input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">종료일</Label>
              <Input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">대표 이미지 (썸네일)</Label>
            {user && (
              <ImageUploader
                key={`banner-${uploaderKey}`}
                bucket="vendor-images"
                pathPrefix={`${user.id}/`}
                initialUrl={bannerUrl || undefined}
                onUploaded={(_, url) => setBannerUrl(url)}
              />
            )}
            <p className="text-[11px] text-muted-foreground">목록·카드 썸네일이에요. 없으면 아래 상세 이미지 첫 장(또는 업체 대표사진)이 쓰여요.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">상세 이미지 (여러 장 가능)</Label>
            {detailImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {detailImages.map((url, i) => (
                  <div key={url} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setDetailImages((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {user && (
              <ImageUploader
                key={`detail-${uploaderKey}-${detailImages.length}`}
                bucket="vendor-images"
                pathPrefix={`${user.id}/`}
                onUploaded={(_, url) => setDetailImages((prev) => [...prev, url])}
              />
            )}
            <p className="text-[11px] text-muted-foreground">한 장씩 올리면 계속 추가돼요. 이미지만으로 상세페이지를 구성할 수 있어요(내용 생략 가능).</p>
          </div>
          <Button onClick={handleAdd} disabled={adding} className="w-full">
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> 이벤트 등록</>}
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">등록한 이벤트가 없어요</p>
        ) : (
          <div className="space-y-3">
            {items.map((e) => {
              const st = STATUS[e.moderation_status] ?? STATUS.pending;
              return (
                <div key={e.id} className="bg-card rounded-2xl border border-border p-4">
                  {e.banner_image_url && (
                    <div className="aspect-[2/1] rounded-xl overflow-hidden bg-muted mb-3">
                      <img src={e.banner_image_url} alt={e.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-foreground">{e.title}</p>
                      {e.description && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2 whitespace-pre-line">{e.description}</p>}
                      {(e.starts_at || e.ends_at) && (
                        <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />{fmtDate(e.starts_at)}{e.ends_at ? ` ~ ${fmtDate(e.ends_at)}` : ""}
                        </p>
                      )}
                      {e.moderation_status === "rejected" && e.moderation_note && (
                        <p className="text-[11px] text-destructive mt-1 whitespace-pre-line">반려 사유: {e.moderation_note}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`text-[11px] px-2 py-1 rounded-full ${st.color}`}>{st.label}</span>
                      <button onClick={() => handleDelete(e.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default BusinessEvents;
