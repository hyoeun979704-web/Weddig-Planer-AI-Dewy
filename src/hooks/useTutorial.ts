import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  TUTORIAL_CHAPTERS,
  findLessonById,
  type TutorialLessonStep,
} from "@/data/tutorialChapters";
import { tutorialActive } from "@/lib/tutorialActive";
import { useAuth } from "@/contexts/AuthContext";

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
  const { user } = useAuth();
  const location = useLocation();
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<TutorialStep[]>(DEFAULT_STEPS);
  const [tourId, setTourId] = useState<string | null>(null);
  const startedPathRef = useRef<string | null>(null);

  const hasSeen = localStorage.getItem(TUTORIAL_SEEN_KEY) === "true";

  // 활성 동안 전역 신호 등록 — 다른 화면 요소(결혼정보 모달 등)가 튜토리얼에
  // 양보하도록. 활성 구간마다 enter/leave 가 균형을 이룬다.
  useEffect(() => {
    if (!isActive) return;
    tutorialActive.enter();
    return () => tutorialActive.leave();
  }, [isActive]);

  // Round 17 P1 — 라우트 변경 시 튜토리얼 자동 종료 (award X). 사용자가 alarm 클릭 /
  // back / link click 등으로 다른 페이지 이동하면 isActive 가 true 인 채 stuck → 다음
  // 화면에 stale 코치마크 + tutorialActive count 누수. 시작 path 기억 후 변동 시 reset.
  useEffect(() => {
    if (!isActive) return;
    if (startedPathRef.current === null) {
      startedPathRef.current = location.pathname;
      return;
    }
    if (startedPathRef.current !== location.pathname) {
      setIsActive(false);
      setCurrentStepIndex(0);
      setTourId(null);
      startedPathRef.current = null;
    }
  }, [isActive, location.pathname]);

  const startTutorial = useCallback(
    (customSteps?: TutorialStep[], guideId?: string) => {
      // Round 17 — 로그인 후만 튜토리얼 진행. 비로그인은 LoginRequiredOverlay 위로
      // 코치마크가 떠 혼란만 유발 + RPC 호출이 'Not authenticated' 로 silently fail.
      if (!user) return;
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
    [user]
  );

  const awardCompletion = useCallback(async (id: string) => {
    try {
      // Round 17 P0 — lesson alias 가드. 같은 콘텐츠가 ID rename (예: app-tour →
      // home-tour) 으로 award 중복 발생했던 회귀. 사용자가 user_id 로 이미 alias tour_id
      // 받은 적 있으면 새 ID 로 award 안 함. lesson.aliases 정의는 tutorialChapters.ts.
      const lesson = findLessonById(id);
      const candidates = [id, ...(lesson?.aliases ?? [])].map((x) => `feature_${x}`);
      if (candidates.length > 1) {
        // alias 별 tour_id 가 달라 RPC 의 PK 가드만으론 cross-alias 중복 award 를 못 막는다.
        // alias 체크는 중복 방지의 핵심 가드 — transient 오류 시 무시하고 award 하면 회귀하므로
        // 3회 재시도(지수 백오프) 후에도 검증 실패면 award 자체를 skip 한다(fail-closed,
        // 강한 정합성 우선: DB 일시 장애 시 적립을 놓치더라도 중복 발급은 막는다).
        let verified = false;
        let existing: unknown = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          const { data, error } = await supabase
            .from("tutorial_completions" as any)
            .select("tour_id")
            .in("tour_id", candidates)
            .limit(1)
            .maybeSingle();
          if (!error) {
            verified = true;
            existing = data;
            break;
          }
          await new Promise((r) => setTimeout(r, 200 * 2 ** attempt)); // 200/400/800ms
        }
        if (!verified) return; // 검증 불가 → 중복 award 위험이라 skip
        if (existing) return; // 이미 alias 로 받은 적 있음
      }
      const { data, error } = await supabase.rpc("complete_tutorial" as any, {
        p_tour_id: `feature_${id}`,
      });
      if (error) return;
      const row = Array.isArray(data) ? data[0] : (data as any);
      if (!row?.awarded) return;
      if (row.bonus_amount > 0) {
        toast.success(
          ` 튜토리얼 마스터! ${row.base_amount + row.bonus_amount}P 적립`
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
