import { useNavigate } from "react-router-dom";
import { ArrowLeft, Ticket, Calendar, Tag } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const coupons = [
  { id: 1, title: "웨딩홀 10% 할인", description: "모든 웨딩홀 예약 시 사용 가능", discount: "10%", expiry: "2025-03-31", minOrder: "500,000원" },
  { id: 2, title: "스튜디오 5만원 할인", description: "스튜디오 촬영 예약 시 사용 가능", discount: "50,000원", expiry: "2025-02-28", minOrder: "300,000원" },
  { id: 3, title: "허니문 15% 할인", description: "허니문 패키지 예약 시 사용 가능", discount: "15%", expiry: "2025-04-30", minOrder: "1,000,000원" },
  { id: 4, title: "신규회원 웰컴 쿠폰", description: "첫 예약 시 사용 가능", discount: "30,000원", expiry: "2025-02-15", minOrder: "없음" },
  { id: 5, title: "드레스 대여 할인", description: "드레스 대여 시 사용 가능", discount: "20%", expiry: "2025-05-31", minOrder: "200,000원" },
];

const Coupons = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-lg pr-10">쿠폰</h1>
        </div>
      </header>

      <main className="pb-20">
        {/* Coupon Count */}
        <div className="p-4 bg-primary/10 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">사용 가능한 쿠폰</span>
            <span className="text-lg font-bold text-primary">{coupons.length}장</span>
          </div>
        </div>

        {/* Coupon Input */}
        <div className="p-4 border-b border-border">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="쿠폰 코드 입력"
              className="flex-1 px-4 py-3 bg-muted rounded-xl text-sm"
            />
            <button className="px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium">
              등록
            </button>
          </div>
        </div>

        {/* Coupon List */}
        <div className="p-4 space-y-3">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-foreground">{coupon.title}</h3>
                  </div>
                  <span className="text-xl font-bold text-primary">{coupon.discount}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{coupon.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {coupon.expiry}까지
                  </span>
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    최소 {coupon.minOrder}
                  </span>
                </div>
              </div>
              <button className="w-full py-3 bg-muted text-sm font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                쿠폰 사용하기
              </button>
            </div>
          ))}
        </div>
      </main>

      <BottomNav activeTab="/mypage" onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Coupons;
