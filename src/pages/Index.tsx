import { useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import HomeHeader from "@/components/home/HomeHeader";
import CategoryTabBar, { CategoryTab } from "@/components/home/CategoryTabBar";
import TabContent from "@/components/home/TabContent";
import Footer from "@/components/home/Footer";
import TutorialOverlay from "@/components/TutorialOverlay";
import { useTutorial, FEATURE_GUIDES } from "@/hooks/useTutorial";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: CategoryTab = "home";
  const tutorial = useTutorial();

  // Auto-start tutorial for first-time users or via query param
  useEffect(() => {
    const tutorialParam = searchParams.get("tutorial");
    if (tutorialParam) {
      const guide = FEATURE_GUIDES.find((g) => g.id === tutorialParam);
      if (guide) {
        tutorial.startTutorial(guide.steps);
      } else {
        tutorial.startTutorial();
      }
      // Remove query param
      searchParams.delete("tutorial");
      setSearchParams(searchParams, { replace: true });
    } else if (!tutorial.hasSeen) {
      // First visit - auto-start full tour
      const timer = setTimeout(() => tutorial.startTutorial(), 800);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const handleTabChange = (href: string) => {
    navigate(href);
  };

  const handleCategoryTabChange = (tab: CategoryTab) => {
    const tabRoutes: Record<CategoryTab, string> = {
      home: "/",
      events: "/deals",
      shopping: "/store",
      info: "/influencers",
    };
    navigate(tabRoutes[tab]);
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <HomeHeader />
      <CategoryTabBar activeTab={activeTab} onTabChange={handleCategoryTabChange} />

      <main className="pb-20" data-tutorial="home-categories">
        <TabContent activeTab={activeTab} />
        <Footer />
      </main>

      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />

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
