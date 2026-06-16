import { useNavigate, useLocation, useParams } from "react-router-dom";
import { MapPin } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { useVendors, categoryRouteMap } from "@/hooks/useVendors";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
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
  const regionMatchCount = curationRegion
    ? vendors.filter((v) => (v.region ?? "").startsWith(curationRegion)).length
    : 0;

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
        </div>

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
          ) : vendors.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 justify-items-center">
              {vendors.map((vendor) => {
                const detail = config?.detailPath ?? "/vendor";
                return (
                  <VendorMediaCard
                    key={vendor.vendor_id}
                    data={vendorToCardData(vendor)}
                    onClick={() => navigate(`${detail}/${vendor.vendor_id}`)}
                  />
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
