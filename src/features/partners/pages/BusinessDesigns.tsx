import { useEffect, useState, useCallback } from "react";
import { Loader2, Plus, Trash2, Palette } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import ImageUploader from "@/components/ImageUploader";
import DesignListingConsentDialog from "@/components/consent/DesignListingConsentDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBranches } from "@/features/partners/hooks/useBranches";
import { toast } from "sonner";
import { confirm } from "@/components/ui/confirm-dialog";

interface DesignRow {
  id: string;
  title: string;
  price: number;
  preview_urls: string[];
  sellable: string[];
  status: "pending" | "approved" | "rejected";
  review_note: string | null;
}

const STATUS_LABEL: Record<string, string> = { pending: "검토 중", approved: "판매 중", rejected: "반려" };

/**
 * 작가 포털 — 청첩장 디자인 등록(마켓). 가격은 라이선스 포함 작가 책정.
 * "상품 등록" → 동의 게이트(DesignListingConsentDialog) → 동의 후에만 등록(pending).
 */
const BusinessDesigns = () => {
  const { user } = useAuth();
  const { selectedId, loading: branchesLoading } = useBranches();
  const [loading, setLoading] = useState(true);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [items, setItems] = useState<DesignRow[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [styleTags, setStyleTags] = useState("");
  const [sellPrint, setSellPrint] = useState(false);
  const [uploaderKey, setUploaderKey] = useState(0);
  const [consentOpen, setConsentOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!selectedId) { setPlaceId(null); setItems([]); setLoading(false); return; }
    setLoading(true);
    setPlaceId(selectedId);
    // 선택 지점(place_id) 의 디자인만 — 기존엔 필터가 없어 다른 지점/디자이너 것까지 섞였음.
    const { data, error } = await (supabase as any)
      .from("designer_designs")
      .select("id, title, price, preview_urls, sellable, status, review_note")
      .eq("place_id", selectedId)
      .order("created_at", { ascending: false });
    if (error) { console.error("designs load failed", error); toast.error("디자인을 불러오지 못했어요"); }
    setItems((data as DesignRow[]) ?? []);
    setLoading(false);
  }, [selectedId]);

  useEffect(() => {
    if (branchesLoading) return;
    void load();
  }, [branchesLoading, load]);

  // 폼 유효성 — 등록 버튼 활성 조건.
  const priceNum = parseInt(price, 10);
  const canSubmit = !!title.trim() && !!previewUrl.trim() && Number.isFinite(priceNum) && priceNum >= 0;

  // "상품 등록" → 동의 게이트 오픈(검증 먼저).
  const onClickRegister = () => {
    if (!canSubmit) { toast.error("제목·대표 이미지·가격을 입력해주세요"); return; }
    setConsentOpen(true);
  };

  // 동의 후 실제 등록.
  const doRegister = async () => {
    if (!user) return;
    setConsentOpen(false);
    setSaving(true);
    const tags = styleTags.split(",").map((t) => t.trim()).filter(Boolean);
    const sellable = ["design", ...(sellPrint ? ["design_print"] : [])];
    const { error } = await (supabase as any).from("designer_designs").insert({
      designer_user_id: user.id,
      place_id: placeId,
      title: title.trim(),
      description: description.trim() || null,
      price: priceNum,
      preview_urls: [previewUrl.trim()],
      style_tags: tags,
      sellable,
      status: "pending",
    });
    setSaving(false);
    if (error) { toast.error("등록에 실패했어요"); return; }
    toast.success("디자인을 등록했어요", { description: "운영자 검토 후 판매가 시작돼요." });
    setTitle(""); setDescription(""); setPrice(""); setPreviewUrl(""); setStyleTags(""); setSellPrint(false);
    setUploaderKey((k) => k + 1);
    void load();
  };

  const onDelete = async (id: string) => {
    if (!(await confirm({ title: "이 디자인을 삭제할까요?", confirmText: "삭제", destructive: true }))) return;
    const { error } = await (supabase as any).from("designer_designs").delete().eq("id", id);
    if (error) { toast.error("삭제에 실패했어요"); return; }
    setItems((prev) => prev.filter((d) => d.id !== id));
    toast.success("삭제했어요");
  };

  return (
    <div className="min-h-screen bg-background app-col mx-auto pb-24">
      <PageHeader title="디자인 등록" />
      <main className="p-4 space-y-5">
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">새 디자인 등록</h2>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">제목</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 미니멀 레터프레스 청첩장" maxLength={100} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">설명</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="디자인 소개(선택)" maxLength={300} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">가격(원) · 라이선스 포함</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="29000" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">대표 이미지</Label>
            {user && (
              <ImageUploader
                key={uploaderKey}
                bucket="vendor-images"
                pathPrefix={`${user.id}/`}
                initialUrl={previewUrl || undefined}
                onUploaded={(_, url) => setPreviewUrl(url)}
              />
            )}
            <Input value={previewUrl} onChange={(e) => setPreviewUrl(e.target.value)} placeholder="또는 이미지 URL" className="mt-2" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">스타일 태그 (쉼표)</Label>
            <Input value={styleTags} onChange={(e) => setStyleTags(e.target.value)} placeholder="예: 미니멀, 모던, 레터프레스" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={sellPrint} onCheckedChange={(v) => setSellPrint(v === true)} />
            <span className="text-[13px] text-foreground">인쇄까지 제공(디자인+인쇄)</span>
          </label>
          <Button onClick={onClickRegister} disabled={saving} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> 상품 등록</>}
          </Button>
        </div>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-foreground">내 디자인</h2>
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          ) : items.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">아직 등록한 디자인이 없어요.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {items.map((d) => (
                <div key={d.id} className="bg-card rounded-2xl border border-border overflow-hidden">
                  <div className="aspect-[3/4] bg-muted">
                    {d.preview_urls?.[0] && <img src={d.preview_urls[0]} alt={d.title} className="w-full h-full object-cover" />}
                  </div>
                  <div className="p-2.5 space-y-1">
                    <p className="text-[13px] font-semibold text-foreground truncate">{d.title}</p>
                    <p className="text-[12px] text-muted-foreground">{d.price.toLocaleString()}원</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${d.status === "approved" ? "bg-primary/10 text-primary" : d.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-amber-100 text-amber-700"}`}>
                        {STATUS_LABEL[d.status]}
                      </span>
                      <button onClick={() => onDelete(d.id)} className="text-[11px] text-destructive inline-flex items-center gap-0.5">
                        <Trash2 className="w-3 h-3" /> 삭제
                      </button>
                    </div>
                    {d.status === "rejected" && d.review_note && (
                      <p className="text-[11px] text-destructive">사유: {d.review_note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <DesignListingConsentDialog
        isOpen={consentOpen}
        onClose={() => setConsentOpen(false)}
        onConfirm={doRegister}
      />
    </div>
  );
};

export default BusinessDesigns;
