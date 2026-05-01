import { useNavigate } from "react-router-dom";
import { useRecommendedVendors } from "@/hooks/useVendors";
import { Skeleton } from "@/components/ui/skeleton";
import VendorMediaCard, { CARD_W, CARD_H, vendorToCardData } from "./VendorMediaCard";

const CardSkeleton = () => (
  <Skeleton
    className="flex-shrink-0 rounded-[10px]"
    style={{ width: CARD_W, height: CARD_H }}
  />
);

const RecommendedSection = () => {
  const navigate = useNavigate();
  const { data: vendors, isLoading } = useRecommendedVendors(8);

  return (
    <section className="pt-[10px] pb-[20px] px-[20px] bg-[hsl(var(--pink-50))]">
      <h2 className="text-[16px] font-bold text-black mb-[10px]">맞춤 추천</h2>
      <div className="flex gap-[8px] overflow-x-auto scrollbar-hide">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : vendors && vendors.length > 0 ? (
          vendors.map((vendor) => (
            <VendorMediaCard
              key={vendor.vendor_id}
              data={vendorToCardData(vendor)}
              onClick={() => navigate(`/vendor/${vendor.vendor_id}`)}
            />
          ))
        ) : (
          <div className="flex items-center justify-center w-full py-15">
            <p className="text-sm text-muted-foreground">등록된 업체가 없습니다</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default RecommendedSection;
