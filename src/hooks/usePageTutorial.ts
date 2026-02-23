import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTutorial, FEATURE_GUIDES, type TutorialStep } from "./useTutorial";

/**
 * Hook to auto-start a tutorial on a page when `?tutorial=<guideId>` is present.
 * Returns the tutorial state for rendering the overlay.
 */
export const usePageTutorial = (pageGuideId?: string) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tutorial = useTutorial();

  useEffect(() => {
    const tutorialParam = searchParams.get("tutorial");
    if (tutorialParam) {
      const guide = FEATURE_GUIDES.find((g) => g.id === tutorialParam);
      if (guide) {
        // Small delay to let the page render
        const timer = setTimeout(() => tutorial.startTutorial(guide.steps), 500);
        searchParams.delete("tutorial");
        setSearchParams(searchParams, { replace: true });
        return () => clearTimeout(timer);
      }
    }
  }, []);

  return tutorial;
};
