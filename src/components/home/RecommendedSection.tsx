import { useNavigate } from "react-router-dom";
import { ChevronRight, Star, MapPin } from "lucide-react";
import { useRecommendedVendors, Vendor } from "@/hooks/useVendors";
import { Skeleton } from "@/components/ui/skeleton";

const VendorCard = ({ vendor, onClick }: { vendor: Vendor; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex-shrink-0 w-56 bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-all duration-200 text-left active:scale-[0.97]"
  >
    <div className="h-32 bg-muted overflow-hidden relative">
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
          <span className="text-3xl">🏛️</span>
        </div>
      )}
      <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 bg-background/80 backdrop-blur-sm text-foreground rounded-full">
        {vendor.category_type}
      </span>
    </div>
    <div className="p-2.5">
      <h4 className="font-semibold text-foreground text-sm mb-1 truncate">{vendor.name}</h4>
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
        <MapPin className="w-3 h-3 shrink-0" />
        <span className="truncate">{vendor.region || vendor.address || "위치 정보 없음"}</span>
      </div>
      <div className="flex items-center gap-1">
        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
        <span className="text-xs font-medium text-foreground">{vendor.avg_rating?.toFixed(1)}</span>
        <span className="text-xs text-muted-foreground">({vendor.review_count})</span>
      </div>
    </div>
  </button>
);

const CardSkeleton = () => (
  <div className="flex-shrink-0 w-56 bg-card rounded-xl border border-border overflow-hidden">
    <Skeleton className="h-32 w-full" />
    <div className="p-2.5">
      <Skeleton className="h-4 w-32 mb-2" />
      <Skeleton className="h-3 w-24 mb-2" />
      <Skeleton className="h-3 w-20" />
    </div>
  </div>
);

const RecommendedSection = () => {
  const navigate = useNavigate();
  const { data: vendors, isLoading } = useRecommendedVendors(8);

  return (
    <section className="pt-2 pb-5">
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-base font-bold text-foreground">인기 업체 추천</h2>
        <button 
          onClick={() => navigate("/vendors/웨딩홀")}
          className="flex items-center gap-0.5 text-xs text-primary font-medium"
        >
          전체보기
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      
      <div className="flex gap-2.5 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : vendors && vendors.length > 0 ? (
          vendors.map((vendor) => (
            <VendorCard 
              key={vendor.vendor_id} 
              vendor={vendor}
              onClick={() => navigate(`/vendor/${vendor.vendor_id}`)}
            />
          ))
        ) : (
          <div className="flex items-center justify-center w-full py-8">
            <p className="text-sm text-muted-foreground">등록된 업체가 없습니다</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default RecommendedSection;
