import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Tag, Star, ChevronRight, SlidersHorizontal } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { usePartnerDeals } from "@/hooks/usePartnerDeals";
import { Skeleton } from "@/components/ui/skeleton";
import SortToggle, { SortMode } from "@/components/SortToggle";
import DealFilterSheet, { DealFilters, defaultFilters } from "@/components/deals/DealFilterSheet";

const mainCategories = [
  { key: "all", label: "전체" },
  { key: "venue", label: "웨딩홀" },
  { key: "studio", label: "스드메" },
  { key: "honeymoon", label: "허니문" },
];

const Deals = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("popular");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<DealFilters>(defaultFilters);

  const { deals, featured, isLoading } = usePartnerDeals(selectedCategory);

  const hasActiveFilters = !!(filters.category || filters.region || filters.maxPrice || filters.keyword);

  const handleTabChange = (href: string) => navigate(href);

  // Apply filters
  let filtered = [...deals];
  if (filters.keyword) {
    const kw = filters.keyword.toLowerCase();
    filtered = filtered.filter(
      (d) => d.title.toLowerCase().includes(kw) || d.partner_name.toLowerCase().includes(kw)
    );
  }
  if (filters.maxPrice) {
    filtered = filtered.filter((d) => (d.deal_price ?? 0) <= filters.maxPrice!);
  }

  // Sort
  const sorted = filtered.sort((a, b) => {
    if (sortMode === "popular") return b.view_count - a.view_count;
    return 0;
  });

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center px-4 h-14">
          <button onClick={() => navigate(-1)} className="mr-3">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">파트너 혜택</h1>
        </div>
      </header>

      {/* Category Filter */}
      <div className="px-4 py-3 overflow-x-auto">
        <div className="flex gap-2">
          {mainCategories.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                selectedCategory === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => setFilterOpen(true)}
            className="relative px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors bg-muted text-muted-foreground flex items-center gap-1"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            필터
            {hasActiveFilters && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Featured Deals */}
      {featured.length > 0 && (
        <div className="px-4 mb-6">
          <h2 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            추천 혜택
          </h2>
          <div className="space-y-3">
            {featured.map((deal) => (
              <div
                key={deal.id}
                onClick={() => navigate(`/deals/${deal.id}`)}
                className="p-4 bg-card rounded-2xl border border-border cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  {deal.partner_logo_url && (
                    <img src={deal.partner_logo_url} alt={deal.partner_name} className="w-12 h-12 rounded-xl object-cover" />
                  )}
                  <div className="flex-1">
                    <span className="text-xs text-primary font-medium">{deal.partner_name}</span>
                    <h3 className="font-semibold text-foreground text-sm">{deal.title}</h3>
                    {deal.discount_info && <span className="text-xs text-destructive font-bold">{deal.discount_info}</span>}
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Deals */}
      <main className="px-4 pb-20">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <Tag className="w-4 h-4 text-muted-foreground" />
            전체 혜택
          </h2>
          <SortToggle value={sortMode} onChange={setSortMode} />
        </div>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            해당 카테고리에 혜택이 없습니다
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((deal) => (
              <div
                key={deal.id}
                onClick={() => navigate(`/deals/${deal.id}`)}
                className="p-4 bg-card rounded-2xl border border-border cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  {deal.partner_logo_url && (
                    <img src={deal.partner_logo_url} alt={deal.partner_name} className="w-10 h-10 rounded-lg object-cover" />
                  )}
                  <div className="flex-1">
                    <span className="text-xs text-muted-foreground">{deal.partner_name}</span>
                    <h3 className="font-semibold text-foreground text-sm">{deal.title}</h3>
                    {deal.short_description && <p className="text-xs text-muted-foreground mt-0.5">{deal.short_description}</p>}
                    {deal.discount_info && <span className="text-xs text-destructive font-bold mt-1 inline-block">{deal.discount_info}</span>}
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <DealFilterSheet open={filterOpen} onOpenChange={setFilterOpen} filters={filters} onApply={setFilters} />
      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default Deals;
