import { useNavigate, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import HomeHeader from "@/components/home/HomeHeader";
import CategoryTabBar, { CategoryTab } from "@/components/home/CategoryTabBar";
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
  const tutorial = usePageTutorial("app-tour");

  const handleTabChange = (href: string) => {
    navigate(href);
  };

  const handleCategoryTabChange = (tab: CategoryTab) => {
    const tabRoutes: Record<CategoryTab, string> = {
      "ai-planner": "/ai-planner",
      "ai-studio": "/ai-studio",
      tips: "/tips",
      events: "/deals",
      shopping: "/store",
    };
    navigate(tabRoutes[tab]);
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
