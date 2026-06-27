import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Ticket, Calendar, Loader2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { fetchDownloadedCoupons } from "@/features/consumer/data/shop";
import { useAuth } from "@/contexts/AuthContext";

// 사용자가 받은(다운로드한) 업체 쿠폰함.
const Coupons = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["my-coupons", user?.id],
    queryFn: async () => {
      if (!user) return [];
      return fetchDownloadedCoupons(user.id);
    },
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-background app-col mx-auto relative">
      <PageHeader title="쿠폰" />
      <main className="pb-20">
        {!user ? (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4"><Ticket className="w-8 h-8 text-muted-foreground" /></div>
            <p className="text-muted-foreground mb-4">로그인 후 받은 쿠폰을 볼 수 있어요</p>
            <button onClick={() => navigate("/auth")} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium">로그인하기</button>
          </div>
        ) : isLoading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : coupons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4"><Ticket className="w-8 h-8 text-muted-foreground" /></div>
            <p className="text-foreground font-semibold mb-1">받은 쿠폰이 없어요</p>
            <p className="text-sm text-muted-foreground">업체 상세페이지에서 쿠폰을 받아보세요.</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {coupons.map((d) => {
              const c = d.business_coupons;
              if (!c) return null;
              return (
                <div key={d.id} className="bg-card rounded-2xl border border-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-5 h-5 text-primary" />
                      <h3 className="font-bold text-foreground">{c.title}</h3>
                    </div>
                    <span className="text-xl font-bold text-primary">{c.discount_text}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                    {c.min_order_won != null && <span>최소 {c.min_order_won.toLocaleString()}원</span>}
                    {c.expires_at && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{c.expires_at}까지</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <BottomNav activeTab="/mypage" onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Coupons;
