import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTutorial, FEATURE_GUIDES } from "./useTutorial";

const PAGE_SEEN_PREFIX = "dewy_tutorial_page_";

/**
 * Hook to auto-start a tutorial on a page:
 * 1. When `?tutorial=<guideId>` query param is present (from Tutorial page)
 * 2. On first visit to the page (per-page localStorage tracking)
 */
export const usePageTutorial = (pageGuideId?: string) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tutorial = useTutorial();

  useEffect(() => {
    // Priority 1: query param trigger
    const tutorialParam = searchParams.get("tutorial");
    if (tutorialParam) {
      const guide = FEATURE_GUIDES.find((g) => g.id === tutorialParam);
      if (guide) {
        const timer = setTimeout(() => tutorial.startTutorial(guide.steps), 500);
        searchParams.delete("tutorial");
        setSearchParams(searchParams, { replace: true });
        return () => clearTimeout(timer);
      }
    }

    // Priority 2: first visit auto-start
    if (pageGuideId) {
      const seenKey = PAGE_SEEN_PREFIX + pageGuideId;
      const hasSeen = localStorage.getItem(seenKey) === "true";
      if (!hasSeen) {
        const guide = FEATURE_GUIDES.find((g) => g.id === pageGuideId);
        if (guide) {
          const timer = setTimeout(() => {
            tutorial.startTutorial(guide.steps);
            localStorage.setItem(seenKey, "true");
          }, 800);
          return () => clearTimeout(timer);
        }
      }
    }
  }, []);

  return tutorial;
};
