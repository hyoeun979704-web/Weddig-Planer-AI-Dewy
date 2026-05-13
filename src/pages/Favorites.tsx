import { useMemo, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Heart, ArrowLeft, Star, Tag, ShoppingBag, Sparkles, ArrowUpDown } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useFavorites, ItemType } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { CATEGORY_LABELS, type SkippableCategory } from "@/lib/weddingStyle";
import { cn } from "@/lib/utils";

const favTabs = [
  {
    id: "vendor",
    label: "업체",
    types: [
      "venue",
      "studio",
      "honeymoon",
      "jewelry",
      "appliance",
      "suit",
      "hanbok",
      "invitation_venues",
    ] as ItemType[],
  },
  { id: "event", label: "이벤트", types: ["deal"] as ItemType[] },
  { id: "shopping", label: "쇼핑", types: ["product"] as ItemType[] },
  { id: "info", label: "정보", types: ["influencer"] as ItemType[] },
] as const;

type FavTabId = (typeof favTabs)[number]["id"];
type SortMode = "recent" | "name";

// item_type (set when the user toggles a favorite) → `places.category` slug.
// Vendor-side categories all resolve through the unified `places` table.
const ITEM_TYPE_TO_PLACE_CATEGORY: Record<string, SkippableCategory> = {
  venue: "wedding_hall",
  studio: "studio",
  honeymoon: "honeymoon",
  jewelry: "appliance",
  appliance: "appliance",
  suit: "tailor_shop",
  hanbok: "hanbok",
  invitation_venues: "invitation_venue",
};

const VENDOR_SUB_LABELS: Record<string, string> = {
  venue: "웨딩홀",
  studio: "스튜디오",
  honeymoon: "허니문",
  jewelry: "예물",
  appliance: "혼수",
  suit: "예복",
  hanbok: "한복",
  invitation_venues: "소규모예식장",
};

// Detail page paths per item_type.
const ITEM_TYPE_DETAIL_PATH: Record<string, string> = {
  venue: "/venue",
  studio: "/vendor",
  honeymoon: "/vendor",
  jewelry: "/vendor",
  appliance: "/vendor",
  suit: "/vendor",
  hanbok: "/vendor",
  invitation_venues: "/vendor",
  deal: "/deals",
  product: "/store",
  influencer: "/influencers",
};

interface FavItem {
  id: string;
  item_id: string;
  item_type: string;
  name: string;
  thumbnail_url: string | null;
  rating?: number;
  price?: number;
  subtitle?: string;
  created_at?: string;
}

const formatPrice = (price: number) => price.toLocaleString() + "원";

// Wedding-style-aware empty-state CTAs. Picks a primary path the user is most
// likely to need given their planning style.
const emptyStateCTA = (
  weddingStyle: string | null,
  tab: FavTabId,
): { label: string; path: string; hint: string } => {
  if (tab === "event") return { label: "혜택 둘러보기", path: "/deals", hint: "지금 받을 수 있는 파트너 혜택을 모아봤어요" };
  if (tab === "shopping") return { label: "셀프웨딩 스토어", path: "/store", hint: "소품·키트를 한 곳에서 둘러보세요" };
  if (tab === "info") return { label: "인플루언서 콘텐츠", path: "/influencers", hint: "실제 결혼 준비 후기를 모아봤어요" };
  // vendor tab
  if (weddingStyle === "self") return { label: "셀프웨딩 굿즈", path: "/store", hint: "셀프웨딩에 필요한 아이템부터 찾아보세요" };
  if (weddingStyle === "small") return { label: "소규모 예식장", path: "/invitation-venues", hint: "가족 중심 스몰웨딩 베뉴를 둘러보세요" };
  return { label: "웨딩홀 둘러보기", path: "/venues", hint: "마음에 드는 곳을 하트로 저장해보세요" };
};

const Favorites = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { favorites, isLoading: favsLoading, toggleFavorite } = useFavorites();
  const { weddingSettings } = useWeddingSchedule();
  const [activeTab, setActiveTab] = useState<FavTabId>("vendor");
  const [vendorSubFilter, setVendorSubFilter] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");

  const excludedCategories = weddingSettings?.excluded_categories ?? [];
  const weddingStyle = weddingSettings?.wedding_style ?? null;

  // Pre-compute counts per tab for the badge UI. Cheap — favorites list is small.
  const tabCounts = useMemo(() => {
    const counts: Record<FavTabId, number> = { vendor: 0, event: 0, shopping: 0, info: 0 };
    for (const tab of favTabs) {
      counts[tab.id] = favorites.filter((f) => (tab.types as string[]).includes(f.item_type)).length;
    }
    return counts;
  }, [favorites]);

  const currentTab = favTabs.find((t) => t.id === activeTab)!;
  const filteredFavs = useMemo(
    () => favorites.filter((f) => (currentTab.types as string[]).includes(f.item_type)),
    [favorites, currentTab],
  );

  // Sub-filter chips for the vendor tab — built dynamically from the user's
  // actual favorites so we don't show empty buckets. Order follows favTabs.
  const vendorSubFilters = useMemo(() => {
    if (activeTab !== "vendor") return [] as { id: string; label: string; count: number; muted: boolean }[];
    const buckets: { id: string; label: string; count: number; muted: boolean }[] = [];
    for (const itemType of currentTab.types) {
      const placeCategory = ITEM_TYPE_TO_PLACE_CATEGORY[itemType];
      const count = filteredFavs.filter((f) => f.item_type === itemType).length;
      if (count === 0) continue;
      buckets.push({
        id: itemType,
        label: VENDOR_SUB_LABELS[itemType] ?? itemType,
        count,
        muted: placeCategory ? excludedCategories.includes(placeCategory) : false,
      });
    }
    return buckets;
  }, [activeTab, currentTab, filteredFavs, excludedCategories]);

  // Reset sub-filter whenever the user switches the top tab so we don't keep a
  // stale "studio" sub-filter when they jump to the event tab.
  useEffect(() => {
    setVendorSubFilter("all");
  }, [activeTab]);

  // Fetch item details for the current tab. Each tab queries its source table
  // in a single round-trip; we then merge with the favorites row (for the
  // toggle-remove handler and created_at sort).
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["favorite-items", activeTab, filteredFavs.map((f) => f.item_id).join(",")],
    queryFn: async (): Promise<FavItem[]> => {
      if (filteredFavs.length === 0) return [];

      // Vendor tab: all item_types map to places (uuid place_id).
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
            created_at: fav.created_at,
            subtitle: VENDOR_SUB_LABELS[fav.item_type],
          });
        }
        return out;
      }

      // Event tab → partner_deals
      if (activeTab === "event") {
        const ids = filteredFavs.map((f) => f.item_id);
        const { data } = await (supabase
          .from("partner_deals" as any)
          .select("id, title, partner_name, banner_image_url, deal_price, original_price, discount_info") as any)
          .in("id", ids);
        if (!data) return [];
        return data
          .map((d: any) => {
            const fav = filteredFavs.find((f) => f.item_id === d.id);
            if (!fav) return null;
            return {
              id: fav.id,
              item_id: d.id,
              item_type: "deal",
              name: d.title,
              thumbnail_url: d.banner_image_url,
              price: d.deal_price ?? undefined,
              subtitle: d.discount_info || d.partner_name,
              created_at: fav.created_at,
            } as FavItem;
          })
          .filter(Boolean) as FavItem[];
      }

      // Shopping tab → products
      if (activeTab === "shopping") {
        const ids = filteredFavs.map((f) => f.item_id);
        const { data } = await (supabase
          .from("products" as any)
          .select("id, name, thumbnail_url, price, sale_price, rating, category") as any)
          .in("id", ids);
        if (!data) return [];
        return data
          .map((p: any) => {
            const fav = filteredFavs.find((f) => f.item_id === p.id);
            if (!fav) return null;
            return {
              id: fav.id,
              item_id: p.id,
              item_type: "product",
              name: p.name,
              thumbnail_url: p.thumbnail_url,
              rating: p.rating ?? undefined,
              price: p.sale_price ?? p.price ?? undefined,
              subtitle: p.category,
              created_at: fav.created_at,
            } as FavItem;
          })
          .filter(Boolean) as FavItem[];
      }

      // Info tab → influencers
      if (activeTab === "info") {
        const ids = filteredFavs.map((f) => f.item_id);
        const { data } = await (supabase
          .from("influencers" as any)
          .select("id, name, handle, profile_image_url, follower_count, platform, category") as any)
          .in("id", ids);
        if (!data) return [];
        return data
          .map((inf: any) => {
            const fav = filteredFavs.find((f) => f.item_id === inf.id);
            if (!fav) return null;
            return {
              id: fav.id,
              item_id: inf.id,
              item_type: "influencer",
              name: inf.name,
              thumbnail_url: inf.profile_image_url,
              subtitle: inf.handle || inf.platform,
              created_at: fav.created_at,
            } as FavItem;
          })
          .filter(Boolean) as FavItem[];
      }

      return [];
    },
    enabled: filteredFavs.length > 0,
  });

  // Apply sub-filter (vendor tab only) + sort. Both operate on the fetched
  // items so the sub-filter chip counts above stay accurate.
  const displayedItems = useMemo(() => {
    let list = items;
    if (activeTab === "vendor" && vendorSubFilter !== "all") {
      list = list.filter((i) => i.item_type === vendorSubFilter);
    }
    list = [...list].sort((a, b) => {
      if (sortMode === "name") return a.name.localeCompare(b.name, "ko");
      // recent — newer first; falls back to name if created_at missing
      const at = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bt - at;
    });
    return list;
  }, [items, activeTab, vendorSubFilter, sortMode]);

  const isLoading = favsLoading || itemsLoading;

  const getDetailPath = (item: FavItem) => {
    const base = ITEM_TYPE_DETAIL_PATH[item.item_type] ?? "/vendor";
    return `${base}/${item.item_id}`;
  };

  const handleTabChange = (href: string) => navigate(href);

  const cta = emptyStateCTA(weddingStyle, activeTab);

  const TabIcon = ({ id }: { id: FavTabId }) => {
    if (id === "vendor") return <Heart className="w-3.5 h-3.5" />;
    if (id === "event") return <Tag className="w-3.5 h-3.5" />;
    if (id === "shopping") return <ShoppingBag className="w-3.5 h-3.5" />;
    return <Sparkles className="w-3.5 h-3.5" />;
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">찜 목록</h1>
          {favorites.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">총 {favorites.length}개</span>
          )}
        </div>

        {/* Top tabs (with count badge) */}
        <div className="flex px-4 pb-3 gap-2 overflow-x-auto">
          {favTabs.map((tab) => {
            const count = tabCounts[tab.id];
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <TabIcon id={tab.id} />
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      "min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                      isActive ? "bg-primary-foreground text-primary" : "bg-background text-foreground",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Vendor sub-filter chips — appear only when the user has vendor favs */}
        {activeTab === "vendor" && vendorSubFilters.length > 1 && (
          <div className="flex px-4 pb-3 gap-1.5 overflow-x-auto">
            <button
              onClick={() => setVendorSubFilter("all")}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                vendorSubFilter === "all"
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground",
              )}
            >
              전체 {filteredFavs.length}
            </button>
            {vendorSubFilters.map((b) => (
              <button
                key={b.id}
                onClick={() => setVendorSubFilter(b.id)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
                  vendorSubFilter === b.id
                    ? "bg-foreground text-background border-foreground"
                    : b.muted
                      ? "bg-background text-muted-foreground/70 border-dashed border-border"
                      : "bg-muted text-muted-foreground border-transparent",
                )}
                title={b.muted ? "현재 결혼 스타일에서 제외한 카테고리예요" : undefined}
              >
                {b.label} {b.count}
              </button>
            ))}
          </div>
        )}
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
        ) : displayedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Heart className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              {filteredFavs.length === 0 ? "찜한 항목이 없습니다" : "결과가 없어요"}
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-6">{cta.hint}</p>
            <button
              onClick={() => navigate(cta.path)}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium"
            >
              {cta.label}
            </button>
          </div>
        ) : (
          <>
            {/* Sort toggle row */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">{displayedItems.length}개 표시</p>
              <button
                onClick={() => setSortMode(sortMode === "recent" ? "name" : "recent")}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                {sortMode === "recent" ? "최근 찜한 순" : "이름순"}
              </button>
            </div>

            <div className="space-y-3">
              {displayedItems.map((item) => (
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
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {item.subtitle && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {item.subtitle}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-foreground text-sm truncate">{item.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {item.rating !== undefined && (
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-primary text-primary" />
                            <span className="text-xs text-muted-foreground">{item.rating}</span>
                          </div>
                        )}
                        {item.price !== undefined && (
                          <span className="text-xs font-semibold text-primary">{formatPrice(item.price)}</span>
                        )}
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => toggleFavorite(item.item_id, item.item_type as ItemType)}
                    className="p-2 flex-shrink-0"
                    aria-label="찜 해제"
                  >
                    <Heart className="w-5 h-5 fill-primary text-primary" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default Favorites;
