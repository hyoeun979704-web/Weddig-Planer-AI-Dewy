import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Star, ExternalLink, Users, Play, Image, FileText, Loader2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useInfluencers, useCategoryLabels, Influencer } from "@/hooks/useInfluencers";

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
  "all", "wedding_planner", "dress", "makeup", "photo", "honeymoon", "interior"
];

const Influencers = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const categoryLabels = useCategoryLabels();
  const { influencers, featured, isLoading } = useInfluencers(selectedCategory);

  const handleTabChange = (href: string) => navigate(href);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">웨딩 인플루언서</h1>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>
      </header>

      <main className="pb-20 px-4 py-4">
        {/* Featured Section */}
        {selectedCategory === "all" && featured.length > 0 && (
          <div className="mb-6">
            <h2 className="font-bold text-foreground mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-primary fill-primary" />
              추천 인플루언서
            </h2>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {featured.map((inf) => (
                <FeaturedCard key={inf.id} influencer={inf} onClick={() => navigate(`/influencers/${inf.id}`)} />
              ))}
            </div>
          </div>
        )}

        {/* List */}
        {influencers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">등록된 인플루언서가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {influencers.map((inf) => (
              <InfluencerCard key={inf.id} influencer={inf} onClick={() => navigate(`/influencers/${inf.id}`)} />
            ))}
          </div>
        )}
      </main>

      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
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
