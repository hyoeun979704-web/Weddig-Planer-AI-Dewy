import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { useRecommendedVendors, Vendor } from "@/hooks/useVendors";
import { formatVendorPrice } from "@/lib/placeMappers";
import { Skeleton } from "@/components/ui/skeleton";

const CARD_W = 110;
const THUMB_H = 130;

const VendorCard = ({ vendor, onClick }: { vendor: Vendor; onClick: () => void }) => {
  const [liked, setLiked] = useState(false);
  const price = formatVendorPrice(vendor);

  return (
    <button
      onClick={onClick}
      aria-label={vendor.name}
      className="flex-shrink-0 flex flex-col gap-1.5 active:scale-[0.97] text-left"
      style={{ width: CARD_W }}
    >
      <div
        className="relative w-full overflow-hidden rounded-[10px] bg-[#d9d9d9]"
        style={{ height: THUMB_H }}
      >
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

        <span
          role="button"
          aria-label={liked ? "찜 해제" : "찜하기"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setLiked((v) => !v);
          }}
          className="absolute right-2 top-2 z-10 inline-flex"
        >
          <Heart
            className={
              liked
                ? "h-4 w-4 fill-[#f29aa3] text-[#f29aa3]"
                : "h-4 w-4 text-white drop-shadow"
            }
            strokeWidth={2}
          />
        </span>
      </div>

      <div className="flex flex-col gap-[2px] px-[2px]">
        <p className="text-[11px] font-semibold leading-tight text-black line-clamp-1">
          {vendor.name}
        </p>
        <p className="text-[10px] leading-tight text-black/55 line-clamp-1">
          {vendor.region ?? vendor.category_type}
        </p>
        {price && (
          <p className="text-[10px] font-medium leading-tight text-[#f29aa3]">
            {price.prefix && <span className="text-black/55 mr-0.5">{price.prefix}</span>}
            {price.amount}
          </p>
        )}
      </div>
    </button>
  );
};

const CardSkeleton = () => (
  <div className="flex-shrink-0 flex flex-col gap-1.5" style={{ width: CARD_W }}>
    <Skeleton className="w-full rounded-[10px]" style={{ height: THUMB_H }} />
    <Skeleton className="h-[11px] w-4/5" />
    <Skeleton className="h-[10px] w-3/5" />
    <Skeleton className="h-[10px] w-1/2" />
  </div>
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
          <div className="flex items-center justify-center w-full py-15">
            <p className="text-sm text-muted-foreground">등록된 업체가 없습니다</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default RecommendedSection;
