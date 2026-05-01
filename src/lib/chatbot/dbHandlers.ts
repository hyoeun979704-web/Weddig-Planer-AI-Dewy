/**
 * 챗봇 DB 핸들러
 *
 * intentRouter가 dbHandler를 지정한 경우, 외부 LLM 호출 없이
 * Supabase에서 사용자 데이터를 조회하여 응답을 생성한다.
 */

import { supabase } from "@/integrations/supabase/client";
import { CHECKLIST_TEMPLATE } from "@/data/checklistTemplate";

export interface DbHandlerContext {
  userId: string;
}

/**
 * 디데이 조회: wedding_settings 또는 user_metadata에서 wedding_date 가져와
 * 오늘 기준 D-day 또는 D+day 계산.
 */
export const handleDday = async (ctx: DbHandlerContext): Promise<string> => {
  const { data, error } = await (supabase as any)
    .from("wedding_settings")
    .select("wedding_date, wedding_date_tbd")
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (error || !data) {
    return "예식일 정보가 없어요 📅\n마이페이지 > 결혼 정보 설정에서 예식일을 등록해주시면 디데이를 알려드릴게요!";
  }

  if (data.wedding_date_tbd || !data.wedding_date) {
    return "예식일이 아직 미정으로 설정되어 있어요 🌿\n예식일이 잡히시면 마이페이지 > 결혼 정보 설정에서 업데이트해주세요. 그러면 정확한 디데이와 시기별 체크리스트를 알려드릴 수 있어요.";
  }

  const target = new Date(data.wedding_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  const dateStr = target.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  if (diffDays > 0) {
    return `예식일까지 **D-${diffDays}** 남았어요 💍\n\n📅 ${dateStr}\n\n${diffDayGuide(diffDays)}`;
  }
  if (diffDays === 0) {
    return `오늘이 결혼식 당일이에요! 🎉\n\n${dateStr}\n\n신부님, 오늘 정말 멋지실 거예요. 마음 편하게 즐기세요 🌸💍`;
  }
  return `결혼하신 지 **${Math.abs(diffDays)}일**이 됐어요 🎉\n신혼 잘 보내고 계신가요? 추억 가득한 시간 되세요 🌸`;
};

const diffDayGuide = (days: number): string => {
  if (days <= 30) return "✨ 한 달 이내! 본식 리허설·예복 가봉·축의금 봉투 준비를 챙기실 때예요.";
  if (days <= 90) return "📸 3개월 이내! 본식 스냅 결정·청첩장 발송·헤어메이크업 시연 시점이에요.";
  if (days <= 180) return "🏛️ 6개월 이내! 식장·스드메 계약 마무리·신혼여행 예약 권장 시기예요.";
  if (days <= 365) return "💐 1년 이내! 식장 답사·예산 합의·기본 업체 알아보실 시기예요.";
  return "🌿 여유 있게 준비할 수 있어요. 양가 인사·결혼식 비전 정하시는 단계예요.";
};

/**
 * 예산 요약: budget_items 합계 + 카테고리별 사용량
 */
export const handleBudget = async (ctx: DbHandlerContext): Promise<string> => {
  const [settingsRes, itemsRes] = await Promise.all([
    (supabase as any)
      .from("wedding_settings")
      .select("total_budget")
      .eq("user_id", ctx.userId)
      .maybeSingle(),
    (supabase as any)
      .from("budget_items")
      .select("category, amount, status")
      .eq("user_id", ctx.userId),
  ]);

  const totalBudget: number | null = settingsRes.data?.total_budget ?? null;
  const items = (itemsRes.data ?? []) as Array<{ category: string; amount: number; status?: string }>;

  if (items.length === 0) {
    return totalBudget
      ? `총 예산은 **${totalBudget.toLocaleString()}원**으로 설정되어 있어요 💰\n\n아직 등록된 지출 항목이 없네요. 예산 페이지에서 항목을 추가하시면 자세한 분석을 보여드릴 수 있어요.`
      : "예산 정보가 아직 없어요 💰\n예산 페이지에서 총 예산과 항목을 등록해주시면 분석해드릴게요!";
  }

  const totalSpent = items.reduce((sum, i) => sum + (i.amount ?? 0), 0);

  // 카테고리별 합계
  const byCategory = items.reduce<Record<string, number>>((acc, i) => {
    acc[i.category] = (acc[i.category] ?? 0) + (i.amount ?? 0);
    return acc;
  }, {});
  const categoryLines = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([cat, amt]) => `• ${categoryLabel(cat)}: ${amt.toLocaleString()}원`)
    .join("\n");

  let header = `현재 등록된 지출 합계는 **${totalSpent.toLocaleString()}원**이에요 💰`;
  if (totalBudget) {
    const ratio = Math.round((totalSpent / totalBudget) * 100);
    header += `\n총 예산 ${totalBudget.toLocaleString()}원 대비 **${ratio}%** 사용 중`;
    if (ratio >= 90) header += " ⚠️";
    else if (ratio >= 70) header += " 🟡";
  }

  return `${header}\n\n**카테고리별 지출 (상위 6)**\n${categoryLines}\n\n자세한 항목과 추이는 [예산 페이지](/budget)에서 확인하실 수 있어요.`;
};

const categoryLabel = (cat: string): string => {
  const labels: Record<string, string> = {
    venue: "베뉴 (식장)",
    sdm: "스드메",
    ring: "예물·반지",
    house: "신혼집·가전",
    honeymoon: "신혼여행",
    etc: "기타",
  };
  return labels[cat] ?? cat;
};

/**
 * 오늘 일정 조회
 */
export const handleScheduleToday = async (ctx: DbHandlerContext): Promise<string> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data, error } = await (supabase as any)
    .from("user_schedule_items")
    .select("title, scheduled_date, is_completed")
    .eq("user_id", ctx.userId)
    .gte("scheduled_date", today.toISOString().split("T")[0])
    .lt("scheduled_date", tomorrow.toISOString().split("T")[0])
    .order("scheduled_date", { ascending: true });

  if (error || !data || data.length === 0) {
    return "오늘 예정된 일정이 없어요 ✨\n여유 있는 하루 되세요. 결혼 준비 외에도 신부님 자신을 위한 시간 가지시면 좋을 것 같아요 🌿";
  }

  const completed = data.filter((d: any) => d.is_completed).length;
  const remaining = data.filter((d: any) => !d.is_completed);
  const lines = remaining.slice(0, 5).map((d: any) => `• ${d.title}`).join("\n");

  return `오늘 예정된 일정 ${data.length}건이 있어요 📅 (완료 ${completed}건)\n\n${lines || "모두 완료하셨네요! 🎉"}\n\n전체 일정은 [일정 페이지](/schedule)에서 확인하실 수 있어요.`;
};

/**
 * 다가오는 일정 조회 (앞으로 7일)
 */
export const handleScheduleUpcoming = async (ctx: DbHandlerContext): Promise<string> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekLater = new Date(today);
  weekLater.setDate(weekLater.getDate() + 7);

  const { data, error } = await (supabase as any)
    .from("user_schedule_items")
    .select("title, scheduled_date, is_completed")
    .eq("user_id", ctx.userId)
    .gte("scheduled_date", today.toISOString().split("T")[0])
    .lte("scheduled_date", weekLater.toISOString().split("T")[0])
    .eq("is_completed", false)
    .order("scheduled_date", { ascending: true })
    .limit(10);

  if (error || !data || data.length === 0) {
    return "앞으로 7일 이내 예정된 일정이 없어요 🌿\n여유 있는 시간이지만, 1~2개월 후 해야 할 일을 미리 점검해보시는 것도 좋아요. '체크리스트 만들어줘' 라고 물어보시면 시기별 가이드를 드릴게요!";
  }

  const lines = data
    .map((d: any) => {
      const date = new Date(d.scheduled_date);
      const m = date.getMonth() + 1;
      const day = date.getDate();
      return `• ${m}/${day} — ${d.title}`;
    })
    .join("\n");

  return `앞으로 7일 이내 ${data.length}건의 일정이 있어요 📅\n\n${lines}\n\n전체 일정은 [일정 페이지](/schedule)에서 확인하실 수 있어요.`;
};

/**
 * 시기별 체크리스트
 * 사용자 메시지에서 "N개월 전" / "N주 전" 추출 후 해당 구간 항목 반환.
 * 예식일이 있으면 D-day 기준, 없으면 사용자가 명시한 시기 기준.
 */
export const handleChecklist = async (
  ctx: DbHandlerContext,
  userMessage: string,
): Promise<string> => {
  // 메시지에서 시기 추출
  const monthMatch = userMessage.match(/(\d+)\s*개월/);
  const weekMatch = userMessage.match(/(\d+)\s*주/);

  let targetDays: number | null = null;
  let label = "";
  if (monthMatch) {
    targetDays = parseInt(monthMatch[1]) * 30;
    label = `${monthMatch[1]}개월 전`;
  } else if (weekMatch) {
    targetDays = parseInt(weekMatch[1]) * 7;
    label = `${weekMatch[1]}주 전`;
  }

  // 시기 명시 없으면 예식일 기준 현재 위치 계산
  if (!targetDays) {
    const { data } = await (supabase as any)
      .from("wedding_settings")
      .select("wedding_date, wedding_date_tbd")
      .eq("user_id", ctx.userId)
      .maybeSingle();

    if (data?.wedding_date && !data.wedding_date_tbd) {
      const target = new Date(data.wedding_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      target.setHours(0, 0, 0, 0);
      targetDays = Math.round((target.getTime() - today.getTime()) / 86400000);
      label = `현재 (D-${targetDays})`;
    } else {
      // 기본: 6개월 전 가이드
      targetDays = 180;
      label = "6개월 전 (기본)";
    }
  }

  // CHECKLIST_TEMPLATE에서 ±15일 윈도우 안의 항목 추출
  const tasks = CHECKLIST_TEMPLATE.filter(
    (t) => Math.abs(t.daysBeforeWedding - targetDays!) <= 30,
  ).slice(0, 8);

  if (tasks.length === 0) {
    return `**${label}** 기준으로 추천할 만한 표준 체크리스트가 없네요.\n\n기본 가이드:\n• 양가 인사·결혼식 비전 합의\n• 식장·스드메 정보 수집\n• 예산 항목별 분배 합의\n\n자세한 시기별 가이드는 [일정 페이지](/schedule)에서 확인하실 수 있어요.`;
  }

  const lines = tasks.map((t) => `• ${t.title}`).join("\n");
  return `**${label}** 권장 체크리스트예요 📋\n\n${lines}\n\n전체 일정은 [일정 페이지](/schedule)에서 관리하실 수 있어요.`;
};

/**
 * 핸들러 라우터 — intent의 dbHandler에 따라 적절한 함수 호출
 */
export const runDbHandler = async (
  handler: NonNullable<import("./intentRouter").IntentMatch["dbHandler"]>,
  ctx: DbHandlerContext,
  userMessage: string,
): Promise<string> => {
  switch (handler) {
    case "dday":
      return handleDday(ctx);
    case "budget":
      return handleBudget(ctx);
    case "schedule_today":
      return handleScheduleToday(ctx);
    case "schedule_upcoming":
      return handleScheduleUpcoming(ctx);
    case "checklist":
      return handleChecklist(ctx, userMessage);
    default:
      return "요청을 처리할 수 없어요. 다시 한 번 말씀해주시겠어요?";
  }
};
