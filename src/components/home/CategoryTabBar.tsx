import { cn } from "@/lib/utils";

export type CategoryTab = "home" | "events" | "shopping" | "influencers";

interface Tab {
  id: CategoryTab;
  label: string;
}

const tabs: Tab[] = [
  { id: "home", label: "홈" },
  { id: "events", label: "이벤트" },
  { id: "shopping", label: "쇼핑" },
  { id: "influencers", label: "인플루언서" },
];

interface CategoryTabBarProps {
  activeTab: CategoryTab;
  onTabChange: (tab: CategoryTab) => void;
}

const CategoryTabBar = ({ activeTab, onTabChange }: CategoryTabBarProps) => {
  return (
    <div className="sticky top-14 z-40 bg-card border-b border-border w-full">
      <div className="flex">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex-1 py-3 relative transition-colors text-center",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "text-sm whitespace-nowrap",
                  isActive ? "font-bold" : "font-medium"
                )}
              >
                {tab.label}
              </span>

              {isActive && (
                <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-full" />
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
