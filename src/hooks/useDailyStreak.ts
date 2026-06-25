import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { safeLocalStorage } from "@/lib/safeLocalStorage";

const STORAGE_KEY = "dewy:daily-streak";
export const FREEZE_CAP = 2;

export interface StreakState {
  /** YYYY-MM-DD */
  last_checkin_date: string | null;
  current_streak: number;
  longest_streak: number;
  total_days: number;
  /** 하루 빠짐을 보호하는 프리즈(상한 FREEZE_CAP). */
  freezes_available: number;
}

const EMPTY: StreakState = {
  last_checkin_date: null,
  current_streak: 0,
  longest_streak: 0,
  total_days: 0,
  freezes_available: FREEZE_CAP,
};

const todayKey = (d: Date = new Date()) => {
  // 로컬 자정 기준 YYYY-MM-DD(UTC 슬라이스는 음수 시간대에서 하루 밀림).
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const daysBetween = (from: string, to: string): number => {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const a = new Date(fy, (fm ?? 1) - 1, fd ?? 1).getTime();
  const b = new Date(ty, (tm ?? 1) - 1, td ?? 1).getTime();
  return Math.round((b - a) / 86_400_000);
};

/**
 * 오늘 체크인을 적용한 다음 상태(순수 함수 — DB/로컬 양쪽이 공유, 단위 테스트 대상).
 * 규칙:
 *  - 같은 날: 변화 없음(changed=false)
 *  - 어제(gap 1): 연속 +1
 *  - 하루 빠짐(gap 2)인데 프리즈 보유: 프리즈 1 소모하고 연속 +1(끊기지 않음)
 *  - 그 외 공백(gap ≥ 2 & 프리즈 없음, 또는 gap ≥ 3): 연속 1로 리셋
 *  - 7일 연속 도달마다 프리즈 +1(상한 FREEZE_CAP)
 */
export function applyCheckIn(prev: StreakState | null, today: string): { next: StreakState; changed: boolean } {
  if (prev && prev.last_checkin_date === today) return { next: prev, changed: false };

  const gap = prev?.last_checkin_date ? daysBetween(prev.last_checkin_date, today) : Infinity;
  let freezes = prev?.freezes_available ?? FREEZE_CAP;
  let streak: number;

  if (!prev || gap === Infinity) {
    streak = 1;
  } else if (gap === 1) {
    streak = prev.current_streak + 1;
  } else if (gap === 2 && freezes > 0) {
    // 하루(전날) 빠짐 — 프리즈로 보호해 연속 유지.
    streak = prev.current_streak + 1;
    freezes -= 1;
  } else {
    // 2일 이상 공백(프리즈 없음/부족) → 리셋. (gap 이 과거로 가는 음수면 시계 이상 — 리셋 처리)
    streak = 1;
  }

  const longest = Math.max(prev?.longest_streak ?? 0, streak);
  const total = (prev?.total_days ?? 0) + 1;
  // 7일 연속마다 프리즈 충전(상한).
  if (streak > 0 && streak % 7 === 0) freezes = Math.min(FREEZE_CAP, freezes + 1);

  return {
    next: { last_checkin_date: today, current_streak: streak, longest_streak: longest, total_days: total, freezes_available: freezes },
    changed: true,
  };
}

const loadLocal = (): StreakState | null => {
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p?.current_streak === "number" && typeof p?.total_days === "number") {
      return {
        last_checkin_date: typeof p.last_checkin_date === "string" ? p.last_checkin_date : null,
        current_streak: p.current_streak,
        longest_streak: typeof p.longest_streak === "number" ? p.longest_streak : p.current_streak,
        total_days: p.total_days,
        freezes_available: typeof p.freezes_available === "number" ? p.freezes_available : FREEZE_CAP,
      };
    }
    return null;
  } catch {
    return null;
  }
};

const saveLocal = (s: StreakState) => {
  try {
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore quota */
  }
};

/**
 * 일일 접속 스트릭. 앱을 여는 행위 자체가 체크인(별도 액션 불필요 — 습관 루프).
 * 로그인 시 user_streaks 로 기기 간 동기화 + 프리즈, 비로그인 시 localStorage 폴백.
 * 로컬 캐시로 즉시 렌더한 뒤 DB 결과로 보정한다.
 */
export function useDailyStreak() {
  const { user } = useAuth();
  const [state, setState] = useState<StreakState>(() => loadLocal() ?? EMPTY);

  useEffect(() => {
    const today = todayKey();

    if (!user) {
      // 비로그인 — 로컬만.
      const prev = loadLocal();
      const { next, changed } = applyCheckIn(prev, today);
      if (changed) saveLocal(next);
      setState(next);
      return;
    }

    let cancelled = false;
    (async () => {
      // 드리프트(260625): user_streaks 테이블이 실 DB 에서 드롭됨 → types.ts 에 없다. 조회는
      // 런타임에 실패하고 아래 error 분기에서 localStorage 폴백으로 동작(스트릭은 보조 기능).
      // 캐스트는 SdmPreviewResult 의 sdm_previews 처리와 동일 패턴. 영구 해소(재생성 또는 DB경로 제거)는
      // docs/260625_backend_domain_map.md §4 / 드리프트 task 참조.
      const { data, error } = await (supabase as any)
        .from("user_streaks")
        .select("last_checkin_date, current_streak, longest_streak, total_days, freezes_available")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        // DB 실패 시 로컬로라도 동작(스트릭은 보조 기능 — 화면을 막지 않는다).
        console.warn("useDailyStreak load failed", error);
        const prev = loadLocal();
        const { next } = applyCheckIn(prev, today);
        if (!cancelled) { setState(next); saveLocal(next); }
        return;
      }
      const prev: StreakState | null = data
        ? {
            last_checkin_date: data.last_checkin_date,
            current_streak: data.current_streak,
            longest_streak: data.longest_streak,
            total_days: data.total_days,
            freezes_available: data.freezes_available,
          }
        : null;
      const { next, changed } = applyCheckIn(prev, today);
      if (changed) {
        // user_streaks 드롭됨(위 주석 참조) — upsert 도 런타임 실패하나 saveLocal 로 폴백.
        const { error: upErr } = await (supabase as any)
          .from("user_streaks")
          .upsert({ user_id: user.id, ...next, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
        if (upErr) console.warn("useDailyStreak upsert failed", upErr);
      }
      if (!cancelled) {
        setState(next);
        saveLocal(next);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return {
    streak: state.current_streak,
    longest: state.longest_streak,
    totalDays: state.total_days,
    /** 보유 프리즈(하루 빠짐 보호권). */
    freezesAvailable: state.freezes_available,
    /** true the first time this hook mounts on a new day */
    isFreshCheckIn: state.last_checkin_date === todayKey() && state.current_streak >= 1,
  };
}
