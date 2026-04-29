import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useVendors } from "@/hooks/useVendors";
import { Skeleton } from "@/components/ui/skeleton";
import VendorMediaCard, { CARD_W, CARD_H, vendorToCardData } from "./VendorMediaCard";

const StudioGallery = () => {
  const navigate = useNavigate();
  const { data: vendors = [], isLoading } = useVendors("스드메");

  return (
    <section className="py-5 bg-muted/30">
      <div className="flex items-center justify-between px-4 mb-3">
        <div>
          <h2 className="text-base font-bold text-foreground">인기 스드메</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">예비부부가 가장 많이 찜한 스튜디오</p>
        </div>
        <button
          onClick={() => navigate("/vendors/스드메")}
          className="flex items-center gap-0.5 text-xs text-primary font-medium"
        >
          전체보기
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2 justify-items-center">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton
                key={i}
                className="rounded-[10px]"
                style={{ width: CARD_W, height: CARD_H }}
              />
            ))}
          </div>
        ) : vendors.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 justify-items-center">
            {vendors.slice(0, 4).map((vendor) => (
              <VendorMediaCard
                key={vendor.vendor_id}
                data={vendorToCardData(vendor)}
                onClick={() => navigate(`/vendor/${vendor.vendor_id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">등록된 스튜디오가 없습니다</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default StudioGallery;
