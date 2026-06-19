import { type ReactNode, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle, Pencil, Building2, MoreHorizontal, ChevronDown } from "lucide-react";
import { usePlaceDetail, type LegacyDetail } from "@/hooks/usePlaceDetail";
import { formatManwon } from "@/lib/priceFormat";
import { APPLIANCE_PRODUCT_TYPE_LABEL, JEWELRY_STORE_TYPE_LABEL } from "@/lib/categoryLabels";
import PlaceDetailLayout from "@/components/detail/PlaceDetailLayout";
import PlaceCoupons from "@/components/place/PlaceCoupons";
import PlaceBusinessSections from "@/components/place/PlaceBusinessSections";
import PlaceEvents from "@/components/place/PlaceEvents";
import RelatedCommunityPosts from "@/components/community/RelatedCommunityPosts";
import { useUserRole } from "@/hooks/useUserRole";

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
  const { isAdmin, isBusiness } = useUserRole();
  const [showTools, setShowTools] = useState(false);

  if (isLoading) return <DetailSkeleton />;
  if (error || !place) {
    return (
      <div className="min-h-screen bg-background app-col mx-auto flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
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
      couponsSection={<PlaceCoupons placeId={place.id} />}
      eventsSection={<PlaceEvents placeId={place.id} />}
      extraSection={
        <>
          {/* 관리 도구(운영자 수정·업체 인수) — 소비자 화면을 깔끔히 유지하기 위해 기본 접힘.
              주 액션(보드 추가/문의)은 위에 그대로 노출, 역할 전용 도구만 '⋯'로 숨긴다. */}
          {(isAdmin || (isBusiness && !place.owner_user_id)) && (
            <div className="px-4 pt-3">
              <button
                type="button"
                onClick={() => setShowTools((v) => !v)}
                className="w-full flex items-center justify-between text-[12px] text-muted-foreground py-1"
              >
                <span className="inline-flex items-center gap-1"><MoreHorizontal className="w-4 h-4" /> 관리 도구</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showTools ? "rotate-180" : ""}`} />
              </button>
              {showTools && (
                <div className="space-y-2 pt-1">
                  {isAdmin && (
                    <Link
                      to={`/admin/places/${place.id}`}
                      className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-muted-foreground active:bg-muted transition-colors"
                    >
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium">
                        <Pencil className="w-3.5 h-3.5" /> 운영자 · 업체 정보 수정
                      </span>
                      <span className="text-[11px] font-medium">편집 →</span>
                    </Link>
                  )}
                  {isBusiness && !place.owner_user_id && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-3">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-foreground">이 업체가 내 업체인가요?</p>
                        <p className="text-[11px] text-muted-foreground">인수 신청하고 직접 관리하세요</p>
                      </div>
                      <Button size="sm" variant="outline" className="shrink-0"
                        onClick={() => navigate(`/business/claim?q=${encodeURIComponent(place.name)}`)}>
                        인수 신청
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <PlaceBusinessSections placeId={place.id} category={place.category} />
          <CategoryExtras place={place} />
          <RelatedCommunityPosts placeId={place.id} />
        </>
      }
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
    // 기타(스냅·DVD·네일·축가 등)는 표준 스키마가 없어 구조화 섹션 대신 업체 소개/서비스로
    // 채운다. 미매핑 카테고리도 동일 폴백(빈 상세정보 방지).
    case "etc":
      return <EtcExtras place={place} />;
    default:
      return <EtcExtras place={place} />;
  }
}

/** 기타·미분류 카테고리 폴백 — 업체 소개·제공 서비스·편의 정보. 모두 없으면 null. */
function EtcExtras({ place }: { place: LegacyDetail }) {
  const hasDesc = !!(place.description && place.description.trim());
  const has = hasDesc || place.basic_services.length > 0 || place.amenities.length > 0;
  if (!has) return null;
  return (
    <div className="space-y-3">
      <h3 className="font-bold text-sm">서비스 안내</h3>
      {hasDesc && (
        <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{place.description}</p>
      )}
      <Tags label="제공 서비스" items={place.basic_services} />
      <Tags label="편의·특징" items={place.amenities} />
    </div>
  );
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

// 원(₩) → "만원" 표기. 식대 98,000 → "9.8만원", 대관료 12,000,000 → "1,200만원".
const won = (v: number | null | undefined): string | null => {
  if (v == null) return null;
  const man = v / 10000;
  const s =
    man >= 100
      ? man.toLocaleString("ko-KR", { maximumFractionDigits: 0 })
      : man.toLocaleString("ko-KR", { maximumFractionDigits: 1 });
  return `${s}만원`;
};

// 홀별/상품별 카드 내부의 라벨-값 한 줄. 값이 없으면 렌더 안 함.
const KV = ({ label, value }: { label: string; value: string | null }) =>
  value ? (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-semibold text-foreground">{value}</span>
    </div>
  ) : null;

const MiniTag = ({ children }: { children: ReactNode }) => (
  <span className="text-[11px] px-2 py-0.5 bg-primary/10 text-primary rounded-full">{children}</span>
);

/** 웨딩홀 — 홀별(1:N) 비교 섹션. 기존 앱이 안 주는 핵심 디테일. */
function HallList({ halls }: { halls: LegacyDetail["halls"] }) {
  if (halls.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="font-bold text-sm">
        홀별 정보 <span className="text-muted-foreground font-normal">({halls.length}개 홀)</span>
      </h3>
      <div className="space-y-2">
        {halls.map((h) => {
          const guarantee =
            h.min_guarantee != null && h.max_guarantee != null
              ? `${h.min_guarantee}~${h.max_guarantee}명`
              : h.min_guarantee != null
                ? `최소 ${h.min_guarantee}명`
                : h.max_guarantee != null
                  ? `최대 ${h.max_guarantee}명`
                  : null;
          const meal = won(h.meal_price);
          return (
            <div key={h.hall_id} className="rounded-xl border border-border p-3 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-foreground">{h.hall_name}</span>
                {h.hall_type && <MiniTag>{h.hall_type}</MiniTag>}
                {h.floor && <span className="text-[11px] text-muted-foreground">{h.floor}</span>}
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                <KV label="보증" value={guarantee} />
                <KV label="대관료" value={won(h.rental_fee)} />
                <KV label="식대" value={meal ? (h.includes_drinks ? `${meal}·음료포함` : meal) : null} />
                <KV label="예식간격" value={h.ceremony_interval_min != null ? `${h.ceremony_interval_min}분` : null} />
                <KV
                  label="동시예식"
                  value={h.simultaneous_events != null ? (h.simultaneous_events ? "있음" : "없음(단독)") : null}
                />
                <KV label="층고" value={h.ceiling_height != null ? `${h.ceiling_height}m` : null} />
                <KV label="버진로드" value={h.virgin_road_length != null ? `${h.virgin_road_length}m` : null} />
                <KV label="착석" value={h.capacity_seated != null ? `${h.capacity_seated}석` : null} />
              </div>
              {h.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {h.tags.map((t, i) => (
                    <MiniTag key={i}>{t}</MiniTag>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 스튜디오 — 상품 구성(1:N). 패키지별 구성·컨셉을 한눈에 비교. */
function StudioProductList({ products }: { products: LegacyDetail["studioProducts"] }) {
  if (products.length === 0) return null;
  const incChips = (p: LegacyDetail["studioProducts"][number]) =>
    [
      p.dress_included ? "드레스" : null,
      p.hair_makeup_included ? "헤어·메이크업" : null,
      p.frame_included ? "액자" : null,
      p.outdoor_included ? "야외촬영" : null,
    ].filter(Boolean) as string[];
  return (
    <div className="space-y-2">
      <h3 className="font-bold text-sm">
        상품 구성 <span className="text-muted-foreground font-normal">({products.length}개)</span>
      </h3>
      <div className="space-y-2">
        {products.map((p) => {
          const composition = [
            p.original_count != null ? `원본 ${p.original_count}장` : null,
            p.retouch_count != null ? `보정 ${p.retouch_count}장` : null,
            p.album_pages != null ? `앨범 ${p.album_pages}p` : null,
            p.album_count != null ? `앨범 ${p.album_count}권` : null,
          ].filter(Boolean) as string[];
          const chips = incChips(p);
          return (
            <div key={p.product_id} className="rounded-xl border border-border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-foreground">{p.product_name}</span>
                  {p.product_type && <MiniTag>{p.product_type}</MiniTag>}
                </div>
                {p.price != null && (
                  <span className="text-sm font-bold text-primary shrink-0">{won(p.price)}</span>
                )}
              </div>
              {p.concepts.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {p.concepts.map((c, i) => (
                    <MiniTag key={i}>{c}</MiniTag>
                  ))}
                </div>
              )}
              {composition.length > 0 && (
                <p className="text-xs text-foreground">{composition.join(" · ")}</p>
              )}
              {chips.length > 0 && (
                <p className="text-[11px] text-muted-foreground">포함: {chips.join(" / ")}</p>
              )}
              {p.includes.length > 0 && (
                <ul className="space-y-0.5">
                  {p.includes.map((it, i) => (
                    <li key={i} className="text-[11px] text-muted-foreground flex gap-1">
                      <span className="text-primary">·</span>
                      {it}
                    </li>
                  ))}
                </ul>
              )}
              {p.notes && <p className="text-[11px] text-muted-foreground">{p.notes}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeddingHallExtras({ place }: { place: LegacyDetail }) {
  const has =
    place.hall_styles.length > 0 || place.meal_types.length > 0 ||
    place.min_guarantee != null || place.max_guarantee != null ||
    place.food_tasting_available != null || place.outdoor_available != null ||
    place.ceremony_only_available != null || place.hall_count != null ||
    place.halls.length > 0;
  if (!has) return null;
  return (
    <div className="space-y-4">
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
      <HallList halls={place.halls} />
    </div>
  );
}

function StudioExtras({ place }: { place: LegacyDetail }) {
  const fmtMan = formatManwon;
  const has =
    place.shoot_styles.length > 0 || place.shoot_locations.length > 0 ||
    place.total_photos != null || place.original_count != null ||
    place.retouching_included != null || place.dress_provided != null ||
    place.includes_originals != null || place.frame_included != null ||
    place.photobook_pages != null || place.editing_days != null ||
    place.base_shoot_hours != null || place.base_retouch_count != null ||
    place.author_tiers.length > 0 ||
    place.raw_file_extra_cost != null || place.per_retouch_cost != null ||
    place.album_extra_cost != null || place.studioProducts.length > 0;
  if (!has) return null;
  return (
    <div className="space-y-4">
      <StudioProductList products={place.studioProducts} />
      <div className="space-y-3">
        <h3 className="font-bold text-sm">촬영 정보</h3>
        <Tags label="스타일" items={place.shoot_styles} />
        <Tags label="촬영 장소" items={place.shoot_locations} />
        <Tags label="작가 등급" items={place.author_tiers} />
        <div className="grid grid-cols-2 gap-2">
          {place.total_photos != null && <Stat label="총 사진" value={`${place.total_photos}장`} />}
          {place.original_count != null && <Stat label="원본" value={`${place.original_count}장`} />}
          {place.base_shoot_hours != null && (
            <Stat label="기본 촬영" value={`${place.base_shoot_hours}시간`} />
          )}
          {place.base_retouch_count != null && (
            <Stat label="기본 보정" value={`${place.base_retouch_count}장`} />
          )}
          {place.editing_days != null && (
            <Stat label="보정 소요" value={`${place.editing_days}일`} />
          )}
          {place.photobook_pages != null && (
            <Stat label="앨범" value={`${place.photobook_pages}p`} />
          )}
          {place.retouching_included != null && <Stat label="보정" value={place.retouching_included ? "포함" : "별도"} />}
          {place.includes_originals != null && <Stat label="원본 제공" value={place.includes_originals ? "제공" : "미제공"} />}
          {place.frame_included != null && <Stat label="액자" value={place.frame_included ? "포함" : "별도"} />}
          {place.dress_provided != null && <Stat label="드레스 대여" value={place.dress_provided ? "포함" : "별도"} />}
        </div>
      </div>

      {(place.raw_file_extra_cost != null ||
        place.per_retouch_cost != null ||
        place.album_extra_cost != null) && (
        <div className="space-y-2 rounded-lg bg-muted/50 p-3">
          <h3 className="font-bold text-sm">추가 옵션 비용</h3>
          <div className="grid grid-cols-2 gap-2">
            {place.raw_file_extra_cost != null && (
              <Stat label="원본 추가" value={fmtMan(place.raw_file_extra_cost)} />
            )}
            {place.per_retouch_cost != null && (
              <Stat label="보정 1장" value={fmtMan(place.per_retouch_cost)} />
            )}
            {place.album_extra_cost != null && (
              <Stat label="앨범 추가" value={fmtMan(place.album_extra_cost)} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DressShopExtras({ place }: { place: LegacyDetail }) {
  const has =
    place.dress_styles.length > 0 || place.designer_brands.length > 0 ||
    place.rental_only != null || place.fitting_count != null ||
    place.rental_includes_alterations != null ||
    place.helper_included != null || place.inner_included != null ||
    place.dress_count_included != null;
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
        {place.dress_count_included != null && (
          <Stat label="포함 벌수" value={`${place.dress_count_included}벌`} />
        )}
        {place.helper_included != null && (
          <Stat label="헬퍼이모" value={place.helper_included ? "포함" : "별도"} />
        )}
        {place.inner_included != null && (
          <Stat label="이너·베일" value={place.inner_included ? "포함" : "별도"} />
        )}
      </div>
    </div>
  );
}

function MakeupExtras({ place }: { place: LegacyDetail }) {
  const fmtMan = formatManwon;
  const has =
    place.makeup_styles.length > 0 ||
    place.includes_rehearsal != null || place.hair_makeup_separate != null ||
    place.rehearsal_count != null || place.travel_fee_included != null ||
    place.director_level || place.early_morning_fee != null;
  if (!has) return null;
  return (
    <div className="space-y-3">
      <h3 className="font-bold text-sm">메이크업 정보</h3>
      <Tags label="스타일" items={place.makeup_styles} />
      <div className="grid grid-cols-2 gap-2">
        {place.director_level && <Stat label="시술자" value={place.director_level} />}
        {place.includes_rehearsal != null && (
          <Stat label="리허설 포함" value={place.includes_rehearsal ? "포함" : "별도"} />
        )}
        {place.hair_makeup_separate != null && (
          <Stat label="헤어/메이크업" value={place.hair_makeup_separate ? "분리비" : "통합"} />
        )}
        {place.rehearsal_count != null && (
          <Stat label="리허설 횟수" value={`${place.rehearsal_count}회`} />
        )}
        {place.travel_fee_included != null && (
          <Stat label="출장비" value={place.travel_fee_included ? "포함" : "별도"} />
        )}
        {place.early_morning_fee != null && place.early_morning_fee > 0 && (
          <Stat label="새벽 출장 추가" value={`+${fmtMan(place.early_morning_fee)}`} />
        )}
      </div>
    </div>
  );
}

function HanbokExtras({ place }: { place: LegacyDetail }) {
  const has =
    place.hanbok_types.length > 0 || place.custom_available != null ||
    place.accessories_included != null || place.delivery_available != null;
  if (!has) return null;
  return (
    <div className="space-y-3">
      <h3 className="font-bold text-sm">한복 정보</h3>
      <Tags label="한복 유형" items={place.hanbok_types} />
      <div className="grid grid-cols-2 gap-2">
        {place.custom_available != null && (
          <Stat label="맞춤 제작" value={place.custom_available ? "가능" : "대여만"} />
        )}
        {place.accessories_included != null && (
          <Stat label="액세서리" value={place.accessories_included ? "포함" : "별도"} />
        )}
        {place.delivery_available != null && (
          <Stat label="지방 배송" value={place.delivery_available ? "가능" : "불가"} />
        )}
      </div>
    </div>
  );
}

function TailorExtras({ place }: { place: LegacyDetail }) {
  const has =
    place.suit_styles.length > 0 || place.designer_brands.length > 0 ||
    place.fitting_count != null || place.custom_available != null ||
    place.accessories_included != null;
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
        {place.accessories_included != null && (
          <Stat label="셔츠·구두·넥타이" value={place.accessories_included ? "포함" : "별도"} />
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
  const fmtMan = formatManwon;
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
           {place.promotion_text}
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
  const APPL_TYPE_LABEL = APPLIANCE_PRODUCT_TYPE_LABEL;
  const fmtMan = formatManwon;
  const buyUrl =
    place.appliance_product_url || place.website_url || place.naver_place_url || null;
  const buyLabel = place.appliance_product_url
    ? "구매 페이지로 이동"
    : place.website_url
      ? "공식 사이트로 이동"
      : place.naver_place_url
        ? "네이버 플레이스에서 보기"
        : null;
  const has =
    place.product_categories.length > 0 ||
    place.brand_options.length > 0 ||
    place.installment_months != null ||
    place.warranty_years != null ||
    place.free_delivery != null ||
    place.free_installation != null ||
    place.old_appliance_pickup != null ||
    place.card_discount_available != null ||
    place.store_chain ||
    place.specialties.length > 0 ||
    place.package_items.length > 0 ||
    place.package_set_price != null;
  if (!has && !buyUrl) return null;
  return (
    <div className="space-y-4">
      {place.appliance_promotion_text && (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
           {place.appliance_promotion_text}
        </div>
      )}

      {/* 매장이 아닌 경우 (package/single) 외부 구매하기 CTA */}
      {(place.appliance_product_type === "package" || place.appliance_product_type === "single") && buyUrl && (
        <a
          href={buyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-lg bg-primary px-4 py-3 text-center text-sm font-bold text-primary-foreground active:scale-[0.98]"
        >
          구매하기 — {buyLabel}
        </a>
      )}

      <div className="space-y-3">
        <h3 className="font-bold text-sm">혼수 정보</h3>
        <div className="grid grid-cols-2 gap-2">
          {place.appliance_product_type && (
            <Stat label="유형" value={APPL_TYPE_LABEL[place.appliance_product_type] ?? place.appliance_product_type} />
          )}
          {place.store_chain && <Stat label="체인" value={place.store_chain} />}
          {place.appliance_product_code && (
            <Stat label="모델 코드" value={place.appliance_product_code} />
          )}
          {place.capacity_text && <Stat label="용량" value={place.capacity_text} />}
          {place.energy_rating && <Stat label="에너지 등급" value={place.energy_rating} />}
          {place.model_release_year != null && (
            <Stat label="출시 연도" value={`${place.model_release_year}년`} />
          )}
          {place.target_household && (
            <Stat label="권장 가구" value={place.target_household} />
          )}
          {place.package_set_price != null && (
            <Stat label="세트 가격" value={`${fmtMan(place.package_set_price)}~`} />
          )}
          {place.floor_location && (
            <Stat label="매장 위치" value={place.floor_location} />
          )}
          {place.is_bestseller && (
            <Stat label="구분" value=" 베스트셀러" />
          )}
          {place.is_new_model && (
            <Stat label="구분" value=" 신모델" />
          )}
        </div>

        <Tags label="제품 카테고리" items={place.product_categories} />
        <Tags label="브랜드" items={place.brand_options} />
        <Tags label="강점 카테고리" items={place.specialties} />
        <Tags label="패키지 구성" items={place.package_items} />
      </div>

      {/* 사은품 — 한국 혼수의 핵심 차별점 */}
      {place.gift_items.length > 0 && (
        <div className="space-y-2 rounded-lg bg-pink-50 p-3">
          <h3 className="font-bold text-sm text-pink-900"> 사은품</h3>
          <Tags label="" items={place.gift_items} />
        </div>
      )}

      {/* 매장 전용 — 이 매장에서 제공하는 대표 패키지 안내 */}
      {place.appliance_product_type === "store" &&
        (place.package_examples.length > 0 || place.package_price_range) && (
        <div className="space-y-2 rounded-lg bg-blue-50 p-3">
          <h3 className="font-bold text-sm text-blue-900"> 이 매장의 대표 패키지</h3>
          {place.package_price_range && (
            <p className="text-xs text-blue-700">가격대: {place.package_price_range}</p>
          )}
          <Tags label="" items={place.package_examples} />
          <p className="text-[11px] text-blue-700/80 mt-1">
            매장 방문 시 청첩장·예식 일정 제시하면 추가 할인이나 사은품 협상 가능합니다.
          </p>
        </div>
      )}

      {/* 결제·배송·서비스 혜택 */}
      {(place.installment_months != null ||
        place.warranty_years != null ||
        place.free_delivery != null ||
        place.free_installation != null ||
        place.old_appliance_pickup != null ||
        place.card_discount_available != null ||
        place.total_discount_percent != null ||
        place.card_partners.length > 0 ||
        place.payment_options.length > 0) && (
        <div className="space-y-2">
          <h3 className="font-bold text-sm">결제·배송 혜택</h3>
          <div className="grid grid-cols-2 gap-2">
            {place.installment_months != null && (
              <Stat label="무이자 할부" value={place.installment_months > 0 ? `최대 ${place.installment_months}개월` : "없음"} />
            )}
            {place.total_discount_percent != null && (
              <Stat label="최대 할인" value={`${place.total_discount_percent}%`} />
            )}
            {place.warranty_years != null && (
              <Stat label="기본 보증" value={`${place.warranty_years}년`} />
            )}
            {place.free_delivery != null && (
              <Stat label="배송" value={place.free_delivery ? "무료" : "유료"} />
            )}
            {place.free_installation != null && (
              <Stat label="설치" value={place.free_installation ? "무료" : "유료"} />
            )}
            {place.old_appliance_pickup != null && (
              <Stat label="폐가전 수거" value={place.old_appliance_pickup ? "무료" : "별도"} />
            )}
            {place.card_discount_available != null && (
              <Stat label="카드 할인" value={place.card_discount_available ? "있음" : "없음"} />
            )}
            {place.negotiable != null && (
              <Stat label="가격 협상" value={place.negotiable ? "가능" : "불가"} />
            )}
            {place.home_visit_quote != null && (
              <Stat label="출장 견적" value={place.home_visit_quote ? "가능" : "매장만"} />
            )}
          </div>
          <Tags label="제휴 카드" items={place.card_partners} />
          <Tags label="결제 옵션" items={place.payment_options} />
          {place.quote_request_url && (
            <a
              href={place.quote_request_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-xs text-primary underline mt-1"
            >
              견적 요청하기 →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function JewelryExtras({ place }: { place: LegacyDetail }) {
  const STORE_TYPE_LABEL = JEWELRY_STORE_TYPE_LABEL;
  const fmtMan = formatManwon;
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
           {place.jewelry_promotion_text}
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
  const fmtMan = formatManwon;
  const has =
    place.venue_types.length > 0 ||
    place.capacity_min != null || place.capacity_max != null ||
    place.venue_atmosphere.length > 0 ||
    place.signature_dishes.length > 0 ||
    place.corkage_fee_won != null ||
    place.private_room_count != null ||
    place.room_charge_separate != null ||
    place.drinks_included != null ||
    place.valet_parking != null;
  if (!has) return null;
  return (
    <div className="space-y-3">
      <h3 className="font-bold text-sm">모임장소 정보</h3>
      <Tags label="유형" items={place.venue_types} />
      <Tags label="분위기" items={place.venue_atmosphere} />
      <Tags label="시그니처 메뉴" items={place.signature_dishes} />
      <div className="grid grid-cols-2 gap-2">
        {place.capacity_min != null && <Stat label="최소 인원" value={`${place.capacity_min}명`} />}
        {place.capacity_max != null && <Stat label="최대 인원" value={`${place.capacity_max}명`} />}
        {place.private_room_count != null && (
          <Stat label="단독 룸" value={`${place.private_room_count}개`} />
        )}
        {place.room_charge_separate != null && (
          <Stat label="룸 차지" value={place.room_charge_separate ? "별도 청구" : "포함"} />
        )}
        {place.drinks_included != null && (
          <Stat label="음료" value={place.drinks_included ? "포함" : "별도"} />
        )}
        {place.valet_parking != null && (
          <Stat label="발렛파킹" value={place.valet_parking ? "제공" : "미제공"} />
        )}
        {place.corkage_fee_won != null && (
          <Stat label="콜키지" value={place.corkage_fee_won === 0 ? "무료" : fmtMan(place.corkage_fee_won)} />
        )}
      </div>
    </div>
  );
}

const DetailSkeleton = () => (
  <div className="min-h-screen bg-background app-col mx-auto">
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
