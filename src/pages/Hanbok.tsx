import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import CategoryHeroBanner from "@/components/CategoryHeroBanner";
import CategoryFilterBar from "@/components/CategoryFilterBar";
import CategoryGrid from "@/components/CategoryGrid";
import { useCategoryFilterStore } from "@/stores/useCategoryFilterStore";
import { CategoryItem } from "@/hooks/useCategoryData";

const Hanbok = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasActiveFilters = useCategoryFilterStore((state) => state.hasActiveFilters);
  const resetFilters = useCategoryFilterStore((state) => state.resetFilters);

  useEffect(() => { resetFilters(); }, []);

  const handleItemClick = (item: CategoryItem) => { navigate(`/hanbok/${item.id}`); };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center px-4 h-14">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground flex-1 text-center -mr-8">한복</h1>
        </div>
      </header>
      <main className="pb-20">
        <CategoryHeroBanner category="hanbok" />
        <CategoryFilterBar category="hanbok" />
        <div className="px-4 py-3">
          <h2 className="text-lg font-bold text-foreground">{hasActiveFilters() ? "검색 결과" : "인기 한복"}</h2>
          <p className="text-sm text-muted-foreground mt-1">{hasActiveFilters() ? "필터 조건에 맞는 한복샵입니다" : "전통과 현대가 어우러진 아름다운 한복"}</p>
        </div>
        <CategoryGrid category="hanbok" onItemClick={handleItemClick} />
      </main>
      <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Hanbok;
