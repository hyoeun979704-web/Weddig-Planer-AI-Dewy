import { useNavigate } from "react-router-dom";
import { Heart, Coins, Ticket, ShoppingBag, HeartHandshake } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface QuickMenuGridProps {
  user: User | null;
}

const QuickMenuGrid = ({ user }: QuickMenuGridProps) => {
  const navigate = useNavigate();
  const [favCount, setFavCount] = useState(0);
  const [points, setPoints] = useState(0);
  const [hearts, setHearts] = useState(0);
  const [orderCount, setOrderCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchCounts = async () => {
      const [favRes, pointsRes, heartsRes, orderRes] = await Promise.all([
        supabase.from("favorites").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("user_points").select("total_points").eq("user_id", user.id).maybeSingle(),
        (supabase as any).from("user_hearts").select("balance").eq("user_id", user.id).maybeSingle(),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setFavCount(favRes.count ?? 0);
      setPoints(pointsRes.data?.total_points ?? 0);
      setHearts(heartsRes.data?.balance ?? 0);
      setOrderCount(orderRes.count ?? 0);
    };
    fetchCounts();
  }, [user]);

  // 5열 그리드 — 찜 / 하트 / 포인트 / 쿠폰 / 주문내역
  // 하트는 AI 시뮬·청첩장·메이크업 등 핵심 유료 기능의 결제 수단.
  const items = [
    { icon: Heart, label: "찜", value: user ? String(favCount) : "-", href: "/favorites", color: "text-primary", bg: "bg-primary/10" },
    { icon: HeartHandshake, label: "하트", value: user ? String(hearts) : "-", href: "/points", color: "text-rose-500", bg: "bg-rose-50" },
    { icon: Coins, label: "포인트", value: user ? `${points.toLocaleString()}P` : "-", href: "/points", color: "text-primary", bg: "bg-primary/10" },
    { icon: Ticket, label: "쿠폰", value: "-", href: "/coupons", color: "text-primary", bg: "bg-primary/10" },
    { icon: ShoppingBag, label: "주문내역", value: user ? String(orderCount) : "-", href: "/orders", color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <div className="px-4 py-3">
      <div className="grid grid-cols-5 gap-1.5">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.href)}
            className="flex flex-col items-center gap-1 p-2 bg-card rounded-2xl border border-border hover:border-primary/20 active:scale-[0.96] transition-all"
          >
            <div className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center`}>
              <item.icon className={`w-4 h-4 ${item.color}`} />
            </div>
            <span className="text-[10px] font-medium text-foreground">{item.label}</span>
            <span className={`text-[11px] font-bold ${item.color} truncate w-full text-center`}>
              {item.value}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickMenuGrid;
