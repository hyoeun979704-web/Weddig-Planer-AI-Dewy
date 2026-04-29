import { useEffect, useRef, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import VendorMediaCard, { CARD_W, CARD_H } from "@/components/home/VendorMediaCard";
import { useVenues, Venue } from "@/hooks/useVenues";
import { useToast } from "@/hooks/use-toast";
import { useFilterStore } from "@/stores/useFilterStore";
import { Button } from "@/components/ui/button";
import { venueToCardData } from "@/lib/categoryCardAdapter";

interface VenueGridProps {
  onVenueClick?: (venue: Venue) => void;
  partnersOnly?: boolean;
}

const CardSkeleton = () => (
  <Skeleton
    className="rounded-[10px]"
    style={{ width: CARD_W, height: CARD_H }}
  />
);

const VenueGrid = ({ onVenueClick, partnersOnly = false }: VenueGridProps) => {
  const { toast } = useToast();
  const { resetFilters, hasActiveFilters } = useFilterStore();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useVenues(partnersOnly);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    observerRef.current = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "100px",
      threshold: 0.1,
    });

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver]);

  useEffect(() => {
    if (isError && error) {
      toast({
        title: "오류가 발생했습니다",
        description: "웨딩홀 목록을 불러오는데 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    }
  }, [isError, error, toast]);

  const allVenues = data?.pages.flatMap((page) => page.venues) ?? [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2 px-[20px] pb-20 justify-items-center">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (allVenues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 animate-fade-in">
        <span className="text-4xl mb-4">{hasActiveFilters() ? "🔍" : "🏛️"}</span>
        <p className="text-muted-foreground text-center mb-4">
          {hasActiveFilters()
            ? "검색 조건에 맞는 웨딩홀이 없습니다."
            : "등록된 웨딩홀이 없습니다."}
        </p>
        {hasActiveFilters() && (
          <Button variant="outline" onClick={resetFilters}>
            필터 초기화
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="grid grid-cols-2 gap-2 px-[20px] justify-items-center">
        {allVenues.map((venue) => (
          <VendorMediaCard
            key={venue.id}
            data={venueToCardData(venue)}
            onClick={() => onVenueClick?.(venue)}
          />
        ))}
      </div>

      <div ref={loadMoreRef} className="flex justify-center py-6">
        {isFetchingNextPage && (
          <div className="grid grid-cols-2 gap-2 px-[20px] w-full justify-items-center">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        )}
        {!hasNextPage && allVenues.length > 0 && (
          <p className="text-muted-foreground text-sm">모든 웨딩홀을 불러왔습니다</p>
        )}
      </div>
    </div>
  );
};

export default VenueGrid;
