import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import CategoryHeroBanner from "@/components/CategoryHeroBanner";
import CategoryFilterBar from "@/components/CategoryFilterBar";
import CategoryGrid from "@/components/CategoryGrid";
import { useCategoryFilterStore } from "@/stores/useCategoryFilterStore";
import { CategoryItem } from "@/hooks/useCategoryData";

const Honeymoon = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasActiveFilters = useCategoryFilterStore((state) => state.hasActiveFilters);
  const initWithRegion = useCategoryFilterStore((state) => state.initWithRegion);

  // 허니문은 places.city가 "일본"/"동남아" 등 destination region_group으로 채워져
  // 있어 사용자의 한국 거주지(wedding_region)를 region 필터로 쓰면 결과가 0건이 됨.
  // 따라서 마운트 시 region을 비워두고 사용자가 직접 destination을 골라야 필터링.
  useEffect(() => { initWithRegion(null); }, []);

  // 허니문은 aggregator 모델 — 카드 클릭 시 여행사 상품 페이지로 이동.
  // agency_product_url이 비어 있으면 fallback으로 내부 detail 페이지를 연다.
  const handleItemClick = (item: CategoryItem) => {
    const url = item.agency_product_url as string | undefined;
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    navigate(`/honeymoon/${item.id}`);
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <PageHeader title="허니문" />
      <main className="pb-20">
        <CategoryHeroBanner category="honeymoon" />
        <CategoryFilterBar category="honeymoon" />
        <div className="px-4 py-3">
          <h2 className="text-lg font-bold text-foreground">{hasActiveFilters() ? "검색 결과" : "인기 허니문"}</h2>
          <p className="text-sm text-muted-foreground mt-1">{hasActiveFilters() ? "필터 조건에 맞는 허니문입니다" : "예비부부가 가장 많이 선택한 여행지"}</p>
        </div>
        <CategoryGrid category="honeymoon" onItemClick={handleItemClick} />
      </main>
      <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Honeymoon;
