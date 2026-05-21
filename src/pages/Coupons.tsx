import { useNavigate } from "react-router-dom";
import { Ticket } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";

// 쿠폰 발급/사용 백엔드(coupons / user_coupons 테이블·redeem RPC)가 아직 없어,
// 보유 쿠폰이 없는 정직한 빈 상태만 표시한다. 시스템 도입 시 목록·코드 등록을
// 실제 데이터로 연결한다.
const Coupons = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <PageHeader title="쿠폰" />

      <main className="pb-20">
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Ticket className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-foreground font-semibold mb-1">보유한 쿠폰이 없어요</p>
          <p className="text-sm text-muted-foreground">
            이벤트·혜택으로 받은 쿠폰이 여기에 표시돼요.
          </p>
        </div>
      </main>

      <BottomNav activeTab="/mypage" onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Coupons;
