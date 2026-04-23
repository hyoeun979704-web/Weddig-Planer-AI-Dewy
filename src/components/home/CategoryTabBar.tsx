import { cn } from "@/lib/utils";

export type CategoryTab = "ai-planner" | "ai-studio" | "tips" | "events" | "shopping";

interface Tab {
  id: CategoryTab;
  label: string;
}

const tabs: Tab[] = [
  { id: "ai-planner", label: "AI 플래너" },
  { id: "ai-studio", label: "AI 스튜디오" },
  { id: "tips", label: "꿀팁" },
  { id: "events", label: "이벤트" },
  { id: "shopping", label: "쇼핑" },
];

interface CategoryTabBarProps {
  activeTab: CategoryTab;
  onTabChange: (tab: CategoryTab) => void;
}

const CategoryTabBar = ({ activeTab, onTabChange }: CategoryTabBarProps) => {
  return (
    <div data-tutorial="category-tab" className="sticky top-14 z-40 bg-card border-b border-[#d9d9d9] w-full">
      <div className="flex items-center justify-center h-[56px] px-[9px]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "w-[75px] h-full flex items-center justify-center relative transition-colors",
                isActive ? "text-primary" : "text-[#a4a1a2] hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "text-[12px] whitespace-nowrap",
                  isActive ? "font-bold" : "font-semibold"
                )}
              >
                {tab.label}
              </span>

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
