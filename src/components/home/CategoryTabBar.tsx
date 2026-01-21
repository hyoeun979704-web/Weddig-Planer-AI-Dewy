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
  emoji: string;
}

const tabs: Tab[] = [
  { id: "wedding-hall", label: "웨딩홀", emoji: "🏛️" },
  { id: "sdm", label: "스드메", emoji: "📸" },
  { id: "honeymoon-gifts", label: "혼수·골든타임", emoji: "🎁" },
  { id: "honeymoon", label: "허니문", emoji: "🌴" },
  { id: "appliances", label: "가전·예물", emoji: "💍" },
  { id: "suit", label: "예복", emoji: "👔" },
  { id: "hanbok", label: "한복", emoji: "👗" },
];

interface CategoryTabBarProps {
  activeTab: CategoryTab;
  onTabChange: (tab: CategoryTab) => void;
}

const CategoryTabBar = ({ activeTab, onTabChange }: CategoryTabBarProps) => {
  return (
    <div className="sticky top-14 z-40 bg-card border-b border-border w-full">
      <div 
        className="flex overflow-x-auto overflow-y-hidden scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex-shrink-0 flex items-center gap-1.5 px-4 py-3 relative transition-colors whitespace-nowrap",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="text-base">{tab.emoji}</span>
              <span 
                className={cn(
                  "text-sm whitespace-nowrap",
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
