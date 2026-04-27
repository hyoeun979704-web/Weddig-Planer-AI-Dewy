import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, ArrowLeft, Star } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useFavorites, ItemType } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const favTabs = [
  { id: "vendor", label: "업체", types: ["venue", "studio", "honeymoon", "honeymoon_gift", "appliance", "suit", "hanbok", "invitation_venues"] as ItemType[] },
  { id: "event", label: "이벤트", types: ["deal"] as ItemType[] },
  { id: "shopping", label: "쇼핑", types: ["product"] as ItemType[] },
  { id: "info", label: "정보", types: ["influencer"] as ItemType[] },
] as const;

type FavTabId = (typeof favTabs)[number]["id"];

// All vendor-side favorites resolve through the unified `places` table now.
// item_type strings (set when the user toggles a favorite) map to the
// `places.category` slug; the legacy per-category tables were dropped during
// schema cleanup.
const ITEM_TYPE_TO_PLACE_CATEGORY: Record<string, string> = {
  venue: "wedding_hall",
  studio: "studio",
  honeymoon: "honeymoon",
  honeymoon_gift: "appliance",
  appliance: "appliance",
  suit: "tailor_shop",
  hanbok: "hanbok",
  invitation_venues: "invitation_venue",
};

// Where the detail page lives. Most categories share /vendor/:id (places-uuid).
const ITEM_TYPE_DETAIL_PATH: Record<string, string> = {
  venue: "/venue",
  studio: "/vendor",
  honeymoon: "/vendor",
  honeymoon_gift: "/vendor",
  appliance: "/vendor",
  suit: "/vendor",
  hanbok: "/vendor",
  invitation_venues: "/vendor",
};

interface FavItem {
  id: string;
  item_id: string;
  item_type: string;
  name: string;
  thumbnail_url: string | null;
  rating?: number;
}

const Favorites = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { favorites, isLoading: favsLoading, toggleFavorite } = useFavorites();
  const [activeTab, setActiveTab] = useState<FavTabId>("vendor");

  const currentTab = favTabs.find((t) => t.id === activeTab)!;
  const filteredFavs = favorites.filter((f) => (currentTab.types as string[]).includes(f.item_type));

  // Fetch item details for filtered favorites. Vendor-tab items all resolve
  // through one places query (filtered by uuid); other tabs are stubs for now.
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["favorite-items", activeTab, filteredFavs.map((f) => f.item_id)],
    queryFn: async (): Promise<FavItem[]> => {
      if (filteredFavs.length === 0) return [];

      // Vendor tab: all item_types map to places (uuid place_id). One round-trip.
      if (activeTab === "vendor") {
        const ids = filteredFavs.map((f) => f.item_id);
        const { data } = await supabase
          .from("places")
          .select("place_id, name, main_image_url, avg_rating, category")
          .in("place_id", ids);
        if (!data) return [];
        const out: FavItem[] = [];
        for (const p of data) {
          const fav = filteredFavs.find((f) => f.item_id === p.place_id);
          if (!fav) continue;
          out.push({
            id: fav.id,
            item_id: p.place_id,
            item_type: fav.item_type,
            name: p.name,
            thumbnail_url: p.main_image_url,
            rating: p.avg_rating ?? undefined,
          });
        }
        return out;
      }

      // Non-vendor tabs (event/shopping/info) — not yet implemented.
      return [];
    },
    enabled: filteredFavs.length > 0,
  });

  const isLoading = favsLoading || itemsLoading;

  const getDetailPath = (item: FavItem) => {
    const base = ITEM_TYPE_DETAIL_PATH[item.item_type] ?? "/vendor";
    return `${base}/${item.item_id}`;
  };

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-14 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">찜 목록</h1>
        </div>

        {/* Category Tabs */}
        <div className="flex px-4 pb-3 gap-2">
          {favTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <div className="px-4 py-4">
        {!user ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Heart className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">로그인이 필요합니다</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              찜 목록을 확인하려면<br />로그인해주세요
            </p>
            <button
              onClick={() => navigate("/auth")}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium"
            >
              로그인하기
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredFavs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Heart className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">찜한 항목이 없습니다</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              마음에 드는 항목을<br />하트를 눌러 저장해보세요
            </p>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium"
            >
              둘러보기
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 bg-card rounded-2xl border border-border"
              >
                <button
                  onClick={() => navigate(getDetailPath(item))}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                    {item.thumbnail_url ? (
                      <img src={item.thumbnail_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No img</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm truncate">{item.name}</h3>
                    {item.rating && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3 h-3 fill-primary text-primary" />
                        <span className="text-xs text-muted-foreground">{item.rating}</span>
                      </div>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => toggleFavorite(item.item_id, item.item_type as ItemType)}
                  className="p-2 flex-shrink-0"
                >
                  <Heart className="w-5 h-5 fill-primary text-primary" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Favorites;
