import { useNavigate, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { Heart, Calendar, Gift, Sparkles, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickMenuItemProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  color?: string;
}

const QuickMenuItem = ({ icon: Icon, label, onClick, color = "bg-primary/10 text-primary" }: QuickMenuItemProps) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-200"
  >
    <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", color)}>
      <Icon className="w-6 h-6" />
    </div>
    <span className="text-sm font-medium text-foreground">{label}</span>
  </button>
);

const Index = () => {
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
          <h1 className="text-lg font-bold text-foreground">웨딩 플래너</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        {/* Hero Banner */}
        <div className="relative h-48 bg-gradient-to-br from-primary/20 via-primary/10 to-background overflow-hidden">
          <div className="absolute inset-0 flex flex-col justify-center px-6">
            <p className="text-sm text-primary font-medium mb-1">특별한 하루를 위한</p>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              완벽한 웨딩 파트너
            </h2>
            <p className="text-sm text-muted-foreground">
              웨딩홀부터 스튜디오까지, 모든 것을 한 곳에서
            </p>
          </div>
          <div className="absolute right-4 bottom-4">
            <Sparkles className="w-16 h-16 text-primary/20" />
          </div>
        </div>

        {/* Quick Menu */}
        <div className="px-4 py-6">
          <h3 className="text-base font-bold text-foreground mb-4">빠른 메뉴</h3>
          <div className="grid grid-cols-4 gap-3">
            <QuickMenuItem
              icon={Heart}
              label="웨딩홀"
              onClick={() => navigate("/venues")}
              color="bg-rose-100 text-rose-500"
            />
            <QuickMenuItem
              icon={Calendar}
              label="일정관리"
              onClick={() => {}}
              color="bg-blue-100 text-blue-500"
            />
            <QuickMenuItem
              icon={Gift}
              label="혜택"
              onClick={() => {}}
              color="bg-amber-100 text-amber-500"
            />
            <QuickMenuItem
              icon={Sparkles}
              label="스튜디오"
              onClick={() => {}}
              color="bg-purple-100 text-purple-500"
            />
          </div>
        </div>

        {/* Featured Section */}
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-foreground">추천 웨딩홀</h3>
            <button 
              onClick={() => navigate("/venues")}
              className="flex items-center gap-1 text-sm text-primary font-medium"
            >
              전체보기
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <div 
            onClick={() => navigate("/venues")}
            className="relative h-40 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/30 to-primary/10 cursor-pointer group"
          >
            <div className="absolute inset-0 flex flex-col justify-end p-4">
              <p className="text-xs text-primary font-medium mb-1">PREMIUM</p>
              <h4 className="text-lg font-bold text-foreground mb-1">
                인기 웨딩홀 보러가기
              </h4>
              <p className="text-sm text-muted-foreground">
                엄선된 파트너 웨딩홀을 만나보세요
              </p>
            </div>
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Notice Section */}
        <div className="px-4 py-4">
          <div className="p-4 rounded-2xl bg-muted/50 border border-border">
            <h4 className="text-sm font-bold text-foreground mb-2">📢 공지사항</h4>
            <p className="text-sm text-muted-foreground">
              2025년 상반기 웨딩 시즌 프로모션이 시작되었습니다. 지금 바로 확인해보세요!
            </p>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default Index;
