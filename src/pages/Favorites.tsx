import { useNavigate, useLocation } from "react-router-dom";
import { Heart } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const Favorites = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleTabChange = (href: string) => {
    navigate(href);
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-lg font-bold text-foreground">찜 목록</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20 px-4">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <Heart className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">찜한 업체가 없습니다</h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            마음에 드는 웨딩홀, 스드메 업체를<br />
            하트를 눌러 저장해보세요
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium"
          >
            업체 둘러보기
          </button>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default Favorites;
