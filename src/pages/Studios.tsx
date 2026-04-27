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

const Studios = () => {
  const navigate = useNavigate();
  const hasActiveFilters = useCategoryFilterStore((state) => state.hasActiveFilters);
  const initWithRegion = useCategoryFilterStore((state) => state.initWithRegion);
  const { defaultRegion, isLoaded } = useDefaultRegion();

  useEffect(() => { if (isLoaded) initWithRegion(defaultRegion); }, [isLoaded]);

  const handleItemClick = (item: CategoryItem) => { navigate(`/studio/${item.id}`); };

  return (
    <AppLayout>
      <PageHeader title="스드메" />
      <CategoryHeroBanner category="studios" />
      <CategoryFilterBar category="studios" />
      <div className="px-4 py-3">
        <h2 className="text-lg font-bold text-foreground">{hasActiveFilters() ? "검색 결과" : "인기 스드메"}</h2>
        <p className="text-sm text-muted-foreground mt-1">{hasActiveFilters() ? "필터 조건에 맞는 스드메입니다" : "예비부부가 가장 많이 선택한 스드메 패키지"}</p>
      </div>
      <CategoryGrid category="studios" onItemClick={handleItemClick} />
    </AppLayout>
  );
};

export default Studios;
