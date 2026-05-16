import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import CategoryHeroBanner from "@/components/CategoryHeroBanner";
import ExcludedCategoryBanner from "@/components/ExcludedCategoryBanner";
import VenueGrid from "@/components/VenueGrid";
import FilterBar from "@/components/FilterBar";
import { Venue } from "@/hooks/useVenues";
import { useFilterStore } from "@/stores/useFilterStore";
import { useDefaultRegion } from "@/hooks/useDefaultRegion";
import { useWeddingProfile } from "@/hooks/useWeddingProfile";
import { normalizeRegion } from "@/lib/regions";

const Venues = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasActiveFilters = useFilterStore((state) => state.hasActiveFilters);
  const initWithRegion = useFilterStore((state) => state.initWithRegion);
  const { defaultRegion, isLoaded } = useDefaultRegion();
  const { weddingStyle } = useWeddingProfile();

  // wedding_region이 라벨 형태("충남","제주")로 저장되면 ILIKE %충남% 가
  // DB의 "충청남도" 와 매칭 안됨. value 형태("충청남")로 정규화 후 적용.
  useEffect(() => { if (isLoaded) initWithRegion(normalizeRegion(defaultRegion)); }, [isLoaded]);

  const handleVenueClick = (venue: Venue) => { navigate(`/venue/${venue.id}`); };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <PageHeader title="웨딩홀" />
      <main className="pb-20">
        <ExcludedCategoryBanner scheduleCategories="wedding_hall" />
        <CategoryHeroBanner category="venues" />
        <FilterBar />
        {weddingStyle === "small" && (
          // Filter UI already supports the relevant venue types (하우스,
          // 채플, etc.) — small-wedding users just need a nudge that the
          // typical "호텔" / "컨벤션" defaults aren't their best fit.
          <div className="mx-4 mt-2 rounded-md bg-rose-50 border border-rose-100 px-3 py-2 flex items-center gap-2 text-[12px] text-rose-700">
            <Sparkles className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            <span>
              스몰웨딩 추천 — 위 필터의 <b>홀 유형</b>에서 “하우스 / 채플” 을 선택해보세요.
            </span>
          </div>
        )}
        <div className="px-4 pt-3 pb-3">
          <h2 className="text-lg font-bold text-foreground">{hasActiveFilters() ? "검색 결과" : "인기 웨딩홀"}</h2>
          <p className="text-sm text-muted-foreground mt-1">{hasActiveFilters() ? "필터 조건에 맞는 웨딩홀입니다" : "지역별 인기 웨딩홀을 비교해 보세요"}</p>
        </div>
        <VenueGrid onVenueClick={handleVenueClick} />
      </main>
      <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Venues;
