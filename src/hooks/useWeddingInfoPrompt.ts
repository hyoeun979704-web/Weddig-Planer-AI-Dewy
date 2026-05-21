import { useEffect, useState, useSyncExternalStore } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { tutorialActive } from "@/lib/tutorialActive";

const DISMISS_KEY = "dewy:wedding-info-modal:dismissed";

// 페이지 튜토리얼이 시작될 시간을 주기 위한 지연. 튜토리얼 자동 시작(800ms)보다
// 길게 잡아, 둘 다 뜰 상황이면 튜토리얼이 먼저 떠 활성 신호가 켜지도록 한다.
const PROMPT_DELAY_MS = 1200;

/**
 * Auto-show controller for the WeddingInfoSetupModal.
 *
 * Returns { open, dismiss, openManually } — pages mount the modal once at
 * the bottom and feed `open` to its `isOpen`.
 *
 * Auto-opens when:
 *  - user is signed in
 *  - useWeddingSchedule has loaded
 *  - wedding_date AND wedding_region are both null (not onboarded)
 *  - user hasn't dismissed it before
 *
 * Dismissal is persistent (localStorage): once the user skips, we don't
 * auto-prompt again. Pages that genuinely need the data surface their own
 * inline CTA / empty-state instead of re-popping the modal. The home screen
 * uses a non-forced CTA card rather than this auto-prompt.
 */
export function useWeddingInfoPrompt() {
  const { user } = useAuth();
  const { weddingSettings, isLoading } = useWeddingSchedule();
  const [open, setOpen] = useState(false);
  // 어느 페이지에서든 튜토리얼이 최우선 — 활성 동안엔 모달을 띄우지 않고,
  // 끝나면 effect 가 재평가돼 그때 띄운다.
  const tutActive = useSyncExternalStore(
    tutorialActive.subscribe,
    tutorialActive.get,
    tutorialActive.get,
  );

  useEffect(() => {
    if (!user || isLoading) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      // localStorage 차단 환경 — 계속 진행
    }
    const hasDateInfo = !!weddingSettings.wedding_date || weddingSettings.wedding_date_tbd;
    const hasRegionInfo = !!weddingSettings.wedding_region || weddingSettings.wedding_region_tbd;
    const onboarded = (hasDateInfo && hasRegionInfo) || !!weddingSettings.planning_stage;
    if (onboarded) return;
    // 튜토리얼이 떠 있으면 양보. 끝나면 tutActive 변경으로 effect 재실행.
    if (tutActive) return;
    const timer = setTimeout(() => {
      if (!tutorialActive.get()) setOpen(true);
    }, PROMPT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [
    user,
    isLoading,
    tutActive,
    weddingSettings.wedding_date,
    weddingSettings.wedding_region,
    weddingSettings.wedding_date_tbd,
    weddingSettings.wedding_region_tbd,
    weddingSettings.planning_stage,
  ]);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // best effort
    }
    setOpen(false);
  };

  const openManually = () => setOpen(true);

  return { open, dismiss, openManually };
}
