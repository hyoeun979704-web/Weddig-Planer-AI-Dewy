import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Star, Users, Loader2, SlidersHorizontal, Heart } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useInfluencers, useCategoryLabels, Influencer } from "@/hooks/useInfluencers";
import SortToggle, { SortMode } from "@/components/SortToggle";
import InfoFilterSheet, { InfoFilters, initialInfoFilters } from "@/components/info/InfoFilterSheet";

const platformIcons: Record<string, string> = {
  instagram: "📸",
  youtube: "🎬",
  blog: "📝",
};

const formatCount = (n: number): string => {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return n.toString();
};

const categories = [
  { id: "all", label: "전체" },
  { id: "wedding_hall", label: "웨딩홀" },
  { id: "photo", label: "촬영" },
  { id: "ceremony", label: "본식" },
];

const Influencers = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("popular");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<InfoFilters>(initialInfoFilters);
  const { influencers, featured, isLoading } = useInfluencers(selectedCategory);

  const hasActiveFilters =
    filters.category !== null ||
    filters.duration !== null ||
    filters.uploadDate !== null ||
    filters.keyword !== "";

  // Sort influencers
  const sorted = [...influencers].sort((a, b) => {
    if (sortMode === "popular") return b.follower_count - a.follower_count;
    return 0; // already ordered by display_order (latest)
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-[112px] z-30 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-bold text-foreground">웨딩 정보</h1>
          </div>
          <button onClick={() => navigate("/favorites")} className="p-2">
            <Heart className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Category Tabs + Filter */}
        <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {cat.label}
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

      <div className="px-4 py-4">
        {/* Sort Toggle */}
        <div className="flex justify-end mb-3">
          <SortToggle value={sortMode} onChange={setSortMode} />
        </div>

        {/* Featured Section */}
        {selectedCategory === "all" && featured.length > 0 && (
          <div className="mb-6">
            <h2 className="font-bold text-foreground mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-primary fill-primary" />
              추천 콘텐츠
            </h2>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {featured.map((inf) => (
                <FeaturedCard key={inf.id} influencer={inf} onClick={() => navigate(`/influencers/${inf.id}`)} />
              ))}
            </div>
          </div>
        )}

        {/* List */}
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">등록된 정보가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((inf) => (
              <InfluencerCard key={inf.id} influencer={inf} onClick={() => navigate(`/influencers/${inf.id}`)} />
            ))}
          </div>
        )}
      </div>

      <InfoFilterSheet open={filterOpen} onOpenChange={setFilterOpen} filters={filters} onApply={setFilters} />
    </AppLayout>
  );
};

const FeaturedCard = ({ influencer, onClick }: { influencer: Influencer; onClick: () => void }) => (
  <button onClick={onClick} className="flex-shrink-0 w-36 bg-card rounded-2xl border border-border overflow-hidden hover:shadow-md transition-shadow text-left">
    <div className="h-20 bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center">
      {influencer.profile_image_url ? (
        <img src={influencer.profile_image_url} alt={influencer.name} className="w-14 h-14 rounded-full object-cover border-2 border-white" />
      ) : (
        <div className="w-14 h-14 rounded-full bg-primary/30 flex items-center justify-center text-xl font-bold text-primary">
          {influencer.name[0]}
        </div>
      )}
    </div>
    <div className="p-3">
      <p className="font-semibold text-foreground text-sm truncate">{influencer.name}</p>
      <p className="text-xs text-muted-foreground truncate">{influencer.handle}</p>
      <p className="text-xs text-primary mt-1">{formatCount(influencer.follower_count)} 팔로워</p>
    </div>
  </button>
);

const InfluencerCard = ({ influencer, onClick }: { influencer: Influencer; onClick: () => void }) => (
  <button onClick={onClick} className="w-full flex items-center gap-3 p-4 bg-card rounded-2xl border border-border hover:shadow-md transition-shadow text-left">
    {influencer.profile_image_url ? (
      <img src={influencer.profile_image_url} alt={influencer.name} className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
    ) : (
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-lg font-bold text-primary">
        {influencer.name[0]}
      </div>
    )}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-foreground text-sm">{influencer.name}</h3>
        <span className="text-xs">{platformIcons[influencer.platform] || "🌐"}</span>
      </div>
      <p className="text-xs text-muted-foreground mb-1.5">{influencer.handle}</p>
      <div className="flex items-center gap-2">
        <span className="text-xs text-primary font-medium">{formatCount(influencer.follower_count)} 팔로워</span>
        {influencer.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="px-1.5 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">
            #{tag}
          </span>
        ))}
      </div>
    </div>
  </button>
);

export default Influencers;
