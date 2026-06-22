import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Download, Trash2, ImageIcon, Share2 } from "lucide-react";
import JSZip from "jszip";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCouplePartnerId } from "@/hooks/useCouplePartnerId";
import { toast } from "sonner";

interface PhotoRow {
  id: string;
  uploader_name: string | null;
  storage_path: string;
  content_type: string | null;
  created_at: string;
}

const extOfPath = (path: string, contentType: string | null) => {
  const fromPath = path.split(".").pop()?.toLowerCase();
  if (fromPath && fromPath.length <= 5) return fromPath;
  if (contentType?.includes("png")) return "png";
  if (contentType?.includes("webp")) return "webp";
  return "jpg";
};

const InvitationPhotos = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { partnerId, isLoading: coupleLoading } = useCouplePartnerId();
  const [title, setTitle] = useState("");
  const [shareSlug, setShareSlug] = useState<string | null>(null);
  const [rows, setRows] = useState<PhotoRow[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [zipping, setZipping] = useState(false);

  const load = useCallback(async () => {
    if (!user || !id) return;
    // 인가 + 제목 (소유자/배우자만). 공개 발행본은 누구나 SELECT 가능하므로 클라 교차검증.
    const { data: inv } = await (supabase as any)
      .from("invitations")
      .select("user_id, user_data, share_slug")
      .eq("id", id)
      .maybeSingle();
    const authorized = !!inv && (inv.user_id === user.id || inv.user_id === partnerId);
    if (!authorized) {
      navigate("/invitation/my", { replace: true });
      return;
    }
    const g = inv.user_data?.groom_name ?? "";
    const b = inv.user_data?.bride_name ?? "";
    setTitle(g && b ? `${g} · ${b}` : "");
    setShareSlug(inv.share_slug ?? null);

    const { data, error } = await (supabase as any)
      .from("invitation_guest_photos")
      .select("id, uploader_name, storage_path, content_type, created_at")
      .eq("invitation_id", id)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("불러오기 실패");
      setLoading(false);
      return;
    }
    const list = (data ?? []) as PhotoRow[];
    setRows(list);
    if (list.length > 0) {
      const { data: signed } = await supabase.storage
        .from("guest-photos")
        .createSignedUrls(list.map((r) => r.storage_path), 60 * 60); // 1시간
      const map: Record<string, string> = {};
      (signed ?? []).forEach((s, i) => {
        if (s.signedUrl) map[list[i].id] = s.signedUrl;
      });
      setUrls(map);
    }
    setLoading(false);
  }, [user, id, partnerId, navigate]);

  useEffect(() => {
    if (coupleLoading) return;
    load();
  }, [coupleLoading, load]);

  const downloadAll = async () => {
    if (rows.length === 0) return;
    setZipping(true);
    try {
      const zip = new JSZip();
      let n = 0;
      for (const r of rows) {
        const url = urls[r.id];
        if (!url) continue;
        const blob = await (await fetch(url)).blob();
        n += 1;
        const who = (r.uploader_name ?? "하객").replace(/[\\/:*?"<>|]/g, "");
        zip.file(`${String(n).padStart(3, "0")}_${who}.${extOfPath(r.storage_path, r.content_type)}`, blob);
      }
      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = `wedding-photos-${id?.slice(0, 8) ?? "all"}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
      toast.success(`${n}장을 ZIP으로 저장했어요`);
    } catch {
      toast.error("전체 다운로드 실패", { description: "잠시 후 다시 시도해 주세요." });
    } finally {
      setZipping(false);
    }
  };

  const remove = async (r: PhotoRow) => {
    if (!confirm("이 사진을 삭제할까요?")) return;
    const { error } = await (supabase as any)
      .from("invitation_guest_photos")
      .delete()
      .eq("id", r.id);
    if (error) {
      toast.error("삭제 실패");
      return;
    }
    await supabase.storage.from("guest-photos").remove([r.storage_path]).catch(() => undefined);
    setRows((prev) => prev.filter((x) => x.id !== r.id));
    toast.success("삭제했어요");
  };

  const copyUploadLink = async () => {
    if (!shareSlug) return;
    const url = `${window.location.origin}/i/${shareSlug}/photos`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("하객 업로드 링크를 복사했어요");
    } catch {
      toast.error("복사 실패");
    }
  };

  return (
    <div className="min-h-screen bg-background app-col mx-auto pb-10">
      <PageHeader title="하객 사진" />
      <main className="px-4 py-5 space-y-4">
        {title && <p className="text-sm text-muted-foreground -mt-2">{title}</p>}

        <div className="flex gap-2">
          <Button onClick={downloadAll} disabled={zipping || rows.length === 0} className="flex-1 gap-1.5">
            {zipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            전체 다운로드{rows.length > 0 ? ` (${rows.length})` : ""}
          </Button>
          {shareSlug && (
            <Button variant="outline" onClick={copyUploadLink} className="gap-1.5">
              <Share2 className="w-4 h-4" />
              업로드 링크
            </Button>
          )}
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              아직 도착한 사진이 없어요.
              <br />
              "업로드 링크"를 하객들에게 공유해 보세요.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {rows.map((r) => (
              <div key={r.id} className="relative aspect-square rounded-md overflow-hidden bg-muted group">
                {urls[r.id] ? (
                  <img src={urls[r.id]} alt="" loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                {r.uploader_name && (
                  <span className="absolute bottom-0 inset-x-0 bg-black/45 text-white text-[10px] px-1 py-0.5 truncate">
                    {r.uploader_name}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => remove(r)}
                  aria-label="삭제"
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default InvitationPhotos;
