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

const Appliances = () => {
  const navigate = useNavigate();
  const hasActiveFilters = useCategoryFilterStore((state) => state.hasActiveFilters);
  const initWithRegion = useCategoryFilterStore((state) => state.initWithRegion);
  const { defaultRegion, isLoaded } = useDefaultRegion();

  useEffect(() => { if (isLoaded) initWithRegion(defaultRegion); }, [isLoaded]);

  const handleItemClick = (item: CategoryItem) => { navigate(`/appliances/${item.id}`); };

  return (
    <AppLayout>
      <PageHeader title="혼수가전" />
      <CategoryHeroBanner category="appliances" />
      <CategoryFilterBar category="appliances" />
      <div className="px-4 py-3">
        <h2 className="text-lg font-bold text-foreground">{hasActiveFilters() ? "검색 결과" : "인기 혼수가전"}</h2>
        <p className="text-sm text-muted-foreground mt-1">{hasActiveFilters() ? "필터 조건에 맞는 상품입니다" : "신혼생활에 꼭 필요한 가전제품"}</p>
      </div>
      <CategoryGrid category="appliances" onItemClick={handleItemClick} />
    </AppLayout>
  );
};

export default Appliances;
