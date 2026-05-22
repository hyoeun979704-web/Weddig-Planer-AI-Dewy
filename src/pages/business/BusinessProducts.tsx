import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Package, Loader2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ProductItem {
  id: string;
  name: string;
  price: number | null;
  description: string | null;
  image_url: string | null;
  moderation_status: string;
}

const STATUS: Record<string, { label: string; color: string }> = {
  approved: { label: "노출중", color: "bg-green-100 text-green-700" },
  pending: { label: "검토 중", color: "bg-amber-100 text-amber-700" },
  rejected: { label: "반려됨", color: "bg-destructive/10 text-destructive" },
};

// 업체 상품 등록. 운영자 검토 필수 — 저장 시 검토 대기, 승인 시 공개.
const BusinessProducts = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [items, setItems] = useState<ProductItem[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [adding, setAdding] = useState(false);

  const loadProducts = useCallback(async (pid: string) => {
    const { data } = await supabase
      .from("business_products" as any)
      .select("id, name, price, description, image_url, moderation_status")
      .eq("place_id", pid)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as unknown as ProductItem[]);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).rpc("get_my_listing");
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.place_id) {
        setPlaceId(row.place_id);
        await loadProducts(row.place_id);
      }
      setLoading(false);
    })();
  }, [loadProducts]);

  const handleAdd = async () => {
    if (!user || !placeId) return;
    if (!name.trim()) { toast.error("상품명을 입력해주세요"); return; }
    setAdding(true);
    const { error } = await (supabase as any).from("business_products").insert({
      place_id: placeId,
      owner_user_id: user.id,
      name: name.trim(),
      price: price ? parseInt(price, 10) : null,
      description: description.trim() || null,
      image_url: imageUrl.trim() || null,
    });
    setAdding(false);
    if (error) { toast.error("등록에 실패했어요"); return; }
    setName(""); setPrice(""); setDescription(""); setImageUrl("");
    toast.success("상품을 등록했어요. 운영자 검토 후 노출됩니다");
    await loadProducts(placeId);
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from("business_products").delete().eq("id", id);
    if (error) { toast.error("삭제에 실패했어요"); return; }
    setItems((prev) => prev.filter((p) => p.id !== id));
  };

  if (loading) {
    return <div className="min-h-screen bg-background max-w-[430px] mx-auto flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }
  if (!placeId) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto">
        <PageHeader title="상품 관리" />
        <div className="px-5 py-20 text-center">
          <p className="text-muted-foreground">먼저 업체 기본 정보를 저장해주세요.</p>
          <Button className="mt-6" onClick={() => navigate("/business/edit")}>업체 정보 입력</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto">
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
            <Label className="text-xs">설명</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="상품 설명" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">상품 사진 URL</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
          </div>
          <Button onClick={handleAdd} disabled={adding} className="w-full">
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> 상품 등록</>}
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">등록한 상품이 없어요</p>
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
