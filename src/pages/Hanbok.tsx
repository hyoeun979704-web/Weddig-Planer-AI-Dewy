import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import CategoryHeroBanner from "@/components/CategoryHeroBanner";
import CategoryFilterBar from "@/components/CategoryFilterBar";
import CategoryGrid from "@/components/CategoryGrid";
import { useCategoryFilterStore } from "@/stores/useCategoryFilterStore";
import { CategoryItem } from "@/hooks/useCategoryData";

const Hanbok = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasActiveFilters, resetFilters } = useCategoryFilterStore();

  useEffect(() => {
    resetFilters();
  }, [resetFilters]);

  const handleItemClick = (item: CategoryItem) => {
    navigate(`/hanbok/${item.id}`);
  };

  const handleTabChange = (href: string) => {
    navigate(href);
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-lg font-bold text-foreground">한복</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">서울</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        <CategoryHeroBanner category="hanbok" />
        
        {/* Filter Bar */}
        <CategoryFilterBar category="hanbok" />
        
        {/* Section Title */}
        <div className="px-4 py-3">
          <h2 className="text-lg font-bold text-foreground">
            {hasActiveFilters() ? "검색 결과" : "인기 한복"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {hasActiveFilters() 
              ? "필터 조건에 맞는 한복샵입니다"
              : "전통과 현대가 어우러진 아름다운 한복"}
          </p>
        </div>

        <CategoryGrid category="hanbok" onItemClick={handleItemClick} />
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default Hanbok;
