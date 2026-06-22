import { supabase } from "@/integrations/supabase/client";
import { isNativeApp } from "@/lib/platform";
import { updateWidgets, type WidgetSnapshot } from "@/lib/native/widgetBridge";

// 위젯 스냅샷 계산 — 가벼운 직접 select 3종(예식일·할일 카운트·예산 합계)로 핵심 값만 모은다.
// 페이지 훅에 강결합하지 않고, 토큰/PII 없이 표시용 숫자만. 설계: docs/widget-system.md §2-3.

/** 로그인 사용자의 위젯 표시 값 계산. 실패한 부분은 안전 기본값(빈 위젯 대신 안내 폴백). */
export async function computeWidgetSnapshot(userId: string): Promise<WidgetSnapshot> {
  const [weddingRes, scheduleRes, budgetSettingsRes, budgetItemsRes] = await Promise.all([
    supabase.from("user_wedding_settings").select("wedding_date, wedding_date_tbd").eq("user_id", userId).maybeSingle(),
    supabase.from("user_schedule_items").select("completed").eq("user_id", userId),
    supabase.from("budget_settings").select("total_budget").eq("user_id", userId).maybeSingle(),
    supabase.from("budget_items").select("amount").eq("user_id", userId),
  ]);

  const tbd = weddingRes.data?.wedding_date_tbd ?? false;
  const weddingDate = tbd ? null : (weddingRes.data?.wedding_date ?? null);

  const items = scheduleRes.data ?? [];
  const total = items.length;
  const done = items.filter((i) => i.completed).length;

  const totalManwon = budgetSettingsRes.data?.total_budget ?? 0;
  const usedManwon = (budgetItemsRes.data ?? []).reduce((sum, i) => sum + (i.amount ?? 0), 0);

  return {
    weddingDate,
    checklist: { done, total },
    budget: { usedManwon, totalManwon },
    updatedAt: Date.now(),
  };
}

/** 스냅샷 계산 후 위젯 갱신. 네이티브에서만 동작, 어디서 불러도 앱 흐름에 영향 없게 안전 처리. */
export async function syncWidgets(userId: string | undefined | null): Promise<void> {
  if (!isNativeApp() || !userId) return;
  try {
    const snapshot = await computeWidgetSnapshot(userId);
    await updateWidgets(snapshot);
  } catch (e) {
    console.warn("[widgetSnapshot] sync failed", e);
  }
}
