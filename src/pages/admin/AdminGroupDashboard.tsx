import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  ADMIN_NAV_GROUPS,
  adminNavItemsByGroup,
  type AdminNavGroupKey,
} from "@/components/admin/adminNav";
import { supabase } from "@/integrations/supabase/client";

// 그룹별 전용 대시보드 — 그 그룹의 관리 도구(adminNav 단일 소스의 group 으로 파생)를 카드로 모으고,
// 처리 대기(pending) 배지를 함께 보여준다. 메인 허브(/admin)에서 그룹 헤더로 진입.
const GROUP_DESCRIPTION: Record<AdminNavGroupKey, string> = {
  vendors: "업체 정보·입점 심사·권한 요청 관리",
  commerce: "상품 큐레이션·추천 상품·기업 콘텐츠 검토",
  moderation: "신고·문의·사용자·공지 등 운영/CS",
  invitation: "청첩장 템플릿·에셋·폰트",
  ai: "AI 생성 현황·프롬프트·카탈로그 소재",
  marketing: "인스타 콘텐츠·이벤트 등 마케팅",
};

const AdminGroupDashboard = ({ group }: { group: AdminNavGroupKey }) => {
  const meta = ADMIN_NAV_GROUPS.find((g) => g.key === group);
  const items = adminNavItemsByGroup(group);
  // href → pending 건수. 메인 대시보드(AdminDashboard)에서 이미 검증된 쿼리만 재사용한다
  // (쿼리/컬럼 정확성 리스크 0). 신규 테이블·컬럼 추측 금지.
  const [pending, setPending] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const next: Record<string, number> = {};
      if (group === "commerce") {
        const [ev, cp] = await Promise.all([
          (supabase as any)
            .from("business_events")
            .select("id", { count: "exact", head: true })
            .eq("moderation_status", "pending"),
          (supabase as any)
            .from("business_coupons")
            .select("id", { count: "exact", head: true })
            .eq("moderation_status", "pending"),
        ]);
        next["/admin/content-review"] = (ev.count ?? 0) + (cp.count ?? 0);
      } else if (group === "moderation") {
        const wl = await (supabase as any)
          .from("service_waitlist")
          .select("id", { count: "exact", head: true })
          .eq("notified", false);
        next["/admin/service-waitlist"] = wl.count ?? 0;
      } else if (group === "ai") {
        const f = await (supabase as any)
          .from("dress_fittings")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending");
        next["/admin/ai-jobs"] = f.count ?? 0;
      }
      if (!cancelled) setPending(next);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [group]);

  return (
    <AdminGuard>
      <AdminLayout title={meta?.label ?? "관리"} description={GROUP_DESCRIPTION[group]}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {items.map((item) => {
            const ItemIcon = item.icon;
            const count = pending[item.href];
            return (
              <Link
                key={item.href}
                to={item.href}
                className="flex flex-col gap-2 p-4 rounded-lg border bg-background border-border text-foreground hover:bg-muted transition-colors"
              >
                <div className="flex items-start justify-between">
                  <ItemIcon className="w-5 h-5" />
                  {count !== undefined && count > 0 ? (
                    <span className="text-[10px] font-bold bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full">
                      {count}
                    </span>
                  ) : item.badge ? (
                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <div className="text-sm font-medium">{item.label}</div>
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Link>
            );
          })}
        </div>
      </AdminLayout>
    </AdminGuard>
  );
};

export default AdminGroupDashboard;
