/**
 * AI Studio·구독 관련 핸들러
 * Premium 구독 상태·드레스 피팅 기록·하트 거래 이력.
 */

import { supabase } from "@/integrations/supabase/client";

const FITTING_STATUS_LABEL: Record<string, string> = {
  pending: "생성 중",
  done: "완료",
  failed: "실패",
  refunded: "환불됨",
};

const HEART_REASON_LABEL: Record<string, string> = {
  signup_bonus: "가입 보너스",
  signup_bonus_backfill: "가입 보너스 (소급)",
  purchase: "충전",
  first_purchase_bonus: "첫 구매 보너스",
  dress_fitting: "드레스 피팅",
  refund_failed_generation: "생성 실패 환불",
  share_bonus: "공유 보너스",
  invite_bonus: "친구 초대",
  daily_attendance: "출석 보너스",
  manual_adjust: "수동 조정",
};

// ────────────────────────────────────────────────────────────
// 구독 상태
// ────────────────────────────────────────────────────────────
export const handleSubscriptionStatus = async (userId: string): Promise<string> => {
  const { data, error } = await (supabase as any)
    .from("subscriptions")
    .select("plan, status, expires_at, trial_ends_at, cancelled_at, payment_method")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return "현재 무료 플랜이에요 🌿\n\n[Premium 페이지](/premium)에서 무제한 AI 플래너·견적서·예산 리포트 기능을 이용하실 수 있어요.";
  }

  const now = new Date();
  const isTrialActive = data.trial_ends_at && new Date(data.trial_ends_at) > now;
  const isPaidActive = data.status === "active" && data.expires_at && new Date(data.expires_at) > now;
  const isCancelled = !!data.cancelled_at;

  if (data.plan === "free" || (!isTrialActive && !isPaidActive)) {
    return "현재 무료 플랜이에요 🌿\n\n[Premium 페이지](/premium)에서 더 풍부한 기능을 이용하실 수 있어요.";
  }

  const expiresStr = data.expires_at
    ? new Date(data.expires_at).toLocaleDateString("ko-KR")
    : null;
  const trialStr = data.trial_ends_at
    ? new Date(data.trial_ends_at).toLocaleDateString("ko-KR")
    : null;

  let result = `**Premium ${isTrialActive ? "체험" : "구독"} 활성** ✨\n\n`;
  if (isTrialActive) result += `• 체험 기간: ~${trialStr}\n`;
  if (expiresStr) result += `• 만료일: ${expiresStr}\n`;
  if (data.payment_method) result += `• 결제 수단: ${data.payment_method}\n`;
  if (isCancelled) result += `\n⚠️ 자동 갱신 해지됨 — 만료일 이후 무료 플랜으로 전환됩니다.`;
  else result += `\n매월 자동 갱신 중이에요. [구독 관리](/premium)에서 변경 가능합니다.`;

  return result;
};

// ────────────────────────────────────────────────────────────
// 드레스 피팅 기록
// ────────────────────────────────────────────────────────────
export const handleDressFittingHistory = async (userId: string): Promise<string> => {
  const { data, error } = await (supabase as any)
    .from("dress_fittings")
    .select("status, hearts_spent, created_at, error_message")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !data || data.length === 0) {
    return "아직 생성하신 드레스 피팅이 없어요 👗\n\n[방구석 드레스 투어](/ai-studio/dress-tour)에서 첫 피팅을 시작해보세요. 신규 가입 5 하트로 한 장 무료 체험이 가능해요.";
  }

  const done = data.filter((d: any) => d.status === "done").length;
  const failed = data.filter((d: any) => d.status === "failed").length;
  const pending = data.filter((d: any) => d.status === "pending").length;
  const totalHearts = data.reduce((sum: number, d: any) => sum + (d.hearts_spent ?? 0), 0);

  let result = `**드레스 피팅 기록** 👗\n\n`;
  result += `• 총 생성: ${data.length}장 (성공 ${done} · 실패 ${failed} · 진행 중 ${pending})\n`;
  result += `• 총 사용 하트: ${totalHearts}\n\n`;

  const recent = data.slice(0, 5);
  result += `**최근 5건**\n`;
  result += recent
    .map((d: any) => {
      const date = new Date(d.created_at).toLocaleDateString("ko-KR");
      const status = FITTING_STATUS_LABEL[d.status] ?? d.status;
      return `• ${date} [${status}]`;
    })
    .join("\n");

  result += `\n\n전체 기록은 [드레스 갤러리](/ai-studio/dress-tour/gallery)에서 확인하실 수 있어요.`;
  return result;
};

// ────────────────────────────────────────────────────────────
// 하트 거래 이력
// ────────────────────────────────────────────────────────────
export const handleHeartHistory = async (userId: string): Promise<string> => {
  const { data, error } = await (supabase as any)
    .from("heart_transactions")
    .select("amount, reason, balance_after, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !data || data.length === 0) {
    return "하트 거래 내역이 없어요 💗\n[AI 스튜디오](/ai-studio) 첫 진입 시 5 하트가 자동 적립됩니다.";
  }

  const earned = data
    .filter((t: any) => t.amount > 0)
    .reduce((sum: number, t: any) => sum + t.amount, 0);
  const spent = data
    .filter((t: any) => t.amount < 0)
    .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);

  const lines = data.slice(0, 8).map((t: any) => {
    const date = new Date(t.created_at).toLocaleDateString("ko-KR");
    const amtStr = t.amount > 0 ? `+${t.amount}` : `${t.amount}`;
    const reason = HEART_REASON_LABEL[t.reason] ?? t.reason;
    return `• ${date} ${amtStr} (${reason}) → ${t.balance_after}`;
  }).join("\n");

  return `**최근 하트 거래 ${data.length}건** 💗\n적립 +${earned} / 사용 ${spent}\n\n${lines}`;
};
