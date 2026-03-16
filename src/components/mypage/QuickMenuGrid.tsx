import { useNavigate } from "react-router-dom";
import { Heart, Coins, Ticket, ShoppingBag } from "lucide-react";
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
  const [orderCount, setOrderCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchCounts = async () => {
      const [favRes, pointsRes, orderRes] = await Promise.all([
        supabase.from("favorites").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("user_points").select("total_points").eq("user_id", user.id).maybeSingle(),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setFavCount(favRes.count ?? 0);
      setPoints(pointsRes.data?.total_points ?? 0);
      setOrderCount(orderRes.count ?? 0);
    };
    fetchCounts();
  }, [user]);

  const items = [
    { icon: Heart, label: "찜", value: user ? String(favCount) : "-", href: "/favorites", color: "text-primary", bg: "bg-primary/10" },
    { icon: Coins, label: "포인트", value: user ? `${points.toLocaleString()}P` : "-", href: "/points", color: "text-primary", bg: "bg-primary/10" },
    { icon: Ticket, label: "쿠폰", value: "-", href: "/coupons", color: "text-primary", bg: "bg-primary/10" },
    { icon: ShoppingBag, label: "주문내역", value: user ? String(orderCount) : "-", href: "/orders", color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <div className="px-4 py-3">
      <div className="grid grid-cols-4 gap-2">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.href)}
            className="flex flex-col items-center gap-1.5 p-3 bg-card rounded-2xl border border-border hover:border-primary/20 active:scale-[0.96] transition-all"
          >
            <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center`}>
              <item.icon className={`w-5 h-5 ${item.color}`} />
            </div>
            <span className="text-[11px] font-medium text-foreground">{item.label}</span>
            <span className={`text-xs font-bold ${item.color}`}>{item.value}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickMenuGrid;
