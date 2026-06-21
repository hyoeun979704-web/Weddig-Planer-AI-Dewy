import type { ReactNode } from "react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Home, LogOut } from "lucide-react";
import { ADMIN_NAV } from "./adminNav";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface AdminLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
  rightAction?: ReactNode;
}


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
      {/* flex-col: 로고(고정) · nav(flex-1 스크롤) · 푸터(고정). 기존엔 nav 에 overflow 가
          없고 푸터가 absolute bottom-0 이라, 메뉴 항목이 많으면 하단(로그아웃 등)이 잘려
          접근 불가였음(#4). */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-background border-r border-border transition-transform flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* 로고 헤더: 상태바(--safe-top) 아래로 내려 모바일 드로어에서 노치에 안 가리게 */}
        <div className="shrink-0 border-b border-border pt-[var(--safe-top)]">
          <div className="h-14 flex items-center justify-between px-4">
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
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  {item.label}
                </span>
                {item.badge && (
                  <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 p-3 pb-[calc(0.75rem+var(--safe-bottom))] border-t border-border bg-background space-y-1">
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
        {/* 소비자 PageHeader 패턴: safe-sticky-header(=top:0 + padding-top:--safe-top)는
            높이 auto, 내부 div 가 h-[--app-header-height] 로 콘텐츠 높이를 가진다.
            기존엔 h-14 박스에 둘을 겹쳐 콘텐츠가 상태바(--safe-top) 영역으로 밀려 겹쳤음(#3). */}
        <header className="bg-background border-b border-border sticky safe-sticky-header z-30">
          <div className="h-[var(--app-header-height)] flex items-center justify-between px-4">
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
          </div>
        </header>

        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
