import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import AppLayout from "@/components/AppLayout";
import CategoryHeroBanner from "@/components/CategoryHeroBanner";
import CategoryFilterBar from "@/components/CategoryFilterBar";
import CategoryGrid from "@/components/CategoryGrid";
import { useCategoryFilterStore } from "@/stores/useCategoryFilterStore";
import { CategoryItem } from "@/hooks/useCategoryData";
import { useDefaultRegion } from "@/hooks/useDefaultRegion";

const InvitationVenues = () => {
  const navigate = useNavigate();
  const hasActiveFilters = useCategoryFilterStore((state) => state.hasActiveFilters);
  const initWithRegion = useCategoryFilterStore((state) => state.initWithRegion);
  const { defaultRegion, isLoaded } = useDefaultRegion();

  useEffect(() => { if (isLoaded) initWithRegion(defaultRegion); }, [isLoaded]);

  const handleItemClick = (item: CategoryItem) => { navigate(`/invitation-venues/${item.id}`); };

  return (
    <AppLayout>
      <PageHeader title="청첩장·모임" />
      <CategoryHeroBanner category="invitation_venues" />
      <CategoryFilterBar category="invitation_venues" />
      <div className="px-4 py-3">
        <h2 className="text-lg font-bold text-foreground">{hasActiveFilters() ? "검색 결과" : "추천 모임 장소"}</h2>
        <p className="text-sm text-muted-foreground mt-1">{hasActiveFilters() ? "필터 조건에 맞는 모임 장소입니다" : "청첩장 전달, 결혼 인사 자리에 딱 맞는 공간"}</p>
      </div>
      <CategoryGrid category="invitation_venues" onItemClick={handleItemClick} />
    </AppLayout>
  );
};

export default InvitationVenues;
