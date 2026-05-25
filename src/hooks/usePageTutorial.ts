import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTutorial } from "./useTutorial";
import { useWeddingSchedule } from "./useWeddingSchedule";
import { useTutorialProgress } from "./useTutorialProgress";
import { useAuth } from "@/contexts/AuthContext";
import { findLessonById, isLessonVisible } from "@/data/tutorialChapters";

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
    // Round 17 — 비로그인 사용자는 어느 경로로든 자동 시작 X (튜토리얼은 로그인 후만).
    // query-param 경로(replay) 도 user 가드 추가 — 이전엔 누구나 ?tutorial=X 로 시작 가능.
    if (!user) return;

    // Priority 1: explicit query param wins — even if requiresStyles
    // doesn't match, the user is explicitly asking to replay.
    const tutorialParam = searchParams.get("tutorial");
    if (tutorialParam) {
      const lesson = findLessonById(tutorialParam);
      // Round 18 — placeholder lesson 은 query 진입도 차단. cutout 풀스크린만
      // 뜨는 무의미한 안내가 시작되지 않도록 보호. Tutorial 페이지는 이미
      // 클릭 자체를 비활성화하지만, 외부 링크/북마크 fallback 도 막아야 함.
      if (lesson && !lesson.placeholder) {
        // Round 17 — 이미 완료한 lesson 이라도 사용자가 명시적으로 replay 한 경로 (Tutorial
        // 페이지에서 "다시 보기" 클릭) → progress 차단 안 함. RPC 가 PK 가드라 중복 award X.
        const timer = setTimeout(
          () => tutorial.startTutorial(lesson.steps, lesson.id),
          500
        );
        searchParams.delete("tutorial");
        setSearchParams(searchParams, { replace: true });
        return () => clearTimeout(timer);
      }
      if (lesson?.placeholder) {
        // 쿼리만 정리하고 시작 안 함.
        searchParams.delete("tutorial");
        setSearchParams(searchParams, { replace: true });
        return;
      }
    }

    // Priority 2: first-visit auto-start. 로그인 + autoStart 가 켜진 페이지만.
    //   - per-page seen flag (legacy `PAGE_SEEN_PREFIX`)
    //   - lesson-completion flag (new progress hook — DB-backed)
    if (pageGuideId && autoStart) {
      const seenKey = PAGE_SEEN_PREFIX + pageGuideId;
      const hasSeen = localStorage.getItem(seenKey) === "true";
      const alreadyDone = progress.isCompleted(pageGuideId);
      const lesson = findLessonById(pageGuideId);

      if (!lesson || hasSeen || alreadyDone) return;
      // Round 18 — placeholder lesson 자동 시작 차단.
      if (lesson.placeholder) return;

      // Round 18 — style + persona + role 통합 필터. requires*/exclude* 모두 검사.
      const visible = isLessonVisible(lesson, {
        style: weddingSettings.wedding_style,
        persona: weddingSettings.persona_mode,
        role: weddingSettings.role,
      });
      if (!visible) return;

      const timer = setTimeout(() => {
        tutorial.startTutorial(lesson.steps, lesson.id);
        localStorage.setItem(seenKey, "true");
      }, 800);
      return () => clearTimeout(timer);
    }
    // Round 17 — progress.isCompleted 가 DB cache 반영하도록 dep 에 추가.
    // Round 18 — persona_mode/role 도 dep 에 포함 (페르소나 변경 시 재평가).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    weddingSettings.wedding_style,
    weddingSettings.persona_mode,
    weddingSettings.role,
    user,
    progress.completedLessons.length,
  ]);

  return tutorial;
};
