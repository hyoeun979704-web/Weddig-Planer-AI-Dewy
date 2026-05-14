import { useEffect, useState } from "react";

const STORAGE_KEY = "dewy:daily-streak";

interface StreakRecord {
  lastCheckIn: string;   // YYYY-MM-DD
  streak: number;        // consecutive days, ≥1 once checked in today
  longest: number;       // highest streak ever reached
  totalDays: number;     // distinct days checked in across lifetime
}

const todayKey = () => new Date().toISOString().slice(0, 10);

const yesterdayKey = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

const load = (): StreakRecord | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.lastCheckIn === "string" &&
      typeof parsed?.streak === "number" &&
      typeof parsed?.longest === "number" &&
      typeof parsed?.totalDays === "number"
    ) {
      return parsed as StreakRecord;
    }
    return null;
  } catch {
    return null;
  }
};

const save = (rec: StreakRecord) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rec));
  } catch {
    // ignore quota
  }
};

/**
 * Manages a per-device daily check-in streak.
 *
 * Auto-check-in on first mount per day. We do NOT require any user action
 * because the act of opening the app *is* the check-in — competing with
 * shopping/calendar apps' habit loop is the whole point.
 *
 * Streak rules:
 *  - same day: no change
 *  - yesterday → +1
 *  - any other gap (≥2 days) → reset to 1 (still counts as a check-in)
 */
export function useDailyStreak() {
  const [state, setState] = useState<StreakRecord>(() => {
    const existing = load();
    if (!existing) {
      return { lastCheckIn: "", streak: 0, longest: 0, totalDays: 0 };
    }
    return existing;
  });

  useEffect(() => {
    const today = todayKey();
    const existing = load();
    if (existing?.lastCheckIn === today) {
      // already checked in today; sync state but don't bump
      setState(existing);
      return;
    }

    const isYesterday = existing?.lastCheckIn === yesterdayKey();
    const nextStreak = isYesterday ? (existing!.streak + 1) : 1;
    const nextLongest = Math.max(existing?.longest ?? 0, nextStreak);
    const nextTotal = (existing?.totalDays ?? 0) + 1;

    const rec: StreakRecord = {
      lastCheckIn: today,
      streak: nextStreak,
      longest: nextLongest,
      totalDays: nextTotal,
    };
    save(rec);
    setState(rec);
  }, []);

  return {
    streak: state.streak,
    longest: state.longest,
    totalDays: state.totalDays,
    /** true the first time this hook mounts on a new day */
    isFreshCheckIn: state.lastCheckIn === todayKey() && state.streak >= 1,
  };
}
