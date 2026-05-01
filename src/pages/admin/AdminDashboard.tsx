import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Shirt,
  Users,
  Heart,
  Image as ImageIcon,
  ChevronRight,
  Sparkles,
  Bell,
  CreditCard,
  TrendingUp,
  AlertCircle,
  Plus,
  Clock,
  type LucideIcon,
} from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Stats {
  // 콘텐츠
  dressTotal: number;
  dressActive: number;
  // 사용자
  usersTotal: number;
  usersToday: number;
  usersWeek: number;
  // 운영
  fittingsTotal: number;
  fittingsToday: number;
  // 매출
  heartTxnTotal: number;
  heartEarned: number;
  heartSpent: number;
  // 알림
  pendingWaitlist: number;
  pendingFittings: number;
}

interface RecentItem {
  id: string;
  type: "fitting" | "heart_purchase" | "heart_spend" | "signup" | "waitlist";
  description: string;
  createdAt: string;
}

interface FreshnessRow {
  category: string;
  label: string;
  total: number;
  daysSinceMedian: number;
  staleCount: number; // 60일+ 안 된 항목
}

const PLACE_CATEGORIES = [
  { key: "wedding_hall", label: "웨딩홀" },
  { key: "studio", label: "스튜디오" },
  { key: "dress_shop", label: "드레스샵" },
  { key: "makeup_shop", label: "메이크업샵" },
  { key: "honeymoon", label: "신혼여행" },
  { key: "hanbok", label: "한복" },
  { key: "suit", label: "예복" },
  { key: "jewelry", label: "예물·반지" },
];

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

const formatRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR");
};

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [freshness, setFreshness] = useState<FreshnessRow[]>([]);
  const today = startOfToday();
  const weekAgo = startOfWeek();

  useEffect(() => {
    const fetchAll = async () => {
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
        recentFittingsRes,
        recentTxnRes,
        recentWaitlistRes,
      ] = await Promise.all([
        (supabase as any).from("dress_samples").select("id", { count: "exact", head: true }),
        (supabase as any)
          .from("dress_samples")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),
        (supabase as any).from("profiles").select("user_id", { count: "exact", head: true }),
        (supabase as any)
          .from("profiles")
          .select("user_id", { count: "exact", head: true })
          .gte("created_at", today),
        (supabase as any)
          .from("profiles")
          .select("user_id", { count: "exact", head: true })
          .gte("created_at", weekAgo),
        (supabase as any).from("dress_fittings").select("id", { count: "exact", head: true }),
        (supabase as any)
          .from("dress_fittings")
          .select("id", { count: "exact", head: true })
          .gte("created_at", today),
        (supabase as any).from("heart_transactions").select("amount, reason"),
        (supabase as any)
          .from("service_waitlist")
          .select("id", { count: "exact", head: true })
          .eq("notified", false),
        (supabase as any)
          .from("dress_fittings")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        (supabase as any)
          .from("dress_fittings")
          .select("id, status, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        (supabase as any)
          .from("heart_transactions")
          .select("id, amount, reason, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        (supabase as any)
          .from("service_waitlist")
          .select("id, service_id, created_at")
          .order("created_at", { ascending: false })
          .limit(3),
      ]);

      // 하트 거래 요약
      const txns = (heartTxnRes.data ?? []) as Array<{ amount: number; reason: string }>;
      const heartTxnTotal = txns.length;
      const heartEarned = txns.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
      const heartSpent = txns
        .filter((t) => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      setStats({
        dressTotal: dressTotalRes.count ?? 0,
        dressActive: dressActiveRes.count ?? 0,
        usersTotal: usersTotalRes.count ?? 0,
        usersToday: usersTodayRes.count ?? 0,
        usersWeek: usersWeekRes.count ?? 0,
        fittingsTotal: fittingsTotalRes.count ?? 0,
        fittingsToday: fittingsTodayRes.count ?? 0,
        heartTxnTotal,
        heartEarned,
        heartSpent,
        pendingWaitlist: waitlistRes.count ?? 0,
        pendingFittings: pendingFittingsRes.count ?? 0,
      });

      // 최근 활동 합치기
      const activities: RecentItem[] = [];
      (recentFittingsRes.data ?? []).forEach((f: any) =>
        activities.push({
          id: `f-${f.id}`,
          type: "fitting",
          description: `드레스 피팅 (${f.status})`,
          createdAt: f.created_at,
        }),
      );
      (recentTxnRes.data ?? []).forEach((t: any) => {
        const isPurchase = t.reason === "purchase" || t.reason === "first_purchase_bonus";
        activities.push({
          id: `t-${t.id}`,
          type: isPurchase ? "heart_purchase" : "heart_spend",
          description: `하트 ${t.amount > 0 ? `+${t.amount}` : t.amount} (${t.reason})`,
          createdAt: t.created_at,
        });
      });
      (recentWaitlistRes.data ?? []).forEach((w: any) =>
        activities.push({
          id: `w-${w.id}`,
          type: "waitlist",
          description: `사전알림: ${w.service_id}`,
          createdAt: w.created_at,
        }),
      );
      activities.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setRecent(activities.slice(0, 10));

      // 데이터 신선도 (places 카테고리별)
      const freshRows = await Promise.all(
        PLACE_CATEGORIES.map(async (c) => {
          const { data } = await (supabase as any)
            .from("places")
            .select("updated_at")
            .eq("category", c.key)
            .eq("is_active", true);
          if (!data || data.length === 0) {
            return { category: c.key, label: c.label, total: 0, daysSinceMedian: 0, staleCount: 0 };
          }
          const days = data
            .filter((d: any) => d.updated_at)
            .map((d: any) => Math.floor((Date.now() - new Date(d.updated_at).getTime()) / 86400000))
            .sort((a: number, b: number) => a - b);
          const med = days.length > 0 ? days[Math.floor(days.length / 2)] : 0;
          const stale = days.filter((d: number) => d > 60).length;
          return {
            category: c.key,
            label: c.label,
            total: data.length,
            daysSinceMedian: med,
            staleCount: stale,
          };
        }),
      );
      setFreshness(freshRows);
    };

    fetchAll();
  }, [today, weekAgo]);

  return (
    <AdminGuard>
      <AdminLayout title="운영자 대시보드" description="듀이 서비스 통계 및 빠른 진입">
        {/* 알림 배너 */}
        {stats && (stats.pendingWaitlist > 0 || stats.pendingFittings > 0) && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 rounded-lg flex gap-2 items-start">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-900 dark:text-amber-200">
              {stats.pendingFittings > 0 && (
                <div>처리 대기 중인 드레스 피팅 {stats.pendingFittings}건</div>
              )}
              {stats.pendingWaitlist > 0 && (
                <div>신규 사전알림 신청 {stats.pendingWaitlist}건</div>
              )}
            </div>
          </div>
        )}

        {/* KPI 카드 그룹 */}
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            사용자
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard
              label="총 가입자"
              value={stats?.usersTotal}
              icon={Users}
              accent="blue"
            />
            <StatCard
              label="오늘 신규"
              value={stats?.usersToday}
              icon={TrendingUp}
              accent="green"
            />
            <StatCard
              label="이번 주 신규"
              value={stats?.usersWeek}
              icon={TrendingUp}
              accent="green"
            />
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            콘텐츠
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard
              label="등록 드레스"
              value={stats?.dressTotal}
              sub={stats ? `노출중 ${stats.dressActive}` : undefined}
              icon={Shirt}
              accent="pink"
            />
            <StatCard label="누적 피팅 생성" value={stats?.fittingsTotal} icon={ImageIcon} />
            <StatCard
              label="오늘 피팅 생성"
              value={stats?.fittingsToday}
              icon={ImageIcon}
              accent="green"
            />
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            매출·하트
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard label="누적 거래 건수" value={stats?.heartTxnTotal} icon={CreditCard} />
            <StatCard
              label="총 적립 하트"
              value={stats?.heartEarned}
              icon={Heart}
              accent="green"
            />
            <StatCard
              label="총 사용 하트"
              value={stats?.heartSpent}
              icon={Heart}
              accent="pink"
            />
          </div>
        </section>

        {/* 빠른 액션 */}
        <section className="mb-6">
          <h2 className="text-sm font-bold text-foreground mb-3">빠른 액션</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickActionCard
              to="/admin/dress-samples"
              label="새 드레스 추가"
              icon={Plus}
              accent="primary"
            />
            <QuickActionCard
              to="/admin/service-waitlist"
              label="사전알림 확인"
              icon={Bell}
              badge={stats?.pendingWaitlist}
            />
            <QuickActionCard to="/admin/users" label="사용자 관리" icon={Users} />
            <QuickActionCard to="/" label="앱으로 돌아가기" icon={Sparkles} />
          </div>
        </section>

        {/* 데이터 신선도 (places 카테고리별) */}
        <section className="mb-6">
          <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            데이터 신선도
          </h2>
          <div className="bg-background rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">카테고리</th>
                  <th className="text-right px-4 py-2 font-semibold">등록</th>
                  <th className="text-right px-4 py-2 font-semibold">중앙값 갱신</th>
                  <th className="text-right px-4 py-2 font-semibold">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {freshness.map((row) => {
                  let status: { icon: string; label: string; color: string };
                  if (row.total === 0) {
                    status = { icon: "⚪", label: "미등록", color: "text-muted-foreground" };
                  } else if (row.daysSinceMedian <= 14) {
                    status = { icon: "🟢", label: "신선", color: "text-emerald-600" };
                  } else if (row.daysSinceMedian <= 30) {
                    status = { icon: "🟡", label: "보통", color: "text-amber-600" };
                  } else if (row.daysSinceMedian <= 60) {
                    status = { icon: "🟡", label: "갱신 권장", color: "text-amber-600" };
                  } else {
                    status = { icon: "🔴", label: "오래됨", color: "text-rose-600" };
                  }
                  return (
                    <tr key={row.category} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-foreground">{row.label}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{row.total}곳</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {row.total === 0 ? "-" :
                         row.daysSinceMedian <= 7 ? `${row.daysSinceMedian}일 전` :
                         row.daysSinceMedian <= 30 ? `${row.daysSinceMedian}일 전` :
                         `${Math.round(row.daysSinceMedian / 30)}달 전`}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs font-medium ${status.color}`}>
                          {status.icon} {status.label}
                          {row.staleCount > 0 && row.total > 0 && (
                            <span className="ml-1 text-muted-foreground">({row.staleCount}곳 60일+)</span>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            챗봇이 시세 답변 시 이 데이터를 사용해요. 1주~1달 주기로 갱신 시 챗봇 답변 품질도 자동으로 향상돼요.
          </p>
        </section>

        {/* 최근 활동 */}
        <section>
          <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            최근 활동
          </h2>
          {recent.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8 bg-background rounded-lg border border-border">
              아직 활동이 없습니다.
            </div>
          ) : (
            <ul className="bg-background rounded-lg border border-border divide-y divide-border">
              {recent.map((item) => (
                <li key={item.id} className="px-4 py-3 flex items-center gap-3">
                  <ActivityIcon type={item.type} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground truncate">{item.description}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {formatRelative(item.createdAt)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </AdminLayout>
    </AdminGuard>
  );
};

interface StatCardProps {
  label: string;
  value: number | undefined;
  sub?: string;
  icon: LucideIcon;
  accent?: "default" | "blue" | "green" | "pink";
}

const StatCard = ({ label, value, sub, icon: Icon, accent = "default" }: StatCardProps) => {
  const accentClass = {
    default: "text-muted-foreground",
    blue: "text-blue-600",
    green: "text-emerald-600",
    pink: "text-pink-600",
  }[accent];
  return (
    <div className="bg-background rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={cn("w-4 h-4", accentClass)} />
      </div>
      <div className="text-2xl font-bold text-foreground">
        {value === undefined ? "-" : value.toLocaleString()}
      </div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
};

interface QuickActionCardProps {
  to: string;
  label: string;
  icon: LucideIcon;
  accent?: "primary" | "default";
  badge?: number;
}

const QuickActionCard = ({ to, label, icon: Icon, accent, badge }: QuickActionCardProps) => (
  <Link
    to={to}
    className={cn(
      "flex flex-col gap-2 p-4 rounded-lg border transition-colors",
      accent === "primary"
        ? "bg-primary/10 border-primary/20 text-primary hover:bg-primary/15"
        : "bg-background border-border text-foreground hover:bg-muted",
    )}
  >
    <div className="flex items-start justify-between">
      <Icon className="w-5 h-5" />
      {badge !== undefined && badge > 0 && (
        <span className="text-[10px] font-bold bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </div>
    <div className="text-sm font-medium">{label}</div>
    <ChevronRight className="w-4 h-4 ml-auto" />
  </Link>
);

const ActivityIcon = ({ type }: { type: RecentItem["type"] }) => {
  const config = {
    fitting: { icon: ImageIcon, color: "bg-pink-100 text-pink-600" },
    heart_purchase: { icon: CreditCard, color: "bg-emerald-100 text-emerald-600" },
    heart_spend: { icon: Heart, color: "bg-rose-100 text-rose-600" },
    signup: { icon: Users, color: "bg-blue-100 text-blue-600" },
    waitlist: { icon: Bell, color: "bg-amber-100 text-amber-600" },
  }[type];
  const Icon = config.icon;
  return (
    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", config.color)}>
      <Icon className="w-4 h-4" />
    </div>
  );
};

export default AdminDashboard;
