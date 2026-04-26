import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";

const SESSION_DISMISS_KEY = "dewy:wedding-info-modal:dismissed";

/**
 * Auto-show controller for the WeddingInfoSetupModal.
 *
 * Returns { open, dismiss, openManually } — pages mount the modal once at
 * the bottom and feed `open` to its `isOpen`.
 *
 * Auto-opens when:
 *  - user is signed in
 *  - useWeddingSchedule has loaded
 *  - wedding_date AND wedding_region are both null
 *  - user hasn't dismissed it for this session
 *
 * Dismissal lasts only the browser session (sessionStorage) so the prompt
 * comes back on next visit but doesn't repeat-spam within the session.
 */
export function useWeddingInfoPrompt() {
  const { user } = useAuth();
  const { weddingSettings, isLoading } = useWeddingSchedule();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user || isLoading) return;
    if (sessionStorage.getItem(SESSION_DISMISS_KEY) === "1") return;
    const missing = !weddingSettings.wedding_date && !weddingSettings.wedding_region;
    if (missing) setOpen(true);
  }, [user, isLoading, weddingSettings.wedding_date, weddingSettings.wedding_region]);

  const dismiss = () => {
    sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
    setOpen(false);
  };

  const openManually = () => setOpen(true);

  return { open, dismiss, openManually };
}
