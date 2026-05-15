import { useCallback, useEffect, useState } from "react";
import {
  TUTORIAL_CHAPTERS,
  chaptersForStyle,
  totalLessonCountForStyle,
  findChapterByLessonId,
} from "@/data/tutorialChapters";
import type { WeddingStyle } from "@/lib/weddingStyle";

const STORAGE_KEY = "dewy:tutorial-progress:v2";
const LEGACY_PAGE_PREFIX = "dewy_tutorial_page_";
const LEGACY_FLAG = "dewy_tutorial_seen";

interface ProgressRecord {
  completedLessons: string[];   // lesson ids
  lastUpdated: string;          // ISO date
  /** First-time welcome-sheet already shown. */
  welcomeShown: boolean;
}

const load = (): ProgressRecord => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.completedLessons)) {
        return {
          completedLessons: parsed.completedLessons,
          lastUpdated: typeof parsed.lastUpdated === "string" ? parsed.lastUpdated : "",
          welcomeShown: !!parsed.welcomeShown,
        };
      }
    }
  } catch {
    // fall through
  }

  // ── Migration from v1 (per-page localStorage flags) ──
  // The old usePageTutorial wrote dewy_tutorial_page_<id>="true" on first visit.
  // Carry that over so returning users don't get re-prompted for completed
  // lessons. We do this exactly once — the next save will overwrite legacy
  // discovery.
  const legacy = TUTORIAL_CHAPTERS.flatMap(c => c.lessons)
    .filter(l => localStorage.getItem(LEGACY_PAGE_PREFIX + l.id) === "true")
    .map(l => l.id);
  const welcomeShown = localStorage.getItem(LEGACY_FLAG) === "true";
  return {
    completedLessons: legacy,
    lastUpdated: legacy.length > 0 ? new Date().toISOString() : "",
    welcomeShown,
  };
};

const save = (rec: ProgressRecord) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rec));
  } catch {
    // quota errors ignored
  }
};

/**
 * Tracks tutorial lesson completion across chapters.
 *
 * - completedLessons: ids of finished lessons
 * - markComplete(id): idempotently mark a lesson done
 * - reset(): wipe progress (debug/testing)
 * - welcomeShown / markWelcomeShown(): one-time first-visit welcome gate
 * - styleProgress(style): { done, total, percent } scoped to the visible
 *   lessons for the given wedding_style — irrelevant lessons don't drag
 *   the percent down for self-wedding users.
 */
export function useTutorialProgress() {
  const [state, setState] = useState<ProgressRecord>(() => load());

  // One-time save after legacy migration so the migration data is persisted.
  useEffect(() => {
    if (state.completedLessons.length > 0 || state.welcomeShown) {
      save(state);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markComplete = useCallback((lessonId: string) => {
    setState(prev => {
      if (prev.completedLessons.includes(lessonId)) return prev;
      const next: ProgressRecord = {
        ...prev,
        completedLessons: [...prev.completedLessons, lessonId],
        lastUpdated: new Date().toISOString(),
      };
      save(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const next: ProgressRecord = {
      completedLessons: [],
      lastUpdated: "",
      welcomeShown: false,
    };
    save(next);
    setState(next);
  }, []);

  const markWelcomeShown = useCallback(() => {
    setState(prev => {
      if (prev.welcomeShown) return prev;
      const next = { ...prev, welcomeShown: true };
      save(next);
      return next;
    });
  }, []);

  const isCompleted = useCallback(
    (lessonId: string) => state.completedLessons.includes(lessonId),
    [state.completedLessons]
  );

  const styleProgress = useCallback(
    (style: WeddingStyle | null | undefined) => {
      const total = totalLessonCountForStyle(style);
      const visible = chaptersForStyle(style).flatMap(c => c.lessons.map(l => l.id));
      const done = visible.filter(id => state.completedLessons.includes(id)).length;
      const percent = total === 0 ? 0 : Math.round((done / total) * 100);
      return { done, total, percent };
    },
    [state.completedLessons]
  );

  /** Returns the next unfinished lesson for the user — the "이어서 시작" target. */
  const nextLesson = useCallback(
    (style: WeddingStyle | null | undefined) => {
      const chapters = chaptersForStyle(style);
      for (const ch of chapters) {
        for (const l of ch.lessons) {
          if (!state.completedLessons.includes(l.id)) {
            return { lesson: l, chapter: ch };
          }
        }
      }
      return null;
    },
    [state.completedLessons]
  );

  return {
    completedLessons: state.completedLessons,
    welcomeShown: state.welcomeShown,
    isCompleted,
    markComplete,
    markWelcomeShown,
    reset,
    styleProgress,
    nextLesson,
    /** Look up which chapter a lesson belongs to without an extra import. */
    chapterFor: findChapterByLessonId,
  };
}
