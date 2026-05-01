/**
 * 챗봇 DB 핸들러
 *
 * intentRouter가 dbHandler를 지정한 경우, 외부 LLM 호출 없이
 * Supabase에서 사용자 데이터를 조회하여 응답을 생성한다.
 *
 * 사용 테이블:
 *  - user_wedding_settings (예식일·지역·파트너명·tbd 플래그)
 *  - budget_settings (total_budget)
 *  - budget_items (지출 항목)
 *  - user_schedule_items (일정·체크리스트)
 *  - favorites (찜)
 *  - cart_items (장바구니)
 *  - user_hearts (AI Studio 하트 잔액)
 *  - user_points (포인트)
 */

import { supabase } from "@/integrations/supabase/client";
import { CHECKLIST_TEMPLATE } from "@/data/checklistTemplate";

export interface DbHandlerContext {
  userId: string;
}

// ════════════════════════════════════════════════════════════
// 디데이
// ════════════════════════════════════════════════════════════
export const handleDday = async (ctx: DbHandlerContext): Promise<string> => {
  const { data, error } = await (supabase as any)
    .from("user_wedding_settings")
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

// ════════════════════════════════════════════════════════════
// 예산 요약
// ════════════════════════════════════════════════════════════
export const handleBudget = async (ctx: DbHandlerContext): Promise<string> => {
  const [settingsRes, itemsRes] = await Promise.all([
    (supabase as any)
      .from("budget_settings")
      .select("total_budget")
      .eq("user_id", ctx.userId)
      .maybeSingle(),
    (supabase as any)
      .from("budget_items")
      .select("category, amount")
      .eq("user_id", ctx.userId),
  ]);

  const totalBudget: number | null = settingsRes.data?.total_budget ?? null;
  const items = (itemsRes.data ?? []) as Array<{ category: string; amount: number }>;

  if (items.length === 0) {
    return totalBudget
      ? `총 예산은 **${totalBudget.toLocaleString()}원**으로 설정되어 있어요 💰\n\n아직 등록된 지출 항목이 없네요. [예산 페이지](/budget)에서 항목을 추가하시면 자세한 분석을 보여드릴 수 있어요.`
      : "예산 정보가 아직 없어요 💰\n[예산 페이지](/budget)에서 총 예산과 항목을 등록해주시면 분석해드릴게요!";
  }

  const totalSpent = items.reduce((sum, i) => sum + (i.amount ?? 0), 0);
  const byCategory = items.reduce<Record<string, number>>((acc, i) => {
    acc[i.category] = (acc[i.category] ?? 0) + (i.amount ?? 0);
    return acc;
  }, {});
  const categoryLines = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([cat, amt]) => `• ${budgetCategoryLabel(cat)}: ${amt.toLocaleString()}원`)
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

const budgetCategoryLabel = (cat: string): string => {
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

// ════════════════════════════════════════════════════════════
// 일정 (오늘 / 다가오는)
// ════════════════════════════════════════════════════════════
export const handleScheduleToday = async (ctx: DbHandlerContext): Promise<string> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data, error } = await (supabase as any)
    .from("user_schedule_items")
    .select("title, scheduled_date, completed")
    .eq("user_id", ctx.userId)
    .gte("scheduled_date", today.toISOString().split("T")[0])
    .lt("scheduled_date", tomorrow.toISOString().split("T")[0])
    .order("scheduled_date", { ascending: true });

  if (error || !data || data.length === 0) {
    return "오늘 예정된 일정이 없어요 ✨\n여유 있는 하루 되세요. 결혼 준비 외에도 신부님 자신을 위한 시간 가지시면 좋을 것 같아요 🌿";
  }

  const completed = data.filter((d: any) => d.completed).length;
  const remaining = data.filter((d: any) => !d.completed);
  const lines = remaining.slice(0, 5).map((d: any) => `• ${d.title}`).join("\n");

  return `오늘 예정된 일정 ${data.length}건이 있어요 📅 (완료 ${completed}건)\n\n${lines || "모두 완료하셨네요! 🎉"}\n\n전체 일정은 [일정 페이지](/schedule)에서 확인하실 수 있어요.`;
};

export const handleScheduleUpcoming = async (ctx: DbHandlerContext): Promise<string> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekLater = new Date(today);
  weekLater.setDate(weekLater.getDate() + 7);

  const { data, error } = await (supabase as any)
    .from("user_schedule_items")
    .select("title, scheduled_date, completed")
    .eq("user_id", ctx.userId)
    .gte("scheduled_date", today.toISOString().split("T")[0])
    .lte("scheduled_date", weekLater.toISOString().split("T")[0])
    .eq("completed", false)
    .order("scheduled_date", { ascending: true })
    .limit(10);

  if (error || !data || data.length === 0) {
    return "앞으로 7일 이내 예정된 일정이 없어요 🌿\n여유 있는 시간이지만, 1~2개월 후 해야 할 일을 미리 점검해보시는 것도 좋아요. '체크리스트 만들어줘' 라고 물어보시면 시기별 가이드를 드릴게요!";
  }

  const lines = data
    .map((d: any) => {
      const date = new Date(d.scheduled_date);
      return `• ${date.getMonth() + 1}/${date.getDate()} — ${d.title}`;
    })
    .join("\n");

  return `앞으로 7일 이내 ${data.length}건의 일정이 있어요 📅\n\n${lines}\n\n전체 일정은 [일정 페이지](/schedule)에서 확인하실 수 있어요.`;
};

// ════════════════════════════════════════════════════════════
// 시기별 체크리스트
// ════════════════════════════════════════════════════════════
export const handleChecklist = async (
  ctx: DbHandlerContext,
  userMessage: string,
): Promise<string> => {
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

  if (!targetDays) {
    const { data } = await (supabase as any)
      .from("user_wedding_settings")
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
      targetDays = 180;
      label = "6개월 전 (기본)";
    }
  }

  const tasks = CHECKLIST_TEMPLATE.filter(
    (t) => Math.abs(t.daysBeforeWedding - targetDays!) <= 30,
  ).slice(0, 8);

  if (tasks.length === 0) {
    return `**${label}** 기준으로 추천할 만한 표준 체크리스트가 없네요.\n\n자세한 시기별 가이드는 [일정 페이지](/schedule)에서 확인하실 수 있어요.`;
  }

  const lines = tasks.map((t) => `• ${t.title}`).join("\n");
  return `**${label}** 권장 체크리스트예요 📋\n\n${lines}\n\n전체 일정은 [일정 페이지](/schedule)에서 관리하실 수 있어요.`;
};

// ════════════════════════════════════════════════════════════
// 찜 목록 (favorites)
// ════════════════════════════════════════════════════════════
export const handleFavorites = async (ctx: DbHandlerContext): Promise<string> => {
  const { data, error } = await (supabase as any)
    .from("favorites")
    .select("item_type")
    .eq("user_id", ctx.userId);

  if (error || !data || data.length === 0) {
    return "아직 찜한 항목이 없어요 💗\n\n식장·스튜디오·드레스 페이지에서 마음에 드는 곳을 ❤️ 아이콘으로 찜해두시면, 나중에 [즐겨찾기 페이지](/favorites)에서 한 번에 모아 보실 수 있어요.";
  }

  const byType: Record<string, number> = {};
  for (const f of data as Array<{ item_type: string }>) {
    byType[f.item_type] = (byType[f.item_type] ?? 0) + 1;
  }
  const lines = Object.entries(byType)
    .map(([type, count]) => `• ${itemTypeLabel(type)}: ${count}개`)
    .join("\n");

  return `현재 **${data.length}개**의 항목을 찜하고 계세요 💗\n\n**카테고리별**\n${lines}\n\n전체 목록은 [즐겨찾기 페이지](/favorites)에서 확인하실 수 있어요.`;
};

const itemTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    venue: "웨딩홀",
    studio: "스튜디오",
    dress: "드레스",
    makeup: "메이크업",
    hanbok: "한복",
    suit: "예복",
    honeymoon: "신혼여행",
    appliance: "가전·혼수",
    influencer: "인플루언서",
    deal: "특가",
    product: "상품",
  };
  return labels[type] ?? type;
};

// ════════════════════════════════════════════════════════════
// 장바구니 (cart)
// ════════════════════════════════════════════════════════════
export const handleCart = async (ctx: DbHandlerContext): Promise<string> => {
  const { data, error } = await (supabase as any)
    .from("cart_items")
    .select("quantity, product_id")
    .eq("user_id", ctx.userId);

  if (error || !data || data.length === 0) {
    return "장바구니가 비어 있어요 🛒\n\n[쇼핑 페이지](/store)에서 마음에 드는 상품을 담아두시면 한 번에 결제하실 수 있어요.";
  }

  const totalQty = data.reduce((sum: number, c: any) => sum + (c.quantity ?? 0), 0);
  const uniqueProducts = data.length;

  return `장바구니에 **${uniqueProducts}종 (총 ${totalQty}개)** 상품이 담겨 있어요 🛒\n\n자세한 항목·가격은 [장바구니 페이지](/cart)에서 확인 후 결제하실 수 있어요.`;
};

// ════════════════════════════════════════════════════════════
// 지역 정보 (wedding_region)
// ════════════════════════════════════════════════════════════
export const handleRegion = async (ctx: DbHandlerContext): Promise<string> => {
  const { data, error } = await (supabase as any)
    .from("user_wedding_settings")
    .select("wedding_region, wedding_region_tbd")
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (error || !data) {
    return "지역 정보가 아직 없어요 📍\n마이페이지 > 결혼 정보 설정에서 결혼 예정 지역을 등록해주시면 그 지역의 식장·업체를 추천해드릴 수 있어요.";
  }
  if (data.wedding_region_tbd || !data.wedding_region) {
    return "결혼 예정 지역이 미정으로 설정되어 있어요 🌿\n지역이 정해지시면 마이페이지에서 업데이트해주세요. 그러면 그 지역 평균 시세·식장·스튜디오를 맞춤 추천해드릴게요.";
  }

  // 같은 지역의 식장·스튜디오 수 조회 (있다면)
  const venueCount = await (supabase as any)
    .from("venues")
    .select("id", { count: "exact", head: true })
    .ilike("address", `%${data.wedding_region}%`);

  const venueLine = (venueCount.count ?? 0) > 0
    ? `\n\n${data.wedding_region} 지역에 등록된 웨딩홀이 **${venueCount.count}곳** 있어요. [웨딩홀 페이지](/venues)에서 확인해보세요!`
    : "";

  return `결혼 예정 지역은 **${data.wedding_region}** 이에요 📍${venueLine}\n\n다른 지역으로 변경하시려면 마이페이지 > 결혼 정보 설정에서 수정하실 수 있어요.`;
};

// ════════════════════════════════════════════════════════════
// 하트 잔액 (AI Studio)
// ════════════════════════════════════════════════════════════
export const handleHearts = async (ctx: DbHandlerContext): Promise<string> => {
  const { data, error } = await (supabase as any)
    .from("user_hearts")
    .select("balance, total_earned, total_spent")
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (error || !data) {
    return "하트 정보를 불러올 수 없어요 💗\n[AI 스튜디오](/ai-studio) 첫 진입 시 5 하트가 자동 적립됩니다.";
  }

  const balance = data.balance ?? 0;
  let message = `현재 하트 잔액은 **${balance}개** 예요 💗\n\n`;
  message += `• 누적 적립: ${(data.total_earned ?? 0).toLocaleString()}개\n`;
  message += `• 누적 사용: ${(data.total_spent ?? 0).toLocaleString()}개\n\n`;

  if (balance >= 5) {
    message += "AI 드레스 피팅 한 장(5 하트) 가능해요. [AI 스튜디오](/ai-studio)에서 시작해보세요!";
  } else if (balance >= 2) {
    message += `AI 드레스 피팅(5 하트)에는 ${5 - balance}개가 부족해요. [충전](/points)도 가능해요.`;
  } else {
    message += "하트가 거의 없어요. [충전 페이지](/points)에서 1,900원부터 충전 가능합니다.";
  }
  return message;
};

// ════════════════════════════════════════════════════════════
// 포인트 잔액
// ════════════════════════════════════════════════════════════
export const handlePoints = async (ctx: DbHandlerContext): Promise<string> => {
  const { data, error } = await (supabase as any)
    .from("user_points")
    .select("total_points")
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (error || !data) {
    return "포인트 정보가 아직 없어요 ✨\n앱을 사용하시면서 자동으로 적립되는 포인트는 [포인트 페이지](/points)에서 확인하실 수 있어요.";
  }

  const points = data.total_points ?? 0;
  if (points === 0) {
    return "현재 적립된 포인트가 0점이에요 ✨\n앱을 사용하시거나 결제하시면 포인트가 적립돼요. [포인트 페이지](/points)에서 자세히 확인하실 수 있어요.";
  }
  return `현재 보유 포인트는 **${points.toLocaleString()}점** 이에요 ✨\n\n결제 시 사용하실 수 있고, [포인트 페이지](/points)에서 사용 내역도 확인하실 수 있어요.`;
};

// ════════════════════════════════════════════════════════════
// 결혼 정보 종합 요약
// ════════════════════════════════════════════════════════════
export const handleWeddingInfo = async (ctx: DbHandlerContext): Promise<string> => {
  const { data, error } = await (supabase as any)
    .from("user_wedding_settings")
    .select("wedding_date, wedding_date_tbd, wedding_region, wedding_region_tbd, partner_name, planning_stage")
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (error || !data) {
    return "결혼 정보가 아직 없어요 💍\n마이페이지에서 예식일·지역·파트너 정보를 등록해주시면 맞춤 가이드를 드릴 수 있어요.";
  }

  const lines: string[] = [];
  if (data.partner_name) lines.push(`💑 파트너: ${data.partner_name}`);

  if (data.wedding_date && !data.wedding_date_tbd) {
    const target = new Date(data.wedding_date);
    const today = new Date();
    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
    lines.push(`📅 예식일: ${target.toLocaleDateString("ko-KR")} (D-${diff})`);
  } else {
    lines.push("📅 예식일: 미정");
  }

  if (data.wedding_region && !data.wedding_region_tbd) {
    lines.push(`📍 지역: ${data.wedding_region}`);
  } else {
    lines.push("📍 지역: 미정");
  }

  if (data.planning_stage) {
    lines.push(`🌿 준비 단계: ${planningStageLabel(data.planning_stage)}`);
  }

  return `**신부님의 결혼 정보**\n\n${lines.join("\n")}\n\n수정은 마이페이지 > 결혼 정보 설정에서 가능해요.`;
};

const planningStageLabel = (stage: string): string => {
  const labels: Record<string, string> = {
    just_started: "이제 막 시작",
    researching: "정보 알아보는 중",
    contracting: "일부 업체 계약",
    finalizing: "마무리 단계",
  };
  return labels[stage] ?? stage;
};

// ════════════════════════════════════════════════════════════
// 핸들러 라우터
// ════════════════════════════════════════════════════════════
export type DbHandlerKey =
  | "dday"
  | "budget"
  | "schedule_today"
  | "schedule_upcoming"
  | "checklist"
  | "favorites"
  | "cart"
  | "region"
  | "hearts"
  | "points"
  | "wedding_info";

export const runDbHandler = async (
  handler: DbHandlerKey,
  ctx: DbHandlerContext,
  userMessage: string,
): Promise<string> => {
  switch (handler) {
    case "dday": return handleDday(ctx);
    case "budget": return handleBudget(ctx);
    case "schedule_today": return handleScheduleToday(ctx);
    case "schedule_upcoming": return handleScheduleUpcoming(ctx);
    case "checklist": return handleChecklist(ctx, userMessage);
    case "favorites": return handleFavorites(ctx);
    case "cart": return handleCart(ctx);
    case "region": return handleRegion(ctx);
    case "hearts": return handleHearts(ctx);
    case "points": return handlePoints(ctx);
    case "wedding_info": return handleWeddingInfo(ctx);
    default: return "요청을 처리할 수 없어요. 다시 한 번 말씀해주시겠어요?";
  }
};
