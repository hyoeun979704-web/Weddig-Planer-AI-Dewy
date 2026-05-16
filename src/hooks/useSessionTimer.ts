import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "dewy:session-time";
const TODAY_PING_INTERVAL_MS = 15000; // 15s

interface DailyRecord {
  date: string;       // YYYY-MM-DD
  totalSeconds: number;
}

interface SessionTimerState {
  todaySeconds: number;
  weekSeconds: number;
  averagePerDayMinutes: number;
  daysObserved: number;
}

const todayKey = () => new Date().toISOString().slice(0, 10);

const loadRecords = (): DailyRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(r => typeof r?.date === "string" && typeof r?.totalSeconds === "number");
  } catch {
    return [];
  }
};

const saveRecords = (records: DailyRecord[]) => {
  try {
    // Keep last 60 days only.
    const trimmed = records
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 60);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // quota errors are non-fatal
  }
};

const computeWeek = (records: DailyRecord[]): number => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 6);
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  return records
    .filter(r => r.date >= cutoffKey)
    .reduce((sum, r) => sum + r.totalSeconds, 0);
};

const computeAverage = (records: DailyRecord[]): { avgMin: number; days: number } => {
  if (records.length === 0) return { avgMin: 0, days: 0 };
  const days = records.length;
  const totalMin = records.reduce((s, r) => s + r.totalSeconds, 0) / 60;
  return { avgMin: Math.round(totalMin / days), days };
};

/**
 * Tracks active session time (seconds) per day in localStorage.
 *
 * We can't reliably read system idle time from a PWA, so the heuristic is:
 *  - while the tab is visible (document.visibilityState === "visible"),
 *    accumulate seconds in fixed-interval pings.
 *  - on hide/blur, stop pinging. On show/focus, resume.
 *
 * This isn't perfect (a user staring at a paused tab without interaction
 * still counts) but it's good enough to derive daily and weekly averages
 * for the dashboard and to bench changes against.
 */
export function useSessionTimer(): SessionTimerState {
  const [state, setState] = useState<SessionTimerState>(() => {
    const records = loadRecords();
    const today = records.find(r => r.date === todayKey());
    const { avgMin, days } = computeAverage(records);
    return {
      todaySeconds: today?.totalSeconds ?? 0,
      weekSeconds: computeWeek(records),
      averagePerDayMinutes: avgMin,
      daysObserved: days,
    };
  });

  const bumpToday = useCallback((deltaSeconds: number) => {
    if (deltaSeconds <= 0) return;
    const records = loadRecords();
    const date = todayKey();
    const existingIdx = records.findIndex(r => r.date === date);
    let next: DailyRecord[];
    if (existingIdx >= 0) {
      next = records.map((r, i) =>
        i === existingIdx ? { ...r, totalSeconds: r.totalSeconds + deltaSeconds } : r
      );
    } else {
      next = [{ date, totalSeconds: deltaSeconds }, ...records];
    }
    saveRecords(next);
    const today = next.find(r => r.date === date)!;
    const { avgMin, days } = computeAverage(next);
    setState({
      todaySeconds: today.totalSeconds,
      weekSeconds: computeWeek(next),
      averagePerDayMinutes: avgMin,
      daysObserved: days,
    });
  }, []);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (intervalId !== null) return;
      intervalId = setInterval(() => {
        bumpToday(TODAY_PING_INTERVAL_MS / 1000);
      }, TODAY_PING_INTERVAL_MS);
    };
    const stop = () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", start);
    window.addEventListener("blur", stop);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", start);
      window.removeEventListener("blur", stop);
    };
  }, [bumpToday]);

  return state;
}
