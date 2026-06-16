// 일정 편집 → 연결된 외부 캘린더 자동 동기화(디바운스, 백그라운드 best-effort).
// useWeddingSchedule 의 일정 변경 직후 nudge() 를 부르면, 잠깐 모았다가(연속 편집 합치기)
// 연결된 provider 에만 cal-sync 를 돌린다. 연결 안 했으면 네트워크 호출 0(헛호출 방지).
//
// 연결 상태는 useCalendarSync 가 localStorage 에 표시 → 여기선 그걸 읽어 게이트한다(상태
// 조회 라운드트립 절약). UI 의존 없는 순수 모듈이라 hook/lib 어디서든 부를 수 있다.
import { supabase } from "@/integrations/supabase/client";

const PROVIDERS = ["google", "kakao"] as const;
type Provider = (typeof PROVIDERS)[number];
const keyOf = (p: Provider) => `dewy:cal:connected:${p}`;
const DEBOUNCE_MS = 4000;

export function markProviderConnected(provider: Provider, connected: boolean): void {
  try {
    if (connected) localStorage.setItem(keyOf(provider), "1");
    else localStorage.removeItem(keyOf(provider));
  } catch { /* best effort */ }
}

function connectedProviders(): Provider[] {
  try {
    return PROVIDERS.filter((p) => localStorage.getItem(keyOf(p)) === "1");
  } catch {
    return [];
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let pendingWhileRunning = false;

async function runOnce(): Promise<void> {
  const providers = connectedProviders();
  if (providers.length === 0) return;
  if (running) { pendingWhileRunning = true; return; } // 진행 중이면 끝나고 1회 더
  running = true;
  try {
    for (const provider of providers) {
      try {
        await supabase.functions.invoke("cal-sync", { body: { provider, action: "sync" } });
      } catch { /* 백그라운드 — 실패해도 조용히(다음 편집/수동 동기화에서 재시도) */ }
    }
  } finally {
    running = false;
    if (pendingWhileRunning) { pendingWhileRunning = false; void runOnce(); }
  }
}

// 일정 변경 후 호출 — 연속 편집을 모아 한 번만 동기화.
export function nudgeCalendarSync(): void {
  if (connectedProviders().length === 0) return; // 연결 없으면 타이머조차 안 검
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { timer = null; void runOnce(); }, DEBOUNCE_MS);
}
