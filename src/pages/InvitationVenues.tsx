import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Star, MapPin, Users } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import CategoryTabBar, { CategoryTab } from "@/components/home/CategoryTabBar";
import { supabase } from "@/integrations/supabase/client";

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

interface InvitationVenue {
  id: string;
  name: string;
  address: string;
  price_range: string;
  capacity_range: string;
  rating: number;
  review_count: number;
  is_partner: boolean;
  thumbnail_url: string | null;
  venue_types: string[] | null;
  amenity_options: string[] | null;
  cuisine_options: string[] | null;
}

const InvitationVenues = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { data: venues, isLoading } = useQuery({
    queryKey: ['invitation-venues'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('invitation_venues')
        .select('*')
        .order('is_partner', { ascending: false })
        .order('rating', { ascending: false });
      
      if (error) throw error;
      return data as InvitationVenue[];
    },
  });

  const handleTabChange = (href: string) => {
    navigate(href);
  };

  const handleCategoryTabChange = (tab: CategoryTab) => {
    navigate(tabToRoute[tab]);
  };

  const handleVenueClick = (venue: InvitationVenue) => {
    navigate(`/invitation-venues/${venue.id}`);
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-center px-4 h-14">
          <h1 className="text-lg font-bold text-foreground">청첩장 모임</h1>
        </div>
      </header>

      {/* Category Tab Bar */}
      <CategoryTabBar activeTab="invitation" onTabChange={handleCategoryTabChange} />

      {/* Main Content */}
      <main className="pb-20">
        {/* Hero Banner */}
        <div className="relative bg-gradient-to-br from-pink-100/50 via-pink-50/30 to-background px-4 py-8 overflow-hidden">
          <div className="absolute top-4 right-4 w-24 h-24 bg-pink-200/30 rounded-full blur-2xl" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-200 bg-opacity-50 rounded-full mb-3">
              <span className="text-base">✉️</span>
              <span className="text-xs font-medium text-pink-600">청첩장 모임</span>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              소중한 분들과<br />
              <span className="text-pink-600">특별한 자리</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              가족, 친구들과 함께하는 청첩장 모임 장소
            </p>
          </div>
        </div>

        {/* Section Title */}
        <div className="px-4 py-3">
          <h2 className="text-lg font-bold text-foreground">추천 모임 장소</h2>
          <p className="text-sm text-muted-foreground mt-1">
            청첩장 전달, 결혼 인사 자리에 딱 맞는 공간
          </p>
        </div>

        {/* Venue Grid */}
        <div className="px-4">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-card rounded-2xl overflow-hidden border border-border animate-pulse">
                  <div className="aspect-[4/3] bg-muted" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : venues && venues.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {venues.map((venue) => (
                <button
                  key={venue.id}
                  onClick={() => handleVenueClick(venue)}
                  className="bg-card rounded-2xl overflow-hidden border border-border hover:border-primary/30 transition-colors text-left"
                >
                  <div className="relative aspect-[4/3] bg-muted">
                    {venue.thumbnail_url ? (
                      <img
                        src={venue.thumbnail_url}
                        alt={venue.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        🍽️
                      </div>
                    )}
                    {venue.is_partner && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full">
                        파트너
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-sm text-foreground line-clamp-1 mb-1">
                      {venue.name}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <MapPin className="w-3 h-3" />
                      <span className="line-clamp-1">{venue.address}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <Users className="w-3 h-3" />
                      <span>{venue.capacity_range}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span className="text-xs font-medium">{venue.rating}</span>
                        <span className="text-xs text-muted-foreground">
                          ({venue.review_count})
                        </span>
                      </div>
                      <span className="text-xs font-bold text-primary">
                        {venue.price_range.split('~')[0]}~
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <span className="text-4xl mb-4">✉️</span>
              <p className="text-muted-foreground">등록된 모임 장소가 없습니다</p>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default InvitationVenues;
