import { Home, Calendar, Sparkles, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: "홈", href: "/" },
  { icon: Calendar, label: "스케쥴", href: "/schedule" },
  { icon: Sparkles, label: "AI 스튜디오", href: "/ai-studio" },
  { icon: Users, label: "커뮤니티", href: "/community" },
  { icon: User, label: "마이페이지", href: "/mypage" },
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
          return (
            <button
              key={item.href}
              onClick={() => onTabChange?.(item.href)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors duration-200",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon 
                className={cn(
                  "w-5 h-5 transition-transform duration-200",
                  isActive && "scale-110"
                )} 
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
