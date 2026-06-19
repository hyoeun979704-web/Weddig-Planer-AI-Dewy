import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { useTutorialProgress } from "@/hooks/useTutorialProgress";
import { HOME_POPUP_DISMISS_KEY } from "@/components/home/HomeEntryPopup";
import { isOnboarded } from "@/lib/onboarding";
import { AUTO_TUTORIAL_ENABLED } from "@/data/tutorialChapters";

const WEDDING_INFO_DISMISS_KEY = "dewy:wedding-info-modal:dismissed";

export type FirstRunStage =
  | "pending" // 아직 준비 안 됨(로딩/딜레이)
  | "event" // 이벤트 팝업
  | "tutorial" // 홈 투어
  | "onboarding" // 동의 → 결혼정보 입력
  | "idle"; // 시퀀스 종료

/**
 * 로그인 후 홈 첫 실행 온보딩 시퀀스를 조율한다.
 *
 *   로그인 → 홈 → 이벤트 팝업 → 튜토리얼(홈 투어) → 동의 → 온보딩 입력
 *
 * 각 단계는 건너뛸 수 있고(닫기/스킵), 닫히면 다음 단계로 진행한다.
 * 이미 완료/스킵된 단계는 순서에서 빠진다:
 *   - event:      오늘 하루 보지 않기로 막혀 있지 않으면 노출
 *   - tutorial:   home-tour 미완료면 노출
 *   - onboarding: 미온보딩 + 결혼정보 입력을 영구 dismiss 안 했으면 노출
 *
 * 온보딩을 건너뛰면 영구 dismiss 되어 홈에선 다시 강제하지 않고,
 * 정보가 필요한 페이지(일정·예산 등)에서 다시 안내한다.
 */
export function useHomeFirstRun() {
  const { user } = useAuth();
  const { weddingSettings, isLoading } = useWeddingSchedule();
  const progress = useTutorialProgress();

  const [stages, setStages] = useState<FirstRunStage[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [ready, setReady] = useState(false);

  // 홈/스플래시가 자리잡은 뒤 시퀀스를 시작.
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 600);
    return () => clearTimeout(t);
  }, []);

  const homeTourDone = progress.isCompleted("home-tour");

  const onboarded = useMemo(
    () => isOnboarded(weddingSettings),
    [
      weddingSettings.wedding_date,
      weddingSettings.wedding_region,
      weddingSettings.wedding_date_tbd,
      weddingSettings.wedding_region_tbd,
      weddingSettings.planning_stage,
    ],
  );

  useEffect(() => {
    if (stages) return; // 한 번만 계산
    if (!ready) return;
    // 로그인 사용자는 결혼정보 로딩을 기다린다(온보딩 여부 판단). 게스트는 대기 X.
    if (user && isLoading) return;

    const list: FirstRunStage[] = [];

    // 이벤트(가입 유도/혜택) 팝업 — 게스트·로그인 모두 노출(오늘 하루 보지않기 제외).
    let eventBlocked = false;
    try {
      const until = localStorage.getItem(HOME_POPUP_DISMISS_KEY);
      eventBlocked = !!until && new Date(until).getTime() > Date.now();
    } catch {
      // ignore
    }
    if (!eventBlocked) list.push("event");

    // 튜토리얼·온보딩은 로그인 사용자만.
    if (user) {
      if (AUTO_TUTORIAL_ENABLED && !homeTourDone) list.push("tutorial");

      let onbDismissed = false;
      try {
        onbDismissed = localStorage.getItem(WEDDING_INFO_DISMISS_KEY) === "1";
      } catch {
        // ignore
      }
      if (!onboarded && !onbDismissed) list.push("onboarding");
    }

    setStages(list);
  }, [stages, user, isLoading, ready, homeTourDone, onboarded]);

  const stage: FirstRunStage = stages ? (stages[idx] ?? "idle") : "pending";
  const advance = () => setIdx((i) => i + 1);

  return { stage, advance };
}
