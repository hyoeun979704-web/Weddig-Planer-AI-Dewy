import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import CategoryHeroBanner from "@/components/CategoryHeroBanner";
import CategoryFilterBar from "@/components/CategoryFilterBar";
import CategoryGrid from "@/components/CategoryGrid";
import { useCategoryFilterStore } from "@/stores/useCategoryFilterStore";
import { CategoryItem } from "@/hooks/useCategoryData";

const Appliances = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasActiveFilters, resetFilters } = useCategoryFilterStore();

  useEffect(() => {
    resetFilters();
  }, [resetFilters]);

  const handleItemClick = (item: CategoryItem) => {
    navigate(`/appliances/${item.id}`);
  };

  const handleTabChange = (href: string) => {
    navigate(href);
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-lg font-bold text-foreground">가전·예물</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">전국</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        <CategoryHeroBanner category="appliances" />
        
        {/* Filter Bar */}
        <CategoryFilterBar category="appliances" />
        
        {/* Section Title */}
        <div className="px-4 py-3">
          <h2 className="text-lg font-bold text-foreground">
            {hasActiveFilters() ? "검색 결과" : "인기 예물·가전"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {hasActiveFilters() 
              ? "필터 조건에 맞는 상품입니다"
              : "예비부부를 위한 특별한 선물"}
          </p>
        </div>

        <CategoryGrid category="appliances" onItemClick={handleItemClick} />
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default Appliances;
