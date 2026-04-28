import type { ComponentType, SVGProps } from "react";
import { cn } from "@/lib/utils";
import {
  NavScheduleIcon,
  NavBudgetIcon,
  NavCommunityIcon,
  NavMypageIcon,
  NavHomeIcon,
} from "@/components/icons/nav-icons";

type IconComp = ComponentType<SVGProps<SVGSVGElement>>;

interface NavItem {
  icon?: IconComp;
  label: string;
  href: string;
  isHome?: boolean;
  tutorialId?: string;
}

const navItems: NavItem[] = [
  { icon: NavScheduleIcon, label: "스케줄", href: "/schedule", tutorialId: "nav-schedule" },
  { icon: NavBudgetIcon, label: "예산", href: "/budget", tutorialId: "nav-budget" },
  { isHome: true, label: "홈", href: "/" },
  { icon: NavCommunityIcon, label: "커뮤니티", href: "/community", tutorialId: "nav-community" },
  { icon: NavMypageIcon, label: "마이페이지", href: "/mypage", tutorialId: "nav-mypage" },
];

interface BottomNavProps {
  activeTab?: string;
  onTabChange?: (href: string) => void;
}

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
                {isActive ? (
                  // Active: pink rounded pill + white logo silhouette inside.
                  <div className="w-10 h-10 rounded-[14px] bg-primary shadow-md shadow-primary/30 flex items-center justify-center text-white transition-all duration-200">
                    <NavHomeIcon className="w-6 h-5" />
                  </div>
                ) : (
                  // Inactive: bare gray silhouette, no pill — matches the
                  // user-provided fixed-tab spec (assets gray by default,
                  // colored only when their menu is active).
                  <NavHomeIcon className="w-7 h-6 text-[hsl(var(--inactive))] transition-colors" />
                )}
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

          const Icon = item.icon;
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
              {Icon && (
                <Icon
                  aria-hidden
                  className={cn(
                    "w-6 h-6 transition-transform duration-200",
                    isActive && "scale-110"
                  )}
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
