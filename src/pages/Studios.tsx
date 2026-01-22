import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import CategoryHeroBanner from "@/components/CategoryHeroBanner";
import CategoryFilterBar from "@/components/CategoryFilterBar";
import CategoryGrid from "@/components/CategoryGrid";
import CategoryTabBar, { CategoryTab } from "@/components/home/CategoryTabBar";
import { useCategoryFilterStore } from "@/stores/useCategoryFilterStore";
import { CategoryItem } from "@/hooks/useCategoryData";

const tabToRoute: Record<CategoryTab, string> = {
  "home": "/",
  "wedding-hall": "/venues",
  "sdm": "/studios",
  "honeymoon-gifts": "/honeymoon-gifts",
  "honeymoon": "/honeymoon",
  "appliances": "/appliances",
  "suit": "/suit",
  "hanbok": "/hanbok",
  "invitation": "/invitation-venues",
};

const Studios = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasActiveFilters = useCategoryFilterStore((state) => state.hasActiveFilters);
  const resetFilters = useCategoryFilterStore((state) => state.resetFilters);

  useEffect(() => {
    resetFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleItemClick = (item: CategoryItem) => {
    navigate(`/studio/${item.id}`);
  };

  const handleTabChange = (href: string) => {
    navigate(href);
  };

  const handleCategoryTabChange = (tab: CategoryTab) => {
    navigate(tabToRoute[tab]);
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-center px-4 h-14">
          <h1 className="text-lg font-bold text-foreground">스드메</h1>
        </div>
      </header>

      {/* Category Tab Bar */}
      <CategoryTabBar activeTab="sdm" onTabChange={handleCategoryTabChange} />

      {/* Main Content */}
      <main className="pb-20">
        <CategoryHeroBanner category="studios" />
        
        {/* Filter Bar */}
        <CategoryFilterBar category="studios" />
        
        {/* Section Title */}
        <div className="px-4 py-3">
          <h2 className="text-lg font-bold text-foreground">
            {hasActiveFilters() ? "검색 결과" : "인기 스드메"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {hasActiveFilters() 
              ? "필터 조건에 맞는 스드메입니다"
              : "예비부부가 가장 많이 선택한 스드메 패키지"}
          </p>
        </div>

        <CategoryGrid category="studios" onItemClick={handleItemClick} />
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default Studios;
