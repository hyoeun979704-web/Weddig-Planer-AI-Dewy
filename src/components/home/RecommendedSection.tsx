import { useNavigate } from "react-router-dom";
import { Star } from "lucide-react";
import { useRecommendedVendors, Vendor, categoryRouteMap } from "@/hooks/useVendors";
import { Skeleton } from "@/components/ui/skeleton";
import { FavoriteButton } from "@/components/FavoriteButton";
import type { ItemType } from "@/hooks/useFavorites";

/**
 * "맞춤 추천" home section.
 *
 * Per the design feed, each card is a small portrait tile:
 *   - Square gray placeholder / thumbnail
 *   - Heart button overlay top-right (real <FavoriteButton>, so a tap
 *     toggles the user's favorite + surfaces the partner-pair indicator
 *     just like every other heart in the app)
 *   - Vendor name
 *   - Region + category meta line
 *   - Star rating + review count
 *
 * Three cards visible at a time, horizontally scrollable for the rest.
 */

const categoryToItemType = (category: string): ItemType => {
  switch (category) {
    case "웨딩홀": return "venue";
    case "스드메": return "studio";
    case "한복": return "hanbok";
    case "예복": return "suit";
    case "허니문": return "honeymoon";
    case "혼수": return "appliance";
    default: return "venue";
  }
};

const VendorCard = ({ vendor, onClick }: { vendor: Vendor; onClick: () => void }) => {
  const itemType = categoryToItemType(vendor.category_type);
  return (
    <article className="flex-shrink-0 w-[150px] rounded-2xl overflow-hidden bg-white border border-border shadow-[var(--shadow-card)]">
      <button
        onClick={onClick}
        aria-label={vendor.name}
        className="block w-full text-left active:scale-[0.98] transition-transform"
      >
        {/* Thumbnail (square) — gray placeholder when no image. */}
        <div className="relative aspect-square bg-[#d9d9d9] overflow-hidden">
          {vendor.thumbnail_url && (
            <img
              src={vendor.thumbnail_url}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          )}
          {/* Heart overlay top-right — sits on top of the thumbnail.
              Stop-propagation lives inside FavoriteButton's handler. */}
          <div className="absolute top-1 right-1">
            <FavoriteButton itemId={vendor.vendor_id} itemType={itemType} variant="overlay" />
          </div>
        </div>

        {/* Caption block */}
        <div className="px-3 py-2.5">
          <p className="text-[12px] text-muted-foreground line-clamp-1">
            {vendor.category_type}
            {vendor.region ? ` · ${vendor.region}` : ""}
          </p>
          <h3 className="text-[13px] font-bold text-foreground line-clamp-1 mt-0.5">
            {vendor.name}
          </h3>
          <div className="flex items-center gap-1 mt-1.5">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-[11px] font-semibold text-foreground">
              {vendor.avg_rating?.toFixed(1) ?? "0.0"}
            </span>
            <span className="text-[11px] text-muted-foreground">
              ({vendor.review_count ?? 0})
            </span>
          </div>
        </div>
      </button>
    </article>
  );
};

const CardSkeleton = () => (
  <div className="flex-shrink-0 w-[150px] rounded-2xl overflow-hidden bg-white border border-border">
    <Skeleton className="aspect-square rounded-none" />
    <div className="p-3 space-y-1.5">
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  </div>
);

const RecommendedSection = () => {
  const navigate = useNavigate();
  const { data: vendors, isLoading } = useRecommendedVendors(8);

  return (
    <section className="px-4 py-5 bg-background">
      <h2 className="text-[16px] font-bold text-black mb-[10px]">맞춤 추천</h2>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
        ) : vendors && vendors.length > 0 ? (
          vendors.map((vendor) => {
            const detail = categoryRouteMap[vendor.category_type]?.detailPath ?? "/vendor";
            return (
              <VendorCard
                key={vendor.vendor_id}
                vendor={vendor}
                onClick={() => navigate(`${detail}/${vendor.vendor_id}`)}
              />
            );
          })
        ) : (
          <div className="flex items-center justify-center w-full py-8">
            <p className="text-sm text-muted-foreground">추천 업체가 곧 추가될 예정이에요</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default RecommendedSection;
