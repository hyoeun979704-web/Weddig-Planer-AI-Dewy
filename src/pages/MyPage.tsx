import { useNavigate, useLocation } from "react-router-dom";
import { Settings } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { toast } from "sonner";
import UserProfileSection from "@/components/mypage/UserProfileSection";
import DdayCard from "@/components/mypage/DdayCard";
import QuickMenuGrid from "@/components/mypage/QuickMenuGrid";
import MenuSection from "@/components/mypage/MenuSection";
import PremiumBanner from "@/components/premium/PremiumBanner";

const MyPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading, signOut } = useAuth();
  const { weddingSettings } = useWeddingSchedule();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("로그아웃되었습니다");
    } catch {
      toast.error("로그아웃에 실패했습니다");
    }
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-lg font-bold text-foreground">마이페이지</h1>
          <button onClick={() => navigate("/settings")} className="p-2 active:scale-90 transition-transform">
            <Settings className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      <main className="pb-20">
        <UserProfileSection user={user} isLoading={isLoading} />
        <div className="mt-3">
          <QuickMenuGrid user={user} />
        </div>
        <DdayCard weddingDate={weddingSettings.wedding_date} />
        <PremiumBanner />
        <MenuSection user={user} onSignOut={handleSignOut} />

        <div className="px-4 py-6">
          <div className="text-center text-[11px] text-muted-foreground">
            <p>앱 버전 1.0.0</p>
            <p className="mt-0.5">© 2025 웨딩 플래너</p>
          </div>
        </div>
      </main>

      <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default MyPage;
