import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import CategoryHeroBanner from "@/components/CategoryHeroBanner";
import CategoryFilterBar from "@/components/CategoryFilterBar";
import CategoryGrid from "@/components/CategoryGrid";
import { useCategoryFilterStore } from "@/stores/useCategoryFilterStore";
import { CategoryItem } from "@/hooks/useCategoryData";

const Appliances = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasActiveFilters = useCategoryFilterStore((state) => state.hasActiveFilters);
  const initWithRegion = useCategoryFilterStore((state) => state.initWithRegion);

  // appliance 페이지의 region 칩은 product_type(매장/패키지/단품)을 의미하므로
  // 사용자 wedding_region(서울 등)을 자동 적용하면 매칭이 안 됨. 비워서 시작.
  useEffect(() => { initWithRegion(null); }, []);

  // hybrid: package/single은 product_url 클릭으로 외부 이동 (aggregator),
  // store는 내부 detail 페이지로 (매장 정보 + naver_place 안내).
  const handleItemClick = (item: CategoryItem) => {
    const url = item.product_url as string | undefined;
    const type = item.product_type as string | undefined;
    if ((type === "package" || type === "single") && url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    navigate(`/appliances/${item.id}`);
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <PageHeader title="혼수" />
      <main className="pb-20">
        <CategoryHeroBanner category="appliances" />
        <CategoryFilterBar category="appliances" />
        <div className="px-4 py-3">
          <h2 className="text-lg font-bold text-foreground">{hasActiveFilters() ? "검색 결과" : "인기 혼수"}</h2>
          <p className="text-sm text-muted-foreground mt-1">{hasActiveFilters() ? "필터 조건에 맞는 상품입니다" : "매장·패키지·단품 한눈에 비교"}</p>
        </div>
        <CategoryGrid category="appliances" onItemClick={handleItemClick} />
      </main>
      <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Appliances;
