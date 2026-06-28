import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  TUTORIAL_CHAPTERS,
  chaptersForUser,
  findChapterByLessonId,
  type TutorialUserContext,
} from "@/data/tutorialChapters";
import type { WeddingStyle } from "@/lib/weddingStyle";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { safeLocalStorage } from "@/lib/safeLocalStorage";

// Round 17 — DB-backed 진행 상태.
//
// 이전: localStorage 만 사용. 사용자가 브라우저 캐시 wipe / 다른 디바이스 / incognito 로
// 재접속하면 진행률 0% 로 리셋. 같은 lesson 자동 재시작 + 'app-tour'→'home-tour' 같은
// lesson ID rename 시 별도 RPC award → 포인트 중복 지급 보고된 사례.
//
// 변경: tutorial_completions 가 권위적 source. 로그인 사용자는 React Query 로 mount 시
// 자동 fetch + cache. localStorage 는 비로그인 폴백 + 즉시성 보완 cache 로 강등.
// markComplete 는 (a) localStorage 즉시 반영 (b) RPC 가 이미 idempotent 라 별도 INSERT
// 안 함 — useTutorial.endTutorial 이 RPC 호출 → tutorial_completions row 생성 → 다음
// invalidate 에서 DB 결과 merge. PK(user_id, tour_id) 라 중복 INSERT 거부됨.

const STORAGE_KEY = "dewy:tutorial-progress:v2";
const LEGACY_PAGE_PREFIX = "dewy_tutorial_page_";
const LEGACY_FLAG = "dewy_tutorial_seen";

interface ProgressRecord {
  completedLessons: string[];
  lastUpdated: string;
  welcomeShown: boolean;
}

// 주의: 모든 저장소 접근은 safeLocalStorage(throw 없음)로. 이전엔 첫 getItem 만 try/catch 였고
// iOS 프라이빗 모드에서 throw 시 아래 legacy 마이그레이션의 raw getItem 이 catch 밖에서 재throw
// → useState 초기화(렌더 경로)에서 화이트스크린. safeLocalStorage 로 그 클래스를 제거.
const load = (): ProgressRecord => {
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
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
    /* fall through (JSON.parse 실패 등) */
  }
  // Legacy v1 → v2 migration (per-page localStorage flags).
  const legacy = TUTORIAL_CHAPTERS.flatMap((c) => c.lessons)
    .filter((l) => safeLocalStorage.getItem(LEGACY_PAGE_PREFIX + l.id) === "true")
    .map((l) => l.id);
  const welcomeShown = safeLocalStorage.getItem(LEGACY_FLAG) === "true";
  return {
    completedLessons: legacy,
    lastUpdated: legacy.length > 0 ? new Date().toISOString() : "",
    welcomeShown,
  };
};

const save = (rec: ProgressRecord) => {
  safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(rec));
};

// tutorial_completions.tour_id 는 'feature_<lesson_id>' 형식 (useTutorial.awardCompletion).
// 둘 다 받아들이도록 prefix strip — 향후 다른 prefix 가 들어와도 안전.
const stripFeaturePrefix = (tourId: string): string =>
  tourId.startsWith("feature_") ? tourId.slice("feature_".length) : tourId;

export function useTutorialProgress() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [localState, setLocalState] = useState<ProgressRecord>(() => load());

  // One-time save after legacy migration.
  useEffect(() => {
    if (localState.completedLessons.length > 0 || localState.welcomeShown) {
      save(localState);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // DB completed lessons — 권위적 source. 로그인 사용자만 fetch.
  const { data: dbCompletedLessons } = useQuery({
    queryKey: ["tutorial_completions", user?.id ?? null],
    queryFn: async (): Promise<string[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("tutorial_completions")
        .select("tour_id")
        .eq("user_id", user.id);
      if (error) {
        console.error("tutorial_completions fetch failed", error);
        return [];
      }
      return (data ?? []).map((r: { tour_id: string }) => stripFeaturePrefix(r.tour_id));
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  // Merge: DB(권위) + localStorage(즉시성/비로그인). 같은 ID 중복 제거.
  const completedLessons = useMemo(() => {
    const set = new Set<string>(localState.completedLessons);
    if (dbCompletedLessons) for (const id of dbCompletedLessons) set.add(id);
    return Array.from(set);
  }, [localState.completedLessons, dbCompletedLessons]);

  // welcomeShown: DB 에 completed 가 1개 이상이면 returning user — welcome 안 띄움.
  // 캐시 wipe 후 재접속이라도 DB completed 가 있으면 sheet 재노출 차단.
  const welcomeShown = localState.welcomeShown || (dbCompletedLessons?.length ?? 0) > 0;

  const markComplete = useCallback((lessonId: string) => {
    // localStorage 는 즉시 cache. DB 는 useTutorial.endTutorial 의 RPC 가 PK 충돌 가드로
    // idempotent INSERT. queryClient.invalidateQueries 로 다음 mount 시 merge 반영.
    setLocalState((prev) => {
      if (prev.completedLessons.includes(lessonId)) return prev;
      const next: ProgressRecord = {
        ...prev,
        completedLessons: [...prev.completedLessons, lessonId],
        lastUpdated: new Date().toISOString(),
      };
      save(next);
      return next;
    });
    if (user) {
      // DB cache 무효화 — 다음 fetch 에서 RPC 결과 반영.
      queryClient.invalidateQueries({ queryKey: ["tutorial_completions", user.id] });
    }
  }, [user, queryClient]);

  const reset = useCallback(() => {
    const next: ProgressRecord = {
      completedLessons: [],
      lastUpdated: "",
      welcomeShown: false,
    };
    save(next);
    setLocalState(next);
    // Round 17 — DB cache 도 무효화. 단 tutorial_completions 행 자체는 PIPA/포인트 audit
    // 위해 보존 (사용자가 reset 해도 RPC 가 다시 award 안 함 — PK 충돌). 즉 reset 은
    // UI 진행 표시만 클리어. 실제 award 재발생은 lesson rename 같은 코드 변경 외엔 불가.
    if (user) {
      queryClient.invalidateQueries({ queryKey: ["tutorial_completions", user.id] });
    }
  }, [user, queryClient]);

  const markWelcomeShown = useCallback(() => {
    setLocalState((prev) => {
      if (prev.welcomeShown) return prev;
      const next = { ...prev, welcomeShown: true };
      save(next);
      return next;
    });
  }, []);

  const isCompleted = useCallback(
    (lessonId: string) => completedLessons.includes(lessonId),
    [completedLessons],
  );

  // Round 18 — style 단독 호출도 지원하기 위해 union 시그니처. 첫 번째 인자가
  // WeddingStyle string 이면 자동 wrap, 객체면 그대로 사용. 호출처는 점진적으로
  // 객체 ctx 형태로 마이그레이션.
  const toCtx = (
    arg: WeddingStyle | null | undefined | TutorialUserContext,
  ): TutorialUserContext => {
    if (arg && typeof arg === "object") return arg;
    return { style: arg ?? null };
  };

  const styleProgress = useCallback(
    (arg: WeddingStyle | null | undefined | TutorialUserContext) => {
      const ctx = toCtx(arg);
      const chapters = chaptersForUser(ctx);
      const visible = chapters.flatMap((c) => c.lessons.map((l) => l.id));
      const total = visible.length;
      const done = visible.filter((id) => completedLessons.includes(id)).length;
      const percent = total === 0 ? 0 : Math.round((done / total) * 100);
      return { done, total, percent };
    },
    [completedLessons],
  );

  const nextLesson = useCallback(
    (arg: WeddingStyle | null | undefined | TutorialUserContext) => {
      const ctx = toCtx(arg);
      const chapters = chaptersForUser(ctx);
      for (const ch of chapters) {
        for (const l of ch.lessons) {
          // Round 18 — placeholder lesson 은 nextLesson 후보에서 제외. CTA 가
          // 시작 불가 lesson 으로 이동하는 회귀를 막는다.
          if (l.placeholder) continue;
          if (!completedLessons.includes(l.id)) {
            return { lesson: l, chapter: ch };
          }
        }
      }
      return null;
    },
    [completedLessons],
  );

  return {
    completedLessons,
    welcomeShown,
    isCompleted,
    markComplete,
    markWelcomeShown,
    reset,
    styleProgress,
    nextLesson,
    chapterFor: findChapterByLessonId,
  };
}
