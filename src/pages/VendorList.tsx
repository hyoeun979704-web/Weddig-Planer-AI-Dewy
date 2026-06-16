import { useMemo } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { MapPin, Camera, Sparkles } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { useVendors, categoryRouteMap } from "@/hooks/useVendors";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { useWeddingVenue } from "@/hooks/useWeddingVenue";
import { usePortfolioVenueMatch } from "@/hooks/usePortfolioVenueMatch";
import { rankByVenueMatch } from "@/lib/venueMatch";
import { Skeleton } from "@/components/ui/skeleton";
import VendorMediaCard, {
  CARD_W,
  CARD_H,
  vendorToCardData,
} from "@/components/home/VendorMediaCard";

const CardSkeleton = () => (
  <Skeleton
    className="rounded-[10px] mx-auto"
    style={{ width: CARD_W, height: CARD_H }}
  />
);

const VendorList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { category } = useParams<{ category: string }>();
  const decodedCategory = category ? decodeURIComponent(category) : "";
  const config = categoryRouteMap[decodedCategory];
  // 예식 지역(식장 city 우선, 없으면 wedding_region)으로 목록을 지역 우선 큐레이션.
  const { weddingSettings } = useWeddingSchedule();
  const curationRegion = weddingSettings.wedding_venue_city || weddingSettings.wedding_region;
  const { data: vendors = [], isLoading } = useVendors(decodedCategory || undefined, curationRegion);
  // useVendors 의 큐레이션 정렬과 동일 기준(city 정확 일치)으로 카운트해야
  // 배지 숫자와 실제 상단 정렬된 업체 수가 일치한다. region 은 "city district"
  // 조합이므로 city===curationRegion 은 region===curationRegion(구 없음) 또는
  // region 이 "curationRegion " 로 시작(구 있음)인 경우와 동치다.
  // (단순 startsWith 는 "서울"→"서울특별시 강남구"까지 잡아 정렬과 어긋남.)
  const regionMatchCount = curationRegion
    ? vendors.filter(
        (v) => v.region === curationRegion || (v.region ?? "").startsWith(curationRegion + " "),
      ).length
    : 0;

  // 같은 식장 포폴 우선 — 확정 식장이 있으면, 업체 포폴의 진행 장소와 매칭해 우선 정렬.
  const venue = useWeddingVenue();
  const placeIds = useMemo(() => vendors.map((v) => v.vendor_id), [vendors]);
  const { data: pfMap } = usePortfolioVenueMatch(venue.isSet ? placeIds : []);
  const ranked = useMemo(() => {
    if (!venue.isSet || !pfMap || pfMap.size === 0) {
      return vendors.map((v) => ({ ...v, venueMatch: { score: 0, sameVenue: false, byName: false } }));
    }
    return rankByVenueMatch(
      { placeId: venue.placeId, name: venue.name },
      vendors,
      (v) => pfMap.get(v.vendor_id) ?? [],
    );
  }, [vendors, pfMap, venue.isSet, venue.placeId, venue.name]);
  const venueMatchCount = ranked.filter((v) => v.venueMatch.score > 0).length;

  return (
    <div className="min-h-screen bg-background app-col mx-auto relative">
      <PageHeader title={config?.label || decodedCategory || "업체 목록"} />

      <main className="pb-20">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background px-4 py-6">
          <h2 className="text-xl font-bold text-foreground">
            {config?.emoji} {config?.label || decodedCategory}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            총 {vendors.length}개의 업체가 있습니다
          </p>
          {regionMatchCount > 0 && (
            <p className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-primary">
              <MapPin className="w-3.5 h-3.5" />
              내 지역 {curationRegion} {regionMatchCount}곳을 먼저 보여드려요
            </p>
          )}
          {venueMatchCount > 0 && (
            <p className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold text-primary">
              <Camera className="w-3.5 h-3.5" />
              {venue.shortLabel ? `${venue.shortLabel}에서` : "내 식장에서"} 촬영한 포폴 {venueMatchCount}곳을 먼저 보여드려요
            </p>
          )}
        </div>

        {/* 취향 모르겠는 초보 — 미니퀴즈 진단 진입(§4.1) */}
        <button
          type="button"
          onClick={() => navigate("/taste")}
          className="mx-4 mt-3 w-[calc(100%-2rem)] flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-left active:scale-[0.99] transition-transform"
        >
          <span className="inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">취향이 아직 모르겠어요</span>
          </span>
          <span className="text-[12px] text-muted-foreground">30초 진단 ›</span>
        </button>

        {/* 한 번에 여러 업체 견적 받기 — 능동적 연결(견적 매칭) 진입점 */}
        <button
          type="button"
          onClick={() => navigate("/quote/new")}
          className="mx-4 mt-3 w-[calc(100%-2rem)] flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-left active:scale-[0.99] transition-transform"
        >
          <span>
            <span className="block text-sm font-bold text-primary">한 번에 여러 곳 견적 받기</span>
            <span className="block text-[12px] text-muted-foreground mt-0.5">조건만 남기면 맞는 업체들이 견적을 보내줘요</span>
          </span>
          <span className="text-primary text-lg">›</span>
        </button>

        <div className="px-[20px] py-4">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-2 justify-items-center">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : ranked.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 justify-items-center">
              {ranked.map((vendor) => {
                const detail = config?.detailPath ?? "/vendor";
                return (
                  <div key={vendor.vendor_id} className="relative">
                    {vendor.venueMatch.score > 0 && (
                      <span className="absolute top-1.5 left-1.5 z-10 inline-flex items-center gap-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground shadow">
                        <Camera className="w-2.5 h-2.5" /> 내 식장 포폴
                      </span>
                    )}
                    <VendorMediaCard
                      data={vendorToCardData(vendor)}
                      onClick={() => navigate(`${detail}/${vendor.vendor_id}`)}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">등록된 업체가 없습니다</p>
            </div>
          )}
        </div>
      </main>

      <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default VendorList;
