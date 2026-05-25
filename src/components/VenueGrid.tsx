import { useEffect, useRef, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin } from "lucide-react";
import VendorMediaCard from "@/components/home/VendorMediaCard";
import { useVenues, Venue } from "@/hooks/useVenues";
import { useToast } from "@/hooks/use-toast";
import { useFilterStore } from "@/stores/useFilterStore";
import { Button } from "@/components/ui/button";
import { venueToCardData } from "@/lib/categoryCardAdapter";
import { regionLabel } from "@/lib/regions";

// Round 14 — 도 단위 region 의 데이터 부재 케이스 인접 광역시 매핑. CategoryGrid 와 동일.
const REGION_NEIGHBORS: Record<string, { value: string; label: string }[]> = {
  "충청남": [{ value: "대전", label: "대전" }, { value: "세종", label: "세종" }],
  "충청북": [{ value: "대전", label: "대전" }, { value: "세종", label: "세종" }],
  "강원":   [{ value: "서울", label: "서울" }, { value: "경기", label: "경기" }],
  "전라남": [{ value: "광주", label: "광주" }],
  "전북":   [{ value: "광주", label: "광주" }],
  "경상남": [{ value: "부산", label: "부산" }, { value: "대구", label: "대구" }, { value: "울산", label: "울산" }],
  "경상북": [{ value: "대구", label: "대구" }, { value: "부산", label: "부산" }],
  "제주":   [{ value: "부산", label: "부산" }],
  "세종":   [{ value: "대전", label: "대전" }],
  "울산":   [{ value: "부산", label: "부산" }],
};

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

  const allVenues = data?.pages.flatMap((page) => page.venues) ?? [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-5 px-5 pb-20">
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
    const neighbors = region ? REGION_NEIGHBORS[region] ?? [] : [];
    const regionName = region ? regionLabel(region) : "";

    if (regionOnly) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3 animate-fade-in">
          <MapPin className="w-8 h-8 text-muted-foreground/40" />
          <div className="space-y-1">
            <p className="text-foreground font-semibold">{regionName} 웨딩홀 데이터가 아직 없어요</p>
            <p className="text-sm text-muted-foreground">
              {neighbors.length > 0
                ? `인접 지역 (${neighbors.map((n) => n.label).join("·")}) 또는 전국 결과를 보여드릴 수 있어요.`
                : "전국 결과를 보여드릴 수 있어요."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center pt-1">
            {neighbors.slice(0, 2).map((n) => (
              <Button
                key={n.value}
                variant="outline"
                size="sm"
                onClick={() => setRegion(n.value)}
                className="text-xs"
              >
                <MapPin className="w-3 h-3 mr-1" />
                {n.label} 보기
              </Button>
            ))}
            <Button variant="default" size="sm" onClick={() => setRegion(null)} className="text-xs">
              전국 보기
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
      <div className="grid grid-cols-2 gap-5 px-5">
        {allVenues.map((venue) => (
          <VendorMediaCard
            key={venue.id}
            data={venueToCardData(venue)}
            onClick={() => onVenueClick?.(venue)}
            fluid
          />
        ))}
      </div>

      <div ref={loadMoreRef} className="flex justify-center py-6">
        {isFetchingNextPage && (
          <div className="grid grid-cols-2 gap-5 px-5 w-full">
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
