import { useSessionTimer } from "@/hooks/useSessionTimer";

/**
 * Headless host that boots `useSessionTimer` at the app root so the daily
 * session-time accumulator runs regardless of which route is mounted. Renders
 * nothing — components that need the value call useSessionTimer themselves
 * (it shares state via localStorage).
 */
const SessionTracker = () => {
  useSessionTimer();
  return null;
};

export default SessionTracker;
