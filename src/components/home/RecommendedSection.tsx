import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { useRecommendedVendors, Vendor } from "@/hooks/useVendors";
import { formatVendorPrice } from "@/lib/placeMappers";
import { Skeleton } from "@/components/ui/skeleton";

const CARD_W = 100;
const CARD_H = 165;
const IMG_H = 100;

const VendorCard = ({ vendor, onClick }: { vendor: Vendor; onClick: () => void }) => {
  const [liked, setLiked] = useState(false);
  const price = formatVendorPrice(vendor);

  return (
    <button
      onClick={onClick}
      aria-label={vendor.name}
      className="flex-shrink-0 flex flex-col bg-[#d9d9d9] rounded-[10px] overflow-hidden text-left active:scale-[0.97]"
      style={{ width: CARD_W, height: CARD_H }}
    >
      <div className="relative w-full" style={{ height: IMG_H }}>
        {vendor.thumbnail_url ? (
          <img
            src={vendor.thumbnail_url}
            alt={vendor.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/15 to-primary/5" />
        )}

        <span
          role="button"
          aria-label={liked ? "찜 해제" : "찜하기"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setLiked((v) => !v);
          }}
          className="absolute right-1.5 top-1.5 z-10 inline-flex"
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

      <div className="flex-1 flex flex-col gap-[3px] px-2 py-1.5">
        <p className="text-[10px] font-bold leading-tight text-black line-clamp-1">
          {vendor.name}
        </p>
        <p className="text-[9px] leading-[1.25] text-black/55 line-clamp-2">
          {[vendor.region, vendor.category_type].filter(Boolean).join(" · ")}
        </p>
        {price ? (
          <p className="text-[9px] font-semibold leading-tight text-[#f29aa3] line-clamp-1 mt-auto">
            {price.prefix && <span className="mr-0.5">{price.prefix}</span>}
            {price.amount}
          </p>
        ) : (
          <p className="text-[9px] font-semibold leading-tight text-[#f29aa3] line-clamp-1 mt-auto">
            가격 문의
          </p>
        )}
      </div>
    </button>
  );
};

const CardSkeleton = () => (
  <div
    className="flex-shrink-0 flex flex-col bg-[#d9d9d9] rounded-[10px] overflow-hidden"
    style={{ width: CARD_W, height: CARD_H }}
  >
    <Skeleton className="w-full" style={{ height: IMG_H }} />
    <div className="flex-1 flex flex-col gap-[3px] px-2 py-1.5">
      <Skeleton className="h-[10px] w-4/5" />
      <Skeleton className="h-[9px] w-3/5" />
      <Skeleton className="h-[9px] w-1/2 mt-auto" />
    </div>
  </div>
);

const RecommendedSection = () => {
  const navigate = useNavigate();
  const { data: vendors, isLoading } = useRecommendedVendors(8);

  return (
    <section className="pt-[10px] pb-[20px] px-[20px] bg-[hsl(var(--pink-50))]">
      <h2 className="text-[16px] font-bold text-black mb-[10px]">맞춤 추천</h2>
      <div className="flex gap-[8px] overflow-x-auto scrollbar-hide">
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
