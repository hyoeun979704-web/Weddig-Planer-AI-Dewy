import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";

const DISMISS_KEY = "dewy:wedding-info-modal:dismissed";

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
    if (!onboarded) setOpen(true);
  }, [
    user,
    isLoading,
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
