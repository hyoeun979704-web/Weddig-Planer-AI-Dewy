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

const Suit = () => {
  const navigate = useNavigate();
  const hasActiveFilters = useCategoryFilterStore((state) => state.hasActiveFilters);
  const initWithRegion = useCategoryFilterStore((state) => state.initWithRegion);
  const { defaultRegion, isLoaded } = useDefaultRegion();

  useEffect(() => { if (isLoaded) initWithRegion(defaultRegion); }, [isLoaded]);

  const handleItemClick = (item: CategoryItem) => { navigate(`/suit/${item.id}`); };

  return (
    <AppLayout>
      <PageHeader title="예복" />
      <CategoryHeroBanner category="suits" />
      <CategoryFilterBar category="suits" />
      <div className="px-4 py-3">
        <h2 className="text-lg font-bold text-foreground">{hasActiveFilters() ? "검색 결과" : "인기 예복"}</h2>
        <p className="text-sm text-muted-foreground mt-1">{hasActiveFilters() ? "필터 조건에 맞는 예복샵입니다" : "신랑을 위한 완벽한 예복 컬렉션"}</p>
      </div>
      <CategoryGrid category="suits" onItemClick={handleItemClick} />
    </AppLayout>
  );
};

export default Suit;
