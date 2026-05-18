import { useNavigate, useLocation, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useVendors, categoryRouteMap } from "@/hooks/useVendors";
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
  const { data: vendors = [], isLoading } = useVendors(decodedCategory || undefined);

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center px-4 h-14">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground flex-1 text-center -mr-8">
            {config?.label || decodedCategory || "업체 목록"}
          </h1>
        </div>
      </header>

      <main className="pb-20">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background px-4 py-6">
          <h2 className="text-xl font-bold text-foreground">
            {config?.emoji} {config?.label || decodedCategory}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            총 {vendors.length}개의 업체가 있습니다
          </p>
        </div>

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
