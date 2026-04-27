import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";
import scheduleIcon from "@/assets/icons/nav-schedule.svg";
import budgetIcon from "@/assets/icons/nav-budget.svg";
import communityIcon from "@/assets/icons/nav-community.svg";
import mypageIcon from "@/assets/icons/nav-mypage.svg";
import logoIcon from "@/assets/icons/logo.svg";

interface NavItem {
  icon?: string;
  label: string;
  href: string;
  isHome?: boolean;
  tutorialId?: string;
}

const navItems: NavItem[] = [
  { icon: scheduleIcon, label: "스케줄", href: "/schedule", tutorialId: "nav-schedule" },
  { icon: budgetIcon, label: "예산", href: "/budget", tutorialId: "nav-budget" },
  { isHome: true, label: "홈", href: "/" },
  { icon: communityIcon, label: "커뮤니티", href: "/community", tutorialId: "nav-community" },
  { icon: mypageIcon, label: "마이페이지", href: "/mypage", tutorialId: "nav-mypage" },
];

interface BottomNavProps {
  activeTab?: string;
  onTabChange?: (href: string) => void;
}

const maskStyle = (url: string): CSSProperties => ({
  WebkitMaskImage: `url(${url})`,
  maskImage: `url(${url})`,
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
  WebkitMaskSize: "contain",
  maskSize: "contain",
});

const BottomNav = ({ activeTab = "/", onTabChange }: BottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="max-w-[430px] mx-auto flex justify-around items-center h-16 px-2 safe-area-inset-bottom">
        {navItems.map((item) => {
          const isActive = activeTab === item.href;

          if (item.isHome) {
            return (
              <button
                key={item.href}
                onClick={() => onTabChange?.(item.href)}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2"
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-[14px] flex items-center justify-center transition-all duration-200",
                    isActive
                      ? "bg-primary shadow-md shadow-primary/30"
                      : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "block w-6 h-5 transition-colors",
                      isActive ? "bg-white" : "bg-[hsl(var(--inactive))]"
                    )}
                    style={maskStyle(logoIcon)}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    isActive ? "text-primary font-bold" : "text-[hsl(var(--inactive))]"
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.href}
              data-tutorial={item.tutorialId}
              onClick={() => onTabChange?.(item.href)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors duration-200",
                isActive ? "text-primary font-bold" : "text-[hsl(var(--inactive))]"
              )}
            >
              {item.icon && (
                <span
                  aria-hidden
                  className={cn(
                    "block w-6 h-6 bg-current transition-transform duration-200",
                    isActive && "scale-110"
                  )}
                  style={maskStyle(item.icon)}
                />
              )}
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
