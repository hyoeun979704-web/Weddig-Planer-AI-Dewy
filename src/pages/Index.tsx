import { useNavigate, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import HomeHeader from "@/components/home/HomeHeader";
import CategoryTabBar, { useCategoryTabNavigation } from "@/components/home/CategoryTabBar";
import TabContent from "@/components/home/TabContent";
import HomeEntryPopup from "@/components/home/HomeEntryPopup";
import Footer from "@/components/home/Footer";
import TutorialOverlay from "@/components/TutorialOverlay";
import { usePageTutorial } from "@/hooks/usePageTutorial";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // 홈 콘텐츠 레이아웃은 'ai-planner' 분기를 그대로 사용하지만, 상단탭은
  // 어떤 카테고리도 아니라서 강조하지 않음 (null 전달).
  // 로그인 후 첫 홈 방문 시 홈 투어가 1회 실행된다(고정탭 안내 포함).
  const tutorial = usePageTutorial("home-tour");
  const handleCategoryTabChange = useCategoryTabNavigation();

  const handleTabChange = (href: string) => {
    navigate(href);
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <HomeHeader />
      <CategoryTabBar activeTab={null} onTabChange={handleCategoryTabChange} />

      <main className="pb-20" data-tutorial="home-categories">
        <TabContent activeTab="ai-planner" />
        <Footer />
      </main>

      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />

      <HomeEntryPopup />

      {tutorial.isActive && tutorial.currentStep && (
        <TutorialOverlay
          isActive={tutorial.isActive}
          currentStep={tutorial.currentStep}
          currentStepIndex={tutorial.currentStepIndex}
          totalSteps={tutorial.totalSteps}
          onNext={tutorial.nextStep}
          onPrev={tutorial.prevStep}
          onSkip={tutorial.skipTutorial}
        />
      )}
    </div>
  );
};

export default Index;
