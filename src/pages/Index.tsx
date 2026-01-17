import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import HeroBanner from "@/components/HeroBanner";
import VenueGrid from "@/components/VenueGrid";
import VenueDetailSheet from "@/components/VenueDetailSheet";
import { Venue } from "@/hooks/useVenues";

const Index = () => {
  const [activeTab, setActiveTab] = useState("/");
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleVenueClick = (venue: Venue) => {
    setSelectedVenue(venue);
    setSheetOpen(true);
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-lg font-bold text-foreground">웨딩홀</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">서울</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        <HeroBanner />
        
        {/* Section Title */}
        <div className="px-4 py-4">
          <h2 className="text-lg font-bold text-foreground">인기 웨딩홀</h2>
          <p className="text-sm text-muted-foreground mt-1">
            신뢰할 수 있는 파트너 웨딩홀을 만나보세요
          </p>
        </div>

        <VenueGrid onVenueClick={handleVenueClick} />
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Venue Detail Sheet */}
      <VenueDetailSheet
        venue={selectedVenue}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
};

export default Index;
