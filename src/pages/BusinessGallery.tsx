import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Image as ImageIcon, Loader2, UtensilsCrossed } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface MediaItem {
  id: string;
  kind: string;
  image_url: string | null;
  title: string | null;
  price: number | null;
}

// 업체 사진/메뉴 관리. 모임장소(invitation_venue)는 "메뉴 등록"(메뉴명·가격·사진),
// 그 외 업체는 "사진 등록"(갤러리). place_media 테이블(공개 읽기·소유자 쓰기).
const BusinessGallery = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [adding, setAdding] = useState(false);

  const isMenu = category === "invitation_venue";

  const loadMedia = useCallback(async (pid: string) => {
    const { data } = await supabase
      .from("place_media" as any)
      .select("id, kind, image_url, title, price")
      .eq("place_id", pid)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });
    setItems((data ?? []) as unknown as MediaItem[]);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).rpc("get_my_listing");
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.place_id) {
        setPlaceId(row.place_id);
        setCategory(row.category);
        await loadMedia(row.place_id);
      }
      setLoading(false);
    })();
  }, [loadMedia]);

  const handleAdd = async () => {
    if (!user || !placeId) return;
    if (!imageUrl.trim()) { toast.error("이미지 URL을 입력해주세요"); return; }
    if (isMenu && !title.trim()) { toast.error("메뉴명을 입력해주세요"); return; }
    setAdding(true);
    const { error } = await (supabase as any).from("place_media").insert({
      place_id: placeId,
      owner_user_id: user.id,
      kind: isMenu ? "menu" : "photo",
      image_url: imageUrl.trim(),
      title: isMenu ? title.trim() : null,
      price: isMenu && price ? parseInt(price, 10) : null,
      display_order: items.length,
    });
    setAdding(false);
    if (error) { toast.error("추가에 실패했어요"); return; }
    setImageUrl(""); setTitle(""); setPrice("");
    toast.success(isMenu ? "메뉴를 추가했어요" : "사진을 추가했어요");
    await loadMedia(placeId);
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from("place_media").delete().eq("id", id);
    if (error) { toast.error("삭제에 실패했어요"); return; }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!placeId) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto">
        <PageHeader title="사진/메뉴 관리" />
        <div className="px-5 py-20 text-center">
          <p className="text-muted-foreground">먼저 업체 기본 정보를 저장해주세요.</p>
          <Button className="mt-6" onClick={() => navigate("/business/edit")}>업체 정보 입력</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto">
      <PageHeader title={isMenu ? "메뉴 관리" : "사진 관리"} />

      <main className="p-4 pb-24 space-y-5">
        {/* Add form */}
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            {isMenu ? <UtensilsCrossed className="w-4 h-4 text-primary" /> : <ImageIcon className="w-4 h-4 text-primary" />}
            <h2 className="text-sm font-semibold text-foreground">{isMenu ? "메뉴 등록" : "사진 등록"}</h2>
          </div>
          {isMenu && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">메뉴명</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 코스 A" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">가격(원)</Label>
                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="59000" />
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">{isMenu ? "메뉴 사진 URL" : "사진 URL"}</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
          </div>
          <Button onClick={handleAdd} disabled={adding} className="w-full">
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> {isMenu ? "메뉴 추가" : "사진 추가"}</>}
          </Button>
        </div>

        {/* List */}
        {items.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            {isMenu ? "등록된 메뉴가 없어요" : "등록된 사진이 없어요"}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((m) => (
              <div key={m.id} className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="aspect-square bg-muted">
                  {m.image_url && <img src={m.image_url} alt={m.title ?? ""} className="w-full h-full object-cover" />}
                </div>
                <div className="p-2.5">
                  {isMenu && (
                    <>
                      <p className="text-[13px] font-semibold text-foreground truncate">{m.title}</p>
                      {m.price != null && <p className="text-[12px] text-muted-foreground">{m.price.toLocaleString()}원</p>}
                    </>
                  )}
                  <button onClick={() => handleDelete(m.id)} className="mt-1 text-[11px] text-destructive inline-flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> 삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default BusinessGallery;
