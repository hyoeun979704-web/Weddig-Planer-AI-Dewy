import { Link } from "react-router-dom";
import {
  Shirt,
  Users,
  Heart,
  Image as ImageIcon,
  ChevronRight,
  Bell,
  CreditCard,
  TrendingUp,
  AlertCircle,
  Plus,
  Clock,
  Flag,
  Building2,
  Megaphone,
  MessageSquare,
  MapPin,
  Instagram,
  ShoppingBag,
  Star,
  type LucideIcon,
} from "lucide-react";
import AdminGuard from "@/features/console/components/AdminGuard";
import AdminLayout from "@/features/console/components/AdminLayout";
import { ADMIN_NAV_GROUPS, adminNavItemsByGroup } from "@/features/console/components/adminNav";
import { useAdminStats, useRecentActivity, useDataFreshness } from "@/features/console/hooks/useAdminDashboard";
import type { RecentItem } from "@/features/console/data/adminDashboard";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/relativeTime";

const AdminDashboard = () => {
  // 데이터 접근은 features/console/data/adminDashboard 로 추상화(Task #3).
  // React Query 가 마운트 시 fetch + 캐싱(staleTime 60s) — 기존 useEffect 무한루프 주의 불필요.
  const { stats } = useAdminStats();
  const { recent } = useRecentActivity();
  const { freshness } = useDataFreshness();

  return (
    <AdminGuard>
      <AdminLayout title="운영자 대시보드" description="듀이 서비스 통계 및 빠른 진입">
        {/* 알림 배너 — 각 줄을 눌러 바로 해결 화면으로 이동(딥링크). */}
        {stats && (stats.pendingWaitlist > 0 || stats.pendingFittings > 0 || stats.pendingContentReview > 0) && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 rounded-lg flex gap-2 items-start">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm text-amber-900 dark:text-amber-200 space-y-1">
              {stats.pendingContentReview > 0 && (
                <Link to="/admin/content-review" className="flex items-center gap-1 hover:underline">
                  <span className="flex-1">검토 대기 중인 기업 콘텐츠 {stats.pendingContentReview}건</span>
                  <ChevronRight className="w-4 h-4 flex-shrink-0" />
                </Link>
              )}
              {stats.pendingFittings > 0 && (
                <Link to="/admin/ai-jobs" className="flex items-center gap-1 hover:underline">
                  <span className="flex-1">처리 대기 중인 드레스 피팅 {stats.pendingFittings}건</span>
                  <ChevronRight className="w-4 h-4 flex-shrink-0" />
                </Link>
              )}
              {stats.pendingWaitlist > 0 && (
                <Link to="/admin/service-waitlist" className="flex items-center gap-1 hover:underline">
                  <span className="flex-1">신규 사전알림 신청 {stats.pendingWaitlist}건</span>
                  <ChevronRight className="w-4 h-4 flex-shrink-0" />
                </Link>
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

        {/* 빠른 액션 — 6개 전용 관리 그룹별 섹션(ADMIN_NAV 단일 소스의 group·featured 에서 파생).
            평면 그리드 대신 그룹으로 묶어 "각 관리 영역" 진입을 한눈에. 새 기능은 adminNav 항목만
            추가하면 해당 그룹에 자동 노출(라벨/경로/그룹 드리프트 방지). */}
        <section className="mb-6">
          <h2 className="text-sm font-bold text-foreground mb-3">빠른 액션</h2>
          <div className="space-y-5">
            {ADMIN_NAV_GROUPS.map((g) => {
              const items = adminNavItemsByGroup(g.key).filter((i) => i.featured);
              if (items.length === 0) return null;
              const GIcon = g.icon;
              return (
                <div key={g.key}>
                  <Link
                    to={`/admin/${g.key}`}
                    className="group flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-2 uppercase tracking-wider w-fit"
                  >
                    <GIcon className="w-3.5 h-3.5" />
                    {g.label}
                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {items.map((item) => (
                      <QuickActionCard
                        key={item.href}
                        to={item.href}
                        label={item.label}
                        icon={item.icon}
                        accent={item.href === "/admin/ai-jobs" ? "primary" : undefined}
                        badge={
                          item.href === "/admin/service-waitlist" ? stats?.pendingWaitlist
                          : item.href === "/admin/content-review" ? stats?.pendingContentReview
                          : undefined
                        }
                      />
                    ))}
                  </div>
                </div>
              );
            })}
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
                  <th className="text-right px-4 py-2 font-semibold">중앙값 수집</th>
                  <th className="text-right px-4 py-2 font-semibold">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {freshness.map((row) => {
                  const known = row.total - row.unknownCount; // 수집일이 있는 항목 수
                  let status: { icon: string; label: string; color: string };
                  if (row.total === 0) {
                    status = { icon: "", label: "미등록", color: "text-muted-foreground" };
                  } else if (known === 0) {
                    // 수집 시각(last_collected_at)이 전무 → 신선도를 판단할 수 없음.
                    status = { icon: "", label: "미확인", color: "text-muted-foreground" };
                  } else if (row.daysSinceMedian <= 14) {
                    status = { icon: "", label: "신선", color: "text-emerald-600" };
                  } else if (row.daysSinceMedian <= 30) {
                    status = { icon: "", label: "보통", color: "text-amber-600" };
                  } else if (row.daysSinceMedian <= 60) {
                    status = { icon: "", label: "갱신 권장", color: "text-amber-600" };
                  } else {
                    status = { icon: "", label: "오래됨", color: "text-rose-600" };
                  }
                  return (
                    <tr key={row.category} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-foreground">{row.label}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{row.total}곳</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {row.total === 0 || known === 0 ? "-" :
                         row.daysSinceMedian <= 30 ? `${row.daysSinceMedian}일 전` :
                         `${Math.round(row.daysSinceMedian / 30)}달 전`}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs font-medium ${status.color}`}>
                          {status.icon} {status.label}
                          {row.staleCount > 0 && (
                            <span className="ml-1 text-muted-foreground">({row.staleCount}곳 60일+)</span>
                          )}
                          {row.unknownCount > 0 && (
                            <span className="ml-1 text-muted-foreground">(수집일 미상 {row.unknownCount}곳)</span>
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
            신선도는 우리가 마지막으로 수집·검증한 시각(last_collected_at) 기준이에요. ‘수집일 미상’은
            아직 수집 시각이 기록되지 않은 항목으로, 재수집 대상입니다. 챗봇 시세 답변 품질과 직결돼요.
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
                      {relativeTime(item.createdAt)}
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
