import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import CategoryHeroBanner from "@/components/CategoryHeroBanner";
import CategoryFilterBar from "@/components/CategoryFilterBar";
import CategoryGrid from "@/components/CategoryGrid";
import { useCategoryFilterStore } from "@/stores/useCategoryFilterStore";
import { CategoryItem } from "@/hooks/useCategoryData";

const Jewelry = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasActiveFilters = useCategoryFilterStore((state) => state.hasActiveFilters);
  const initWithRegion = useCategoryFilterStore((state) => state.initWithRegion);

  // jewelry는 places.city가 매장 도시 (서울/강남구). region 칩은 brand_tier로 동작.
  // 사용자 wedding_region (한국 주거지)을 brand_tier로 쓰면 매칭 안 되므로 비워둠.
  useEffect(() => { initWithRegion(null); }, []);

  // aggregator 모델 — 카드 클릭 시 브랜드 베스트셀러 상품 페이지로 이동.
  // product_url이 비어 있으면 내부 detail 페이지로 fallback (거기서 website/naver_place로 이동).
  const handleItemClick = (item: CategoryItem) => {
    const url = item.product_url as string | undefined;
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    navigate(`/jewelry/${item.id}`);
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <PageHeader title="예물·예단" />
      <main className="pb-20">
        <CategoryHeroBanner category="jewelry" />
        <CategoryFilterBar category="jewelry" />
        <div className="px-4 py-3">
          <h2 className="text-lg font-bold text-foreground">{hasActiveFilters() ? "검색 결과" : "인기 예물·예단"}</h2>
          <p className="text-sm text-muted-foreground mt-1">{hasActiveFilters() ? "필터 조건에 맞는 예물·예단입니다" : "결혼반지, 예물세트 한눈에 비교"}</p>
        </div>
        <CategoryGrid category="jewelry" onItemClick={handleItemClick} />
      </main>
      <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Jewelry;
