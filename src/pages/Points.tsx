import { useNavigate } from "react-router-dom";
import { ArrowLeft, Coins, Gift, Clock, Gamepad2, ChevronRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";
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
      </main>

      <BottomNav activeTab="/mypage" onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Points;
