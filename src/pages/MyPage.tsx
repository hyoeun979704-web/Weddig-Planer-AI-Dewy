import { useNavigate, useLocation } from "react-router-dom";
import { Settings, LogIn, UserPlus, Heart, Gift, Sparkles, Calendar, Wallet, ChevronRight, Star, Users, ArrowRight, Crown } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import UserProfileSection from "@/components/mypage/UserProfileSection";
import DdayCard from "@/components/mypage/DdayCard";
import QuickMenuGrid from "@/components/mypage/QuickMenuGrid";
import MenuSection from "@/components/mypage/MenuSection";
import PremiumBanner from "@/components/premium/PremiumBanner";
import WeddingInfoSetupModal from "@/components/wedding-planner/WeddingInfoSetupModal";
import { useWeddingInfoPrompt } from "@/hooks/useWeddingInfoPrompt";
import { Button } from "@/components/ui/button";

const GuestMyPage = () => {
  const navigate = useNavigate();

  const features = [
    { icon: Calendar, label: "D-Day 관리", desc: "웨딩 카운트다운 & 체크리스트", color: "text-primary", bg: "bg-primary/10" },
    { icon: Wallet, label: "예산 관리", desc: "지역별 평균 비교·양가 분담", color: "text-primary", bg: "bg-primary/10" },
    { icon: Sparkles, label: "AI 플래너", desc: "맞춤 업체 추천·타임라인", color: "text-primary", bg: "bg-primary/10" },
    { icon: Users, label: "커뮤니티", desc: "예비부부 후기·꿀팁 공유", color: "text-primary", bg: "bg-primary/10" },
  ];

  const stats = [
    { label: "등록 업체", value: "2,400+" },
    { label: "이용 커플", value: "15,000+" },
    { label: "리뷰 수", value: "38,000+" },
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
        <div className="px-4 pt-5 pb-3">
          <div className="rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-accent/20 border border-primary/20 p-5 relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full border-2 border-primary/10" />
            <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full border-2 border-primary/8" />

            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">💍</span>
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">무료</span>
              </div>
              <h2 className="text-lg font-bold text-foreground mb-1">웨딩 준비, 여기서 시작하세요</h2>
              <p className="text-sm text-muted-foreground mb-4">
                가입만 하면 모든 기능을 무료로 이용할 수 있어요
              </p>
              <div className="flex gap-2">
                <Button onClick={() => navigate("/auth")} className="gap-2 rounded-xl flex-1 h-11">
                  <UserPlus className="w-4 h-4" />
                  무료 회원가입
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/auth")}
                  className="gap-1.5 rounded-xl h-11 bg-background/50"
                >
                  <LogIn className="w-4 h-4" />
                  로그인
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Social proof stats */}
        <div className="px-4 py-2">
          <div className="grid grid-cols-3 gap-2">
            {stats.map((s) => (
              <div key={s.label} className="text-center py-3 bg-card rounded-2xl border border-border">
                <p className="text-base font-bold text-primary">{s.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Feature preview grid */}
        <div className="px-4 py-3">
          <h3 className="text-xs font-medium text-muted-foreground mb-2 px-1">가입하면 이용할 수 있어요</h3>
          <div className="grid grid-cols-2 gap-2">
            {features.map((f) => (
              <button
                key={f.label}
                onClick={() => navigate("/auth")}
                className="flex flex-col gap-2 p-4 bg-card rounded-2xl border border-border hover:border-primary/30 active:scale-[0.97] transition-all text-left group"
              >
                <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{f.label}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{f.desc}</p>
                </div>
                <span className="text-[10px] text-primary font-medium flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  시작하기 <ArrowRight className="w-3 h-3" />
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Review teaser */}
        <div className="px-4 py-3">
          <h3 className="text-xs font-medium text-muted-foreground mb-2 px-1">실제 이용 후기</h3>
          <div className="space-y-2">
            {[
              { name: "예비신부 김**", text: "예산 관리 기능이 정말 편해요! 양가 분담까지 한눈에 보여서 좋아요 👍", stars: 5 },
              { name: "예비신랑 이**", text: "AI 추천으로 웨딩홀 3곳 방문했는데 다 만족스러웠어요", stars: 5 },
            ].map((r, i) => (
              <div key={i} className="p-3.5 bg-card rounded-2xl border border-border">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="flex">
                    {Array.from({ length: r.stars }).map((_, si) => (
                      <Star key={si} className="w-3 h-3 fill-primary text-primary" />
                    ))}
                  </div>
                  <span className="text-[11px] text-muted-foreground">{r.name}</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{r.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ / Contact */}
        <div className="px-4 py-2 mt-1">
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
  const { isAdmin } = useUserRole();
  const weddingInfoPrompt = useWeddingInfoPrompt();

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
        <DdayCard
          weddingDate={weddingSettings.wedding_date}
          weddingDateTbd={weddingSettings.wedding_date_tbd}
        />

        {isAdmin && (
          <div className="px-4 mt-3">
            <button
              type="button"
              onClick={() => navigate("/admin")}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl active:scale-[0.98] transition-transform shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Crown className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold">운영자 대시보드</div>
                  <div className="text-[11px] opacity-90">듀이 관리자 전용 도구</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 opacity-80" />
            </button>
          </div>
        )}

        <PremiumBanner />
        <MenuSection
          user={user}
          onSignOut={handleSignOut}
          onEditWeddingInfo={weddingInfoPrompt.openManually}
        />

        <div className="px-4 py-6">
          <div className="text-center text-[11px] text-muted-foreground">
            <p>앱 버전 1.0.0</p>
            <p className="mt-0.5">© 2025 웨딩 플래너</p>
          </div>
        </div>
      </main>

      <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />

      <WeddingInfoSetupModal
        isOpen={weddingInfoPrompt.open}
        onClose={weddingInfoPrompt.dismiss}
      />
    </div>
  );
};

export default MyPage;
