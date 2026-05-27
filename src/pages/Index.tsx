import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import HomeHeader from "@/components/home/HomeHeader";
import CategoryTabBar, { useCategoryTabNavigation } from "@/components/home/CategoryTabBar";
import TabContent from "@/components/home/TabContent";
import HomeEntryPopup from "@/components/home/HomeEntryPopup";
import Footer from "@/components/home/Footer";
import TutorialOverlay from "@/components/TutorialOverlay";
import AnnouncementBanner from "@/components/home/AnnouncementBanner";
import Seo from "@/components/Seo";
import WeddingInfoSetupModal from "@/components/wedding-planner/WeddingInfoSetupModal";
import { usePageTutorial } from "@/hooks/usePageTutorial";
import { useHomeFirstRun } from "@/hooks/useHomeFirstRun";

const WEDDING_INFO_DISMISS_KEY = "dewy:wedding-info-modal:dismissed";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const handleCategoryTabChange = useCategoryTabNavigation();

  // 첫 실행 시퀀스: 이벤트 팝업 → 튜토리얼 → 동의·온보딩 입력 순서로 조율.
  const flow = useHomeFirstRun();

  // 홈 투어는 시퀀스가 직접 시작(autoStart 끔). ?tutorial= 쿼리 재생은 그대로 동작.
  const tutorial = usePageTutorial("home-tour", { autoStart: false });
  const tutorialStarted = useRef(false);
  const tutorialWasActive = useRef(false);

  // 튜토리얼 단계 진입 시 1회 시작, "활성화됐다가 종료"되면 다음 단계로.
  useEffect(() => {
    if (flow.stage !== "tutorial") return;
    if (!tutorialStarted.current) {
      tutorialStarted.current = true;
      tutorial.startTutorial(undefined, "home-tour");
      return;
    }
    if (tutorial.isActive) {
      tutorialWasActive.current = true;
    } else if (tutorialWasActive.current) {
      flow.advance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow.stage, tutorial.isActive]);

  const handleTabChange = (href: string) => {
    navigate(href);
  };

  // 온보딩 모달 닫힘(저장 또는 건너뛰기). 건너뛰어도 홈에선 다시 강제하지 않도록
  // 영구 dismiss 를 기록하고(필요한 페이지의 인라인 안내로 대체), 다음 단계로 진행.
  const handleOnboardingClose = () => {
    try {
      localStorage.setItem(WEDDING_INFO_DISMISS_KEY, "1");
    } catch {
      // best effort
    }
    flow.advance();
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <Seo title="Dewy - AI 웨딩플래너와 함께하는 결혼준비" description="결혼 준비 체크리스트·예산 관리·웨딩홀·스드메 추천·AI 드레스 시뮬레이션·모바일 청첩장까지. AI 웨딩플래너 Dewy." path="/" />
      <HomeHeader />
      <CategoryTabBar activeTab={null} onTabChange={handleCategoryTabChange} />
      <AnnouncementBanner />

      <main className="safe-bottom-scroll" data-tutorial="home-categories">
        <TabContent activeTab="ai-planner" />
        <Footer />
      </main>

      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />

      <HomeEntryPopup open={flow.stage === "event"} onClose={flow.advance} />

      <WeddingInfoSetupModal
        isOpen={flow.stage === "onboarding"}
        onClose={handleOnboardingClose}
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
