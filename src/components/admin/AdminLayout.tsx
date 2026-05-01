import type { ReactNode } from "react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Shirt,
  Sparkles,
  FileText,
  Camera,
  Bell,
  Users,
  Menu,
  X,
  Home,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface AdminLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
  rightAction?: ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  status?: "active" | "soon";
}

const navItems: NavItem[] = [
  { label: "대시보드", href: "/admin", icon: LayoutDashboard, status: "active" },
  { label: "드레스 카탈로그", href: "/admin/dress-samples", icon: Shirt, status: "active" },
  { label: "메이크업 카탈로그", href: "/admin/makeup-samples", icon: Sparkles, status: "soon" },
  { label: "청첩장 템플릿", href: "/admin/invitation-templates", icon: FileText, status: "soon" },
  { label: "촬영 시안", href: "/admin/wedding-photo-refs", icon: Camera, status: "soon" },
  { label: "사전알림 신청", href: "/admin/service-waitlist", icon: Bell, status: "soon" },
  { label: "사용자 관리", href: "/admin/users", icon: Users, status: "soon" },
];

const AdminLayout = ({ title, description, children, rightAction }: AdminLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* 모바일 사이드바 오버레이 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-background border-r border-border transition-transform",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="h-14 border-b border-border flex items-center justify-between px-4">
          <Link to="/admin" className="font-bold text-foreground">
            듀이 운영자
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1"
            aria-label="사이드바 닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            const isDisabled = item.status === "soon";
            return (
              <Link
                key={item.href}
                to={isDisabled ? "#" : item.href}
                onClick={(e) => {
                  if (isDisabled) e.preventDefault();
                  setSidebarOpen(false);
                }}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive && "bg-primary/10 text-primary",
                  !isActive && !isDisabled && "text-foreground hover:bg-muted",
                  isDisabled && "text-muted-foreground cursor-not-allowed",
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  {item.label}
                </span>
                {isDisabled && (
                  <span className="text-[10px] bg-muted px-2 py-0.5 rounded">준비중</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border bg-background space-y-1">
          {user && (
            <div className="px-3 py-2 text-xs text-muted-foreground truncate">
              {user.email}
            </div>
          )}
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted"
          >
            <Home className="w-4 h-4" />
            앱으로 돌아가기
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>
      </aside>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 min-w-0">
        <header className="h-14 bg-background border-b border-border sticky top-0 z-30 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1"
              aria-label="사이드바 열기"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-bold text-foreground leading-none">{title}</h1>
              {description && (
                <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
              )}
            </div>
          </div>
          {rightAction}
        </header>

        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
