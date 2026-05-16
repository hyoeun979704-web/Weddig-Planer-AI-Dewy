import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTutorial } from "./useTutorial";
import { useWeddingSchedule } from "./useWeddingSchedule";
import { useTutorialProgress } from "./useTutorialProgress";
import { findLessonById } from "@/data/tutorialChapters";

const PAGE_SEEN_PREFIX = "dewy_tutorial_page_";

/**
 * Auto-start a tutorial on a page when:
 *   1. `?tutorial=<lessonId>` query param is present (Tutorial page → page nav)
 *   2. First visit to a page that opts in via `pageGuideId`
 *
 * Skips lessons that don't match the user's wedding_style. e.g. if a future
 * lesson sets requiresStyles=['self'] and the user is on a general wedding,
 * we won't auto-start it but the query-param flow still wins (manual replay).
 */
export const usePageTutorial = (pageGuideId?: string) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tutorial = useTutorial();
  const { weddingSettings } = useWeddingSchedule();
  const progress = useTutorialProgress();

  useEffect(() => {
    // Priority 1: explicit query param wins — even if requiresStyles
    // doesn't match, the user is explicitly asking to replay.
    const tutorialParam = searchParams.get("tutorial");
    if (tutorialParam) {
      const lesson = findLessonById(tutorialParam);
      if (lesson) {
        const timer = setTimeout(
          () => tutorial.startTutorial(lesson.steps, lesson.id),
          500
        );
        searchParams.delete("tutorial");
        setSearchParams(searchParams, { replace: true });
        return () => clearTimeout(timer);
      }
    }

    // Priority 2: first-visit auto-start. Two gates:
    //  - per-page seen flag (legacy `PAGE_SEEN_PREFIX`)
    //  - lesson-completion flag (new progress hook) — handles users that
    //    came in via query param replay first.
    if (pageGuideId) {
      const seenKey = PAGE_SEEN_PREFIX + pageGuideId;
      const hasSeen = localStorage.getItem(seenKey) === "true";
      const alreadyDone = progress.isCompleted(pageGuideId);
      const lesson = findLessonById(pageGuideId);

      if (!lesson || hasSeen || alreadyDone) return;

      // Style filter: skip auto-start for lessons that don't match.
      if (
        lesson.requiresStyles &&
        weddingSettings.wedding_style &&
        !lesson.requiresStyles.includes(weddingSettings.wedding_style)
      ) {
        return;
      }

      const timer = setTimeout(() => {
        tutorial.startTutorial(lesson.steps, lesson.id);
        localStorage.setItem(seenKey, "true");
      }, 800);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weddingSettings.wedding_style]);

  return tutorial;
};
