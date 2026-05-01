/**
 * 활동 요약 핸들러
 * 여러 테이블을 통합해 사용자 현황을 한눈에 보여주는 종합 응답.
 */

import { supabase } from "@/integrations/supabase/client";

interface ActivityCounts {
  fittings: number;
  orders: number;
  posts: number;
  comments: number;
  diary: number;
  votes: number;
  favorites: number;
  cart: number;
  hearts: number;
  schedule_pending: number;
  ai_today: number;
}

const fetchCounts = async (
  userId: string,
  fromDate?: string,
): Promise<ActivityCounts> => {
  const dateFilter = (col: string) => fromDate ? { col, value: fromDate } : null;

  const baseQuery = (table: string, dateCol = "created_at") => {
    let q = (supabase as any)
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    const f = dateFilter(dateCol);
    if (f) q = q.gte(dateCol, f.value);
    return q;
  };

  // couple_link_id 필요한 것
  const { data: link } = await (supabase as any)
    .from("couple_links")
    .select("id")
    .or(`user_id.eq.${userId},partner_user_id.eq.${userId}`)
    .eq("status", "linked")
    .maybeSingle();

  const today = new Date().toISOString().split("T")[0];

  const [
    fittingsRes,
    ordersRes,
    postsRes,
    commentsRes,
    diaryRes,
    votesRes,
    favoritesRes,
    cartRes,
    heartsRes,
    scheduleRes,
    aiTodayRes,
  ] = await Promise.all([
    baseQuery("dress_fittings"),
    baseQuery("orders"),
    baseQuery("community_posts"),
    baseQuery("community_comments"),
    link
      ? (() => {
          let q = (supabase as any)
            .from("couple_diary")
            .select("id", { count: "exact", head: true })
            .eq("couple_link_id", link.id);
          const f = dateFilter("created_at");
          if (f) q = q.gte("created_at", f.value);
          return q;
        })()
      : Promise.resolve({ count: 0 }),
    link
      ? (() => {
          let q = (supabase as any)
            .from("couple_votes")
            .select("id", { count: "exact", head: true })
            .eq("couple_link_id", link.id);
          const f = dateFilter("created_at");
          if (f) q = q.gte("created_at", f.value);
          return q;
        })()
      : Promise.resolve({ count: 0 }),
    baseQuery("favorites"),
    (supabase as any)
      .from("cart_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    (supabase as any)
      .from("user_hearts")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle(),
    (supabase as any)
      .from("user_schedule_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("completed", false)
      .gte("scheduled_date", today),
    (supabase as any)
      .from("ai_usage_daily")
      .select("message_count")
      .eq("user_id", userId)
      .eq("usage_date", today)
      .maybeSingle(),
  ]);

  return {
    fittings: fittingsRes.count ?? 0,
    orders: ordersRes.count ?? 0,
    posts: postsRes.count ?? 0,
    comments: commentsRes.count ?? 0,
    diary: diaryRes.count ?? 0,
    votes: votesRes.count ?? 0,
    favorites: favoritesRes.count ?? 0,
    cart: cartRes.count ?? 0,
    hearts: heartsRes.data?.balance ?? 0,
    schedule_pending: scheduleRes.count ?? 0,
    ai_today: aiTodayRes.data?.message_count ?? 0,
  };
};

// ────────────────────────────────────────────────────────────
// 종합 활동 요약 (전체 누적)
// ────────────────────────────────────────────────────────────
export const handleActivitySummary = async (userId: string): Promise<string> => {
  const c = await fetchCounts(userId);

  // 결혼 정보 + D-day
  const { data: settings } = await (supabase as any)
    .from("user_wedding_settings")
    .select("wedding_date, wedding_date_tbd, wedding_region, partner_name")
    .eq("user_id", userId)
    .maybeSingle();

  const lines: string[] = [];

  if (settings?.partner_name) lines.push(`💑 파트너: ${settings.partner_name}`);
  if (settings?.wedding_date && !settings.wedding_date_tbd) {
    const target = new Date(settings.wedding_date);
    const today = new Date();
    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
    lines.push(`📅 D-${diff}`);
  }
  if (settings?.wedding_region) lines.push(`📍 ${settings.wedding_region}`);

  const baseInfo = lines.length > 0 ? `${lines.join(" · ")}\n\n` : "";

  return `${baseInfo}**나의 활동 요약** 📊\n\n` +
    `📋 **플래닝**\n` +
    `• 미완료 일정: ${c.schedule_pending}건\n` +
    `• 찜한 항목: ${c.favorites}개\n` +
    `• 장바구니: ${c.cart}건\n\n` +
    `💑 **커플**\n` +
    `• 다이어리: ${c.diary}개\n` +
    `• 투표: ${c.votes}건\n\n` +
    `🎨 **AI Studio**\n` +
    `• 드레스 피팅: ${c.fittings}장\n` +
    `• 하트 잔액: ${c.hearts}\n\n` +
    `🛍️ **쇼핑**\n` +
    `• 주문: ${c.orders}건\n\n` +
    `💬 **커뮤니티**\n` +
    `• 작성한 글: ${c.posts}개 / 댓글: ${c.comments}개\n\n` +
    `🤖 **AI 사용**\n` +
    `• 오늘 챗봇: ${c.ai_today}회 (한도 5회)\n\n` +
    `각 항목별 자세한 내용은 해당 페이지에서 확인하실 수 있어요.`;
};

// ────────────────────────────────────────────────────────────
// 이번 주 활동 (지난 7일)
// ────────────────────────────────────────────────────────────
export const handleThisWeek = async (userId: string): Promise<string> => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString();

  const c = await fetchCounts(userId, weekAgoStr);

  // AI 사용량 7일 합계
  const weekAgoDate = weekAgo.toISOString().split("T")[0];
  const { data: aiData } = await (supabase as any)
    .from("ai_usage_daily")
    .select("message_count")
    .eq("user_id", userId)
    .gte("usage_date", weekAgoDate);
  const aiWeek = (aiData ?? []).reduce(
    (sum: number, d: any) => sum + (d.message_count ?? 0),
    0,
  );

  // 활동이 0인 항목은 표시 생략 (간결성)
  const items: string[] = [];
  if (c.fittings > 0) items.push(`🎨 드레스 피팅 ${c.fittings}장`);
  if (c.orders > 0) items.push(`🛍️ 주문 ${c.orders}건`);
  if (c.posts > 0) items.push(`✏️ 글 작성 ${c.posts}개`);
  if (c.comments > 0) items.push(`💬 댓글 ${c.comments}개`);
  if (c.diary > 0) items.push(`📔 다이어리 ${c.diary}개`);
  if (c.votes > 0) items.push(`🗳️ 투표 ${c.votes}건`);
  if (aiWeek > 0) items.push(`🤖 AI 챗봇 ${aiWeek}회`);

  if (items.length === 0) {
    return "이번 주 활동 기록이 없어요 🌿\n오늘부터 시작해보시는 건 어떨까요? 작은 행동도 결혼 준비에 도움이 됩니다.";
  }

  return `**이번 주(최근 7일) 활동** 📊\n\n${items.map((i) => `• ${i}`).join("\n")}\n\n잘하고 계세요! 🎉`;
};
