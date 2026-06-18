import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Coupon {
  id: string;
  title: string;
  discount_text: string;
  min_order_won: number | null;
  expires_at: string | null;
}

// 쿠폰 만료일 표시 — ISO("2026-12-31T00:00:00+00:00") → "2026.12.31". 잘못된 값은 숨김.
const fmtCouponDate = (iso: string): string | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[1]}.${m[2]}.${m[3]}` : null;
};

// 업체 상세페이지의 쿠폰 섹션 — 사용자가 "받기"로 다운로드. 쿠폰 없으면 렌더 안 함.
const PlaceCoupons = ({ placeId }: { placeId: string }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    // moderation_status='approved' 명시 필터 — RLS 가 이미 차단하지만,
    // owner 본인이 자기 가게 페이지 볼 때 자기 pending 쿠폰이 새지 않게.
    const { data } = await supabase
      .from("business_coupons" as any)
      .select("id, title, discount_text, min_order_won, expires_at, is_active")
      .eq("place_id", placeId)
      .eq("is_active", true)
      .eq("moderation_status", "approved")
      .order("created_at", { ascending: false });
    const active = ((data ?? []) as unknown as (Coupon & { is_active: boolean })[])
      .filter((c) => !c.expires_at || c.expires_at >= today);
    setCoupons(active);

    if (user && active.length > 0) {
      const { data: dl } = await supabase
        .from("coupon_downloads" as any)
        .select("coupon_id")
        .eq("user_id", user.id)
        .in("coupon_id", active.map((c) => c.id));
      setDownloaded(new Set(((dl ?? []) as unknown as { coupon_id: string }[]).map((d) => d.coupon_id)));
    }
  }, [placeId, user]);

  useEffect(() => { load(); }, [load]);

  const handleDownload = async (id: string) => {
    if (!user) { toast.error("로그인 후 받을 수 있어요"); navigate("/auth"); return; }
    const { error } = await (supabase as any).from("coupon_downloads").insert({ coupon_id: id, user_id: user.id });
    if (error) {
      // 유니크 제약(이미 받음) 등
      if (error.code === "23505") { setDownloaded((p) => new Set(p).add(id)); return; }
      toast.error("쿠폰 받기에 실패했어요");
      return;
    }
    setDownloaded((p) => new Set(p).add(id));
    toast.success("쿠폰을 받았어요");
  };

  if (coupons.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="font-bold text-sm flex items-center gap-1.5"><Ticket className="w-4 h-4 text-primary" /> 쿠폰</h3>
      {coupons.map((c) => {
        const got = downloaded.has(c.id);
        return (
          <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{c.title}</p>
              <p className="text-[13px] text-primary font-bold">{c.discount_text}</p>
              <div className="flex gap-2 text-[11px] text-muted-foreground mt-0.5">
                {c.min_order_won != null && <span>최소 {c.min_order_won.toLocaleString()}원</span>}
                {c.expires_at && fmtCouponDate(c.expires_at) && <span>{fmtCouponDate(c.expires_at)}까지</span>}
              </div>
            </div>
            <button
              onClick={() => handleDownload(c.id)}
              disabled={got}
              className={`shrink-0 px-3 py-2 rounded-xl text-[13px] font-semibold ${got ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground active:scale-[0.98]"}`}
            >
              {got ? <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5" /> 받음</span> : "받기"}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default PlaceCoupons;
