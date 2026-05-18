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
// 종합 활동 요약 (전체 누적) — Dewy 페르소나 적용
//
// 이전 회귀: 12개 카테고리 raw 카운트 나열 (DATA-DUMP). "내 활동 어때?"
// 라고 물어도 의미·다음 액션이 없어서 데이터 페이지 보는 것과 동일했음.
// 페르소나 적용 후:
//  1) D-day·지역·파트너로 한 줄 컨텍스트
//  2) 두드러진 신호 1~2개 인사이트화 (놓친 일정·결정 정체·커플 부재 등)
//  3) 다음 액션 1개 제안
//  4) 전체 카운트는 간결히 끝에
// ────────────────────────────────────────────────────────────
export const handleActivitySummary = async (userId: string): Promise<string> => {
  const c = await fetchCounts(userId);

  const { data: settings } = await (supabase as any)
    .from("user_wedding_settings")
    .select("wedding_date, wedding_date_tbd, wedding_region, partner_name")
    .eq("user_id", userId)
    .maybeSingle();

  const ctx: string[] = [];
  let dday: number | null = null;
  if (settings?.partner_name) ctx.push(` ${settings.partner_name}님과`);
  if (settings?.wedding_date && !settings.wedding_date_tbd) {
    const target = new Date(settings.wedding_date);
    const today = new Date();
    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    dday = Math.round((target.getTime() - today.getTime()) / 86400000);
    if (dday > 0) ctx.push(` D-${dday}`);
    else if (dday === 0) ctx.push(` 오늘이 결혼식!`);
    else ctx.push(` D+${-dday}`);
  }
  if (settings?.wedding_region) ctx.push(` ${settings.wedding_region}`);
  const ctxLine = ctx.length > 0 ? `${ctx.join(" · ")}\n\n` : "";

  // 두드러진 신호 1~2개를 골라 의미 있는 코멘트로 변환.
  const insights: string[] = [];

  if (dday !== null && dday > 0 && dday <= 90 && c.schedule_pending >= 5) {
    insights.push(
      ` **D-${dday}**인데 미완료 일정이 **${c.schedule_pending}건** 남아있어요. 일정 페이지에서 우선순위 정리부터 같이 해볼까요?`,
    );
  } else if (c.schedule_pending >= 10) {
    insights.push(
      ` 미완료 일정이 **${c.schedule_pending}건**이에요. 가까운 일정 3~5개부터 차근차근 처리하시면 부담이 줄어요.`,
    );
  }

  if (c.favorites >= 5 && c.orders === 0 && c.cart === 0) {
    insights.push(
      ` 찜만 **${c.favorites}개** 모이셨네요. 결정에 망설여지신다면 상위 2~3곳만 추려서 비교해드릴까요?`,
    );
  } else if (c.favorites >= 10 && c.cart >= 1) {
    insights.push(
      ` 찜 ${c.favorites}개 · 장바구니 ${c.cart}건 — 슬슬 결정 단계예요. 카테고리별 우선순위 잡아드릴까요?`,
    );
  }

  if (settings?.partner_name && c.diary === 0 && c.votes === 0) {
    insights.push(
      ` ${settings.partner_name}님과 다이어리·투표 활동이 아직 없으시네요. 함께 결정 모드 들어가시면 진척이 훨씬 빨라져요.`,
    );
  }

  if (c.ai_today >= 4) {
    insights.push(
      ` 오늘 챗봇 ${c.ai_today}회 사용 — 열심히 준비하고 계시네요! 무료 한도가 곧 차요. 프리미엄으로 무제한 가능해요.`,
    );
  }

  if (insights.length === 0) {
    if (c.schedule_pending === 0 && c.favorites === 0) {
      insights.push(
        ` 아직 활동 기록이 적네요. 결혼식 일정·예산을 먼저 정해두시면 챗봇이 시기별로 맞춤 추천을 드릴 수 있어요.`,
      );
    } else {
      insights.push(
        ` 잘 진행하고 계세요! 다음 단계가 궁금하시면 "지금 뭐 해야 해?"라고 물어봐 주세요.`,
      );
    }
  }

  // 전체 카운트 — 0인 항목은 생략해 시각적 노이즈 감소.
  const counts = [
    `미완료 일정 ${c.schedule_pending}건`,
    `찜 ${c.favorites}개`,
    c.cart > 0 ? `장바구니 ${c.cart}건` : null,
    c.orders > 0 ? `주문 ${c.orders}건` : null,
    c.fittings > 0 ? `드레스 피팅 ${c.fittings}장` : null,
    c.diary > 0 ? `다이어리 ${c.diary}개` : null,
    c.votes > 0 ? `투표 ${c.votes}건` : null,
    c.posts > 0 ? `글 ${c.posts}개` : null,
    `하트 ${c.hearts}`,
  ].filter(Boolean);

  return `${ctxLine}**나의 활동 요약** 

${insights.slice(0, 2).join("\n\n")}

---
**전체 현황** — ${counts.join(" · ")}
오늘 챗봇 ${c.ai_today}/5회

자세한 내용은 [홈](/home) 또는 [일정 페이지](/schedule)에서 확인하실 수 있어요.`;
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
  if (c.fittings > 0) items.push(` 드레스 피팅 ${c.fittings}장`);
  if (c.orders > 0) items.push(` 주문 ${c.orders}건`);
  if (c.posts > 0) items.push(` 글 작성 ${c.posts}개`);
  if (c.comments > 0) items.push(` 댓글 ${c.comments}개`);
  if (c.diary > 0) items.push(` 다이어리 ${c.diary}개`);
  if (c.votes > 0) items.push(` 투표 ${c.votes}건`);
  if (aiWeek > 0) items.push(` AI 챗봇 ${aiWeek}회`);

  if (items.length === 0) {
    return "이번 주 활동 기록이 없어요 \n오늘부터 시작해보시는 건 어떨까요? 작은 행동도 결혼 준비에 도움이 됩니다.";
  }

  return `**이번 주(최근 7일) 활동** \n\n${items.map((i) => `• ${i}`).join("\n")}\n\n잘하고 계세요! `;
};
