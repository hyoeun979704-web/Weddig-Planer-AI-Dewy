import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import CategoryHeroBanner from "@/components/CategoryHeroBanner";
import VenueGrid from "@/components/VenueGrid";
import FilterBar from "@/components/FilterBar";
import { Venue } from "@/hooks/useVenues";
import { useFilterStore } from "@/stores/useFilterStore";
import { useDefaultRegion } from "@/hooks/useDefaultRegion";

const Venues = () => {
  const navigate = useNavigate();
  const hasActiveFilters = useFilterStore((state) => state.hasActiveFilters);
  const initWithRegion = useFilterStore((state) => state.initWithRegion);
  const { defaultRegion, isLoaded } = useDefaultRegion();

  useEffect(() => { if (isLoaded) initWithRegion(defaultRegion); }, [isLoaded]);

  const handleVenueClick = (venue: Venue) => { navigate(`/venue/${venue.id}`); };

  return (
    <AppLayout>
      <PageHeader title="웨딩홀" />
      <CategoryHeroBanner category="venues" />
      <FilterBar />
      <div className="px-4 pb-3">
        <h2 className="text-lg font-bold text-foreground">{hasActiveFilters() ? "검색 결과" : "인기 웨딩홀"}</h2>
        <p className="text-sm text-muted-foreground mt-1">{hasActiveFilters() ? "필터 조건에 맞는 웨딩홀입니다" : "지역별 인기 웨딩홀을 비교해 보세요"}</p>
      </div>
      <VenueGrid onVenueClick={handleVenueClick} />
    </AppLayout>
  );
};

export default Venues;
