import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import CategoryHeroBanner from "@/components/CategoryHeroBanner";
import VenueGrid from "@/components/VenueGrid";
import FilterBar from "@/components/FilterBar";
import CategoryTabBar, { CategoryTab } from "@/components/home/CategoryTabBar";
import { Venue } from "@/hooks/useVenues";
import { useFilterStore } from "@/stores/useFilterStore";

const tabToRoute: Record<CategoryTab, string> = {
  "home": "/",
  "wedding-hall": "/venues",
  "sdm": "/studios",
  "honeymoon-gifts": "/honeymoon-gifts",
  "honeymoon": "/honeymoon",
  "appliances": "/appliances",
  "suit": "/suit",
  "hanbok": "/hanbok",
  "invitation": "/invitation-venues",
};

const Venues = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasActiveFilters = useFilterStore((state) => state.hasActiveFilters);
  const resetFilters = useFilterStore((state) => state.resetFilters);

  useEffect(() => {
    resetFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVenueClick = (venue: Venue) => {
    navigate(`/venue/${venue.id}`);
  };

  const handleTabChange = (href: string) => {
    navigate(href);
  };

  const handleCategoryTabChange = (tab: CategoryTab) => {
    navigate(tabToRoute[tab]);
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-center px-4 h-14">
          <h1 className="text-lg font-bold text-foreground">웨딩홀</h1>
        </div>
      </header>

      {/* Category Tab Bar */}
      <CategoryTabBar activeTab="wedding-hall" onTabChange={handleCategoryTabChange} />

      {/* Main Content */}
      <main className="pb-20">
        <CategoryHeroBanner category="venues" />
        
        {/* Filter Bar */}
        <FilterBar />
        
        {/* Section Title */}
        <div className="px-4 pb-3">
          <h2 className="text-lg font-bold text-foreground">
            {hasActiveFilters() ? "검색 결과" : "인기 웨딩홀"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {hasActiveFilters() 
              ? "필터 조건에 맞는 웨딩홀입니다"
              : "신뢰할 수 있는 파트너 웨딩홀을 만나보세요"}
          </p>
        </div>

        <VenueGrid onVenueClick={handleVenueClick} />
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default Venues;
