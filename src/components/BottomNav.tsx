import { Home, Heart, ShoppingBag, Grid3X3, Church } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: "홈", href: "/" },
  { icon: Church, label: "웨딩홀", href: "/venues" },
  { icon: Heart, label: "찜", href: "/favorites" },
  { icon: ShoppingBag, label: "스토어", href: "/store" },
  { icon: Grid3X3, label: "더보기", href: "/more" },
];

interface BottomNavProps {
  activeTab?: string;
  onTabChange?: (href: string) => void;
}

const BottomNav = ({ activeTab = "/", onTabChange }: BottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="max-w-[430px] mx-auto flex justify-around items-center h-16 px-4 safe-area-inset-bottom">
        {navItems.map((item) => {
          const isActive = activeTab === item.href;
          return (
            <button
              key={item.href}
              onClick={() => onTabChange?.(item.href)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors duration-200",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon 
                className={cn(
                  "w-6 h-6 transition-transform duration-200",
                  isActive && "scale-110"
                )} 
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
