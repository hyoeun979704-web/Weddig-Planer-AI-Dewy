import { useCallback, useEffect, useState } from "react";
import { Loader2, Lock, Check, Sparkles } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ORDER_SESSION_KEY } from "@/pages/Checkout";
import { computeDesignCharge } from "@/lib/designPricing";

interface DesignCard {
  id: string;
  title: string;
  price: number;
  preview_urls: string[];
  style_tags: string[];
  sellable: string[];
}

const InvitationMarket = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<"market" | "mine">("market");
  const [designs, setDesigns] = useState<DesignCard[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [selected, setSelected] = useState<DesignCard | null>(null);
  const [usePoints, setUsePoints] = useState(0);
  const [buying, setBuying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: market }, { data: pts }] = await Promise.all([
      (supabase as any)
        .from("designer_designs")
        .select("id, title, price, preview_urls, style_tags, sellable")
        .eq("status", "approved").eq("active", true)
        .order("created_at", { ascending: false }),
      user ? supabase.from("user_points").select("balance").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    setDesigns((market as DesignCard[]) ?? []);
    setBalance((pts?.data?.balance as number) ?? 0);
    if (user) {
      const { data: owned } = await (supabase as any).from("design_purchases").select("design_id").eq("user_id", user.id);
      setOwnedIds(new Set(((owned as { design_id: string }[]) ?? []).map((o) => o.design_id)));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const openBuy = (d: DesignCard) => {
    if (!user) { toast.error("로그인이 필요해요"); return; }
    setSelected(d); setUsePoints(0);
  };

  const charge = selected ? computeDesignCharge(selected.price, usePoints, balance) : null;

  const onBuy = async () => {
    if (!selected) return;
    setBuying(true);
    const { data, error } = await supabase.functions.invoke("design-purchase-ready", {
      body: { designId: selected.id, usePoints, origin: window.location.origin },
    });
    setBuying(false);
    if (error || !data?.success) { toast.error(data?.error || "결제 준비에 실패했어요"); return; }
    sessionStorage.setItem(
      ORDER_SESSION_KEY,
      JSON.stringify({ tid: data.tid, partnerOrderId: data.partner_order_id, partnerUserId: data.partner_user_id, type: "design" }),
    );
    const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
    window.location.href = isMobile ? data.next_redirect_mobile_url : data.next_redirect_pc_url;
  };

  const list = tab === "market" ? designs : designs.filter((d) => ownedIds.has(d.id));

  return (
    <div className="min-h-screen bg-background app-col mx-auto pb-10">
      <PageHeader title="청첩장 디자인 마켓" />
      <main className="px-4 py-4 space-y-4">
        <div className="flex gap-2">
          {(["market", "mine"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 h-9 rounded-full text-sm font-semibold ${tab === t ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"}`}
            >
              {t === "market" ? "마켓" : "내 디자인"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : list.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-16">
            {tab === "market" ? "등록된 디자인이 아직 없어요." : "구매한 디자인이 없어요."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {list.map((d) => {
              const owned = ownedIds.has(d.id);
              return (
                <button key={d.id} onClick={() => (owned ? toast.success("보유한 디자인이에요") : openBuy(d))} className="text-left">
                  <div className="bg-card rounded-2xl border border-border overflow-hidden">
                    <div className="aspect-[3/4] bg-muted relative">
                      {d.preview_urls?.[0] && <img src={d.preview_urls[0]} alt={d.title} className="w-full h-full object-cover" />}
                      <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-0.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {owned ? <><Check className="w-2.5 h-2.5" /> 보유</> : <><Lock className="w-2.5 h-2.5" /> {d.price.toLocaleString()}원</>}
                      </span>
                    </div>
                    <div className="p-2.5">
                      <p className="text-[13px] font-semibold text-foreground truncate">{d.title}</p>
                      {d.style_tags?.length > 0 && (
                        <p className="text-[11px] text-muted-foreground truncate">#{d.style_tags.slice(0, 2).join(" #")}</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-base">{selected?.title}</DialogTitle></DialogHeader>
          {selected && charge && (
            <div className="space-y-3">
              {selected.preview_urls?.[0] && (
                <img src={selected.preview_urls[0]} alt={selected.title} className="w-full rounded-xl aspect-[3/4] object-cover" />
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">가격</span>
                <span className="font-semibold">{selected.price.toLocaleString()}원</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">포인트 사용 (보유 {balance.toLocaleString()}P)</span>
                </div>
                <Input
                  type="number"
                  value={usePoints || ""}
                  onChange={(e) => setUsePoints(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  placeholder="0"
                />
                {charge.capped && <p className="text-[11px] text-amber-600">최대 {charge.discount.toLocaleString()}P 까지 사용돼요(최소 결제액 유지).</p>}
              </div>
              <div className="flex items-center justify-between text-sm border-t border-border pt-2">
                <span className="font-semibold">최종 결제</span>
                <span className="font-bold text-primary">{charge.final.toLocaleString()}원</span>
              </div>
              <Button className="w-full h-11" onClick={onBuy} disabled={buying}>
                {buying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
                구매하고 사용하기
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                구매 시 이용범위는 작가가 정한 라이선스를 따릅니다(본인 결혼식용, 재판매 금지).
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvitationMarket;
