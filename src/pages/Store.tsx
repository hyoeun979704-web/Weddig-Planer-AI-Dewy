import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShoppingCart, Star, Loader2, SlidersHorizontal } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import StoreFilterSheet, { StoreFilters, initialFilters } from "@/components/store/StoreFilterSheet";
import SortToggle, { SortMode } from "@/components/SortToggle";

interface Product {
  id: string;
  name: string;
  short_description: string | null;
  category: string;
  price: number;
  sale_price: number | null;
  thumbnail_url: string | null;
  rating: number;
  review_count: number;
  sold_count: number;
  is_featured: boolean;
}

const tabs = [
  { id: "all", label: "전체" },
  { id: "self_wedding", label: "셀프웨딩" },
  { id: "snap", label: "스냅" },
  { id: "props", label: "촬영소품" },
] as const;

type TabId = (typeof tabs)[number]["id"];

const formatPrice = (price: number) => price.toLocaleString() + "원";

const Store = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { itemCount } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedTab, setSelectedTab] = useState<TabId>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<StoreFilters>(initialFilters);
  const [sortMode, setSortMode] = useState<SortMode>("popular");
  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      let query = (supabase
        .from("products" as any)
        .select("id, name, short_description, category, price, sale_price, thumbnail_url, rating, review_count, sold_count, is_featured") as any)
        .eq("is_active", true)
        .order(sortMode === "popular" ? "sold_count" : "created_at", { ascending: false });

      // Tab-based category filter
      if (selectedTab !== "all") {
        query = query.eq("category", selectedTab) as any;
      }

      // Advanced filters
      if (filters.category) {
        query = query.eq("category", filters.category) as any;
      }
      if (filters.priceRange[0] > 0) {
        query = query.gte("price", filters.priceRange[0]) as any;
      }
      if (filters.priceRange[1] < 500000) {
        query = query.lte("price", filters.priceRange[1]) as any;
      }
      if (filters.keyword) {
        query = query.ilike("name", `%${filters.keyword}%`) as any;
      }

      const { data } = await query;
      setProducts((data || []) as any);
      setIsLoading(false);
    };
    fetch();
  }, [selectedTab, filters, sortMode]);

  const hasActiveFilters =
    filters.category !== null ||
    filters.priceRange[0] > 0 ||
    filters.priceRange[1] < 500000 ||
    filters.colors.length > 0 ||
    filters.sizes.length > 0 ||
    filters.keyword !== "";

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-lg font-bold text-foreground">듀이 스토어</h1>
          <button onClick={() => navigate("/cart")} className="relative p-2">
            <ShoppingCart className="w-5 h-5 text-foreground" />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px]">
                {itemCount}
              </span>
            )}
          </button>
        </div>

        {/* Tabs + Filter button */}
        <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
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
      </header>

      <main className="pb-20 px-4 py-4">
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

              return (
                <button
                  key={product.id}
                  onClick={() => navigate(`/store/${product.id}`)}
                  className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-md transition-shadow text-left"
                >
                  <div className="h-36 bg-muted flex items-center justify-center">
                    {product.thumbnail_url ? (
                      <img src={product.thumbnail_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingCart className="w-8 h-8 text-muted-foreground/30" />
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
