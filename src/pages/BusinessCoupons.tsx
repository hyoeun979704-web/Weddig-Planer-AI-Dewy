import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Ticket, Loader2, Calendar } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Coupon {
  id: string;
  title: string;
  discount_text: string;
  min_order_won: number | null;
  expires_at: string | null;
  is_active: boolean;
}

// 업체 쿠폰 발행/관리. 운영자 검토 면제 — 저장 즉시 노출.
const BusinessCoupons = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [items, setItems] = useState<Coupon[]>([]);
  const [title, setTitle] = useState("");
  const [discount, setDiscount] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [expires, setExpires] = useState("");
  const [adding, setAdding] = useState(false);

  const loadCoupons = useCallback(async (pid: string) => {
    const { data } = await supabase
      .from("business_coupons" as any)
      .select("id, title, discount_text, min_order_won, expires_at, is_active")
      .eq("place_id", pid)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as unknown as Coupon[]);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).rpc("get_my_listing");
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.place_id) {
        setPlaceId(row.place_id);
        await loadCoupons(row.place_id);
      }
      setLoading(false);
    })();
  }, [loadCoupons]);

  const handleAdd = async () => {
    if (!user || !placeId) return;
    if (!title.trim() || !discount.trim()) {
      toast.error("쿠폰명과 할인 내용을 입력해주세요");
      return;
    }
    setAdding(true);
    const { error } = await (supabase as any).from("business_coupons").insert({
      place_id: placeId,
      owner_user_id: user.id,
      title: title.trim(),
      discount_text: discount.trim(),
      min_order_won: minOrder ? parseInt(minOrder, 10) : null,
      expires_at: expires || null,
    });
    setAdding(false);
    if (error) { toast.error("발행에 실패했어요"); return; }
    setTitle(""); setDiscount(""); setMinOrder(""); setExpires("");
    toast.success("쿠폰을 발행했어요");
    await loadCoupons(placeId);
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from("business_coupons").delete().eq("id", id);
    if (error) { toast.error("삭제에 실패했어요"); return; }
    setItems((prev) => prev.filter((c) => c.id !== id));
  };

  if (loading) {
    return <div className="min-h-screen bg-background max-w-[430px] mx-auto flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  if (!placeId) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto">
        <PageHeader title="쿠폰 관리" />
        <div className="px-5 py-20 text-center">
          <p className="text-muted-foreground">먼저 업체 기본 정보를 저장해주세요.</p>
          <Button className="mt-6" onClick={() => navigate("/business/edit")}>업체 정보 입력</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto">
      <PageHeader title="쿠폰 관리" />
      <main className="p-4 pb-24 space-y-5">
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">쿠폰 발행</h2>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">쿠폰명</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 신규 고객 할인" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">할인 내용</Label>
              <Input value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="10% / 5만원" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">최소 주문(원)</Label>
              <Input type="number" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="500000" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">만료일 (선택)</Label>
            <Input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
          </div>
          <Button onClick={handleAdd} disabled={adding} className="w-full">
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> 쿠폰 발행</>}
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">발행한 쿠폰이 없어요</p>
        ) : (
          <div className="space-y-3">
            {items.map((c) => (
              <div key={c.id} className="bg-card rounded-2xl border border-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-foreground">{c.title}</p>
                    <p className="text-sm text-primary font-semibold mt-0.5">{c.discount_text}</p>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                      {c.min_order_won != null && <span>최소 {c.min_order_won.toLocaleString()}원</span>}
                      {c.expires_at && <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" />{c.expires_at}까지</span>}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(c.id)} className="text-destructive shrink-0">
                    <Trash2 className="w-4 h-4" />
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

export default BusinessCoupons;
