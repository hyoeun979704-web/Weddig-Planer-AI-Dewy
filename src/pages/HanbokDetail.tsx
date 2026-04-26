import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlaceDetail } from "@/hooks/usePlaceDetail";
import PlaceDetailLayout from "@/components/detail/PlaceDetailLayout";

const HanbokDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: hanbok, isLoading, error } = usePlaceDetail(id);

  if (isLoading) return <DetailSkeleton />;
  if (error || !hanbok) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto flex flex-col items-center justify-center p-4">
        <span className="text-4xl mb-4">😢</span>
        <p className="text-muted-foreground text-center mb-4">한복 업체를 찾을 수 없어요.</p>
        <Button onClick={() => navigate("/hanbok")}>목록으로</Button>
      </div>
    );
  }

  const hasExtras = hanbok.hanbok_types.length > 0 || hanbok.custom_available != null;
  const extraSection = hasExtras ? (
    <div className="space-y-3">
      <h3 className="font-bold text-sm">한복 정보</h3>
      {hanbok.hanbok_types.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">한복 유형</p>
          <div className="flex flex-wrap gap-1.5">
            {hanbok.hanbok_types.map((t, i) => (
              <span key={i} className="text-xs px-2.5 py-1 bg-primary/10 text-primary rounded-full">{t}</span>
            ))}
          </div>
        </div>
      )}
      {hanbok.custom_available != null && (
        <div className="bg-muted/50 rounded-xl p-3">
          <p className="text-[11px] text-muted-foreground">맞춤 제작</p>
          <p className="text-sm font-semibold text-foreground mt-0.5">
            {hanbok.custom_available ? "가능" : "대여만"}
          </p>
        </div>
      )}
    </div>
  ) : null;

  return (
    <PlaceDetailLayout
      place={hanbok}
      categoryLabel="한복"
      favoriteType="hanbok"
      extraSection={extraSection}
    />
  );
};

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

export default HanbokDetail;
