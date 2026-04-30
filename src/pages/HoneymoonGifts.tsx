import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import CategoryHeroBanner from "@/components/CategoryHeroBanner";
import CategoryFilterBar from "@/components/CategoryFilterBar";
import CategoryGrid from "@/components/CategoryGrid";
import { useCategoryFilterStore } from "@/stores/useCategoryFilterStore";
import { CategoryItem } from "@/hooks/useCategoryData";
import { useDefaultRegion } from "@/hooks/useDefaultRegion";

const HoneymoonGifts = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasActiveFilters = useCategoryFilterStore((state) => state.hasActiveFilters);
  const initWithRegion = useCategoryFilterStore((state) => state.initWithRegion);
  const { defaultRegion, isLoaded } = useDefaultRegion();

  useEffect(() => { if (isLoaded) initWithRegion(defaultRegion); }, [isLoaded]);

  // jewelry는 aggregator 모델 — 카드 클릭 시 브랜드 베스트셀러 상품 페이지로 이동.
  // product_url이 비어 있으면 내부 detail 페이지로 fallback (거기서 website/naver_place로 이동).
  const handleItemClick = (item: CategoryItem) => {
    const url = item.product_url as string | undefined;
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    navigate(`/honeymoon-gifts/${item.id}`);
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <PageHeader title="예물예단" />
      <main className="pb-20">
        <CategoryHeroBanner category="honeymoon_gifts" />
        <CategoryFilterBar category="honeymoon_gifts" />
        <div className="px-4 py-3">
          <h2 className="text-lg font-bold text-foreground">{hasActiveFilters() ? "검색 결과" : "인기 예물예단"}</h2>
          <p className="text-sm text-muted-foreground mt-1">{hasActiveFilters() ? "필터 조건에 맞는 예물예단입니다" : "결혼 반지, 예물, 예단 한눈에 비교"}</p>
        </div>
        <CategoryGrid category="honeymoon_gifts" onItemClick={handleItemClick} />
      </main>
      <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default HoneymoonGifts;
