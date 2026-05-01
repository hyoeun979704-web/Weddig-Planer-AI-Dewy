/**
 * 사용자 데이터 진단 핸들러
 * - 예산 분배 진단 (권장 비율 vs 실제)
 * - 일정 진단 (놓친 골든타임)
 * - 계약 진척도 (찜 + 예산 항목 분석)
 */

import { supabase } from "@/integrations/supabase/client";
import { CHECKLIST_TEMPLATE } from "@/data/checklistTemplate";

// ════════════════════════════════════════════════════════════
// 예산 진단 — 권장 비율 vs 실제 지출 비교
// ════════════════════════════════════════════════════════════
const RECOMMENDED_RATIOS: Record<string, number> = {
  venue: 0.40,
  sdm: 0.15,
  ring: 0.10,
  honeymoon: 0.15,
  house: 0.15,
  etc: 0.05,
};

const CATEGORY_LABEL: Record<string, string> = {
  venue: "베뉴 (식장)",
  sdm: "스드메",
  ring: "예물·반지",
  honeymoon: "신혼여행",
  house: "신혼집·가전",
  etc: "기타",
};

export const handleBudgetDiagnosis = async (userId: string): Promise<string> => {
  const [settingsRes, itemsRes] = await Promise.all([
    (supabase as any)
      .from("budget_settings")
      .select("total_budget")
      .eq("user_id", userId)
      .maybeSingle(),
    (supabase as any)
      .from("budget_items")
      .select("category, amount")
      .eq("user_id", userId),
  ]);

  const totalBudget: number | null = settingsRes.data?.total_budget ?? null;
  const items = (itemsRes.data ?? []) as Array<{ category: string; amount: number }>;

  if (!totalBudget) {
    return "총 예산이 설정되지 않아 진단할 수 없어요 💰\n[예산 페이지](/budget)에서 총 예산을 먼저 설정해주세요.";
  }
  if (items.length === 0) {
    return `총 예산은 ${totalBudget.toLocaleString()}원이에요. 아직 지출 항목이 없어 진단이 어려워요. [예산 페이지](/budget)에서 항목을 추가해주세요.`;
  }

  // 카테고리별 합계
  const byCategory: Record<string, number> = {};
  for (const i of items) byCategory[i.category] = (byCategory[i.category] ?? 0) + (i.amount ?? 0);

  // 권장 비율 비교
  const lines: string[] = [];
  let warningCount = 0;
  for (const [cat, recommended] of Object.entries(RECOMMENDED_RATIOS)) {
    const actual = byCategory[cat] ?? 0;
    const recommendedAmount = totalBudget * recommended;
    const ratio = recommendedAmount > 0 ? actual / recommendedAmount : 0;
    const label = CATEGORY_LABEL[cat] ?? cat;

    let status = "";
    if (actual === 0) {
      status = "⚪ 미시작";
    } else if (ratio >= 1.2) {
      status = "🔴 권장 초과 (+20%↑)";
      warningCount++;
    } else if (ratio >= 1.0) {
      status = "🟡 권장 도달 (조심)";
    } else if (ratio >= 0.7) {
      status = "🟢 정상 진행";
    } else {
      status = "🔵 여유 (~30%)";
    }
    lines.push(
      `• **${label}**: ${actual.toLocaleString()}원 / 권장 ${recommendedAmount.toLocaleString()}원 ${status}`,
    );
  }

  const totalSpent = items.reduce((s, i) => s + (i.amount ?? 0), 0);
  const totalRatio = Math.round((totalSpent / totalBudget) * 100);

  let summary = `총 ${totalRatio}% 사용 중 (${totalSpent.toLocaleString()} / ${totalBudget.toLocaleString()}원)`;
  if (totalRatio >= 95) summary += " ⚠️ 예산 거의 소진";
  else if (totalRatio >= 80) summary += " 🟡 마지막 체크 필요";
  else if (totalRatio < 30 && items.length < 3) summary += " 🌿 초기 단계";

  let warning = "";
  if (warningCount >= 2) {
    warning = "\n\n⚠️ **주의**: 권장 비율 초과 항목이 여러 개예요. 전체 예산 재조정을 고려해보세요.";
  }

  return `**예산 진단 결과** 📊\n${summary}\n\n${lines.join("\n")}${warning}\n\n💡 자세한 항목 관리는 [예산 페이지](/budget)에서.`;
};

// ════════════════════════════════════════════════════════════
// 일정 진단 — 놓친 골든타임 점검
// ════════════════════════════════════════════════════════════
export const handleScheduleDiagnosis = async (userId: string): Promise<string> => {
  const { data: settings } = await (supabase as any)
    .from("user_wedding_settings")
    .select("wedding_date, wedding_date_tbd")
    .eq("user_id", userId)
    .maybeSingle();

  if (!settings?.wedding_date || settings.wedding_date_tbd) {
    return "예식일이 설정되지 않아 시기 진단이 어려워요 📅\n마이페이지에서 예식일을 설정해주세요.";
  }

  const target = new Date(settings.wedding_date);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.round((target.getTime() - today.getTime()) / 86400000);

  if (daysLeft < 0) {
    return `결혼식 후 ${Math.abs(daysLeft)}일이 지났어요 🎉 신혼 잘 보내고 계신가요?`;
  }

  // 사용자 일정 조회
  const { data: scheduleItems } = await (supabase as any)
    .from("user_schedule_items")
    .select("title, scheduled_date, completed")
    .eq("user_id", userId);

  const scheduleMap = new Map<string, { completed: boolean }>();
  for (const s of (scheduleItems ?? [])) {
    scheduleMap.set(s.title, { completed: !!s.completed });
  }

  // 현재 시점에 해야 할 항목 = daysBeforeWedding > daysLeft (즉 이미 지났어야 할 것)
  const overdue = CHECKLIST_TEMPLATE.filter((t) => {
    if (t.daysBeforeWedding < daysLeft) return false; // 아직 시기 아님
    const item = scheduleMap.get(t.title);
    return !item || !item.completed;
  });

  // 임박 (앞으로 30일 안에 해야 할 것)
  const upcoming = CHECKLIST_TEMPLATE.filter((t) => {
    if (t.daysBeforeWedding > daysLeft) return false;
    if (t.daysBeforeWedding < daysLeft - 30) return false;
    const item = scheduleMap.get(t.title);
    return !item || !item.completed;
  });

  let result = `**일정 진단 (D-${daysLeft})** ⏰\n\n`;

  if (overdue.length === 0 && upcoming.length === 0) {
    result += "👏 잘 따라오고 계세요! 권장 시기에 맞춰 진행 중입니다.";
  } else {
    if (overdue.length > 0) {
      result += `🔴 **놓친 골든타임 ${overdue.length}건**\n`;
      result += overdue.slice(0, 5).map((t) => `• ${t.title} (D-${t.daysBeforeWedding} 권장)`).join("\n");
      if (overdue.length > 5) result += `\n... 외 ${overdue.length - 5}건`;
      result += "\n\n";
    }
    if (upcoming.length > 0) {
      result += `🟡 **앞으로 30일 내 권장 ${upcoming.length}건**\n`;
      result += upcoming.slice(0, 5).map((t) => `• ${t.title} (D-${t.daysBeforeWedding} 권장)`).join("\n");
      if (upcoming.length > 5) result += `\n... 외 ${upcoming.length - 5}건`;
    }
  }

  result += `\n\n전체 일정은 [일정 페이지](/schedule)에서 관리하실 수 있어요.`;
  return result;
};

// ════════════════════════════════════════════════════════════
// 계약 진척도 — 카테고리별 진행 상황
// ════════════════════════════════════════════════════════════
const CATEGORY_FOR_CONTRACT = [
  { key: "venue", label: "🏛️ 웨딩홀", budgetCat: "venue" },
  { key: "sdm", label: "📸 스드메", budgetCat: "sdm" },
  { key: "ring", label: "💍 예물·반지", budgetCat: "ring" },
  { key: "honeymoon", label: "✈️ 신혼여행", budgetCat: "honeymoon" },
  { key: "house", label: "🏠 가전·혼수", budgetCat: "house" },
];

export const handleContractProgress = async (userId: string): Promise<string> => {
  const { data: items } = await (supabase as any)
    .from("budget_items")
    .select("category, amount, status")
    .eq("user_id", userId);

  const byCategory: Record<string, { total: number; count: number }> = {};
  for (const i of (items ?? [])) {
    if (!byCategory[i.category]) byCategory[i.category] = { total: 0, count: 0 };
    byCategory[i.category].total += i.amount ?? 0;
    byCategory[i.category].count += 1;
  }

  const lines = CATEGORY_FOR_CONTRACT.map((c) => {
    const data = byCategory[c.budgetCat];
    if (!data || data.count === 0) {
      return `${c.label}: ⚪ 시작 전`;
    }
    return `${c.label}: ✅ 진행 중 (${data.count}건 · ${data.total.toLocaleString()}원)`;
  }).join("\n");

  const startedCount = CATEGORY_FOR_CONTRACT.filter(
    (c) => byCategory[c.budgetCat]?.count > 0,
  ).length;
  const total = CATEGORY_FOR_CONTRACT.length;
  const progress = Math.round((startedCount / total) * 100);

  let nextStep = "";
  if (startedCount === 0) {
    nextStep = "\n\n💡 **다음 단계**: 가장 먼저 식장(웨딩홀) 알아보시는 걸 권장해요. 식장이 정해져야 다른 일정이 잡혀요.";
  } else if (!byCategory.venue) {
    nextStep = "\n\n💡 **다음 단계**: 식장이 미정이에요. 가장 우선해서 진행해야 할 항목이에요.";
  } else if (!byCategory.sdm) {
    nextStep = "\n\n💡 **다음 단계**: 스드메는 식장 결정 후 바로 (6~9개월 전) 진행 권장.";
  } else if (!byCategory.honeymoon) {
    nextStep = "\n\n💡 **다음 단계**: 신혼여행 항공권은 4~6개월 전이 특가 시즌이에요.";
  }

  return `**카테고리별 진행 상황** 📋\n진척도 ${progress}% (${startedCount}/${total} 카테고리)\n\n${lines}${nextStep}\n\n자세한 항목은 [예산 페이지](/budget)에서.`;
};

// ════════════════════════════════════════════════════════════
// 체크리스트 완료율
// ════════════════════════════════════════════════════════════
export const handleChecklistProgress = async (userId: string): Promise<string> => {
  const { data, error } = await (supabase as any)
    .from("user_schedule_items")
    .select("completed")
    .eq("user_id", userId);

  if (error || !data || data.length === 0) {
    return "체크리스트가 아직 비어 있어요 📋\n[일정 페이지](/schedule)에서 항목을 추가해주세요.";
  }

  const total = data.length;
  const completed = data.filter((d: any) => d.completed).length;
  const rate = Math.round((completed / total) * 100);

  let badge = "";
  if (rate >= 80) badge = "🌟 거의 완성!";
  else if (rate >= 50) badge = "💪 절반 넘김!";
  else if (rate >= 20) badge = "🌱 시작 단계";
  else badge = "🌿 출발선";

  return `**체크리스트 진행률** ✅\n\n${badge}\n• 완료: ${completed}/${total}건 (${rate}%)\n\n남은 항목은 [일정 페이지](/schedule)에서 확인할 수 있어요.`;
};
