import { useNavigate } from "react-router-dom";
import { Heart, Coins, Ticket, ShoppingBag, FileText, ClipboardList, Package } from "lucide-react";
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
        supabase.from("user_points").select("balance").eq("user_id", user.id).maybeSingle(),
        (supabase as any).from("user_hearts").select("balance").eq("user_id", user.id).maybeSingle(),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setFavCount(favRes.count ?? 0);
      setPoints(pointsRes.data?.balance ?? 0);
      setHearts(heartsRes.data?.balance ?? 0);
      setOrderCount(orderRes.count ?? 0);
    };
    fetchCounts();
  }, [user]);

  // 5열 — 배경 없이 아이콘 자체로 톤 분리. 라벨·값 텍스트는 검정 통일.
  //   찜       : 핑크 (primary, 변경 없음)
  //   하트     : 로즈 + 채워진 하트
  //   포인트   : 노랑 (amber)
  //   쿠폰     : 하늘 (sky)
  //   주문내역 : 주황 (orange)
  const items = [
    {
      icon: Heart,
      label: "찜",
      value: user ? String(favCount) : "-",
      href: "/favorites",
      iconClass: "text-primary",
    },
    {
      icon: Heart,
      label: "하트",
      value: user ? String(hearts) : "-",
      href: "/points",
      iconClass: "text-rose-500 fill-rose-500",
    },
    {
      icon: Coins,
      label: "포인트",
      value: user ? `${points.toLocaleString()}P` : "-",
      href: "/points",
      iconClass: "text-amber-500",
    },
    {
      icon: Ticket,
      label: "쿠폰",
      value: "-",
      href: "/coupons",
      iconClass: "text-sky-500",
    },
    {
      icon: ShoppingBag,
      label: "주문내역",
      value: user ? String(orderCount) : "-",
      href: "/orders",
      iconClass: "text-orange-500",
    },
    {
      icon: FileText,
      label: "내 견적",
      value: "-",
      href: "/quote",
      iconClass: "text-primary",
    },
    {
      icon: ClipboardList,
      label: "업체보드",
      value: "-",
      href: "/board",
      iconClass: "text-primary",
    },
    {
      icon: Package,
      label: "받은 결과물",
      value: "-",
      href: "/my-deliveries",
      iconClass: "text-primary",
    },
  ];

  return (
    <div className="px-4 py-3">
      <div className="grid grid-cols-5 gap-1.5">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.href)}
            className="flex flex-col items-center gap-1.5 p-2 bg-card rounded-2xl border border-border hover:border-primary/20 active:scale-[0.96] transition-all"
          >
            <div className="w-10 h-10 flex items-center justify-center">
              <item.icon className={`w-6 h-6 ${item.iconClass}`} />
            </div>
            <span className="text-[10px] font-medium text-foreground/80">
              {item.label}
            </span>
            <span className="text-[11px] font-bold text-foreground/80 truncate w-full text-center">
              {item.value}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickMenuGrid;
