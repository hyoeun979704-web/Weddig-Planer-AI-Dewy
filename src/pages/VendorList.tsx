import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Star, MapPin, Heart } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useVendors, Vendor, categoryRouteMap } from "@/hooks/useVendors";
import { useCoupleFavorites } from "@/hooks/useCoupleFavorites";
import type { ItemType } from "@/hooks/useFavorites";
import { Skeleton } from "@/components/ui/skeleton";

// Maps the vendor's Korean category_type onto the favorites item_type so we
// can read pair status for vendor list cards.
const categoryToItemType = (category: string): ItemType => {
  switch (category) {
    case "웨딩홀": return "venue";
    case "스드메": return "studio";
    case "한복": return "hanbok";
    case "예복": return "suit";
    case "허니문": return "honeymoon";
    case "혼수": return "appliance";
    default: return "venue";
  }
};

const VendorList = () => {
  const navigate = useNavigate();
  const { category } = useParams<{ category: string }>();
  const decodedCategory = category ? decodeURIComponent(category) : "";
  const config = categoryRouteMap[decodedCategory];
  const { data: vendors = [], isLoading } = useVendors(decodedCategory || undefined);
  const { isFavorite, partnerLikes, isLinked } = useCoupleFavorites();

  return (
    <AppLayout hideCategoryTabBar mainClassName="">
      <header className="sticky top-14 z-30 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center px-4 h-14">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground flex-1 text-center -mr-8">
            {config?.label || decodedCategory || "업체 목록"}
          </h1>
        </div>
      </header>

      <div className="pb-20">
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
              {vendors.map((vendor) => {
                // Route to the category-specific detail path when available, so
                // /studio/:id /hanbok/:id etc are used; the category list's own
                // categoryRouteMap entry wins (e.g. "스드메" → /vendor catch-all
                // because the combo can't pick a single route). Falls back to
                // /vendor/:id (smart-router).
                const detail = config?.detailPath ?? "/vendor";
                const itemType = categoryToItemType(vendor.category_type);
                const mine = isFavorite(vendor.vendor_id, itemType);
                const partner = isLinked && partnerLikes(vendor.vendor_id, itemType);
                return (
                  <VendorListCard
                    key={vendor.vendor_id}
                    vendor={vendor}
                    pairStatus={
                      mine && partner ? "both" : partner ? "partner" : mine ? "mine" : "none"
                    }
                    onClick={() => navigate(`${detail}/${vendor.vendor_id}`)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <span className="text-2xl">{config?.emoji || "🏢"}</span>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {config?.label || decodedCategory} 업체가 곧 추가될 예정이에요
              </p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">먼저 다른 카테고리를 둘러볼까요?</p>
              <button
                onClick={() => navigate("/")}
                className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold"
              >
                홈으로
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

type PairStatus = "none" | "mine" | "partner" | "both";

const PairPill = ({ status }: { status: PairStatus }) => {
  if (status === "none") return null;
  const label =
    status === "both" ? "둘 다 찜" : status === "partner" ? "파트너 찜" : "내가 찜";
  const cls =
    status === "both"
      ? "bg-primary text-primary-foreground"
      : status === "partner"
        ? "bg-[#7BB6E0]/15 text-[#3F7CAB]"
        : "bg-destructive/10 text-destructive";
  return (
    <span
      className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 ${cls}`}
    >
      <Heart
        className={`w-2.5 h-2.5 ${status === "both" || status === "mine" ? "fill-current" : ""}`}
      />
      {label}
    </span>
  );
};

const VendorListCard = ({
  vendor,
  pairStatus,
  onClick,
}: {
  vendor: Vendor;
  pairStatus: PairStatus;
  onClick: () => void;
}) => (
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
      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
        <span className="text-[10px] font-medium px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
          {vendor.category_type}
        </span>
        <PairPill status={pairStatus} />
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
