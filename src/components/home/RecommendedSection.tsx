import { useNavigate } from "react-router-dom";
import { ChevronRight, Star, MapPin } from "lucide-react";
import { useRecommendedVendors, Vendor } from "@/hooks/useVendors";
import { Skeleton } from "@/components/ui/skeleton";

const VendorCard = ({ vendor, onClick }: { vendor: Vendor; onClick: () => void }) => (
  <button
    onClick={onClick}
    aria-label={vendor.name}
    className="flex-shrink-0 w-[90px] flex flex-col gap-1 active:scale-[0.97]"
  >
    <div className="w-[90px] h-[90px] rounded-[10px] bg-[#d9d9d9] overflow-hidden">
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
          <span className="text-2xl">🏛️</span>
        </div>
      )}
    </div>
    <p className="text-[11px] leading-tight text-black text-center line-clamp-2">
      {vendor.name}
    </p>
  </button>
);

const CardSkeleton = () => (
  <Skeleton className="flex-shrink-0 w-[90px] h-[90px] rounded-[10px]" />
);

const RecommendedSection = () => {
  const navigate = useNavigate();
  const { data: vendors, isLoading } = useRecommendedVendors(8);

  return (
    <section className="pt-[10px] pb-[30px] px-[30px] bg-[hsl(var(--pink-50))]">
      <h2 className="text-[16px] font-bold text-black mb-[10px]">맞춤 추천</h2>
      <div className="flex gap-[10px] overflow-x-auto scrollbar-hide">
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
