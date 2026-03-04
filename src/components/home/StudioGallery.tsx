import { useNavigate } from "react-router-dom";
import { ChevronRight, Star, MapPin } from "lucide-react";
import { useVendors, Vendor } from "@/hooks/useVendors";
import { Skeleton } from "@/components/ui/skeleton";

const StudioGallery = () => {
  const navigate = useNavigate();
  const { data: vendors = [], isLoading } = useVendors("스드메");

  return (
    <section className="py-6 bg-muted/30">
      <div className="flex items-center justify-between px-4 mb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">인기 스드메 갤러리</h2>
          <p className="text-xs text-muted-foreground mt-0.5">예비부부가 가장 많이 찜한 스튜디오</p>
        </div>
        <button
          onClick={() => navigate("/vendors/스드메")}
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
        ) : vendors.length > 0 ? (
          vendors.slice(0, 4).map((vendor) => (
            <button
              key={vendor.vendor_id}
              onClick={() => navigate(`/vendor/${vendor.vendor_id}`)}
              className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow text-left"
            >
              <div className="aspect-[4/3] bg-muted overflow-hidden relative">
                {vendor.thumbnail_url ? (
                  <img
                    src={vendor.thumbnail_url}
                    alt={vendor.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <span className="text-3xl">📸</span>
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <h4 className="text-sm font-semibold text-foreground truncate">{vendor.name}</h4>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{vendor.region || vendor.address}</span>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-medium">{vendor.avg_rating}</span>
                    <span className="text-xs text-muted-foreground">({vendor.review_count})</span>
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
