import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import CategoryHeroBanner from "@/components/CategoryHeroBanner";
import CategoryFilterBar from "@/components/CategoryFilterBar";
import CategoryGrid from "@/components/CategoryGrid";
import { useCategoryFilterStore } from "@/stores/useCategoryFilterStore";
import { CategoryItem } from "@/hooks/useCategoryData";

const HoneymoonGifts = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasActiveFilters = useCategoryFilterStore((state) => state.hasActiveFilters);
  const resetFilters = useCategoryFilterStore((state) => state.resetFilters);

  useEffect(() => {
    resetFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleItemClick = (item: CategoryItem) => {
    navigate(`/honeymoon-gifts/${item.id}`);
  };

  const handleTabChange = (href: string) => {
    navigate(href);
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-lg font-bold text-foreground">혼수·골든타임</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">전국</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        <CategoryHeroBanner category="honeymoon_gifts" />
        
        {/* Filter Bar */}
        <CategoryFilterBar category="honeymoon_gifts" />
        
        {/* Section Title */}
        <div className="px-4 py-3">
          <h2 className="text-lg font-bold text-foreground">
            {hasActiveFilters() ? "검색 결과" : "혼수 특가"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {hasActiveFilters() 
              ? "필터 조건에 맞는 혼수 상품입니다"
              : "지금 가장 인기있는 혼수 상품"}
          </p>
        </div>

        <CategoryGrid category="honeymoon_gifts" onItemClick={handleItemClick} />
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default HoneymoonGifts;
