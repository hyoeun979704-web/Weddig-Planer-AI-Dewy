// 운영자 대시보드 데이터 접근 레이어 (Task #3 — console 도메인).
// 패턴: docs/data-access-layer.md. 페이지(AdminDashboard)의 raw supabase 집계를 여기로 모은다.
// React 비의존 순수 함수 → 단위 테스트 가능. React Query 래핑은 hooks/useAdminDashboard.ts.

import { supabase } from "@/integrations/supabase/client";

export interface AdminStats {
  dressTotal: number;
  dressActive: number;
  usersTotal: number;
  usersToday: number;
  usersWeek: number;
  fittingsTotal: number;
  fittingsToday: number;
  heartTxnTotal: number;
  heartEarned: number;
  heartSpent: number;
  pendingWaitlist: number;
  pendingFittings: number;
  pendingContentReview: number; // business_events + business_coupons pending 합산
}

export interface RecentItem {
  id: string;
  type: "fitting" | "heart_purchase" | "heart_spend" | "signup" | "waitlist";
  description: string;
  createdAt: string;
}

export interface FreshnessRow {
  category: string;
  label: string;
  total: number;
  daysSinceMedian: number; // last_collected_at(수집일) 기준 중앙값. 미상은 제외.
  staleCount: number; // 수집일 60일+ 항목
  unknownCount: number; // last_collected_at 이 NULL — 수집일 미상
}

// key 는 반드시 실제 places.category 값과 일치해야 한다(불일치 시 신선도 0건 표시).
// 회귀: "suit" 로 조회했으나 DB 값은 "tailor_shop" → 예복(최다)이 0으로 보였다.
export const PLACE_CATEGORIES: { key: string; label: string }[] = [
  { key: "invitation_venue", label: "상견례·예식장" },
  { key: "wedding_hall", label: "웨딩홀" },
  { key: "studio", label: "스튜디오" },
  { key: "dress_shop", label: "드레스샵" },
  { key: "makeup_shop", label: "메이크업샵" },
  { key: "tailor_shop", label: "예복" },
  { key: "hanbok", label: "한복" },
  { key: "jewelry", label: "예물·반지" },
  { key: "appliance", label: "혼수가전" },
  { key: "honeymoon", label: "허니문" },
];

export const adminDashboardKeys = {
  all: ["admin", "dashboard"] as const,
  stats: () => [...adminDashboardKeys.all, "stats"] as const,
  recent: () => [...adminDashboardKeys.all, "recent"] as const,
  freshness: () => [...adminDashboardKeys.all, "freshness"] as const,
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};
const startOfWeek = () => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
};

/** 대시보드 KPI 집계(가입·콘텐츠·피팅·하트·검토대기). */
export async function fetchAdminStats(): Promise<AdminStats> {
  // 시각 계산은 호출당 1회(매 렌더 새 ISO → 무한루프 회귀 방지는 호출부 책임이었으나
  // 여기로 옮기며 함수 진입당 1회 계산으로 고정).
  const today = startOfToday();
  const weekAgo = startOfWeek();
  const sb = supabase as typeof supabase & {
    from: (t: string) => ReturnType<typeof supabase.from>;
  };

  const [
    dressTotalRes,
    dressActiveRes,
    usersTotalRes,
    usersTodayRes,
    usersWeekRes,
    fittingsTotalRes,
    fittingsTodayRes,
    heartTxnRes,
    waitlistRes,
    pendingFittingsRes,
    pendingEventsRes,
    pendingCouponsRes,
  ] = await Promise.all([
    sb.from("dress_samples").select("id", { count: "exact", head: true }),
    sb.from("dress_samples").select("id", { count: "exact", head: true }).eq("is_active", true),
    sb.from("profiles").select("user_id", { count: "exact", head: true }),
    sb.from("profiles").select("user_id", { count: "exact", head: true }).gte("created_at", today),
    sb.from("profiles").select("user_id", { count: "exact", head: true }).gte("created_at", weekAgo),
    sb.from("dress_fittings").select("id", { count: "exact", head: true }),
    sb.from("dress_fittings").select("id", { count: "exact", head: true }).gte("created_at", today),
    sb.from("heart_transactions").select("amount, reason"),
    sb.from("service_waitlist").select("id", { count: "exact", head: true }).eq("notified", false),
    sb.from("dress_fittings").select("id", { count: "exact", head: true }).eq("status", "pending"),
    sb.from("business_events").select("id", { count: "exact", head: true }).eq("moderation_status", "pending"),
    sb.from("business_coupons").select("id", { count: "exact", head: true }).eq("moderation_status", "pending"),
  ]);

  const txns = (heartTxnRes.data ?? []) as Array<{ amount: number; reason: string }>;
  const heartEarned = txns.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const heartSpent = txns.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  return {
    dressTotal: dressTotalRes.count ?? 0,
    dressActive: dressActiveRes.count ?? 0,
    usersTotal: usersTotalRes.count ?? 0,
    usersToday: usersTodayRes.count ?? 0,
    usersWeek: usersWeekRes.count ?? 0,
    fittingsTotal: fittingsTotalRes.count ?? 0,
    fittingsToday: fittingsTodayRes.count ?? 0,
    heartTxnTotal: txns.length,
    heartEarned,
    heartSpent,
    pendingWaitlist: waitlistRes.count ?? 0,
    pendingFittings: pendingFittingsRes.count ?? 0,
    pendingContentReview: (pendingEventsRes.count ?? 0) + (pendingCouponsRes.count ?? 0),
  };
}

/** 최근 활동(피팅·하트거래·사전알림) 병합 후 시간 역순 상위 10. */
export async function fetchRecentActivity(): Promise<RecentItem[]> {
  const sb = supabase as typeof supabase & {
    from: (t: string) => ReturnType<typeof supabase.from>;
  };
  const [fittingsRes, txnRes, waitlistRes] = await Promise.all([
    sb.from("dress_fittings").select("id, status, created_at").order("created_at", { ascending: false }).limit(5),
    sb.from("heart_transactions").select("id, amount, reason, created_at").order("created_at", { ascending: false }).limit(5),
    sb.from("service_waitlist").select("id, service_id, created_at").order("created_at", { ascending: false }).limit(3),
  ]);

  const activities: RecentItem[] = [];
  ((fittingsRes.data ?? []) as Array<{ id: string; status: string; created_at: string }>).forEach((f) =>
    activities.push({ id: `f-${f.id}`, type: "fitting", description: `드레스 피팅 (${f.status})`, createdAt: f.created_at }),
  );
  ((txnRes.data ?? []) as Array<{ id: string; amount: number; reason: string; created_at: string }>).forEach((t) => {
    const isPurchase = t.reason === "purchase" || t.reason === "first_purchase_bonus";
    activities.push({
      id: `t-${t.id}`,
      type: isPurchase ? "heart_purchase" : "heart_spend",
      description: `하트 ${t.amount > 0 ? `+${t.amount}` : t.amount} (${t.reason})`,
      createdAt: t.created_at,
    });
  });
  ((waitlistRes.data ?? []) as Array<{ id: string; service_id: string; created_at: string }>).forEach((w) =>
    activities.push({ id: `w-${w.id}`, type: "waitlist", description: `사전알림: ${w.service_id}`, createdAt: w.created_at }),
  );

  activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return activities.slice(0, 10);
}

/** places 카테고리별 데이터 신선도(last_collected_at 기준 중앙값·stale·미상 수). */
export async function fetchDataFreshness(): Promise<FreshnessRow[]> {
  const sb = supabase as typeof supabase & {
    from: (t: string) => ReturnType<typeof supabase.from>;
  };
  return Promise.all(
    PLACE_CATEGORIES.map(async (c) => {
      const { data } = await sb
        .from("places")
        .select("last_collected_at")
        .eq("category", c.key)
        .eq("is_active", true);
      const rows = (data ?? []) as Array<{ last_collected_at: string | null }>;
      if (rows.length === 0) {
        return { category: c.key, label: c.label, total: 0, daysSinceMedian: 0, staleCount: 0, unknownCount: 0 };
      }
      const unknown = rows.filter((d) => !d.last_collected_at).length;
      const days = rows
        .filter((d) => d.last_collected_at)
        .map((d) => Math.floor((Date.now() - new Date(d.last_collected_at as string).getTime()) / 86400000))
        .sort((a, b) => a - b);
      const med = days.length > 0 ? days[Math.floor(days.length / 2)] : 0;
      const stale = days.filter((d) => d > 60).length;
      return { category: c.key, label: c.label, total: rows.length, daysSinceMedian: med, staleCount: stale, unknownCount: unknown };
    }),
  );
}
