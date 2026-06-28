// 업체 '결정'(식장·업체 선택, 견적 예약 성사)을 내 예산에 기록하는 단일 소스.
// 앱 내 결제가 아니라 사용자가 외부에서 계약한 경우가 많아 금액은 직접 입력받는다.
// budget_items.amount 는 만원 단위(기존 견적 예약 반영 경로와 동일 컨벤션).
import { supabase } from "@/integrations/supabase/client";
import { PLACE_TO_BUDGET_CATEGORY } from "@/lib/categoryLabels";

// place 카테고리 → 예산 카테고리로 매핑해 budget_items 한 줄 추가(best-effort).
// 같은 결정의 중복 기록을 막기 위해 (예산 카테고리 + 업체명) 동일 행이 있으면 금액만 갱신.
export async function recordVendorBudget(params: {
  userId: string;
  placeCategory: string | null | undefined;
  vendorName: string | null;
  amountManwon: number;
  memo?: string;
}): Promise<{ ok: boolean }> {
  const { userId, placeCategory, vendorName, amountManwon, memo } = params;
  if (!userId || !(amountManwon > 0)) return { ok: false };
  const budgetCategory = PLACE_TO_BUDGET_CATEGORY[placeCategory ?? ""] ?? "etc";
  const title = vendorName?.trim() || "선택한 업체";

  // 중복 방지 — 같은 카테고리·제목 항목이 이미 있으면 금액만 업데이트(재선택 시 덮어쓰기).
  const { data: existing } = await (supabase as any)
    .from("budget_items")
    .select("id")
    .eq("user_id", userId)
    .eq("category", budgetCategory)
    .eq("title", title)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await (supabase as any)
      .from("budget_items")
      .update({ amount: amountManwon, memo: memo ?? "업체 선택 시 직접 입력" })
      .eq("id", existing.id);
    return { ok: !error };
  }

  const { error } = await (supabase as any).from("budget_items").insert({
    user_id: userId,
    category: budgetCategory,
    title,
    amount: amountManwon,
    memo: memo ?? "업체 선택 시 직접 입력",
  });
  return { ok: !error };
}
