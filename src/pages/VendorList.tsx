import { useNavigate, useLocation, useParams } from "react-router-dom";
import { ChevronLeft, Star, MapPin, Phone } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useVendors, Vendor, categoryRouteMap } from "@/hooks/useVendors";
import { Skeleton } from "@/components/ui/skeleton";

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
        {/* Hero */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background px-4 py-6">
          <h2 className="text-xl font-bold text-foreground">
            {config?.emoji} {config?.label || decodedCategory}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            총 {vendors.length}개의 업체가 있습니다
          </p>
        </div>

        {/* Vendor Grid */}
        <div className="px-4 py-4">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          ) : vendors.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {vendors.map((vendor) => (
                <VendorListCard key={vendor.vendor_id} vendor={vendor} onClick={() => navigate(`/vendor/${vendor.vendor_id}`)} />
              ))}
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

const VendorListCard = ({ vendor, onClick }: { vendor: Vendor; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex gap-3 bg-card rounded-xl border border-border p-3 hover:shadow-md transition-shadow text-left w-full"
  >
    <div className="w-24 h-24 rounded-lg bg-muted overflow-hidden flex-shrink-0">
      {vendor.thumbnail_url ? (
        <img
          src={vendor.thumbnail_url}
          alt={vendor.name}
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
          <span className="text-2xl">{categoryRouteMap[vendor.category_type]?.emoji || "🏢"}</span>
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[10px] font-medium px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
          {vendor.category_type}
        </span>
      </div>
      <h3 className="font-semibold text-foreground text-sm truncate">{vendor.name}</h3>
      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
        <MapPin className="w-3 h-3" />
        <span className="truncate">{vendor.region || vendor.address || "위치 정보 없음"}</span>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <div className="flex items-center gap-0.5">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          <span className="text-xs font-medium">{vendor.avg_rating?.toFixed(1)}</span>
        </div>
        <span className="text-xs text-muted-foreground">리뷰 {vendor.review_count}</span>
      </div>
    </div>
  </button>
);

export default VendorList;
