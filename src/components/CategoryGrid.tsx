import React, { useEffect, useRef, forwardRef } from "react";
import { Star, MapPin, BadgeCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useCategoryData, CategoryItem } from "@/hooks/useCategoryData";
import { useCategoryFilterStore, CategoryType } from "@/stores/useCategoryFilterStore";

interface CategoryGridProps {
  category: CategoryType;
  onItemClick?: (item: CategoryItem) => void;
}

const CategoryCardSkeleton = () => (
  <div className="bg-card rounded-2xl border border-border overflow-hidden">
    <Skeleton className="aspect-[4/3] w-full" />
    <div className="p-3 space-y-2">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
      <div className="flex justify-between pt-1">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  </div>
);

// Category-specific tag list now flows through CategoryItem.keywords
// (populated by useCategoryData from place_<category>).
function getKeywords(item: CategoryItem): string[] {
  return item.keywords ?? [];
}

// All places.min_price values are stored as KRW per_person (analyzer normalizes
// couple/set prices ÷ 2). Labels here are user-facing context only — they do
// not change the underlying value.
const PRICE_UNIT_LABEL: Record<CategoryType, string> = {
  venues: "식대",
  studios: "1인 기준",
  dress_shops: "1인 1벌",
  makeup_shops: "1인 기준",
  hanbok: "1인 1세트",
  suits: "1인 1세트",
  honeymoon: "1인 기준",
  honeymoon_gifts: "1인 분담",
  appliances: "1인 분담",
  invitation_venues: "1인 식대",
};

function PriceRow({ price, label }: { price?: number; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      {price ? (
        <span className="text-xs font-semibold text-primary">
          {(price / 10000).toFixed(0)}만원~
        </span>
      ) : (
        <span className="text-xs font-medium text-muted-foreground">(준비중)</span>
      )}
    </div>
  );
}

// Category-specific card content renderer
function CategoryCardContent({ item, category }: { item: CategoryItem; category: CategoryType }) {
  const rating = typeof item.rating === "string" ? parseFloat(item.rating) || 0 : item.rating || 0;
  const keywords = getKeywords(item);

  // Location line
  const getLocation = () => {
    switch (category) {
      case "honeymoon": return item.destination || "";
      case "honeymoon_gifts":
      case "appliances": return item.brand || "";
      default: return item.address || "";
    }
  };

  const priceLabel = PRICE_UNIT_LABEL[category];

  // Render category-specific detail lines
  const renderDetails = () => {
    switch (category) {
      case "venues":
        return (
          <div className="space-y-0.5">
            <PriceRow price={item.price_per_person} label={priceLabel} />
            {item.min_guarantee && item.min_guarantee > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">보증인원</span>
                <span className="text-xs font-medium text-foreground">{item.min_guarantee}명</span>
              </div>
            )}
          </div>
        );

      case "honeymoon":
        return (
          <div className="space-y-0.5">
            {item.duration && (
              <p className="text-[11px] text-muted-foreground">{item.duration}</p>
            )}
            <PriceRow price={item.price_per_person} label={priceLabel} />
          </div>
        );

      case "studios":
      case "hanbok":
      case "suits":
      case "honeymoon_gifts":
      case "appliances":
      case "invitation_venues":
        return <PriceRow price={item.price_per_person} label={priceLabel} />;

      default:
        return null;
    }
  };

  return (
    <div className="p-3 space-y-1.5">
      {/* Location */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <MapPin className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">{getLocation() || "(위치 미정)"}</span>
      </div>

      {/* Name */}
      <h4 className="font-bold text-foreground text-sm truncate">{item.name}</h4>

      {/* Category-specific details */}
      {renderDetails()}

      {/* Keywords */}
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {keywords.slice(0, 3).map((kw, i) => (
            <span
              key={i}
              className="text-[10px] px-1.5 py-0.5 bg-primary/5 text-primary rounded-full"
            >
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* Rating & Reviews */}
      <div className="flex items-center gap-1 pt-0.5">
        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
        <span className="text-xs font-semibold text-foreground">{rating.toFixed(1)}</span>
        {item.review_count > 0 && (
          <span className="text-xs text-muted-foreground">({item.review_count})</span>
        )}
      </div>
    </div>
  );
}

const CategoryGrid = forwardRef<HTMLDivElement, CategoryGridProps>(function CategoryGrid({ category, onItemClick }, ref) {
  const { toast } = useToast();
  const { resetFilters, hasActiveFilters } = useCategoryFilterStore();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCategoryData(category);

  useEffect(() => {
    if (isError && error) {
      toast({
        title: "데이터를 불러올 수 없습니다",
        description: "잠시 후 다시 시도해주세요",
        variant: "destructive",
      });
    }
  }, [isError, error, toast]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const allItems = data?.pages.flatMap((page) => page.data) ?? [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 px-4">
        {[...Array(6)].map((_, i) => (
          <CategoryCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (allItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <p className="text-muted-foreground mb-4">
          {hasActiveFilters()
            ? "필터 조건에 맞는 결과가 없습니다"
            : "등록된 업체가 없습니다"}
        </p>
        {hasActiveFilters() && (
          <Button variant="outline" size="sm" onClick={resetFilters}>
            필터 초기화
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="px-4" ref={ref}>
      <div className="grid grid-cols-2 gap-3">
        {allItems.map((item) => {
          const itemId = item.id || String((item as any).number);

          return (
            <button
              key={itemId}
              onClick={() => onItemClick?.(item)}
              className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all text-left"
            >
              {/* Thumbnail */}
              <div className="aspect-[4/3] bg-muted overflow-hidden relative">
                <img
                  src={item.thumbnail_url || "/placeholder.svg"}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg";
                  }}
                />
                {item.is_partner && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center gap-0.5 shadow-sm">
                    <BadgeCheck className="w-3 h-3" />
                    파트너
                  </span>
                )}
              </div>

              {/* Card Content */}
              <CategoryCardContent item={item} category={category} />
            </button>
          );
        })}
      </div>

      {/* Load more trigger */}
      <div ref={loadMoreRef} className="py-4">
        {isFetchingNextPage && (
          <div className="grid grid-cols-2 gap-3">
            <CategoryCardSkeleton />
            <CategoryCardSkeleton />
          </div>
        )}
        {!hasNextPage && allItems.length > 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">
            모든 결과를 불러왔습니다
          </p>
        )}
      </div>
    </div>
  );
});

export default CategoryGrid;
