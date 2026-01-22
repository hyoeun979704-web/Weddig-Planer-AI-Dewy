import { cn } from "@/lib/utils";
import { useRef, useEffect } from "react";

export type CategoryTab = 
  | "home"
  | "wedding-hall" 
  | "sdm" 
  | "honeymoon-gifts" 
  | "honeymoon" 
  | "appliances" 
  | "suit" 
  | "hanbok"
  | "invitation";

interface Tab {
  id: CategoryTab;
  label: string;
  emoji: string;
}

const tabs: Tab[] = [
  { id: "home", label: "홈", emoji: "🏠" },
  { id: "wedding-hall", label: "웨딩홀", emoji: "🏛️" },
  { id: "sdm", label: "스드메", emoji: "📸" },
  { id: "honeymoon-gifts", label: "혼수·골든타임", emoji: "🎁" },
  { id: "honeymoon", label: "허니문", emoji: "🌴" },
  { id: "appliances", label: "가전·예물", emoji: "💍" },
  { id: "suit", label: "예복", emoji: "👔" },
  { id: "hanbok", label: "한복", emoji: "👗" },
  { id: "invitation", label: "청첩장 모임", emoji: "✉️" },
];

interface CategoryTabBarProps {
  activeTab: CategoryTab;
  onTabChange: (tab: CategoryTab) => void;
}

const CategoryTabBar = ({ activeTab, onTabChange }: CategoryTabBarProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  // Scroll to active tab on mount and when activeTab changes
  useEffect(() => {
    if (activeTabRef.current && containerRef.current) {
      const container = containerRef.current;
      const activeButton = activeTabRef.current;
      
      // Calculate scroll position to center the active tab
      const containerWidth = container.offsetWidth;
      const buttonLeft = activeButton.offsetLeft;
      const buttonWidth = activeButton.offsetWidth;
      
      const scrollPosition = buttonLeft - (containerWidth / 2) + (buttonWidth / 2);
      
      container.scrollTo({
        left: Math.max(0, scrollPosition),
        behavior: 'smooth'
      });
    }
  }, [activeTab]);

  return (
    <div className="sticky top-14 z-40 bg-card border-b border-border w-full">
      <div 
        ref={containerRef}
        className="flex overflow-x-auto overflow-y-hidden scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              ref={isActive ? activeTabRef : null}
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
