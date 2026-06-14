import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
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
import Seo from "@/components/Seo";

const Studios = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasActiveFilters = useCategoryFilterStore((state) => state.hasActiveFilters);
  const initWithRegion = useCategoryFilterStore((state) => state.initWithRegion);
  const { defaultRegion, isLoaded } = useDefaultRegion();

  useEffect(() => { if (isLoaded) initWithRegion(normalizeRegion(defaultRegion)); }, [isLoaded]);

  const handleItemClick = (item: CategoryItem) => { navigate(`/studio/${item.id}`); };

  return (
    <div className="min-h-screen bg-background app-col mx-auto relative">
      <Seo title="스드메 추천·비교 (스튜디오·드레스·메이크업) | Dewy" description="예비부부가 가장 많이 선택한 스드메 패키지를 비교하세요. 촬영 스타일·드레스·메이크업 옵션별 추천과 후기까지 한 곳에서." path="/studios" />
      <PageHeader title="스드메" />
      <main className="pb-20">
        <ExcludedCategoryBanner
          scheduleCategories={["studio", "dress_shop", "makeup_shop"]}
        />
        <CategoryHeroBanner category="studios" />
        <VenueAnchorBanner />
        <CategoryFilterBar category="studios" />
        <div className="px-4 py-3">
          <h2 className="text-lg font-bold text-foreground">{hasActiveFilters() ? "검색 결과" : "인기 스드메"}</h2>
          <p className="text-sm text-muted-foreground mt-1">{hasActiveFilters() ? "필터 조건에 맞는 스드메입니다" : "예비부부가 가장 많이 선택한 스드메 패키지"}</p>
        </div>
        <CategoryGrid category="studios" onItemClick={handleItemClick} />
      </main>
      <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Studios;
