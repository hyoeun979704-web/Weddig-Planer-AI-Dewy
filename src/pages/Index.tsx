import AppLayout from "@/components/AppLayout";
import TabContent from "@/components/home/TabContent";
import Footer from "@/components/home/Footer";
import TutorialOverlay from "@/components/TutorialOverlay";
import { usePageTutorial } from "@/hooks/usePageTutorial";

const Index = () => {
  const tutorial = usePageTutorial("app-tour");

  return (
    <AppLayout activeCategoryTab="ai-planner" mainClassName="pb-20" >
      <div data-tutorial="home-categories">
        <TabContent activeTab="ai-planner" />
        <Footer />
      </div>

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
    </AppLayout>
  );
};

export default Index;
