import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Package, Loader2, X } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ImageUploader from "@/components/ImageUploader";
import { useAuth } from "@/contexts/AuthContext";
import { useBranches } from "@/features/partners/hooks/useBranches";
import { fetchBusinessProducts, addBusinessProduct, deleteBusinessProduct, type ProductItem } from "@/features/partners/data/businessProducts";
import { toast } from "sonner";
import { confirm } from "@/components/ui/confirm-dialog";

const STATUS: Record<string, { label: string; color: string }> = {
  approved: { label: "노출중", color: "bg-green-100 text-green-700" },
  pending: { label: "검토 중", color: "bg-amber-100 text-amber-700" },
  rejected: { label: "반려됨", color: "bg-destructive/10 text-destructive" },
};

// 업체 상품 등록. 운영자 검토 필수 — 저장 시 검토 대기, 승인 시 공개.
const BusinessProducts = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedId, loading: branchesLoading } = useBranches();
  const [loading, setLoading] = useState(true);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [items, setItems] = useState<ProductItem[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [detailImages, setDetailImages] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [uploaderKey, setUploaderKey] = useState(0);

  const loadProducts = useCallback(async (pid: string) => {
    setLoadError(false);
    try {
      setItems(await fetchBusinessProducts(pid));
    } catch {
      setItems([]);
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    if (branchesLoading) return;
    if (!selectedId) { setLoading(false); return; }
    setPlaceId(selectedId);
    (async () => { await loadProducts(selectedId); setLoading(false); })();
  }, [branchesLoading, selectedId, loadProducts]);

  const handleAdd = async () => {
    if (!user || !placeId) return;
    if (!name.trim()) { toast.error("상품명을 입력해주세요"); return; }
    setAdding(true);
    try {
      await addBusinessProduct({
        place_id: placeId,
        owner_user_id: user.id,
        name: name.trim(),
        price: price ? parseInt(price, 10) : null,
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        detail_images: detailImages,
      });
    } catch {
      setAdding(false);
      toast.error("등록에 실패했어요");
      return;
    }
    setAdding(false);
    setName(""); setPrice(""); setDescription(""); setImageUrl(""); setDetailImages([]);
    setUploaderKey((k) => k + 1);
    toast.success("상품을 등록했어요. 운영자 검토 후 노출됩니다");
    await loadProducts(placeId);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: "이 상품을 삭제할까요?", confirmText: "삭제", destructive: true }))) return;
    try {
      await deleteBusinessProduct(id);
    } catch {
      toast.error("삭제에 실패했어요");
      return;
    }
    setItems((prev) => prev.filter((p) => p.id !== id));
    toast.success("삭제했어요");
  };

  if (loading) {
    return <div className="min-h-screen bg-background app-col mx-auto flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }
  if (!placeId) {
    return (
      <div className="min-h-screen bg-background app-col mx-auto">
        <PageHeader title="상품 관리" />
        <div className="px-5 py-20 text-center">
          <p className="text-muted-foreground">먼저 업체 기본 정보를 저장해주세요.</p>
          <Button className="mt-6" onClick={() => navigate("/business/edit")}>업체 정보 입력</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background app-col mx-auto">
      <PageHeader title="상품 관리" />
      <main className="p-4 pb-24 space-y-5">
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">상품 등록</h2>
            <span className="text-[11px] text-muted-foreground">· 운영자 검토 후 노출</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">상품명</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="상품명" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">가격(원)</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="100000" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">설명 (선택)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="상품 설명 (상세 이미지로 대신해도 돼요)" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">대표 사진 (썸네일)</Label>
            {user && (
              <ImageUploader
                key={uploaderKey}
                bucket="vendor-images"
                pathPrefix={`${user.id}/`}
                initialUrl={imageUrl || undefined}
                onUploaded={(_, url) => setImageUrl(url)}
              />
            )}
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="또는 외부 이미지 URL (https://...)"
              className="mt-2"
            />
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
            <p className="text-[11px] text-muted-foreground">한 장씩 올리면 계속 추가돼요. 이미지만으로 상세를 구성할 수 있어요(설명 생략 가능).</p>
          </div>
          <Button onClick={handleAdd} disabled={adding} className="w-full">
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> 상품 등록</>}
          </Button>
        </div>

        {items.length === 0 ? (
          loadError ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-sm text-muted-foreground">상품을 불러오지 못했어요.</p>
              <button onClick={() => placeId && loadProducts(placeId)} className="text-sm text-primary font-semibold">다시 시도</button>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-8">등록한 상품이 없어요</p>
          )
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((p) => {
              const st = STATUS[p.moderation_status] ?? STATUS.pending;
              return (
                <div key={p.id} className="bg-card rounded-2xl border border-border overflow-hidden">
                  <div className="aspect-square bg-muted relative">
                    {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />}
                    <span className={`absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                  </div>
                  <div className="p-2.5">
                    <p className="text-[13px] font-semibold text-foreground truncate">{p.name}</p>
                    {p.price != null && <p className="text-[12px] text-muted-foreground">{p.price.toLocaleString()}원</p>}
                    {p.moderation_status === "rejected" && p.moderation_note && (
                      <p className="text-[10px] text-destructive mt-0.5 line-clamp-2 whitespace-pre-line">반려: {p.moderation_note}</p>
                    )}
                    <button onClick={() => handleDelete(p.id)} className="mt-1 text-[11px] text-destructive inline-flex items-center gap-1">
                      <Trash2 className="w-3 h-3" /> 삭제
                    </button>
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

export default BusinessProducts;
