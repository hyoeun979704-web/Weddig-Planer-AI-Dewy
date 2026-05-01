import { useEffect, useRef, forwardRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useCategoryData, CategoryItem } from "@/hooks/useCategoryData";
import { useCategoryFilterStore, CategoryType } from "@/stores/useCategoryFilterStore";
import VendorMediaCard, { CARD_W, CARD_H } from "@/components/home/VendorMediaCard";
import { categoryItemToCardData } from "@/lib/categoryCardAdapter";

interface CategoryGridProps {
  category: CategoryType;
  onItemClick?: (item: CategoryItem) => void;
}

const CardSkeleton = () => (
  <Skeleton
    className="rounded-[10px]"
    style={{ width: CARD_W, height: CARD_H }}
  />
);

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
      <div className="grid grid-cols-2 gap-2 px-[20px] justify-items-center">
        {[...Array(6)].map((_, i) => (
          <CardSkeleton key={i} />
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
    <div className="px-[20px]" ref={ref}>
      <div className="grid grid-cols-2 gap-2 justify-items-center">
        {allItems.map((item) => {
          const itemId = item.id || String((item as { number?: string | number }).number);
          return (
            <VendorMediaCard
              key={itemId}
              data={categoryItemToCardData(item, category)}
              onClick={() => onItemClick?.(item)}
            />
          );
        })}
      </div>

      <div ref={loadMoreRef} className="py-4">
        {isFetchingNextPage && (
          <div className="grid grid-cols-2 gap-2 justify-items-center">
            <CardSkeleton />
            <CardSkeleton />
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
