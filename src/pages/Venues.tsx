import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import CategoryHeroBanner from "@/components/CategoryHeroBanner";
import VenueGrid from "@/components/VenueGrid";
import FilterBar from "@/components/FilterBar";
import { Venue } from "@/hooks/useVenues";
import { useFilterStore } from "@/stores/useFilterStore";
import { useDefaultRegion } from "@/hooks/useDefaultRegion";
import { normalizeRegion } from "@/lib/regions";

const Venues = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasActiveFilters = useFilterStore((state) => state.hasActiveFilters);
  const initWithRegion = useFilterStore((state) => state.initWithRegion);
  const { defaultRegion, isLoaded } = useDefaultRegion();

  // wedding_region이 라벨 형태("충남","제주")로 저장되면 ILIKE %충남% 가
  // DB의 "충청남도" 와 매칭 안됨. value 형태("충청남")로 정규화 후 적용.
  useEffect(() => { if (isLoaded) initWithRegion(normalizeRegion(defaultRegion)); }, [isLoaded]);

  const handleVenueClick = (venue: Venue) => { navigate(`/venue/${venue.id}`); };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <PageHeader title="웨딩홀" />
      <main className="pb-20">
        <CategoryHeroBanner category="venues" />
        <FilterBar />
        <div className="px-4 pb-3">
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
