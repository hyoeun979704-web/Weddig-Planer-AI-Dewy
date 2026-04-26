import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlaceDetail } from "@/hooks/usePlaceDetail";
import PlaceDetailLayout from "@/components/detail/PlaceDetailLayout";

const StudioDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: studio, isLoading, error } = usePlaceDetail(id);

  if (isLoading) return <DetailSkeleton />;
  if (error || !studio) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto flex flex-col items-center justify-center p-4">
        <span className="text-4xl mb-4">😢</span>
        <p className="text-muted-foreground text-center mb-4">스튜디오를 찾을 수 없어요.</p>
        <Button onClick={() => navigate("/studios")}>목록으로</Button>
      </div>
    );
  }

  const hasExtras =
    studio.shoot_styles.length > 0 ||
    studio.shoot_locations.length > 0 ||
    studio.total_photos != null ||
    studio.original_count != null ||
    studio.retouching_included != null ||
    studio.includes_originals != null ||
    studio.dress_provided != null;

  const extraSection = hasExtras ? (
    <div className="space-y-3">
      <h3 className="font-bold text-sm">촬영 정보</h3>
      {studio.shoot_styles.length > 0 && (
        <Tags label="스타일" items={studio.shoot_styles} />
      )}
      {studio.shoot_locations.length > 0 && (
        <Tags label="촬영 장소" items={studio.shoot_locations} />
      )}
      <div className="grid grid-cols-2 gap-2">
        {studio.total_photos != null && (
          <Stat label="총 사진" value={`${studio.total_photos}장`} />
        )}
        {studio.original_count != null && (
          <Stat label="원본" value={`${studio.original_count}장`} />
        )}
        {studio.retouching_included != null && (
          <Stat label="보정 포함" value={studio.retouching_included ? "포함" : "별도"} />
        )}
        {studio.includes_originals != null && (
          <Stat label="원본 제공" value={studio.includes_originals ? "제공" : "미제공"} />
        )}
        {studio.dress_provided != null && (
          <Stat label="드레스 대여" value={studio.dress_provided ? "포함" : "별도"} />
        )}
      </div>
    </div>
  ) : null;

  return (
    <PlaceDetailLayout
      place={studio}
      categoryLabel="스튜디오"
      favoriteType="studio"
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

export default StudioDetail;
