import { useNavigate } from "react-router-dom";
import { ArrowLeft, Coins, Clock, ChevronRight, Loader2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { usePoints, labelForReason } from "@/hooks/usePoints";

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

const Points = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { balance, transactions, isLoading } = usePoints();

  const cashValue = Math.floor(balance * 0.2); // 1P = 0.2원

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-lg pr-10">포인트</h1>
        </div>
      </header>

      <main className="pb-20">
        {/* Point Summary */}
        <div className="p-6 bg-gradient-to-br from-primary/20 to-primary/5">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">보유 포인트</p>
            {isLoading ? (
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
            ) : (
              <>
                <p className="text-4xl font-bold text-primary">{balance.toLocaleString()}P</p>
                <p className="text-xs text-muted-foreground mt-1">≈ {cashValue.toLocaleString()}원 상당</p>
              </>
            )}
          </div>
          <button
            onClick={() => navigate("/merge-game")}
            className="w-full mt-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm flex items-center justify-center gap-2"
          >
            <Coins className="w-4 h-4" />
            게임으로 적립하기
          </button>
        </div>

        {/* 게임 카드 */}
        <div className="px-4 pt-4">
          <button
            onClick={() => navigate('/merge-game')}
            className="w-full p-4 bg-gradient-to-r from-secondary to-accent rounded-2xl border border-border flex items-center gap-4 text-left hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl shrink-0">
              💐
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground text-sm">꽃 머지 게임</p>
              <p className="text-xs text-muted-foreground mt-0.5">게임하고 포인트 받기! 광고 시청 시 2배</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        </div>

        {/* Point History */}
        <div className="p-4">
          <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            포인트 내역
          </h2>
          {!user ? (
            <p className="text-sm text-muted-foreground text-center py-8">로그인 후 이용 가능합니다.</p>
          ) : isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">아직 적립 내역이 없어요. 게임으로 시작해보세요!</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
                  <div>
                    <p className="font-medium text-foreground text-sm">{labelForReason(tx.reason)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(tx.created_at)}</p>
                  </div>
                  <p className={`font-bold ${tx.amount > 0 ? "text-primary" : "text-destructive"}`}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()}P
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav activeTab="/mypage" onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Points;
