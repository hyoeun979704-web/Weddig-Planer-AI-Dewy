import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";
import homeIcon from "@/assets/icons/nav-home.svg";
import scheduleIcon from "@/assets/icons/nav-schedule.svg";
import budgetIcon from "@/assets/icons/nav-budget.svg";
import communityIcon from "@/assets/icons/nav-community.svg";
import mypageIcon from "@/assets/icons/nav-mypage.svg";

interface NavItem {
  icon?: string;
  label: string;
  href: string;
  tutorialId?: string;
}

const navItems: NavItem[] = [
  { icon: scheduleIcon, label: "스케줄", href: "/schedule", tutorialId: "nav-schedule" },
  { icon: budgetIcon, label: "예산", href: "/budget", tutorialId: "nav-budget" },
  { icon: homeIcon, label: "홈", href: "/", tutorialId: "nav-home" },
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
