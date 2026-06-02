import { useEffect, useRef, forwardRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { useCategoryData, CategoryItem } from "@/hooks/useCategoryData";
import { useCategoryFilterStore, CategoryType } from "@/stores/useCategoryFilterStore";
import VendorMediaCard from "@/components/home/VendorMediaCard";
import { categoryItemToCardData } from "@/lib/categoryCardAdapter";
import { regionLabel } from "@/lib/regions";
import { useWeddingVenue, distanceKm, formatDistanceKm } from "@/hooks/useWeddingVenue";

interface CategoryGridProps {
  category: CategoryType;
  onItemClick?: (item: CategoryItem) => void;
}

const CATEGORY_KOREAN: Record<CategoryType, string> = {
  venues: "웨딩홀",
  studios: "스튜디오",
  dress_shops: "드레스",
  makeup_shops: "메이크업",
  hanbok: "한복",
  suits: "예복",
  honeymoon: "허니문",
  jewelry: "예물",
  appliances: "혼수",
  invitation_venues: "청첩장 모임",
};

// Fluid card placeholder — matches the 195px fluid card (100 image + 95 text).
const CardSkeleton = () => (
  <div className="w-full h-[195px] flex flex-col rounded-[10px] overflow-hidden bg-card">
    <Skeleton className="w-full h-[100px] rounded-none" />
    <div className="flex-1 p-2 space-y-1">
      <Skeleton className="h-2 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-2 w-3/4" />
    </div>
  </div>
);

const CategoryGrid = forwardRef<HTMLDivElement, CategoryGridProps>(function CategoryGrid({ category, onItemClick }, ref) {
  const { toast } = useToast();
  const { resetFilters, hasActiveFilters, region, setRegion, filterOptions1, filterOptions2, filterOptions3, minRating } = useCategoryFilterStore();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  // 식장 anchor 기준 근접 거리 배지 — 식장 등록 + 좌표 있을 때만.
  const venue = useWeddingVenue();

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
      <div className="grid grid-cols-2 gap-5 px-5">
        {[...Array(6)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (allItems.length === 0) {
    // Round 14 — empty state 분기:
    //   1. region 만 켜짐 + 0건 → 카테고리·지역 명시 + 인접 광역시 안내 + 전국 보기 CTA
    //   2. region + 다른 필터 + 0건 → 다른 필터 풀기 권유
    //   3. 필터 없음 + 0건 → 기존 "등록된 업체가 없습니다"
    const hasNonRegionFilter =
      !!minRating ||
      filterOptions1.length > 0 ||
      filterOptions2.length > 0 ||
      filterOptions3.length > 0;
    const regionOnly = !!region && !hasNonRegionFilter;
    const categoryName = CATEGORY_KOREAN[category] ?? "";
    const regionName = region ? regionLabel(region) : "";

    if (regionOnly) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3">
          <MapPin className="w-8 h-8 text-muted-foreground/40" />
          <div className="space-y-1">
            <p className="text-foreground font-semibold">
              {regionName} {categoryName} 데이터가 아직 없어요
            </p>
            <p className="text-sm text-muted-foreground">
              곧 추가될 예정이에요. 전국 결과를 먼저 둘러보시겠어요?
            </p>
          </div>
          <div className="flex gap-2 justify-center pt-1">
            <Button variant="default" size="sm" onClick={() => setRegion(null)} className="text-xs">
              전국 보기
            </Button>
            <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs">
              필터 초기화
            </Button>
          </div>
        </div>
      );
    }

    if (hasActiveFilters()) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3">
          <p className="text-muted-foreground">필터 조건에 맞는 결과가 없습니다</p>
          <p className="text-xs text-muted-foreground">
            지역·옵션 칩을 일부 풀면 더 많은 결과가 나올 수 있어요.
          </p>
          <Button variant="outline" size="sm" onClick={resetFilters}>
            필터 초기화
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <p className="text-muted-foreground mb-4">등록된 업체가 없습니다</p>
      </div>
    );
  }

  return (
    <div ref={ref}>
      <div className="grid grid-cols-2 gap-5 px-5">
        {allItems.map((item) => {
          const itemId = item.id || String((item as { number?: string | number }).number);
          const cardData = categoryItemToCardData(item, category);
          if (venue.isSet) {
            const d = distanceKm(venue.lat, venue.lng, item.lat ?? null, item.lng ?? null);
            if (d != null) cardData.distanceLabel = `식장 ${formatDistanceKm(d)}`;
          }
          return (
            <VendorMediaCard
              key={itemId}
              data={cardData}
              onClick={() => onItemClick?.(item)}
              fluid
            />
          );
        })}
      </div>

      <div ref={loadMoreRef} className="py-4">
        {isFetchingNextPage && (
          <div className="grid grid-cols-2 gap-5 px-5">
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
