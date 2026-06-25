import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Seo from "@/components/Seo";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import CategoryHeroBanner from "@/components/CategoryHeroBanner";
import CategoryFilterBar from "@/components/CategoryFilterBar";
import CategoryGrid from "@/components/CategoryGrid";
import ExcludedCategoryBanner from "@/components/ExcludedCategoryBanner";
import VenueAnchorBanner from "@/components/persona/VenueAnchorBanner";
import { useCategoryFilterStore } from "@/stores/useCategoryFilterStore";
import { CategoryItem } from "@/hooks/useCategoryData";
import { useDefaultRegion } from "@/hooks/useDefaultRegion";
import { normalizeRegion } from "@/lib/regions";

const Hanbok = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasActiveFilters = useCategoryFilterStore((state) => state.hasActiveFilters);
  const initWithRegion = useCategoryFilterStore((state) => state.initWithRegion);
  const { defaultRegion, isLoaded } = useDefaultRegion();

  useEffect(() => { if (isLoaded) initWithRegion(normalizeRegion(defaultRegion)); }, [isLoaded]);

  const handleItemClick = (item: CategoryItem) => { navigate(`/hanbok/${item.id}`); };

  return (
    <div className="min-h-screen bg-background app-col mx-auto relative">
      <Seo title="결혼 한복·예복 한복 | Dewy" description="신부·신랑 한복 추천, 대여·맞춤 비교. 본식 한복부터 폐백 의상까지 스타일별 가이드." path="/hanbok" />
      <PageHeader title="한복" />
      <main className="pb-20">
        <ExcludedCategoryBanner scheduleCategories="hanbok" />
        <CategoryHeroBanner category="hanbok" />
        <VenueAnchorBanner />
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
