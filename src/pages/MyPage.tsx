import { useNavigate, useLocation } from "react-router-dom";
import { Settings, LogIn, UserPlus, Heart, Gift, Sparkles, ChevronRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { toast } from "sonner";
import UserProfileSection from "@/components/mypage/UserProfileSection";
import DdayCard from "@/components/mypage/DdayCard";
import QuickMenuGrid from "@/components/mypage/QuickMenuGrid";
import MenuSection from "@/components/mypage/MenuSection";
import PremiumBanner from "@/components/premium/PremiumBanner";
import { Button } from "@/components/ui/button";

const GuestMyPage = () => {
  const navigate = useNavigate();

  const benefits = [
    { icon: Heart, label: "찜한 업체 저장", desc: "마음에 드는 업체를 저장하세요" },
    { icon: Sparkles, label: "AI 맞춤 추천", desc: "AI가 최적 업체를 추천해요" },
    { icon: Gift, label: "커플 혜택", desc: "커플만의 특별한 혜택을 받으세요" },
  ];

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-lg font-bold text-foreground">마이페이지</h1>
          <div className="w-5" />
        </div>
      </header>

      <main className="pb-20">
        {/* Hero CTA */}
        <div className="px-4 pt-6 pb-4">
          <div className="rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-accent/20 border border-primary/20 p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-1">웨딩 준비의 시작</h2>
            <p className="text-sm text-muted-foreground mb-5">
              회원가입하고 맞춤 웨딩 플래닝을<br />무료로 시작해보세요
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => navigate("/auth")} className="gap-2 px-6 rounded-xl">
                <UserPlus className="w-4 h-4" />
                회원가입
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/auth")}
                className="gap-2 px-6 rounded-xl"
              >
                <LogIn className="w-4 h-4" />
                로그인
              </Button>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="px-4 py-2">
          <h3 className="text-xs font-medium text-muted-foreground mb-2 px-1">가입하면 이런 것들이 가능해요</h3>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {benefits.map((b, i) => (
              <div
                key={b.label}
                className={`flex items-center gap-3 px-4 py-3.5 ${i < benefits.length - 1 ? "border-b border-border" : ""}`}
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <b.icon className="w-[18px] h-[18px] text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{b.label}</p>
                  <p className="text-[11px] text-muted-foreground">{b.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* FAQ / Contact (accessible without login) */}
        <div className="px-4 py-2 mt-2">
          <h3 className="text-xs font-medium text-muted-foreground mb-2 px-1">고객 지원</h3>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {[
              { label: "자주 묻는 질문", href: "/faq" },
              { label: "1:1 문의", href: "/contact" },
            ].map((item, i) => (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                className={`w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-muted/50 active:bg-muted/80 transition-colors ${i === 0 ? "border-b border-border" : ""}`}
              >
                <span className="text-sm font-medium text-foreground">{item.label}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-6">
          <div className="text-center text-[11px] text-muted-foreground">
            <p>앱 버전 1.0.0</p>
            <p className="mt-0.5">© 2025 웨딩 플래너</p>
          </div>
        </div>
      </main>
    </div>
  );
};

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

  if (!isLoading && !user) {
    return (
      <>
        <GuestMyPage />
        <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />
      </>
    );
  }

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
