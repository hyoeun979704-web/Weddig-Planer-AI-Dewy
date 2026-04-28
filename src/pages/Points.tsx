import { useNavigate } from "react-router-dom";
import { ArrowLeft, Coins, Gift, Clock, Gamepad2, ChevronRight } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";

const pointHistory = [
  { id: 1, type: "earn", title: "웨딩홀 예약 적립", points: 1000, date: "2025-01-20" },
  { id: 2, type: "earn", title: "리뷰 작성 적립", points: 500, date: "2025-01-18" },
  { id: 3, type: "use", title: "스튜디오 예약 사용", points: -2000, date: "2025-01-15" },
  { id: 4, type: "earn", title: "회원가입 축하 포인트", points: 3000, date: "2025-01-10" },
];

const Points = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <AppLayout>
      <header className="sticky top-[112px] z-30 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-lg pr-10">포인트</h1>
        </div>
      </header>

      <div>
        {/* Point Summary */}
        <div className="p-6 bg-gradient-to-br from-primary/20 to-primary/5">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">보유 포인트</p>
            <p className="text-4xl font-bold text-primary">3,500P</p>
          </div>
          <div className="flex gap-3 mt-6">
            <button className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm flex items-center justify-center gap-2">
              <Gift className="w-4 h-4" />
              포인트 선물
            </button>
            <button className="flex-1 py-3 bg-card border border-border text-foreground rounded-xl font-medium text-sm flex items-center justify-center gap-2">
              <Coins className="w-4 h-4" />
              포인트 충전
            </button>
          </div>
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
          <div className="space-y-3">
            {pointHistory.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
                <div>
                  <p className="font-medium text-foreground text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.date}</p>
                </div>
                <p className={`font-bold ${item.type === "earn" ? "text-primary" : "text-destructive"}`}>
                  {item.points > 0 ? "+" : ""}{item.points.toLocaleString()}P
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Points;
