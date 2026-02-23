import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Heart, ArrowLeft, Star } from "lucide-react";
import BottomNav from "@/components/BottomNav";
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

const tableMap: Record<string, { table: string; detailPath: string }> = {
  venue: { table: "venues", detailPath: "/venues" },
  studio: { table: "studios", detailPath: "/studios" },
  honeymoon: { table: "honeymoon", detailPath: "/honeymoon" },
  honeymoon_gift: { table: "honeymoon_gifts", detailPath: "/honeymoon-gifts" },
  appliance: { table: "appliances", detailPath: "/appliances" },
  suit: { table: "suits", detailPath: "/suits" },
  hanbok: { table: "hanbok", detailPath: "/hanbok" },
  invitation_venues: { table: "invitation_venues", detailPath: "/invitation-venues" },
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
  const location = useLocation();
  const { user } = useAuth();
  const { favorites, isLoading: favsLoading, toggleFavorite } = useFavorites();
  const [activeTab, setActiveTab] = useState<FavTabId>("vendor");

  const currentTab = favTabs.find((t) => t.id === activeTab)!;
  const filteredFavs = favorites.filter((f) => (currentTab.types as string[]).includes(f.item_type));

  // Fetch item details for filtered favorites
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["favorite-items", activeTab, filteredFavs.map((f) => f.item_id)],
    queryFn: async (): Promise<FavItem[]> => {
      if (filteredFavs.length === 0) return [];

      const results: FavItem[] = [];

      // Group by item_type for batch queries
      const grouped: Record<string, string[]> = {};
      for (const fav of filteredFavs) {
        if (!grouped[fav.item_type]) grouped[fav.item_type] = [];
        grouped[fav.item_type].push(fav.item_id);
      }

      for (const [type, ids] of Object.entries(grouped)) {
        const config = tableMap[type];
        if (!config) continue;

        const { data } = await (supabase as any)
          .from(config.table)
          .select("id, name, thumbnail_url, rating")
          .in("id", ids);

        if (data) {
          for (const item of data) {
            const fav = filteredFavs.find((f) => f.item_id === item.id)!;
            results.push({
              id: fav.id,
              item_id: item.id,
              item_type: type,
              name: item.name,
              thumbnail_url: item.thumbnail_url,
              rating: item.rating,
            });
          }
        }
      }

      return results;
    },
    enabled: filteredFavs.length > 0,
  });

  const isLoading = favsLoading || itemsLoading;

  const getDetailPath = (item: FavItem) => {
    const config = tableMap[item.item_type];
    return config ? `${config.detailPath}/${item.item_id}` : "/";
  };

  const handleTabChange = (href: string) => navigate(href);

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
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
      <main className="pb-20 px-4 py-4">
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
      </main>

      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default Favorites;
