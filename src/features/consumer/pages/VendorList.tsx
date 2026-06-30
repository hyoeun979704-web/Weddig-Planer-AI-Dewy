import { useCallback, useMemo } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { MapPin, Camera, Sparkles } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { useVendors, categoryRouteMap } from "@/hooks/useVendors";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { useWeddingVenue } from "@/hooks/useWeddingVenue";
import { usePortfolioVenueMatch } from "@/hooks/usePortfolioVenueMatch";
import { rankByVenueMatch } from "@/lib/venueMatch";
import { loadTasteTags } from "@/lib/tasteQuiz";
import { normalizeTagsToMoods } from "@/lib/tasteTaxonomy";
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
  // 취향 진단(미니퀴즈) 결과 태그 — 있으면 업체 스타일 태그와 겹치는 만큼 소프트 가산.
  const tasteTags = useMemo(() => loadTasteTags() as string[], []);
  const tasteSet = useMemo(() => new Set(tasteTags), [tasteTags]);
  // 업체 style_tags(자유텍스트일 수 있음)를 무드로 정규화 후 취향과 겹치는 수. 읽기 시점
  // 정규화라 기존 데이터 변형 없이(가역) "심플→모던" 같은 동의어도 매칭된다(콜드스타트 보강).
  const countTasteOverlap = useCallback(
    (styleTags: string[] | null | undefined) =>
      normalizeTagsToMoods(styleTags ?? []).filter((m) => tasteSet.has(m)).length,
    [tasteSet],
  );
  const ranked = useMemo(() => {
    const withVenue =
      venue.isSet && pfMap && pfMap.size > 0
        ? rankByVenueMatch({ placeId: venue.placeId, name: venue.name }, vendors, (v) => pfMap.get(v.vendor_id) ?? [])
        : vendors.map((v) => ({ ...v, venueMatch: { score: 0, sameVenue: false, byName: false } }));
    if (tasteTags.length === 0) return withVenue;
    // 같은-식장(1순위) → 취향 겹침 수(2순위) → 기존 순서. 취향이 결과 정렬에 실제 반영되게
    // 해 미니퀴즈가 "동작하는 척"하지 않도록(거짓 약속 방지).
    return withVenue
      .map((v, i) => ({ v, i, t: countTasteOverlap(v.style_tags) }))
      .sort((a, b) => b.v.venueMatch.score - a.v.venueMatch.score || b.t - a.t || a.i - b.i)
      .map(({ v }) => v);
  }, [vendors, pfMap, venue.isSet, venue.placeId, venue.name, tasteTags, countTasteOverlap]);
  const venueMatchCount = ranked.filter((v) => v.venueMatch.score > 0).length;
  const tasteMatchCount =
    tasteTags.length > 0 ? ranked.filter((v) => countTasteOverlap(v.style_tags) > 0).length : 0;

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
          {tasteMatchCount > 0 && (
            <p className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold text-primary">
              <Sparkles className="w-3.5 h-3.5" />
              취향({tasteTags.slice(0, 2).join("·")}) 맞춤 {tasteMatchCount}곳을 먼저 보여드려요
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
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
              <p className="text-sm text-muted-foreground">이 조건에 맞는 업체가 아직 없어요.</p>
              <div className="flex flex-col gap-2 w-full max-w-[260px]">
                <button
                  onClick={() => navigate("/quote/new")}
                  className="h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
                >
                  견적 요청하고 매칭받기
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="h-11 rounded-xl border border-border text-sm font-medium text-foreground"
                >
                  다른 카테고리 둘러보기
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default VendorList;
