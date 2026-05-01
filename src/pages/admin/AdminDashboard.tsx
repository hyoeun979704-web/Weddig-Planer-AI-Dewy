import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Shirt, Users, Heart, Image as ImageIcon, ChevronRight } from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  dressSamples: number;
  activeSamples: number;
  totalUsers: number;
  totalHearts: number;
  totalFittings: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const [samplesRes, activeRes, fittingsRes] = await Promise.all([
        (supabase as any).from("dress_samples").select("id", { count: "exact", head: true }),
        (supabase as any)
          .from("dress_samples")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),
        (supabase as any).from("dress_fittings").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        dressSamples: samplesRes.count ?? 0,
        activeSamples: activeRes.count ?? 0,
        totalUsers: 0,
        totalHearts: 0,
        totalFittings: fittingsRes.count ?? 0,
      });
    };
    fetchStats();
  }, []);

  return (
    <AdminGuard>
      <AdminLayout title="운영자 대시보드" description="듀이 서비스 통계 및 관리 진입">
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard
            label="등록 드레스"
            value={stats ? `${stats.dressSamples}` : "-"}
            sub={stats ? `노출중 ${stats.activeSamples}` : ""}
            icon={Shirt}
          />
          <StatCard
            label="누적 피팅"
            value={stats ? `${stats.totalFittings}` : "-"}
            icon={ImageIcon}
          />
          <StatCard label="가입자" value="-" icon={Users} />
          <StatCard label="하트 거래" value="-" icon={Heart} />
        </section>

        <section>
          <h2 className="text-sm font-bold text-foreground mb-3">바로가기</h2>
          <div className="space-y-2">
            <ShortcutLink to="/admin/dress-samples" label="드레스 카탈로그 관리" />
            <ShortcutLink to="/" label="앱으로 돌아가기" />
          </div>
        </section>
      </AdminLayout>
    </AdminGuard>
  );
};

const StatCard = ({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof Shirt;
}) => (
  <div className="bg-background rounded-lg border border-border p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Icon className="w-4 h-4 text-muted-foreground" />
    </div>
    <div className="text-2xl font-bold text-foreground">{value}</div>
    {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
  </div>
);

const ShortcutLink = ({ to, label }: { to: string; label: string }) => (
  <Link
    to={to}
    className="flex items-center justify-between px-4 py-3 bg-background rounded-lg border border-border hover:bg-muted transition-colors"
  >
    <span className="text-sm font-medium text-foreground">{label}</span>
    <ChevronRight className="w-4 h-4 text-muted-foreground" />
  </Link>
);

export default AdminDashboard;
