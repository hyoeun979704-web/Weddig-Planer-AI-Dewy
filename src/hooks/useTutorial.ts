import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  TUTORIAL_CHAPTERS,
  findLessonById,
  type TutorialLessonStep,
} from "@/data/tutorialChapters";

// Coachmark step shape kept identical for backwards compatibility with
// TutorialOverlay, which renders `targetSelector` + `position`.
export type TutorialStep = TutorialLessonStep;

/**
 * Backwards-compat shim for code that used to read `FEATURE_GUIDES`.
 * Flattened from the new chapter-based source (`tutorialChapters.ts`) so
 * existing callers (e.g. usePageTutorial's `?tutorial=<id>` query param)
 * keep working without changes.
 *
 * Prefer importing TUTORIAL_CHAPTERS directly in new code — chapters carry
 * grouping + style-filtering metadata that this flat list throws away.
 */
export const FEATURE_GUIDES = TUTORIAL_CHAPTERS.flatMap(ch =>
  ch.lessons.map(l => ({
    id: l.id,
    icon: ch.icon,
    title: l.title,
    description: l.description,
    route: l.route,
    steps: l.steps,
  }))
);

// Default tour = the first lesson of the first chapter (home tour).
const DEFAULT_STEPS: TutorialStep[] = TUTORIAL_CHAPTERS[0].lessons[0].steps;

const TUTORIAL_SEEN_KEY = "dewy_tutorial_seen";

export const useTutorial = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<TutorialStep[]>(DEFAULT_STEPS);
  const [tourId, setTourId] = useState<string | null>(null);

  const hasSeen = localStorage.getItem(TUTORIAL_SEEN_KEY) === "true";

  const startTutorial = useCallback(
    (customSteps?: TutorialStep[], guideId?: string) => {
      // Allow callers to pass a guideId alone — we'll resolve the steps from
      // the chapter source. Older callers pass steps directly.
      if (!customSteps && guideId) {
        const lesson = findLessonById(guideId);
        if (lesson) {
          setSteps(lesson.steps);
          setTourId(lesson.id);
          setCurrentStepIndex(0);
          setIsActive(true);
          return;
        }
      }
      setSteps(customSteps || DEFAULT_STEPS);
      setTourId(guideId ?? null);
      setCurrentStepIndex(0);
      setIsActive(true);
    },
    []
  );

  const awardCompletion = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase.rpc("complete_tutorial" as any, {
        p_tour_id: `feature_${id}`,
      });
      if (error) return;
      const row = Array.isArray(data) ? data[0] : (data as any);
      if (!row?.awarded) return;
      if (row.bonus_amount > 0) {
        toast.success(
          `🎓 튜토리얼 마스터! ${row.base_amount + row.bonus_amount}P 적립`
        );
      } else if (row.base_amount > 0) {
        toast.success(`튜토리얼 완료! ${row.base_amount}P 적립`);
      }
    } catch {
      // 적립 실패해도 튜토리얼은 정상 종료
    }
  }, []);

  const endTutorial = useCallback(() => {
    setIsActive(false);
    setCurrentStepIndex(0);
    localStorage.setItem(TUTORIAL_SEEN_KEY, "true");
    if (tourId) {
      awardCompletion(tourId);
      // Persist lesson completion locally as well, so progress UI stays
      // accurate even when the Supabase RPC is unavailable (e.g. anonymous
      // browsing). useTutorialProgress reads from localStorage.
      try {
        const raw = localStorage.getItem("dewy:tutorial-progress:v2");
        const parsed = raw ? JSON.parse(raw) : { completedLessons: [], welcomeShown: false };
        const completed: string[] = Array.isArray(parsed.completedLessons)
          ? parsed.completedLessons
          : [];
        if (!completed.includes(tourId)) {
          completed.push(tourId);
          localStorage.setItem(
            "dewy:tutorial-progress:v2",
            JSON.stringify({
              ...parsed,
              completedLessons: completed,
              lastUpdated: new Date().toISOString(),
            })
          );
        }
      } catch {
        // ignore quota/parse errors
      }
      setTourId(null);
    }
  }, [tourId, awardCompletion]);

  const nextStep = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((i) => i + 1);
    } else {
      endTutorial();
    }
  }, [currentStepIndex, steps.length, endTutorial]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((i) => i - 1);
    }
  }, [currentStepIndex]);

  const skipTutorial = useCallback(() => {
    endTutorial();
  }, [endTutorial]);

  return {
    isActive,
    currentStep: steps[currentStepIndex],
    currentStepIndex,
    totalSteps: steps.length,
    hasSeen,
    startTutorial,
    nextStep,
    prevStep,
    skipTutorial,
    endTutorial,
  };
};
