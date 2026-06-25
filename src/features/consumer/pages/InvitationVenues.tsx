import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import CategoryHeroBanner from "@/components/CategoryHeroBanner";
import CategoryFilterBar from "@/components/CategoryFilterBar";
import CategoryGrid from "@/components/CategoryGrid";
import VenueCrossLink from "@/components/VenueCrossLink";
import { useCategoryFilterStore } from "@/stores/useCategoryFilterStore";
import { CategoryItem } from "@/hooks/useCategoryData";
import { useDefaultRegion } from "@/hooks/useDefaultRegion";
import { normalizeRegion } from "@/lib/regions";
import Seo from "@/components/Seo";

const InvitationVenues = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasActiveFilters = useCategoryFilterStore((state) => state.hasActiveFilters);
  const initWithRegion = useCategoryFilterStore((state) => state.initWithRegion);
  const { defaultRegion, isLoaded } = useDefaultRegion();

  useEffect(() => { if (isLoaded) initWithRegion(normalizeRegion(defaultRegion)); }, [isLoaded]);

  const handleItemClick = (item: CategoryItem) => { navigate(`/invitation-venues/${item.id}`); };

  return (
    <div className="min-h-screen bg-background app-col mx-auto relative">
      <Seo title="청첩장 모임 장소 추천 | Dewy" description="청첩장 전달과 결혼 인사 자리에 딱 맞는 모임 장소를 추천해 드려요. 레스토랑·한정식·카페·파인다이닝 등 인원별 공간 비교." path="/invitation-venues" />
      <PageHeader title="청첩장·모임" />
      <main className="pb-20">
        <CategoryHeroBanner category="invitation_venues" />
        <VenueCrossLink variant="invitation-venues" />
        <CategoryFilterBar category="invitation_venues" />
        <div className="px-4 py-3">
          <h2 className="text-lg font-bold text-foreground">{hasActiveFilters() ? "검색 결과" : "추천 모임 장소"}</h2>
          <p className="text-sm text-muted-foreground mt-1">{hasActiveFilters() ? "필터 조건에 맞는 모임 장소입니다" : "청첩장 전달, 결혼 인사 자리에 딱 맞는 공간"}</p>
        </div>
        <CategoryGrid category="invitation_venues" onItemClick={handleItemClick} />
      </main>
      <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default InvitationVenues;
