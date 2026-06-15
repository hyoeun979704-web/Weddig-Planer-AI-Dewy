import { useMemo, useState, useEffect } from "react";
import { formatWon as formatPrice } from "@/lib/priceFormat";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Heart,
  ArrowLeft,
  Star,
  Tag,
  ShoppingBag,
  Sparkles,
  ArrowUpDown,
  Search,
  X,
  Users,
  Scale,
} from "lucide-react";
import { categoryForItemType } from "@/lib/vendorCompare";
import BottomNav from "@/components/BottomNav";
import { useFavorites, ItemType } from "@/hooks/useFavorites";
import { useCoupleFavorites, type MergedFavorite, type Ownership } from "@/hooks/useCoupleFavorites";
import { youTubeUrl } from "@/hooks/useTipVideos";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { openExternal } from "@/lib/native/openExternal";
import { useQuery } from "@tanstack/react-query";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { type SkippableCategory } from "@/lib/weddingStyle";
import { cn } from "@/lib/utils";

const favTabs = [
  {
    id: "vendor",
    label: "업체",
    types: [
      "venue",
      "studio",
      "dress",
      "makeup",
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
  // 인플루언서 ItemType은 DB·FavoriteButton(InfluencerDetail)에 그대로 살아있지만
  // 찜 페이지 UI에서는 별도 인플루언서 탭이 다시 들어오기 전까지 노출 X.
  { id: "info", label: "꿀팁", types: ["tip_video"] as ItemType[] },
] as const;

type FavTabId = (typeof favTabs)[number]["id"];
// 함께 찜한 항목 → 최근 항목 순이 사용자 요청 기본값.
type SortMode = "together" | "recent" | "name";
type ViewMode = "all" | "mine" | "partner";

const ITEM_TYPE_TO_PLACE_CATEGORY: Record<string, SkippableCategory> = {
  venue: "wedding_hall",
  studio: "studio",
  dress: "dress_shop",
  makeup: "makeup_shop",
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
  dress: "드레스",
  makeup: "메이크업",
  honeymoon: "허니문",
  jewelry: "예물",
  appliance: "혼수",
  suit: "예복",
  hanbok: "한복",
  invitation_venues: "소규모예식장",
};

const ITEM_TYPE_DETAIL_PATH: Record<string, string> = {
  venue: "/venue",
  studio: "/vendor",
  dress: "/vendor",
  makeup: "/vendor",
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

const SORT_LABELS: Record<SortMode, string> = {
  together: "함께 찜한 순",
  recent: "최근 찜한 순",
  name: "이름순",
};

interface FavItem {
  item_id: string;
  item_type: string;
  name: string;
  thumbnail_url: string | null;
  rating?: number;
  price?: number;
  subtitle?: string;
  ownership: Ownership;
  latestCreatedAt: string;
  myFavRowId: string | null;
}


const emptyStateCTA = (
  weddingStyle: string | null,
  tab: FavTabId,
): { label: string; path: string; hint: string } => {
  if (tab === "event") return { label: "혜택 둘러보기", path: "/deals", hint: "지금 받을 수 있는 파트너 혜택을 모아봤어요" };
  if (tab === "shopping") return { label: "셀프웨딩 스토어", path: "/store", hint: "소품·키트를 한 곳에서 둘러보세요" };
  if (tab === "info") return { label: "꿀팁 보러가기", path: "/tips", hint: "유튜브 꿀팁 영상을 로 저장해두면 여기서 다시 볼 수 있어요" };
  if (weddingStyle === "self") return { label: "셀프웨딩 굿즈", path: "/store", hint: "셀프웨딩에 필요한 아이템부터 찾아보세요" };
  if (weddingStyle === "small") return { label: "소규모 예식장", path: "/invitation-venues", hint: "가족 중심 스몰웨딩 베뉴를 둘러보세요" };
  return { label: "웨딩홀 둘러보기", path: "/venues", hint: "마음에 드는 곳을 하트로 저장해보세요" };
};

const Favorites = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toggleFavorite } = useFavorites();
  const { merged, isLinked, partnerProfile, isLoading: favsLoading } = useCoupleFavorites();
  const { weddingSettings } = useWeddingSchedule();

  const [activeTab, setActiveTab] = useState<FavTabId>("vendor");
  const [vendorSubFilter, setVendorSubFilter] = useState<string>("all");
  // Default sort honors the user request: 함께 찜 우선 → 최근 순.
  const [sortMode, setSortMode] = useState<SortMode>("together");
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const excludedCategories = weddingSettings?.excluded_categories ?? [];
  const weddingStyle = weddingSettings?.wedding_style ?? null;
  const partnerName = partnerProfile?.display_name || "파트너";

  // Per-tab counts use the view-filtered merged list so the badge matches the
  // current "신부/신랑/함께" mode.
  const viewFiltered = useMemo(() => {
    if (viewMode === "all") return merged;
    if (viewMode === "mine") return merged.filter((m) => m.ownership !== "partner");
    return merged.filter((m) => m.ownership !== "mine");
  }, [merged, viewMode]);

  const tabCounts = useMemo(() => {
    const counts: Record<FavTabId, number> = { vendor: 0, event: 0, shopping: 0, info: 0 };
    for (const tab of favTabs) {
      counts[tab.id] = viewFiltered.filter((f) => (tab.types as string[]).includes(f.item_type)).length;
    }
    return counts;
  }, [viewFiltered]);

  const currentTab = favTabs.find((t) => t.id === activeTab)!;
  const filteredFavs: MergedFavorite[] = useMemo(
    () => viewFiltered.filter((f) => (currentTab.types as string[]).includes(f.item_type)),
    [viewFiltered, currentTab],
  );

  // Sub-filter chips for vendor tab — derived from actual merged list so we
  // don't show empty buckets.
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

  useEffect(() => {
    setVendorSubFilter("all");
  }, [activeTab]);

  // Fetch metadata for the items the current tab needs.
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: [
      "favorite-items",
      activeTab,
      filteredFavs.map((f) => `${f.item_type}:${f.item_id}`).join(","),
    ],
    queryFn: async (): Promise<FavItem[]> => {
      if (filteredFavs.length === 0) return [];

      const lookup = (item_id: string, item_type: string) =>
        filteredFavs.find((f) => f.item_id === item_id && f.item_type === item_type)!;

      const enrich = (fav: MergedFavorite, partial: Omit<FavItem, "ownership" | "latestCreatedAt" | "myFavRowId" | "item_id" | "item_type">): FavItem => ({
        item_id: fav.item_id,
        item_type: fav.item_type,
        ownership: fav.ownership,
        latestCreatedAt: fav.latestCreatedAt,
        myFavRowId: fav.myFavRowId,
        ...partial,
      });

      if (activeTab === "vendor") {
        const ids = filteredFavs.map((f) => f.item_id);
        const { data } = await supabase
          .from("places")
          .select("place_id, name, main_image_url, avg_rating, category")
          .in("place_id", ids);
        if (!data) return [];
        return data.map((p) => {
          const fav = lookup(p.place_id, filteredFavs.find((f) => f.item_id === p.place_id)!.item_type);
          return enrich(fav, {
            name: p.name,
            thumbnail_url: p.main_image_url,
            rating: p.avg_rating ?? undefined,
            subtitle: VENDOR_SUB_LABELS[fav.item_type],
          });
        });
      }

      if (activeTab === "event") {
        const ids = filteredFavs.map((f) => f.item_id);
        const { data } = await (supabase
          .from("partner_deals" as any)
          .select("id, title, partner_name, banner_image_url, deal_price, original_price, discount_info") as any)
          .in("id", ids);
        if (!data) return [];
        return (data as any[]).map((d) =>
          enrich(lookup(d.id, "deal"), {
            name: d.title,
            thumbnail_url: d.banner_image_url,
            price: d.deal_price ?? undefined,
            subtitle: d.discount_info || d.partner_name,
          }),
        );
      }

      if (activeTab === "shopping") {
        const ids = filteredFavs.map((f) => f.item_id);
        const { data } = await (supabase
          .from("products" as any)
          .select("id, name, thumbnail_url, price, sale_price, rating, category, categories") as any)
          .in("id", ids);
        if (!data) return [];
        return (data as any[]).map((p) =>
          enrich(lookup(p.id, "product"), {
            name: p.name,
            thumbnail_url: p.thumbnail_url,
            rating: p.rating ?? undefined,
            price: p.sale_price ?? p.price ?? undefined,
            subtitle: Array.isArray(p.categories) && p.categories.length > 0 ? p.categories[0] : p.category,
          }),
        );
      }

      if (activeTab === "info") {
        const ids = filteredFavs.map((f) => f.item_id);
        const { data } = await supabase
          .from("tip_videos")
          .select("video_id, title, thumbnail_url, channel_name")
          .in("video_id", ids);
        if (!data) return [];
        return data.map((v) =>
          enrich(lookup(v.video_id, "tip_video"), {
            name: v.title,
            thumbnail_url: v.thumbnail_url,
            subtitle: v.channel_name ?? "유튜브",
          }),
        );
      }

      return [];
    },
    enabled: filteredFavs.length > 0,
  });

  // Search + sub-filter + sort all applied on the fetched items so chip
  // counts (which use pre-filter data) stay stable.
  const displayedItems = useMemo(() => {
    let list = items;
    if (activeTab === "vendor" && vendorSubFilter !== "all") {
      list = list.filter((i) => i.item_type === vendorSubFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (i) => i.name.toLowerCase().includes(q) || (i.subtitle ?? "").toLowerCase().includes(q),
      );
    }
    list = [...list].sort((a, b) => {
      if (sortMode === "name") return a.name.localeCompare(b.name, "ko");
      if (sortMode === "recent") {
        const at = new Date(a.latestCreatedAt).getTime();
        const bt = new Date(b.latestCreatedAt).getTime();
        return bt - at;
      }
      // together — 함께 찜 우선, tie-break by recent
      const rank = (o: Ownership) => (o === "both" ? 0 : 1);
      const r = rank(a.ownership) - rank(b.ownership);
      if (r !== 0) return r;
      const at = new Date(a.latestCreatedAt).getTime();
      const bt = new Date(b.latestCreatedAt).getTime();
      return bt - at;
    });
    return list;
  }, [items, activeTab, vendorSubFilter, sortMode, searchQuery]);

  const isLoading = favsLoading || itemsLoading;

  const getDetailPath = (item: FavItem) => {
    const base = ITEM_TYPE_DETAIL_PATH[item.item_type] ?? "/vendor";
    return `${base}/${item.item_id}`;
  };

  const handleCardClick = (item: FavItem) => {
    if (item.item_type === "tip_video") {
      void openExternal(youTubeUrl(item.item_id));
      return;
    }
    navigate(getDetailPath(item));
  };

  const handleTabChange = (href: string) => navigate(href);

  const handleHeartClick = (item: FavItem) => {
    if (item.ownership === "mine" || item.ownership === "both") {
      // Removes from MY list. Partner's mirror row (if any) stays untouched.
      toggleFavorite(item.item_id, item.item_type as ItemType);
    } else {
      // Partner-only — adding it to my list too.
      toggleFavorite(item.item_id, item.item_type as ItemType);
    }
  };

  const cta = emptyStateCTA(weddingStyle, activeTab);

  const TabIcon = ({ id }: { id: FavTabId }) => {
    if (id === "vendor") return <Heart className="w-3.5 h-3.5" />;
    if (id === "event") return <Tag className="w-3.5 h-3.5" />;
    if (id === "shopping") return <ShoppingBag className="w-3.5 h-3.5" />;
    return <Sparkles className="w-3.5 h-3.5" />;
  };

  // Heart icon state per card: filled for sides that have favorited.
  const OwnershipBadge = ({ ownership }: { ownership: Ownership }) => {
    if (ownership === "both") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
          <Heart className="w-2.5 h-2.5 fill-current" />
          함께 찜
        </span>
      );
    }
    if (ownership === "partner") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium">
          {partnerName}
        </span>
      );
    }
    return null;
  };

  const totalCount = viewFiltered.length;

  return (
    <div className="min-h-screen bg-background app-col mx-auto relative">
      {/* Header */}
      <header className="sticky safe-sticky-header z-40 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">찜 목록</h1>
          {totalCount > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">총 {totalCount}개</span>
          )}
        </div>

        {/* Mode toggle (신부/신랑/함께) — only meaningful when linked. */}
        {isLinked ? (
          <div className="px-4 pb-2">
            <div className="flex items-center gap-1 p-1 bg-muted rounded-xl">
              {(
                [
                  { id: "all", label: "함께" },
                  { id: "mine", label: "내 찜" },
                  { id: "partner", label: `${partnerName} 찜` },
                ] as Array<{ id: ViewMode; label: string }>
              ).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setViewMode(m.id)}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                    viewMode === m.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Solo / not linked — surface couple linking as the "clean UI" upgrade.
          <div className="px-4 pb-2">
            <button
              onClick={() => navigate("/mypage")}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary/5 border border-dashed border-primary/30 text-xs text-primary font-medium"
            >
              <Users className="w-3.5 h-3.5" />
              파트너와 연결하면 찜 목록도 함께 볼 수 있어요
            </button>
          </div>
        )}

        {/* Top tabs */}
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

        {/* Vendor sub-filter chips */}
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

        {/* Search row */}
        {searchOpen ? (
          <div className="flex items-center gap-2 px-4 pb-3">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-xl">
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="이름이나 카테고리로 검색"
                className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="p-0.5 text-muted-foreground hover:text-foreground"
                  aria-label="검색어 지우기"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery("");
              }}
              className="text-xs text-muted-foreground"
            >
              취소
            </button>
          </div>
        ) : null}
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
              {searchQuery
                ? `'${searchQuery}' 검색 결과가 없어요`
                : filteredFavs.length === 0
                  ? "찜한 항목이 없습니다"
                  : "결과가 없어요"}
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              {searchQuery ? "다른 키워드로 검색해보세요" : cta.hint}
            </p>
            {!searchQuery && (
              <button
                onClick={() => navigate(cta.path)}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium"
              >
                {cta.label}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Sort + search controls */}
            <div className="flex items-center justify-between mb-3 gap-2">
              <p className="text-xs text-muted-foreground flex-shrink-0">
                {displayedItems.length}개 표시
              </p>
              <div className="flex items-center gap-1">
                {activeTab === "vendor" && (
                  <button
                    onClick={() => {
                      const cat = vendorSubFilter !== "all" ? categoryForItemType(vendorSubFilter) : null;
                      navigate(cat ? `/compare?category=${cat}` : "/compare");
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary hover:text-primary/80"
                    aria-label="찜한 업체 비교"
                  >
                    <Scale className="w-3.5 h-3.5" /> 비교
                  </button>
                )}
                {!searchOpen && (
                  <button
                    onClick={() => setSearchOpen(true)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                    aria-label="검색"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                )}
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground bg-transparent border border-border rounded-md focus:outline-none focus:border-primary"
                  aria-label="정렬 방식"
                >
                  {(["together", "recent", "name"] as SortMode[]).map((s) => {
                    // 솔로 모드에선 "함께 찜" 정렬은 의미가 없으니 숨김.
                    if (s === "together" && !isLinked) return null;
                    return (
                      <option key={s} value={s}>
                        {SORT_LABELS[s]}
                      </option>
                    );
                  })}
                </select>
                <ArrowUpDown className="w-3 h-3 text-muted-foreground -ml-1" />
              </div>
            </div>

            <div className="space-y-3">
              {displayedItems.map((item) => (
                <div
                  key={`${item.item_type}:${item.item_id}`}
                  className={cn(
                    "flex items-center gap-3 p-3 bg-card rounded-2xl border transition-colors",
                    item.ownership === "both"
                      ? "border-primary/40 bg-primary/[0.03]"
                      : "border-border",
                  )}
                >
                  <button
                    onClick={() => handleCardClick(item)}
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
                      <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                        {item.subtitle && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {item.subtitle}
                          </span>
                        )}
                        {isLinked && <OwnershipBadge ownership={item.ownership} />}
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
                    onClick={() => handleHeartClick(item)}
                    className="p-2 flex-shrink-0"
                    aria-label={
                      item.ownership === "partner"
                        ? "내 찜 목록에 추가"
                        : "찜 해제"
                    }
                  >
                    <Heart
                      className={cn(
                        "w-5 h-5",
                        item.ownership === "partner"
                          ? "text-muted-foreground"
                          : "fill-primary text-primary",
                      )}
                    />
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
