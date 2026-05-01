/**
 * 사용자 활동 핸들러
 * 주문·결제·커뮤니티 활동·AI 사용량·받은 특가 등.
 */

import { supabase } from "@/integrations/supabase/client";

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "결제 대기",
  paid: "결제 완료",
  preparing: "준비 중",
  shipped: "배송 중",
  delivered: "배송 완료",
  cancelled: "취소됨",
};

// ────────────────────────────────────────────────────────────
// 주문 내역
// ────────────────────────────────────────────────────────────
export const handleOrders = async (userId: string): Promise<string> => {
  const { data, error } = await (supabase as any)
    .from("orders")
    .select("order_number, status, total_amount, paid_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error || !data || data.length === 0) {
    return "아직 주문 내역이 없어요 🛍️\n[쇼핑 페이지](/store)에서 마음에 드는 상품을 찾아보세요.";
  }

  const lines = data
    .map((o: any) => {
      const date = o.paid_at || o.created_at;
      const dateStr = new Date(date).toLocaleDateString("ko-KR");
      const statusLabel = ORDER_STATUS_LABEL[o.status] ?? o.status;
      return `• ${o.order_number} — ${(o.total_amount ?? 0).toLocaleString()}원 [${statusLabel}] ${dateStr}`;
    })
    .join("\n");

  return `최근 주문 ${data.length}건이에요 🛍️\n\n${lines}\n\n전체 주문은 [주문 내역](/orders)에서 확인하실 수 있어요.`;
};

// ────────────────────────────────────────────────────────────
// 결제 이력
// ────────────────────────────────────────────────────────────
export const handlePayments = async (userId: string): Promise<string> => {
  // payments 테이블에 user_id가 없으면 orders 통해 join
  const { data: orders } = await (supabase as any)
    .from("orders")
    .select("id")
    .eq("user_id", userId);

  const orderIds = (orders ?? []).map((o: any) => o.id);
  if (orderIds.length === 0) {
    return "결제 내역이 아직 없어요 💳\n주문하시면 여기서 결제 이력을 확인하실 수 있어요.";
  }

  const { data, error } = await (supabase as any)
    .from("payments")
    .select("amount, status, method, approved_at, order_number")
    .in("order_id", orderIds)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error || !data || data.length === 0) {
    return "결제 내역이 아직 없어요 💳";
  }

  const totalPaid = data
    .filter((p: any) => p.status === "approved" || p.status === "paid")
    .reduce((sum: number, p: any) => sum + (p.amount ?? 0), 0);

  const lines = data
    .map((p: any) => {
      const date = p.approved_at
        ? new Date(p.approved_at).toLocaleDateString("ko-KR")
        : "-";
      return `• ${p.order_number} — ${(p.amount ?? 0).toLocaleString()}원 [${p.method ?? "기타"}] ${date}`;
    })
    .join("\n");

  return `최근 결제 ${data.length}건 (누적 ${totalPaid.toLocaleString()}원) 💳\n\n${lines}\n\n자세한 내역은 [주문 내역](/orders)에서 확인하실 수 있어요.`;
};

// ────────────────────────────────────────────────────────────
// 내 커뮤니티 게시글
// ────────────────────────────────────────────────────────────
const POST_CATEGORY_LABEL: Record<string, string> = {
  free: "자유",
  question: "질문",
  review: "후기",
  tip: "팁",
};

export const handleMyPosts = async (userId: string): Promise<string> => {
  const { data, error } = await (supabase as any)
    .from("community_posts")
    .select("title, category, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error || !data || data.length === 0) {
    return "아직 작성하신 커뮤니티 글이 없어요 ✏️\n[커뮤니티](/community)에서 다른 예비신부들과 정보를 나눠보세요.";
  }

  const lines = data
    .map((p: any) => {
      const cat = POST_CATEGORY_LABEL[p.category] ?? p.category;
      const date = new Date(p.created_at).toLocaleDateString("ko-KR");
      return `• [${cat}] ${p.title} — ${date}`;
    })
    .join("\n");

  return `작성하신 커뮤니티 글 ${data.length}개 ✏️\n\n${lines}\n\n전체 글은 [커뮤니티 > 내 활동](/community)에서 확인하실 수 있어요.`;
};

// ────────────────────────────────────────────────────────────
// 내 커뮤니티 댓글
// ────────────────────────────────────────────────────────────
export const handleMyComments = async (userId: string): Promise<string> => {
  const { data, error } = await (supabase as any)
    .from("community_comments")
    .select("content, created_at, post_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error || !data || data.length === 0) {
    return "아직 작성하신 댓글이 없어요 💬";
  }

  const lines = data
    .map((c: any) => {
      const date = new Date(c.created_at).toLocaleDateString("ko-KR");
      const preview = c.content.length > 30 ? c.content.slice(0, 30) + "…" : c.content;
      return `• "${preview}" — ${date}`;
    })
    .join("\n");

  return `최근 작성하신 댓글 ${data.length}개 💬\n\n${lines}`;
};

// ────────────────────────────────────────────────────────────
// AI 사용량 (오늘·이번 주)
// ────────────────────────────────────────────────────────────
export const handleAiUsage = async (userId: string): Promise<string> => {
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];

  const { data, error } = await (supabase as any)
    .from("ai_usage_daily")
    .select("usage_date, message_count")
    .eq("user_id", userId)
    .gte("usage_date", weekAgoStr)
    .order("usage_date", { ascending: false });

  if (error || !data) {
    return "AI 사용 정보를 불러올 수 없어요 🌿";
  }

  const todayCount = data.find((d: any) => d.usage_date === today)?.message_count ?? 0;
  const weekCount = data.reduce((sum: number, d: any) => sum + (d.message_count ?? 0), 0);

  return `**AI 플래너 사용 현황** 🤖\n\n• 오늘: ${todayCount}회 (무료 한도 5회)\n• 최근 7일: ${weekCount}회\n\nPremium 구독 시 무제한 사용 가능해요. [Premium 페이지](/premium)`;
};

// ────────────────────────────────────────────────────────────
// 받은 특가/쿠폰
// ────────────────────────────────────────────────────────────
export const handleDealClaims = async (userId: string): Promise<string> => {
  const { data: claims } = await (supabase as any)
    .from("deal_claims")
    .select("deal_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!claims || claims.length === 0) {
    return "아직 받으신 특가가 없어요 🎁\n[특가 페이지](/deals)에서 진행 중인 혜택을 확인해보세요.";
  }

  // deal 정보 join
  const dealIds = claims.map((c: any) => c.deal_id);
  const { data: deals } = await (supabase as any)
    .from("partner_deals")
    .select("id, description, deal_type, deal_price, discount_info")
    .in("id", dealIds);

  const dealMap = new Map<string, any>();
  for (const d of (deals ?? [])) dealMap.set(d.id, d);

  const lines = claims
    .slice(0, 5)
    .map((c: any) => {
      const d = dealMap.get(c.deal_id);
      const desc = d?.description ?? "(만료된 특가)";
      const date = new Date(c.created_at).toLocaleDateString("ko-KR");
      return `• ${desc} — ${date}`;
    })
    .join("\n");

  return `받으신 특가 ${claims.length}건 🎁\n\n${lines}\n\n쿠폰 사용은 [쿠폰 페이지](/coupons)에서 확인하실 수 있어요.`;
};
