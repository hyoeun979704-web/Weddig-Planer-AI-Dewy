import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTutorial } from "./useTutorial";
import { useWeddingSchedule } from "./useWeddingSchedule";
import { useTutorialProgress } from "./useTutorialProgress";
import { useAuth } from "@/contexts/AuthContext";
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
export const usePageTutorial = (
  pageGuideId?: string,
  options?: { autoStart?: boolean },
) => {
  const autoStart = options?.autoStart ?? true;
  const [searchParams, setSearchParams] = useSearchParams();
  const tutorial = useTutorial();
  const { weddingSettings } = useWeddingSchedule();
  const progress = useTutorialProgress();
  const { user } = useAuth();

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

    // Priority 2: first-visit auto-start. 비로그인 사용자에겐 자동 실행하지
    // 않는다 — 로그인 게이트(LoginRequiredOverlay) 위로 코치마크가 뜨는 것을
    // 막고, "로그인 후 튜토리얼" 흐름과 일치시킨다. (수동 replay 는 위 query
    // param 경로로 계속 가능.)
    //  - per-page seen flag (legacy `PAGE_SEEN_PREFIX`)
    //  - lesson-completion flag (new progress hook)
    if (pageGuideId && user && autoStart) {
      const seenKey = PAGE_SEEN_PREFIX + pageGuideId;
      const hasSeen = localStorage.getItem(seenKey) === "true";
      const alreadyDone = progress.isCompleted(pageGuideId);
      const lesson = findLessonById(pageGuideId);

      if (!lesson || hasSeen || alreadyDone) return;

      // 결혼정보 입력 모달이 뜰 상황(미온보딩 + 미dismiss)이면 코치마크와 겹치지
      // 않도록 자동 시작을 미룬다 — 온보딩(또는 건너뛰기) 후 다음 방문에 실행.
      const hasDate =
        !!weddingSettings.wedding_date || weddingSettings.wedding_date_tbd;
      const hasRegion =
        !!weddingSettings.wedding_region || weddingSettings.wedding_region_tbd;
      const onboarded =
        (hasDate && hasRegion) || !!weddingSettings.planning_stage;
      let weddingInfoDismissed = false;
      try {
        weddingInfoDismissed =
          localStorage.getItem("dewy:wedding-info-modal:dismissed") === "1";
      } catch {
        // ignore
      }
      if (!onboarded && !weddingInfoDismissed) return;

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
  }, [
    weddingSettings.wedding_style,
    weddingSettings.wedding_date,
    weddingSettings.wedding_region,
    weddingSettings.wedding_date_tbd,
    weddingSettings.wedding_region_tbd,
    weddingSettings.planning_stage,
    user,
  ]);

  return tutorial;
};
