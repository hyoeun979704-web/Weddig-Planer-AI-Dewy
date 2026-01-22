import { useEffect, useRef } from "react";
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
    <Skeleton className="h-32 w-full" />
    <div className="p-3 space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex justify-between">
        <Skeleton className="h-3 w-1/4" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  </div>
);

export default function CategoryGrid({ category, onItemClick }: CategoryGridProps) {
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
    <div className="px-4">
      <div className="grid grid-cols-2 gap-3">
        {allItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemClick?.(item)}
            className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all text-left"
          >
            <div className="h-32 bg-muted overflow-hidden relative">
              <img
                src={item.thumbnail_url || "/placeholder.svg"}
                alt={item.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.svg";
                }}
              />
              {item.is_partner && (
                <span className="absolute top-2 left-2 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full flex items-center gap-1">
                  <BadgeCheck className="w-3 h-3" />
                  파트너
                </span>
              )}
            </div>
            <div className="p-3">
              <h4 className="font-semibold text-foreground text-sm mb-1 truncate">
                {item.name}
              </h4>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <MapPin className="w-3 h-3" />
                <span className="truncate">
                  {item.address || item.destination || item.brand || ""}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-primary">
                  {item.price_per_person
                    ? `${(item.price_per_person / 10000).toFixed(0)}만원~`
                    : item.price_range || ""}
                </span>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-primary text-primary" />
                  <span className="text-xs font-medium">{item.rating}</span>
                  <span className="text-xs text-muted-foreground">
                    ({item.review_count})
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
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
}
