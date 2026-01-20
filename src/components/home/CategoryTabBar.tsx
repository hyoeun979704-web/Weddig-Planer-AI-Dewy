import { useState } from "react";
import { 
  Building2, 
  Camera, 
  Gift, 
  Plane, 
  Tv, 
  Shirt,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

export type CategoryTab = 
  | "wedding-hall" 
  | "sdm" 
  | "honeymoon-gifts" 
  | "honeymoon" 
  | "appliances" 
  | "suit" 
  | "hanbok";

interface Tab {
  id: CategoryTab;
  label: string;
  icon: React.ElementType;
}

const tabs: Tab[] = [
  { id: "wedding-hall", label: "웨딩홀", icon: Building2 },
  { id: "sdm", label: "스드메", icon: Camera },
  { id: "honeymoon-gifts", label: "혼수·골든타임", icon: Gift },
  { id: "honeymoon", label: "허니문", icon: Plane },
  { id: "appliances", label: "가전·예물", icon: Tv },
  { id: "suit", label: "예복", icon: Shirt },
  { id: "hanbok", label: "한복", icon: Sparkles },
];

interface CategoryTabBarProps {
  activeTab: CategoryTab;
  onTabChange: (tab: CategoryTab) => void;
}

const CategoryTabBar = ({ activeTab, onTabChange }: CategoryTabBarProps) => {
  return (
    <div className="sticky top-14 z-40 bg-card border-b border-border">
      <div className="flex overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex-shrink-0 flex flex-col items-center gap-1 px-4 py-3 relative transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span 
                className={cn(
                  "text-xs whitespace-nowrap",
                  isActive ? "font-bold" : "font-medium"
                )}
              >
                {tab.label}
              </span>
              
              {/* Active indicator */}
              {isActive && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryTabBar;
export { tabs };
