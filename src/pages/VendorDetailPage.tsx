import { useParams, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { usePlaceDetail, type LegacyDetail } from "@/hooks/usePlaceDetail";
import PlaceDetailLayout from "@/components/detail/PlaceDetailLayout";

// Catch-all detail page wired to PlaceDetailLayout. Used by:
//  - /vendor/:id (categoryRouteMap fallback for "스드메" combo + legacy links)
//  - HomePage RecommendedSection / StudioGallery navigations
// Each category gets its own extraSection block dispatched via place.category;
// dedicated routes (/studio/:id /suit/:id /hanbok/:id) reuse the same hook +
// layout but pass a category-tailored extraSection inline.

const CATEGORY_LABEL: Record<string, string> = {
  wedding_hall: "웨딩홀",
  studio: "스튜디오",
  dress_shop: "드레스",
  makeup_shop: "메이크업",
  hanbok: "한복",
  tailor_shop: "예복",
  honeymoon: "허니문",
  appliance: "혼수",
  invitation_venue: "청첩장",
};

const FAVORITE_TYPE: Record<string, "venue" | "studio" | "hanbok" | "suit" | "honeymoon" | "appliance" | "invitation_venues"> = {
  wedding_hall: "venue",
  studio: "studio",
  dress_shop: "studio",
  makeup_shop: "studio",
  hanbok: "hanbok",
  tailor_shop: "suit",
  honeymoon: "honeymoon",
  appliance: "appliance",
  invitation_venue: "invitation_venues",
};

const VendorDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: place, isLoading, error } = usePlaceDetail(id);

  if (isLoading) return <DetailSkeleton />;
  if (error || !place) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto flex flex-col items-center justify-center p-4">
        <span className="text-4xl mb-4">😢</span>
        <p className="text-muted-foreground text-center mb-4">업체를 찾을 수 없어요.</p>
        <Button onClick={() => navigate(-1)}>뒤로</Button>
      </div>
    );
  }

  const categoryLabel = CATEGORY_LABEL[place.category] ?? place.category;
  const favoriteType = FAVORITE_TYPE[place.category] ?? "studio";

  return (
    <PlaceDetailLayout
      place={place}
      categoryLabel={categoryLabel}
      favoriteType={favoriteType}
      extraSection={<CategoryExtras place={place} />}
    />
  );
};

/** Renders the per-category extras block. Each branch hides its own UI when
 *  no relevant fields are populated; the empty case returns null so the
 *  parent doesn't render an empty wrapper. */
function CategoryExtras({ place }: { place: LegacyDetail }) {
  switch (place.category) {
    case "wedding_hall":
      return <WeddingHallExtras place={place} />;
    case "studio":
      return <StudioExtras place={place} />;
    case "dress_shop":
      return <DressShopExtras place={place} />;
    case "makeup_shop":
      return <MakeupExtras place={place} />;
    case "hanbok":
      return <HanbokExtras place={place} />;
    case "tailor_shop":
      return <TailorExtras place={place} />;
    case "honeymoon":
      return <HoneymoonExtras place={place} />;
    case "appliance":
      return <ApplianceExtras place={place} />;
    case "invitation_venue":
      return <InvitationVenueExtras place={place} />;
    default:
      return null;
  }
}

const Tags = ({ label, items }: { label: string; items: string[] }) =>
  items.length > 0 ? (
    <div>
      <p className="text-xs text-muted-foreground mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it, i) => (
          <span key={i} className="text-xs px-2.5 py-1 bg-primary/10 text-primary rounded-full">{it}</span>
        ))}
      </div>
    </div>
  ) : null;

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="bg-muted/50 rounded-xl p-3">
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className="text-sm font-semibold text-foreground mt-0.5">{value}</p>
  </div>
);

function WeddingHallExtras({ place }: { place: LegacyDetail }) {
  const has =
    place.hall_styles.length > 0 || place.meal_types.length > 0 ||
    place.min_guarantee != null || place.max_guarantee != null ||
    place.food_tasting_available != null || place.outdoor_available != null ||
    place.ceremony_only_available != null || place.hall_count != null;
  if (!has) return null;
  return (
    <div className="space-y-3">
      <h3 className="font-bold text-sm">웨딩홀 정보</h3>
      <Tags label="홀 분위기" items={place.hall_styles} />
      <Tags label="식사 형식" items={place.meal_types} />
      <div className="grid grid-cols-2 gap-2">
        {place.min_guarantee != null && <Stat label="최소 보증" value={`${place.min_guarantee}명`} />}
        {place.max_guarantee != null && <Stat label="최대 수용" value={`${place.max_guarantee}명`} />}
        {place.hall_count != null && <Stat label="홀 개수" value={`${place.hall_count}개`} />}
        {place.food_tasting_available != null && <Stat label="음식 시연" value={place.food_tasting_available ? "가능" : "불가"} />}
        {place.outdoor_available != null && <Stat label="야외 예식" value={place.outdoor_available ? "가능" : "불가"} />}
        {place.ceremony_only_available != null && <Stat label="식만 가능" value={place.ceremony_only_available ? "가능" : "불가"} />}
      </div>
    </div>
  );
}

function StudioExtras({ place }: { place: LegacyDetail }) {
  const has =
    place.shoot_styles.length > 0 || place.shoot_locations.length > 0 ||
    place.total_photos != null || place.original_count != null ||
    place.retouching_included != null || place.dress_provided != null ||
    place.includes_originals != null;
  if (!has) return null;
  return (
    <div className="space-y-3">
      <h3 className="font-bold text-sm">촬영 정보</h3>
      <Tags label="스타일" items={place.shoot_styles} />
      <Tags label="촬영 장소" items={place.shoot_locations} />
      <div className="grid grid-cols-2 gap-2">
        {place.total_photos != null && <Stat label="총 사진" value={`${place.total_photos}장`} />}
        {place.original_count != null && <Stat label="원본" value={`${place.original_count}장`} />}
        {place.retouching_included != null && <Stat label="보정" value={place.retouching_included ? "포함" : "별도"} />}
        {place.includes_originals != null && <Stat label="원본 제공" value={place.includes_originals ? "제공" : "미제공"} />}
        {place.dress_provided != null && <Stat label="드레스 대여" value={place.dress_provided ? "포함" : "별도"} />}
      </div>
    </div>
  );
}

function DressShopExtras({ place }: { place: LegacyDetail }) {
  const has =
    place.dress_styles.length > 0 || place.designer_brands.length > 0 ||
    place.rental_only != null || place.fitting_count != null ||
    place.rental_includes_alterations != null;
  if (!has) return null;
  return (
    <div className="space-y-3">
      <h3 className="font-bold text-sm">드레스 정보</h3>
      <Tags label="드레스 스타일" items={place.dress_styles} />
      <Tags label="브랜드" items={place.designer_brands} />
      <div className="grid grid-cols-2 gap-2">
        {place.rental_only != null && <Stat label="대여/맞춤" value={place.rental_only ? "대여만" : "둘 다"} />}
        {place.fitting_count != null && <Stat label="가봉 횟수" value={`${place.fitting_count}회`} />}
        {place.rental_includes_alterations != null && (
          <Stat label="가봉비" value={place.rental_includes_alterations ? "포함" : "별도"} />
        )}
      </div>
    </div>
  );
}

function MakeupExtras({ place }: { place: LegacyDetail }) {
  const has =
    place.makeup_styles.length > 0 ||
    place.includes_rehearsal != null || place.hair_makeup_separate != null ||
    place.rehearsal_count != null;
  if (!has) return null;
  return (
    <div className="space-y-3">
      <h3 className="font-bold text-sm">메이크업 정보</h3>
      <Tags label="스타일" items={place.makeup_styles} />
      <div className="grid grid-cols-2 gap-2">
        {place.includes_rehearsal != null && (
          <Stat label="리허설 포함" value={place.includes_rehearsal ? "포함" : "별도"} />
        )}
        {place.hair_makeup_separate != null && (
          <Stat label="헤어/메이크업" value={place.hair_makeup_separate ? "분리비" : "통합"} />
        )}
        {place.rehearsal_count != null && (
          <Stat label="리허설 횟수" value={`${place.rehearsal_count}회`} />
        )}
      </div>
    </div>
  );
}

function HanbokExtras({ place }: { place: LegacyDetail }) {
  const has = place.hanbok_types.length > 0 || place.custom_available != null;
  if (!has) return null;
  return (
    <div className="space-y-3">
      <h3 className="font-bold text-sm">한복 정보</h3>
      <Tags label="한복 유형" items={place.hanbok_types} />
      {place.custom_available != null && (
        <Stat label="맞춤 제작" value={place.custom_available ? "가능" : "대여만"} />
      )}
    </div>
  );
}

function TailorExtras({ place }: { place: LegacyDetail }) {
  const has =
    place.suit_styles.length > 0 || place.designer_brands.length > 0 ||
    place.fitting_count != null || place.custom_available != null;
  if (!has) return null;
  return (
    <div className="space-y-3">
      <h3 className="font-bold text-sm">예복 정보</h3>
      <Tags label="스타일" items={place.suit_styles} />
      <Tags label="브랜드" items={place.designer_brands} />
      <div className="grid grid-cols-2 gap-2">
        {place.fitting_count != null && <Stat label="가봉 횟수" value={`${place.fitting_count}회`} />}
        {place.custom_available != null && (
          <Stat label="맞춤 제작" value={place.custom_available ? "가능" : "대여만"} />
        )}
      </div>
    </div>
  );
}

function HoneymoonExtras({ place }: { place: LegacyDetail }) {
  const has =
    place.destinations.length > 0 || place.duration_days != null ||
    place.includes_flights != null || place.includes_hotel != null ||
    place.travel_agency_partner;
  if (!has) return null;
  return (
    <div className="space-y-3">
      <h3 className="font-bold text-sm">허니문 정보</h3>
      <Tags label="여행지" items={place.destinations} />
      <div className="grid grid-cols-2 gap-2">
        {place.duration_days != null && <Stat label="기본 일수" value={`${place.duration_days}일`} />}
        {place.includes_flights != null && (
          <Stat label="항공편" value={place.includes_flights ? "포함" : "별도"} />
        )}
        {place.includes_hotel != null && (
          <Stat label="숙박" value={place.includes_hotel ? "포함" : "별도"} />
        )}
        {place.travel_agency_partner && (
          <Stat label="제휴 여행사" value={place.travel_agency_partner} />
        )}
      </div>
    </div>
  );
}

function ApplianceExtras({ place }: { place: LegacyDetail }) {
  const has = place.product_categories.length > 0 || place.brand_options.length > 0;
  if (!has) return null;
  return (
    <div className="space-y-3">
      <h3 className="font-bold text-sm">혼수 정보</h3>
      <Tags label="제품 카테고리" items={place.product_categories} />
      <Tags label="브랜드" items={place.brand_options} />
    </div>
  );
}

function InvitationVenueExtras({ place }: { place: LegacyDetail }) {
  const has =
    place.venue_types.length > 0 ||
    place.capacity_min != null || place.capacity_max != null;
  if (!has) return null;
  return (
    <div className="space-y-3">
      <h3 className="font-bold text-sm">모임장소 정보</h3>
      <Tags label="유형" items={place.venue_types} />
      <div className="grid grid-cols-2 gap-2">
        {place.capacity_min != null && <Stat label="최소 인원" value={`${place.capacity_min}명`} />}
        {place.capacity_max != null && <Stat label="최대 인원" value={`${place.capacity_max}명`} />}
      </div>
    </div>
  );
}

const DetailSkeleton = () => (
  <div className="min-h-screen bg-background max-w-[430px] mx-auto">
    <div className="h-14 border-b border-border flex items-center px-4">
      <Skeleton className="w-6 h-6 rounded" />
    </div>
    <Skeleton className="aspect-[4/3] w-full" />
    <div className="p-4 space-y-3">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-16 w-full rounded-xl" />
    </div>
  </div>
);

export default VendorDetailPage;
