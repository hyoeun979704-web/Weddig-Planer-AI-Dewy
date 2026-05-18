import { useNavigate } from "react-router-dom";
import { useRecommendedVendors } from "@/hooks/useVendors";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { Skeleton } from "@/components/ui/skeleton";
import { WEDDING_STYLE_LABEL } from "@/lib/weddingStyle";
import VendorMediaCard, { CARD_W, CARD_H, vendorToCardData } from "./VendorMediaCard";
import EmptyState from "@/components/EmptyState";
import { emptyCopy } from "@/lib/emptyCopy";

const EMPTY_BY_STYLE = {
  self: emptyCopy.vendorsSelf,
  small: emptyCopy.vendorsSmall,
} as const;

const CardSkeleton = () => (
  <Skeleton
    className="flex-shrink-0 rounded-[10px]"
    style={{ width: CARD_W, height: CARD_H }}
  />
);

const STYLE_HEADER: Record<string, { title: string; hint: string }> = {
  self: { title: "셀프웨딩 맞춤 추천", hint: "DIY 친화적인 한옥·하우스 베뉴 위주로 골랐어요" },
  small: { title: "스몰웨딩 맞춤 추천", hint: "50명 안팎 소규모 식 어울리는 곳" },
  general: { title: "맞춤 추천", hint: "예식일·지역·예산에 맞춰 추천드려요" },
};

const RecommendedSection = () => {
  const navigate = useNavigate();
  const { data: vendors, isLoading } = useRecommendedVendors(8);
  const { weddingSettings } = useWeddingSchedule();
  const style = weddingSettings.wedding_style;
  const header = STYLE_HEADER[style ?? "general"] ?? STYLE_HEADER.general;
  // Filter out vendors whose place category is in user's excluded list so the
  // self user doesn't see makeup shops they explicitly hid in settings.
  const excluded = new Set(weddingSettings.excluded_categories ?? []);
  const displayVendors = (vendors ?? []).filter(v => !excluded.has(v.category_slug));

  return (
    <section className="pt-[10px] pb-[20px] px-[20px] bg-[hsl(var(--pink-100))]">
      <div className="mb-[10px]">
        <div className="flex items-center gap-1.5">
          <h2 className="text-title font-bold text-black">{header.title}</h2>
          {style && style !== "general" && (
            <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-caption font-semibold">
              {WEDDING_STYLE_LABEL[style]}
            </span>
          )}
        </div>
        <p className="text-caption text-black/55 mt-0.5">{header.hint}</p>
      </div>
      <div className="flex gap-[8px] overflow-x-auto scrollbar-hide">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : displayVendors.length > 0 ? (
          displayVendors.map((vendor) => (
            <VendorMediaCard
              key={vendor.vendor_id}
              data={vendorToCardData(vendor)}
              onClick={() => navigate(`/vendor/${vendor.vendor_id}`)}
            />
          ))
        ) : (
          <EmptyState
            variant="inline"
            className="w-full"
            {...(EMPTY_BY_STYLE[style as keyof typeof EMPTY_BY_STYLE] ?? emptyCopy.vendors)}
          />
        )}
      </div>
    </section>
  );
};

export default RecommendedSection;
