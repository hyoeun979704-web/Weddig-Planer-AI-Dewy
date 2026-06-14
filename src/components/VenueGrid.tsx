import { useEffect, useMemo, useRef, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin } from "lucide-react";
import VendorMediaCard from "@/components/home/VendorMediaCard";
import { useVenues, Venue } from "@/hooks/useVenues";
import { useToast } from "@/hooks/use-toast";
import { useFilterStore } from "@/stores/useFilterStore";
import { Button } from "@/components/ui/button";
import { venueToCardData } from "@/lib/categoryCardAdapter";
import { regionLabel } from "@/lib/regions";

interface VenueGridProps {
  onVenueClick?: (venue: Venue) => void;
  partnersOnly?: boolean;
}

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

const VenueGrid = ({ onVenueClick, partnersOnly = false }: VenueGridProps) => {
  const { toast } = useToast();
  const {
    resetFilters,
    hasActiveFilters,
    region,
    sigungu,
    setRegion,
    maxPrice,
    maxGuarantee,
    minGuarantee,
    minRating,
    hallTypes,
    mealOptions,
    eventOptions,
  } = useFilterStore();
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

  const allVenues = useMemo(
    () => data?.pages.flatMap((page) => page.venues) ?? [],
    [data]
  );

  // 카드 목록을 메모 — 토스트·observer 등 무관한 상태 변화로 부모가 리렌더돼도
  // 목록(과 memo 된 VendorMediaCard)이 재생성되지 않도록. 데이터/콜백이 바뀔 때만 재계산.
  const venueCards = useMemo(
    () =>
      allVenues.map((venue) => (
        <VendorMediaCard
          key={venue.id}
          data={venueToCardData(venue)}
          onClick={() => onVenueClick?.(venue)}
          fluid
        />
      )),
    [allVenues, onVenueClick]
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 px-5 pb-20">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (allVenues.length === 0) {
    // Round 14 — region 만 켜진 0건 케이스 친근한 안내 + 인접 광역시 / 전국 보기 CTA.
    const hasNonRegionFilter =
      !!sigungu || !!maxPrice || !!maxGuarantee || !!minGuarantee || !!minRating ||
      hallTypes.length > 0 || mealOptions.length > 0 || eventOptions.length > 0;
    const regionOnly = !!region && !hasNonRegionFilter;
    const regionName = region ? regionLabel(region) : "";

    if (regionOnly) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3 animate-fade-in">
          <MapPin className="w-8 h-8 text-muted-foreground/40" />
          <div className="space-y-1">
            <p className="text-foreground font-semibold">{regionName} 웨딩홀 데이터가 아직 없어요</p>
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

    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 animate-fade-in text-center gap-3">
        <p className="text-muted-foreground">
          {hasActiveFilters() ? "검색 조건에 맞는 웨딩홀이 없습니다" : "등록된 웨딩홀이 없습니다"}
        </p>
        {hasActiveFilters() && (
          <>
            <p className="text-xs text-muted-foreground">지역·옵션 칩을 일부 풀면 더 많은 결과가 나올 수 있어요.</p>
            <Button variant="outline" onClick={resetFilters}>
              필터 초기화
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 px-5">
        {venueCards}
      </div>

      <div ref={loadMoreRef} className="flex justify-center py-6">
        {isFetchingNextPage && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 px-5 w-full">
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
