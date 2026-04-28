import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, ArrowLeft, Star } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useFavorites, ItemType } from "@/hooks/useFavorites";
import { useCoupleLink } from "@/hooks/useCoupleLink";
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

// All vendor-side favorites resolve through the unified `places` table.
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
  /** Composite key: <ownership>-<item_type>-<item_id> */
  key: string;
  item_id: string;
  item_type: string;
  name: string;
  thumbnail_url: string | null;
  rating?: number;
}

interface PartnerFavRow {
  item_id: string;
  item_type: string;
}

const Favorites = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { favorites, isLoading: favsLoading, toggleFavorite } = useFavorites();
  const { isLinked, partnerUserId, partnerProfile } = useCoupleLink();
  const [activeTab, setActiveTab] = useState<FavTabId>("vendor");

  // Partner favorites — only fetched when linked. RLS migration 20260428100000
  // grants linked partners SELECT on each other's favorites.
  const { data: partnerFavorites = [] } = useQuery<PartnerFavRow[]>({
    queryKey: ["favorites", "partner", partnerUserId],
    queryFn: async () => {
      if (!partnerUserId) return [];
      const { data } = await (supabase as any)
        .from("favorites")
        .select("item_id, item_type")
        .eq("user_id", partnerUserId);
      return (data ?? []) as PartnerFavRow[];
    },
    enabled: isLinked && !!partnerUserId,
    staleTime: 30_000,
  });

  const currentTab = favTabs.find((t) => t.id === activeTab)!;
  const filteredMine = favorites.filter((f) => (currentTab.types as string[]).includes(f.item_type));
  const filteredPartner = partnerFavorites.filter((f) =>
    (currentTab.types as string[]).includes(f.item_type)
  );

  // Compute partition keys: both / mineOnly / partnerOnly.
  const partition = useMemo(() => {
    const mineSet = new Set(filteredMine.map((f) => `${f.item_type}:${f.item_id}`));
    const theirsSet = new Set(filteredPartner.map((f) => `${f.item_type}:${f.item_id}`));
    const bothKeys = [...mineSet].filter((k) => theirsSet.has(k));
    const mineOnlyKeys = [...mineSet].filter((k) => !theirsSet.has(k));
    const partnerOnlyKeys = [...theirsSet].filter((k) => !mineSet.has(k));
    return { bothKeys, mineOnlyKeys, partnerOnlyKeys };
  }, [filteredMine, filteredPartner]);

  // Union of all relevant item_ids (own + partner) → one query for details.
  const allItemIds = useMemo(() => {
    const ids = new Set<string>();
    for (const f of filteredMine) ids.add(f.item_id);
    for (const f of filteredPartner) ids.add(f.item_id);
    return [...ids];
  }, [filteredMine, filteredPartner]);

  const { data: itemMap = {}, isLoading: itemsLoading } = useQuery({
    queryKey: ["favorite-items-merged", activeTab, allItemIds.sort().join(",")],
    queryFn: async (): Promise<Record<string, FavItem>> => {
      if (allItemIds.length === 0) return {};

      if (activeTab === "vendor") {
        const { data } = await supabase
          .from("places")
          .select("place_id, name, main_image_url, avg_rating")
          .in("place_id", allItemIds);
        const out: Record<string, FavItem> = {};
        for (const p of data ?? []) {
          out[p.place_id] = {
            key: p.place_id,
            item_id: p.place_id,
            item_type: "vendor", // overwritten by callers per ownership
            name: p.name,
            thumbnail_url: p.main_image_url,
            rating: p.avg_rating ?? undefined,
          };
        }
        return out;
      }
      // Other tabs (event/shopping/info) — placeholder, not implemented yet.
      return {};
    },
    enabled: allItemIds.length > 0,
  });

  const isLoading = favsLoading || itemsLoading;
  const partnerLabel = partnerProfile?.display_name?.trim() || "파트너";

  const buildItem = (key: string): FavItem | null => {
    const [item_type, item_id] = key.split(":");
    const base = itemMap[item_id];
    if (!base) return null;
    return { ...base, item_type, key: `${item_type}-${item_id}` };
  };

  const bothItems = partition.bothKeys.map(buildItem).filter(Boolean) as FavItem[];
  const mineItems = partition.mineOnlyKeys.map(buildItem).filter(Boolean) as FavItem[];
  const partnerItems = partition.partnerOnlyKeys.map(buildItem).filter(Boolean) as FavItem[];

  const totalCount = bothItems.length + mineItems.length + partnerItems.length;

  const getDetailPath = (item: FavItem) => {
    const base = ITEM_TYPE_DETAIL_PATH[item.item_type] ?? "/vendor";
    return `${base}/${item.item_id}`;
  };

  const renderItem = (item: FavItem, ownership: "both" | "mine" | "partner") => (
    <div
      key={`${ownership}-${item.key}`}
      className="flex items-center gap-3 p-3 bg-card rounded-2xl border border-border"
    >
      <button
        onClick={() => navigate(getDetailPath(item))}
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
      >
        <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden flex-shrink-0 relative">
          {item.thumbnail_url ? (
            <img src={item.thumbnail_url} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No img</div>
          )}
          {/* Ownership dot — same color language as FavoriteButton's pair badge. */}
          {ownership !== "mine" && (
            <span
              aria-hidden
              className={`absolute -top-1 -right-1 rounded-full ring-2 ring-background ${
                ownership === "both" ? "w-3 h-3 bg-destructive" : "w-2.5 h-2.5 bg-[#7BB6E0]"
              }`}
            />
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

      {/* My-side toggle: only meaningful when the item is in MY list (both / mine). */}
      {ownership !== "partner" ? (
        <button
          onClick={() => toggleFavorite(item.item_id, item.item_type as ItemType)}
          className="p-2 flex-shrink-0"
          aria-label={ownership === "both" ? "둘 다 찜한 항목 — 내 찜 해제" : "찜 해제"}
        >
          <Heart className="w-5 h-5 fill-primary text-primary" />
        </button>
      ) : (
        <button
          onClick={() => toggleFavorite(item.item_id, item.item_type as ItemType)}
          className="p-2 flex-shrink-0"
          aria-label="나도 찜하기"
        >
          <Heart className="w-5 h-5 text-muted-foreground" />
        </button>
      )}
    </div>
  );

  return (
    <AppLayout>
      <header className="sticky top-[112px] z-30 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">찜 목록</h1>
        </div>

        <div className="flex px-4 pb-3 gap-2">
          {favTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              aria-pressed={activeTab === tab.id}
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
        ) : totalCount === 0 ? (
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
          <div className="space-y-6">
            {/* "둘 다" — couples agree, the most actionable bucket. */}
            {bothItems.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-destructive" aria-hidden />
                  <h2 className="text-[15px] font-bold text-foreground">
                    둘 다 좋아한 항목 <span className="text-muted-foreground font-medium">{bothItems.length}</span>
                  </h2>
                </div>
                <div className="space-y-2">
                  {bothItems.map((item) => renderItem(item, "both"))}
                </div>
              </section>
            )}

            {/* My picks — what I want to show the partner. */}
            {mineItems.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-3.5 h-3.5 fill-primary text-primary" />
                  <h2 className="text-[15px] font-bold text-foreground">
                    내가 찜한 항목 <span className="text-muted-foreground font-medium">{mineItems.length}</span>
                  </h2>
                </div>
                <div className="space-y-2">
                  {mineItems.map((item) => renderItem(item, "mine"))}
                </div>
              </section>
            )}

            {/* Partner picks — what they're showing me. Only renders when linked. */}
            {isLinked && partnerItems.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#7BB6E0]" aria-hidden />
                  <h2 className="text-[15px] font-bold text-foreground">
                    {partnerLabel}이 찜한 항목 <span className="text-muted-foreground font-medium">{partnerItems.length}</span>
                  </h2>
                </div>
                <div className="space-y-2">
                  {partnerItems.map((item) => renderItem(item, "partner"))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Favorites;
