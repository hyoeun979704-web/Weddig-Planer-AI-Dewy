import { useNavigate } from "react-router-dom";
import { ChevronRight, Star, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface StudioItem {
  id: string;
  name: string;
  address: string;
  price_per_person: number;
  rating: number;
  review_count: number;
  thumbnail_url: string | null;
  is_partner: boolean;
}

const formatPrice = (price: number): string => {
  if (price >= 10000) return `${Math.floor(price / 10000)}만원`;
  return `${price.toLocaleString()}원`;
};

const StudioGallery = () => {
  const navigate = useNavigate();

  const { data: studios = [], isLoading } = useQuery({
    queryKey: ["home-studio-gallery"],
    queryFn: async (): Promise<StudioItem[]> => {
      const { data, error } = await supabase
        .from("studios")
        .select("id, name, address, price_per_person, rating, review_count, thumbnail_url, is_partner")
        .order("is_partner", { ascending: false })
        .order("rating", { ascending: false })
        .limit(6);

      if (error) throw error;
      return (data || []) as StudioItem[];
    },
  });

  return (
    <section className="py-6 bg-muted/30">
      <div className="flex items-center justify-between px-4 mb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">인기 스드메 갤러리</h2>
          <p className="text-xs text-muted-foreground mt-0.5">예비부부가 가장 많이 찜한 스튜디오</p>
        </div>
        <button
          onClick={() => navigate("/studios")}
          className="flex items-center gap-1 text-sm text-primary font-medium"
        >
          전체보기
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full rounded-xl" />
          ))
        ) : studios.length > 0 ? (
          studios.slice(0, 4).map((studio) => (
            <button
              key={studio.id}
              onClick={() => navigate(`/studio/${studio.id}`)}
              className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow text-left"
            >
              <div className="aspect-[4/3] bg-muted overflow-hidden relative">
                {studio.thumbnail_url ? (
                  <img
                    src={studio.thumbnail_url}
                    alt={studio.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <span className="text-3xl">📸</span>
                  </div>
                )}
                {studio.is_partner && (
                  <span className="absolute top-2 left-2 text-[10px] font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                    파트너
                  </span>
                )}
              </div>
              <div className="p-2.5">
                <h4 className="text-sm font-semibold text-foreground truncate">{studio.name}</h4>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{studio.address}</span>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs font-medium text-primary">{formatPrice(studio.price_per_person)}</span>
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-medium">{studio.rating}</span>
                  </div>
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="col-span-2 flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">등록된 스튜디오가 없습니다</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default StudioGallery;
