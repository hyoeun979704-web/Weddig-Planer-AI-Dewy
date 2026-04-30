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
    case "jewelry":
      return <JewelryExtras place={place} />;
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
  const PRODUCT_TYPE_LABEL: Record<string, string> = {
    package: "패키지",
    free_travel: "자유여행",
    flight: "항공권",
    pass: "이용권",
  };
  const isPass = place.product_type === "pass";
  const fmtMan = (won: number) => `${(won / 10000).toFixed(0)}만원`;
  const has =
    place.agency_name ||
    place.product_type ||
    place.countries.length > 0 ||
    place.cities.length > 0 ||
    place.nights != null ||
    place.days != null ||
    place.itinerary_summary ||
    place.itinerary_highlights.length > 0 ||
    place.avg_budget != null ||
    place.airline ||
    place.themes.length > 0 ||
    place.honeymoon_perks.length > 0 ||
    place.hotel_names.length > 0;
  if (!has) return null;
  return (
    <div className="space-y-4">
      {/* 신혼 특전 — 페이지 최상단에 배치 (허니문 상품의 핵심 차별점) */}
      {place.honeymoon_perks.length > 0 && (
        <div className="space-y-2 rounded-lg bg-rose-50 p-3">
          <h3 className="font-bold text-sm text-rose-900">허니문 특전</h3>
          <Tags label="" items={place.honeymoon_perks} />
        </div>
      )}

      {place.promotion_text && (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          🎁 {place.promotion_text}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="font-bold text-sm">허니문 상품 정보</h3>
        <div className="grid grid-cols-2 gap-2">
          {place.agency_name && <Stat label="여행사" value={place.agency_name} />}
          {place.product_type && (
            <Stat label="상품 유형" value={PRODUCT_TYPE_LABEL[place.product_type] ?? place.product_type} />
          )}
          {place.product_code && <Stat label="상품 코드" value={place.product_code} />}
          {place.departure_type && <Stat label="출발 형태" value={place.departure_type} />}
          {!isPass && place.nights != null && place.days != null && (
            <Stat label="일정" value={`${place.nights}박${place.days}일`} />
          )}
          {place.avg_budget != null && (
            <Stat label="평균 경비" value={`${fmtMan(place.avg_budget)}~`} />
          )}
          {place.single_supplement != null && (
            <Stat label="1인 1실 추가" value={`+${fmtMan(place.single_supplement)}`} />
          )}
          {place.child_price != null && (
            <Stat label="아동가" value={fmtMan(place.child_price)} />
          )}
          {place.infant_price != null && (
            <Stat label="유아가" value={fmtMan(place.infant_price)} />
          )}
          {isPass && place.validity_days != null && (
            <Stat label="유효기간" value={`${place.validity_days}일`} />
          )}
          {isPass && place.usage_count != null && (
            <Stat
              label="사용 횟수"
              value={place.usage_count === 0 ? "무제한" : `${place.usage_count}회`}
            />
          )}
        </div>
      </div>

      {/* 항공 정보 */}
      {(place.airline || place.departure_airport || place.flight_hours != null || place.layover_cities.length > 0) && (
        <div className="space-y-2">
          <h3 className="font-bold text-sm">항공</h3>
          <div className="grid grid-cols-2 gap-2">
            {place.airline && (
              <Stat
                label="항공사"
                value={`${place.airline}${place.direct_flight ? " · 직항" : place.direct_flight === false ? " · 경유" : ""}`}
              />
            )}
            {place.departure_airport && <Stat label="출발 공항" value={place.departure_airport} />}
            {place.flight_hours != null && (
              <Stat label="비행시간" value={`약 ${place.flight_hours}시간`} />
            )}
          </div>
          {place.layover_cities.length > 0 && (
            <Tags label="경유" items={place.layover_cities} />
          )}
        </div>
      )}

      {/* 숙박 정보 */}
      {(place.hotel_grade || place.room_type || place.hotel_names.length > 0 || place.meal_plan) && (
        <div className="space-y-2">
          <h3 className="font-bold text-sm">숙박·식사</h3>
          <div className="grid grid-cols-2 gap-2">
            {place.hotel_grade && <Stat label="등급" value={place.hotel_grade} />}
            {place.room_type && <Stat label="객실" value={place.room_type} />}
            {place.meal_plan && <Stat label="식사" value={place.meal_plan} />}
          </div>
          <Tags label="호텔" items={place.hotel_names} />
        </div>
      )}

      {/* 정책 / 키워드 */}
      <div className="grid grid-cols-2 gap-2">
        {place.guide_included != null && (
          <Stat label="가이드" value={place.guide_included ? "동행" : "미동행"} />
        )}
        {place.shopping_required != null && (
          <Stat label="쇼핑 의무" value={place.shopping_required ? "있음" : "없음"} />
        )}
        {place.visa_required != null && (
          <Stat label="비자" value={place.visa_required ? "필요" : "면제"} />
        )}
      </div>

      <Tags label="방문 국가" items={place.countries} />
      <Tags label="방문 도시" items={place.cities} />
      <Tags label="테마" items={place.themes} />
      <Tags label="포함 사항" items={place.price_includes} />
      <Tags label="불포함 사항" items={place.price_excludes} />
      <Tags label="주요 일정" items={place.itinerary_highlights} />
      {place.itinerary_summary && (
        <p className="text-xs text-muted-foreground whitespace-pre-line">
          {place.itinerary_summary}
        </p>
      )}
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

function JewelryExtras({ place }: { place: LegacyDetail }) {
  const STORE_TYPE_LABEL: Record<string, string> = {
    online: "온라인 판매",
    offline: "오프라인 매장만",
    both: "온·오프라인 모두",
  };
  const fmtMan = (won: number) => `${(won / 10000).toFixed(0)}만원`;
  // 구매하기 버튼: product_url > website_url > naver_place_url
  const buyUrl =
    place.product_url || place.website_url || place.naver_place_url || null;
  const buyLabel = place.product_url
    ? "공식 상품 페이지에서 구매"
    : place.website_url
      ? "브랜드 공식 사이트로 이동"
      : place.naver_place_url
        ? "네이버 플레이스에서 보기"
        : null;
  const has =
    place.brand_name ||
    place.metals.length > 0 ||
    place.product_categories.length > 0 ||
    place.carat_diamond != null ||
    place.aftercare_includes.length > 0 ||
    place.package_includes.length > 0;
  if (!has && !buyUrl) return null;
  return (
    <div className="space-y-4">
      {/* 시즌 프로모션 */}
      {place.jewelry_promotion_text && (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          🎁 {place.jewelry_promotion_text}
        </div>
      )}

      {/* 구매하기 CTA */}
      {buyUrl && (
        <a
          href={buyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-lg bg-primary px-4 py-3 text-center text-sm font-bold text-primary-foreground active:scale-[0.98]"
        >
          구매하기 — {buyLabel}
        </a>
      )}

      {/* 브랜드/상품 식별 */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm">예물 정보</h3>
        <div className="grid grid-cols-2 gap-2">
          {place.brand_name && <Stat label="브랜드" value={place.brand_name} />}
          {place.jewelry_product_type && (
            <Stat label="상품 유형" value={place.jewelry_product_type} />
          )}
          {place.sub_category && <Stat label="베스트셀러" value={place.sub_category} />}
          {place.signature_collection && (
            <Stat label="시그니처" value={place.signature_collection} />
          )}
          {place.store_type && (
            <Stat label="판매 채널" value={STORE_TYPE_LABEL[place.store_type] ?? place.store_type} />
          )}
          {place.price_couple_set != null && (
            <Stat label="커플 세트가" value={`${fmtMan(place.price_couple_set)}~`} />
          )}
          {place.delivery_days != null && (
            <Stat label="제작 소요" value={`${place.delivery_days}일`} />
          )}
        </div>
      </div>

      {/* 다이아 (4C + 형태 + 출처) */}
      {(place.carat_diamond != null ||
        place.diamond_color ||
        place.diamond_clarity ||
        place.diamond_cut ||
        place.diamond_shape ||
        place.diamond_origin ||
        place.side_stones_count != null) && (
        <div className="space-y-2">
          <h3 className="font-bold text-sm">다이아</h3>
          <div className="grid grid-cols-2 gap-2">
            {place.carat_diamond != null && (
              <Stat label="캐럿" value={`${place.carat_diamond}ct`} />
            )}
            {place.diamond_shape && <Stat label="형태" value={place.diamond_shape} />}
            {place.diamond_color && <Stat label="컬러" value={place.diamond_color} />}
            {place.diamond_clarity && <Stat label="투명도" value={place.diamond_clarity} />}
            {place.diamond_cut && <Stat label="컷" value={place.diamond_cut} />}
            {place.diamond_origin && (
              <Stat
                label="출처"
                value={place.diamond_origin === "natural" ? "천연" : "랩그로운"}
              />
            )}
            {place.diamond_certified != null && (
              <Stat
                label="인증"
                value={
                  place.diamond_certified
                    ? `${place.diamond_cert_org ?? "발급"}`
                    : "미발급"
                }
              />
            )}
            {place.side_stones_count != null && place.side_stones_count > 0 && (
              <Stat
                label="사이드 스톤"
                value={
                  place.side_stones_total_carat != null
                    ? `${place.side_stones_count}개 · ${place.side_stones_total_carat}ct`
                    : `${place.side_stones_count}개`
                }
              />
            )}
          </div>
        </div>
      )}

      {/* 밴드 (치수·디자인·마감) */}
      {(place.band_design ||
        place.band_width_mm != null ||
        place.band_thickness_mm != null ||
        place.band_profile ||
        place.band_finishing ||
        place.stone_setting ||
        place.gold_karat) && (
        <div className="space-y-2">
          <h3 className="font-bold text-sm">밴드·세팅</h3>
          <div className="grid grid-cols-2 gap-2">
            {place.gold_karat && <Stat label="함량" value={place.gold_karat} />}
            {place.band_width_mm != null && (
              <Stat label="폭" value={`${place.band_width_mm}mm`} />
            )}
            {place.band_thickness_mm != null && (
              <Stat label="두께" value={`${place.band_thickness_mm}mm`} />
            )}
            {place.band_profile && <Stat label="단면" value={place.band_profile} />}
            {place.band_design && <Stat label="디자인" value={place.band_design} />}
            {place.band_finishing && <Stat label="마감" value={place.band_finishing} />}
            {place.stone_setting && <Stat label="세팅" value={place.stone_setting} />}
          </div>
        </div>
      )}

      {/* 서비스 */}
      <div className="grid grid-cols-2 gap-2">
        {place.engraving_available != null && (
          <Stat label="각인" value={place.engraving_available ? "가능" : "불가"} />
        )}
        {place.size_resize_free != null && (
          <Stat label="사이즈 조절" value={place.size_resize_free ? "무료" : "유료"} />
        )}
        {place.custom_design_available != null && (
          <Stat label="맞춤 디자인" value={place.custom_design_available ? "가능" : "불가"} />
        )}
        {place.lifetime_warranty != null && (
          <Stat label="평생 A/S" value={place.lifetime_warranty ? "제공" : "미제공"} />
        )}
        {place.couple_set_available != null && (
          <Stat label="커플 세트" value={place.couple_set_available ? "가능" : "단품만"} />
        )}
      </div>

      <Tags label="메탈" items={place.metals} />
      <Tags label="제품 카테고리" items={place.product_categories} />
      <Tags label="입점 백화점" items={place.partnership_dept_stores} />
      <Tags label="평생 케어" items={place.aftercare_includes} />
      <Tags label="패키지 포함" items={place.package_includes} />

      {/* 브랜드 메타 */}
      {(place.brand_tier || place.brand_origin || place.brand_history_year || place.showroom_count != null) && (
        <div className="space-y-2">
          <h3 className="font-bold text-sm">브랜드 정보</h3>
          <div className="grid grid-cols-2 gap-2">
            {place.brand_tier && <Stat label="가격대" value={place.brand_tier} />}
            {place.brand_origin && <Stat label="원산지" value={place.brand_origin} />}
            {place.brand_history_year != null && (
              <Stat label="설립" value={`${place.brand_history_year}년`} />
            )}
            {place.showroom_count != null && (
              <Stat label="국내 매장" value={`${place.showroom_count}개`} />
            )}
          </div>
        </div>
      )}
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
