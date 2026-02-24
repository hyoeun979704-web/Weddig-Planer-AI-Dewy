import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import CategoryHeroBanner from "@/components/CategoryHeroBanner";
import VenueGrid from "@/components/VenueGrid";
import FilterBar from "@/components/FilterBar";
import { Venue } from "@/hooks/useVenues";
import { useFilterStore } from "@/stores/useFilterStore";
import { useDefaultRegion } from "@/hooks/useDefaultRegion";

const Venues = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasActiveFilters = useFilterStore((state) => state.hasActiveFilters);
  const initWithRegion = useFilterStore((state) => state.initWithRegion);
  const { defaultRegion, isLoaded } = useDefaultRegion();

  useEffect(() => { if (isLoaded) initWithRegion(defaultRegion); }, [isLoaded]);

  const handleVenueClick = (venue: Venue) => { navigate(`/venue/${venue.number}`); };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center px-4 h-14">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground flex-1 text-center -mr-8">웨딩홀</h1>
        </div>
      </header>
      <main className="pb-20">
        <CategoryHeroBanner category="venues" />
        <FilterBar />
        <div className="px-4 pb-3">
          <h2 className="text-lg font-bold text-foreground">{hasActiveFilters() ? "검색 결과" : "인기 웨딩홀"}</h2>
          <p className="text-sm text-muted-foreground mt-1">{hasActiveFilters() ? "필터 조건에 맞는 웨딩홀입니다" : "신뢰할 수 있는 파트너 웨딩홀을 만나보세요"}</p>
        </div>
        <VenueGrid onVenueClick={handleVenueClick} />
      </main>
      <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Venues;
