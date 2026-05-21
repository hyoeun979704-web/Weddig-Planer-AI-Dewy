import { usePageTutorial } from "@/hooks/usePageTutorial";
import TutorialOverlay from "@/components/TutorialOverlay";

/**
 * 페이지에 처음 접속할 때 1회 코치마크 튜토리얼을 자동 실행하는 래퍼.
 * 각 페이지 최하단에 <PageTutorial id="<lessonId>" /> 한 줄로 마운트하면 된다.
 * (usePageTutorial 이 first-visit/완료 여부를 자체적으로 가드한다.)
 */
const PageTutorial = ({ id }: { id: string }) => {
  const tutorial = usePageTutorial(id);
  if (!tutorial.isActive || !tutorial.currentStep) return null;
  return (
    <TutorialOverlay
      isActive={tutorial.isActive}
      currentStep={tutorial.currentStep}
      currentStepIndex={tutorial.currentStepIndex}
      totalSteps={tutorial.totalSteps}
      onNext={tutorial.nextStep}
      onPrev={tutorial.prevStep}
      onSkip={tutorial.skipTutorial}
    />
  );
};

export default PageTutorial;
