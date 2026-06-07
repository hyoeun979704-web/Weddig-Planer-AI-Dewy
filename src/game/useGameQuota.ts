import { useCallback, useState } from "react";

// 꽃 머지 게임 일일 플레이 쿼터 (KST 자정 리셋).
//   무료 FREE_MAX 판 + 광고(보상형)로 AD_MAX 판 추가 = 하루 최대 (FREE_MAX+AD_MAX)판.
//   소진 시 플레이 불가 → 다음날 재방문 유도(리텐션). 서버(add_game_points)는 적립을
//   별도로 캡하므로, 이 훅은 'UX 게이팅'(버튼/잠금) 담당 — localStorage 기반.
//
// 주의: localStorage 는 기기 로컬·삭제 가능. 적립 한도의 진짜 통제는 서버다(이중 안전).

export const FREE_MAX = 3;
export const AD_MAX = 3;
const STORAGE_KEY = "mergeGame_quota_v1";

interface QuotaState {
  date: string; // KST YYYY-MM-DD
  free: number; // 사용한 무료 판 수
  ad: number;   // 사용한 광고 판 수
}

const kstTodayISO = (): string => {
  const now = new Date();
  const kst = new Date(now.getTime() + now.getTimezoneOffset() * 60_000 + 9 * 60 * 60_000);
  return kst.toISOString().slice(0, 10);
};

const msUntilKstMidnight = (): number => {
  const now = new Date();
  const kstNow = new Date(now.getTime() + now.getTimezoneOffset() * 60_000 + 9 * 60 * 60_000);
  const next = new Date(kstNow);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - kstNow.getTime();
};

const load = (): QuotaState => {
  const today = kstTodayISO();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as QuotaState;
      if (p.date === today) {
        return { date: today, free: p.free ?? 0, ad: p.ad ?? 0 };
      }
    }
  } catch {
    /* parse 오류 무시 → 초기화 */
  }
  return { date: today, free: 0, ad: 0 };
};

const save = (s: QuotaState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* quota 초과 등 무시 */
  }
};

export const useGameQuota = () => {
  const [state, setState] = useState<QuotaState>(load);

  // 자정 경과 후 다시 열렸을 때를 위해 읽을 때마다 날짜 검사(상태가 어제면 리셋).
  const fresh = state.date === kstTodayISO() ? state : { date: kstTodayISO(), free: 0, ad: 0 };
  const freeLeft = Math.max(0, FREE_MAX - fresh.free);
  const adLeft = Math.max(0, AD_MAX - fresh.ad);

  const consumeFree = useCallback(() => {
    setState((prev) => {
      const base = prev.date === kstTodayISO() ? prev : { date: kstTodayISO(), free: 0, ad: 0 };
      const next = { ...base, free: base.free + 1 };
      save(next);
      return next;
    });
  }, []);

  const consumeAd = useCallback(() => {
    setState((prev) => {
      const base = prev.date === kstTodayISO() ? prev : { date: kstTodayISO(), free: 0, ad: 0 };
      const next = { ...base, ad: base.ad + 1 };
      save(next);
      return next;
    });
  }, []);

  return {
    freeLeft,
    adLeft,
    totalLeft: freeLeft + adLeft,
    consumeFree,
    consumeAd,
    msUntilReset: msUntilKstMidnight,
    FREE_MAX,
    AD_MAX,
  };
};
