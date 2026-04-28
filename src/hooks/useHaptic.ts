/**
 * useHaptic — small wrapper over `navigator.vibrate` so meaningful UI
 * moments (heart tap, schedule check, payment success, error) carry a
 * tactile cue instead of pure visual feedback. iOS Safari + Android
 * Chrome both support the Vibration API (iOS only respects "light"
 * patterns ≤ 50ms but doesn't error on longer ones).
 *
 * No-op on devices without the API (desktop) and respects reduced-
 * motion preference so users with motion sensitivity aren't buzzed.
 *
 * Patterns are intentionally distinct from each other so muscle memory
 * can develop:
 *   light    — selection / toggle (e.g. heart on/off)
 *   medium   — confirm / commit (e.g. schedule check, form submit)
 *   success  — completion (e.g. payment success, draft restored)
 *   warning  — irreversible action prompt (e.g. delete confirm)
 *   error    — failed action (e.g. form validation)
 */

const reducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

const vibrate = (pattern: number | number[]) => {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  if (reducedMotion()) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* some browsers throw on unsupported patterns; fail silently */
  }
};

export const useHaptic = () => {
  return {
    light: () => vibrate(10),
    medium: () => vibrate(20),
    success: () => vibrate([15, 30, 15]),
    warning: () => vibrate([20, 40, 20]),
    error: () => vibrate([30, 50, 30, 50]),
  };
};
