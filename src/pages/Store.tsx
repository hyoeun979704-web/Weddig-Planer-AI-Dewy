import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Star, Loader2, SlidersHorizontal, ExternalLink } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import HomeHeader from "@/components/home/HomeHeader";
import CategoryTabBar, { useCategoryTabNavigation } from "@/components/home/CategoryTabBar";
import { supabase } from "@/integrations/supabase/client";
import { escapeLikePattern } from "@/lib/postgrestEscape";
import StoreFilterSheet, { StoreFilters, initialFilters } from "@/components/store/StoreFilterSheet";
import SortToggle, { SortMode } from "@/components/SortToggle";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import Seo from "@/components/Seo";
import { STORE_CATEGORIES, StoreCategoryValue, getSourceLabel } from "@/lib/storeCategories";
import { formatWon as formatPrice } from "@/lib/priceFormat";
import { ProductThumb } from "@/components/store/ProductThumb";

interface Product {
  id: string;
  name: string;
  short_description: string | null;
  category: string | null;
  categories: string[] | null;
  price: number;
  sale_price: number | null;
  thumbnail_url: string | null;
  rating: number;
  review_count: number;
  sold_count: number;
  is_featured: boolean;
  source: string;
  source_url: string | null;
  source_mall: string | null;
}

type TabId = "all" | StoreCategoryValue;

const tabs: { id: TabId; label: string }[] = [
  { id: "all", label: "전체" },
  ...STORE_CATEGORIES.map((c) => ({ id: c.value as TabId, label: c.label })),
];


const Store = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [products, setProducts] = useState<Product[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [selectedTab, setSelectedTab] = useState<TabId>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<StoreFilters>(initialFilters);
  const [sortMode, setSortMode] = useState<SortMode>("popular");

  // 결혼 스타일이 셀프인 경우 1회 한정으로 '셀프웨딩 드레스' 탭을 자동 선택.
  const { weddingSettings, isLoading: scheduleLoading } = useWeddingSchedule();
  const didInitTabRef = useRef(false);
  useEffect(() => {
    if (didInitTabRef.current || scheduleLoading) return;
    didInitTabRef.current = true;
    if (weddingSettings.wedding_style === "self") {
      setSelectedTab("self_wedding_dress");
    }
  }, [scheduleLoading, weddingSettings.wedding_style]);

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      let query = (supabase
        .from("products" as any)
        .select(
          "id, name, short_description, category, categories, price, sale_price, thumbnail_url, rating, review_count, sold_count, is_featured, source, source_url, source_mall",
        ) as any)
        .eq("is_active", true)
        .order(sortMode === "popular" ? "sold_count" : "created_at", { ascending: false });

      // Tab-based category filter (multi-category via array contains).
      if (selectedTab !== "all") {
        query = query.contains("categories", [selectedTab]) as any;
      }

      // Advanced filter category — also matched against categories[].
      if (filters.category) {
        query = query.contains("categories", [filters.category]) as any;
      }
      if (filters.priceRange[0] > 0) {
        query = query.gte("price", filters.priceRange[0]) as any;
      }
      if (filters.priceRange[1] < 500000) {
        query = query.lte("price", filters.priceRange[1]) as any;
      }
      if (filters.keyword) {
        query = query.ilike("name", `%${escapeLikePattern(filters.keyword)}%`) as any;
      }

      const { data } = await query;
      setProducts((data || []) as any);
      setIsLoading(false);
    };
    fetch();
  }, [selectedTab, filters, sortMode]);

  // 추천 띠 — 선택된 탭에 해당하는 is_featured 상품 8개. 'all' 일 땐 전체 추천.
  // featured_personas 가 비어있으면 전체 노출, 값이 있으면 사용자 persona_mode 와 매칭 시만.
  useEffect(() => {
    const fetchFeatured = async () => {
      const persona = weddingSettings.persona_mode ?? null;
      let q = (supabase
        .from("products" as any)
        .select(
          "id, name, short_description, category, categories, price, sale_price, thumbnail_url, rating, review_count, sold_count, is_featured, source, source_url, source_mall, featured_personas",
        ) as any)
        .eq("is_active", true)
        .eq("is_featured", true)
        .limit(8);
      if (selectedTab !== "all") {
        q = q.contains("categories", [selectedTab]) as any;
      }
      // 빈 배열(전체 대상) OR 사용자 persona 가 배열에 포함.
      const orFilter = persona
        ? `featured_personas.eq.{},featured_personas.cs.{${persona}}`
        : "featured_personas.eq.{}";
      q = q.or(orFilter) as any;
      const { data } = await q;
      setFeatured((data || []) as any);
    };
    fetchFeatured();
  }, [selectedTab, weddingSettings.persona_mode]);

  const hasActiveFilters =
    filters.category !== null ||
    filters.priceRange[0] > 0 ||
    filters.priceRange[1] < 500000 ||
    filters.colors.length > 0 ||
    filters.sizes.length > 0 ||
    filters.keyword !== "";

  const handleCategoryTabChange = useCategoryTabNavigation();

  const handleProductClick = (product: Product) => {
    // 클릭 트래킹 — fire-and-forget. 실패해도 UX 영향 없음.
    void (supabase.from("product_clicks" as any) as any).insert({
      product_id: product.id,
      source_tab: selectedTab,
    });

    // 외부 상품(쿠팡/네이버)은 원본으로 새 탭 이동. 자체 상품은 내부 상세로.
    if (product.source !== "manual" && product.source_url) {
      window.open(product.source_url, "_blank", "noopener,noreferrer");
      return;
    }
    navigate(`/store/${product.id}`);
  };

  return (
    <div className="min-h-screen bg-background app-col mx-auto relative">
      <Seo title="웨딩 준비 쇼핑몰 | Dewy" description="결혼 준비에 필요한 상품을 한 곳에서. 예비부부를 위한 큐레이션 상품과 혜택을 만나보세요." path="/store" />
      <HomeHeader />
      <CategoryTabBar activeTab="shopping" onTabChange={handleCategoryTabChange} />

      {/* Tabs + Filter button */}
      <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto scrollbar-hide border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {tab.label}
          </button>
        ))}
        <button
          onClick={() => setFilterOpen(true)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
            hasActiveFilters
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground border-border hover:border-primary/50"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          필터
          {hasActiveFilters && <span className="ml-0.5 text-[10px]">●</span>}
        </button>
      </div>

      <main className="safe-bottom-scroll px-4 py-4">
        {/* 추천 띠 — is_featured=true 상품 가로 스크롤. 없으면 숨김. */}
        {featured.length > 0 && (
          <section className="mb-5">
            <div className="flex items-center gap-1.5 mb-2">
              <Star className="w-4 h-4 fill-primary text-primary" />
              <h3 className="text-sm font-bold text-foreground">추천 상품</h3>
            </div>
            <div className="flex gap-2.5 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
              {featured.map((product) => {
                const isExternal = product.source !== "manual";
                const sourceLabel = isExternal ? getSourceLabel(product.source) : null;
                return (
                  <button
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className="flex-shrink-0 w-32 bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow text-left"
                  >
                    <div className="relative">
                      <ProductThumb url={product.thumbnail_url} alt={product.name} sizeClass="w-full h-24" />
                      {sourceLabel && (
                        <span className="absolute top-1 left-1 inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-background/90 backdrop-blur-sm text-[9px] font-semibold text-foreground border border-border">
                          {sourceLabel}
                        </span>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-[11px] font-semibold line-clamp-2 leading-tight mb-1">{product.name}</p>
                      <p className="text-xs font-bold text-primary">
                        {formatPrice(product.sale_price ?? product.price)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <div className="flex justify-end mb-3">
          <SortToggle value={sortMode} onChange={setSortMode} />
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">상품이 없습니다</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => {
              const discountPercent = product.sale_price
                ? Math.round((1 - product.sale_price / product.price) * 100)
                : null;
              const isExternal = product.source !== "manual";
              const sourceLabel = isExternal ? getSourceLabel(product.source) : null;

              return (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-md transition-shadow text-left"
                >
                  <div className="relative">
                    <ProductThumb url={product.thumbnail_url} alt={product.name} sizeClass="w-full h-36" />
                    {sourceLabel && (
                      <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-background/90 backdrop-blur-sm text-[10px] font-semibold text-foreground border border-border">
                        {sourceLabel}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <h4 className="font-semibold text-foreground text-xs mb-1 line-clamp-2 leading-tight">{product.name}</h4>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {discountPercent && (
                        <span className="text-sm font-black text-primary">{discountPercent}%</span>
                      )}
                      <span className="text-sm font-bold text-foreground">
                        {formatPrice(product.sale_price ?? product.price)}
                      </span>
                    </div>
                    {product.sale_price && (
                      <p className="text-[10px] text-muted-foreground line-through">{formatPrice(product.price)}</p>
                    )}
                    <div className="flex items-center gap-1 mt-1.5">
                      <Star className="w-3 h-3 fill-primary text-primary" />
                      <span className="text-[10px] text-muted-foreground">
                        {product.rating} ({product.review_count})
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      <StoreFilterSheet open={filterOpen} onOpenChange={setFilterOpen} filters={filters} onApply={setFilters} />
      <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Store;
