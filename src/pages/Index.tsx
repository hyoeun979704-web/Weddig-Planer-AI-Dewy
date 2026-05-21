import { useNavigate, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import HomeHeader from "@/components/home/HomeHeader";
import CategoryTabBar, { useCategoryTabNavigation } from "@/components/home/CategoryTabBar";
import TabContent from "@/components/home/TabContent";
import HomeEntryPopup from "@/components/home/HomeEntryPopup";
import Footer from "@/components/home/Footer";
import TutorialOverlay from "@/components/TutorialOverlay";
import { usePageTutorial } from "@/hooks/usePageTutorial";
import WeddingInfoSetupModal from "@/components/wedding-planner/WeddingInfoSetupModal";
import { useWeddingInfoPrompt } from "@/hooks/useWeddingInfoPrompt";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // 홈 콘텐츠 레이아웃은 'ai-planner' 분기를 그대로 사용하지만, 상단탭은
  // 어떤 카테고리도 아니라서 강조하지 않음 (null 전달).
  const tutorial = usePageTutorial("app-tour");
  // 가입 직후 첫 화면(홈)에서도 결혼 정보 입력을 안내한다. 다른 핵심 페이지와
  // 동일한 프롬프트 — 온보딩 완료/세션 dismiss 시 다시 뜨지 않는다.
  const weddingInfoPrompt = useWeddingInfoPrompt();
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

      <WeddingInfoSetupModal
        isOpen={weddingInfoPrompt.open}
        onClose={weddingInfoPrompt.dismiss}
      />

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
