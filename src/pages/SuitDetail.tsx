import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlaceDetail } from "@/hooks/usePlaceDetail";
import PlaceDetailLayout from "@/components/detail/PlaceDetailLayout";

const SuitDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: suit, isLoading, error } = usePlaceDetail(id);

  if (isLoading) return <DetailSkeleton />;
  if (error || !suit) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto flex flex-col items-center justify-center p-4">
        <span className="text-4xl mb-4">😢</span>
        <p className="text-muted-foreground text-center mb-4">예복 정보를 찾을 수 없어요.</p>
        <Button onClick={() => navigate("/suit")}>목록으로</Button>
      </div>
    );
  }

  // Per-category extra: show suit styles, designer brands, fitting count if present.
  const hasExtras =
    suit.suit_styles.length > 0 || suit.designer_brands.length > 0 || suit.fitting_count != null;

  const extraSection = hasExtras ? (
    <div className="space-y-3">
      <h3 className="font-bold text-sm">예복 정보</h3>
      {suit.suit_styles.length > 0 && (
        <Tags label="스타일" items={suit.suit_styles} />
      )}
      {suit.designer_brands.length > 0 && (
        <Tags label="브랜드" items={suit.designer_brands} />
      )}
      <div className="grid grid-cols-2 gap-2">
        {suit.fitting_count != null && (
          <Stat label="가봉 횟수" value={`${suit.fitting_count}회`} />
        )}
        {suit.custom_available != null && (
          <Stat label="맞춤 제작" value={suit.custom_available ? "가능" : "불가"} />
        )}
      </div>
    </div>
  ) : null;

  return (
    <PlaceDetailLayout
      place={suit}
      categoryLabel="예복"
      favoriteType="suit"
      extraSection={extraSection}
    />
  );
};

const Tags = ({ label, items }: { label: string; items: string[] }) => (
  <div>
    <p className="text-xs text-muted-foreground mb-1.5">{label}</p>
    <div className="flex flex-wrap gap-1.5">
      {items.map((it, i) => (
        <span key={i} className="text-xs px-2.5 py-1 bg-primary/10 text-primary rounded-full">{it}</span>
      ))}
    </div>
  </div>
);

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-muted/50 rounded-xl p-3">
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className="text-sm font-semibold text-foreground mt-0.5">{value}</p>
  </div>
);

const DetailSkeleton = () => (
  <div className="min-h-screen bg-background max-w-[430px] mx-auto">
    <div className="h-14 border-b border-border flex items-center px-4">
      <Skeleton className="w-6 h-6 rounded" />
    </div>
    <Skeleton className="aspect-[4/3] w-full" />
    <div className="p-4 space-y-3">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-16 w-full rounded-xl" />
    </div>
  </div>
);

export default SuitDetail;
