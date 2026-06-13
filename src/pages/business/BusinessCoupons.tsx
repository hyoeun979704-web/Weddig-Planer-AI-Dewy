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
import { confirm } from "@/components/ui/confirm-dialog";

interface Coupon {
  id: string;
  title: string;
  discount_text: string;
  min_order_won: number | null;
  expires_at: string | null;
  is_active: boolean;
  moderation_status: string;
  moderation_note: string | null;
}

const STATUS: Record<string, { label: string; color: string }> = {
  approved: { label: "노출중", color: "bg-green-100 text-green-700" },
  pending: { label: "검토 중", color: "bg-amber-100 text-amber-700" },
  rejected: { label: "반려됨", color: "bg-destructive/10 text-destructive" },
};

// 업체 쿠폰 발행/관리. 운영자 검토 필수 — 저장 시 검토 대기, 승인 시 노출.
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
      .select("id, title, discount_text, min_order_won, expires_at, is_active, moderation_status, moderation_note")
      .eq("place_id", pid)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as unknown as Coupon[]);
  }, []);

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any).rpc("get_my_listing");
      if (error) { toast.error("정보를 불러오지 못했어요"); setLoading(false); return; }
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.place_id) {
        setPlaceId(row.place_id);
        await loadCoupons(row.place_id);
      }
      setLoading(false);
    })();
  }, [loadCoupons]);

  const fmtDate = (s: string | null) => {
    if (!s) return "";
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleDateString("ko-KR");
  };

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
    toast.success("쿠폰을 등록했어요. 운영자 검토 후 노출됩니다");
    await loadCoupons(placeId);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: "이 쿠폰을 삭제할까요?", confirmText: "삭제", destructive: true }))) return;
    const { error } = await (supabase as any).from("business_coupons").delete().eq("id", id);
    if (error) { toast.error("삭제에 실패했어요"); return; }
    setItems((prev) => prev.filter((c) => c.id !== id));
    toast.success("삭제했어요");
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
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[12px] text-amber-800">
          쿠폰은 <b>운영자 검토 후 노출</b>됩니다. (보통 1영업일 이내)
        </div>
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
            {items.map((c) => {
              const st = STATUS[c.moderation_status] ?? STATUS.pending;
              return (
                <div key={c.id} className="bg-card rounded-2xl border border-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-foreground">{c.title}</p>
                      <p className="text-sm text-primary font-semibold mt-0.5">{c.discount_text}</p>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                        {c.min_order_won != null && <span>최소 {c.min_order_won.toLocaleString()}원</span>}
                        {c.expires_at && <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" />{fmtDate(c.expires_at)}까지</span>}
                      </div>
                      {c.moderation_status === "rejected" && c.moderation_note && (
                        <p className="text-[11px] text-destructive mt-1 whitespace-pre-line">반려 사유: {c.moderation_note}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`text-[11px] px-2 py-1 rounded-full ${st.color}`}>{st.label}</span>
                      <button onClick={() => handleDelete(c.id)} className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
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

export default BusinessCoupons;
