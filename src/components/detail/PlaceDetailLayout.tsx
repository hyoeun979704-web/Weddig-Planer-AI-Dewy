import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Star,
  MapPin,
  Phone,
  Globe,
  Instagram,
  Clock,
  Car,
  Train,
  Sparkles,
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { FavoriteButton } from "@/components/FavoriteButton";
import { openExternal } from "@/lib/native/openExternal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { LegacyDetail } from "@/hooks/usePlaceDetail";
import PlaceImagePlaceholder from "@/components/place/PlaceImagePlaceholder";
import { usePlaceReviews, useSubmitPlaceReview, REVIEW_SOURCE_META, type PlaceReview } from "@/hooks/usePlaceReviews";
import HiddenCostsCard from "@/components/detail/HiddenCostsCard";
import SetAsWeddingVenueButton from "@/components/detail/SetAsWeddingVenueButton";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const handleTagClick = (tag: string) => {
  // Tag-based filtering on the list pages isn't wired yet — the list hooks
  // (useVenues, useCategoryData) don't read ?tag= from the query string.
  // Until that lands, surface an honest "coming soon" rather than navigating
  // to a list that visibly hasn't filtered.
  toast.info(`#${tag}`, {
    description: "태그로 비슷한 업체 찾기 기능은 곧 출시될 예정이에요",
  });
};

interface Props {
  place: LegacyDetail;
  /** Korean category label, e.g. "웨딩홀" — for the category chip */
  categoryLabel: string;
  /** Per-category extra section rendered in the detail tab */
  extraSection?: React.ReactNode;
  /** Item type for FavoriteButton (venue / studio / hanbok / etc) */
  favoriteType: "venue" | "studio" | "hanbok" | "suit" | "honeymoon" | "jewelry" | "appliance" | "invitation_venues";
}

type TabKey = "basic" | "detail" | "review";

const DAYS = [
  { key: "mon", label: "월" },
  { key: "tue", label: "화" },
  { key: "wed", label: "수" },
  { key: "thu", label: "목" },
  { key: "fri", label: "금" },
  { key: "sat", label: "토" },
  { key: "sun", label: "일" },
] as const;

// Suffix shown after a price, derived from PricePackage.unit.
const UNIT_SUFFIX: Record<string, string> = {
  per_person: "/인",
  per_event: "/행사",
  per_package: "/패키지",
  per_set: "/세트",
  per_couple: "/2인",
  per_rental: "/대여",
  per_custom: "/맞춤",
  per_session: "/회",
};

function fmtPrice(
  min: number | null,
  max?: number | null,
  currency?: string | null,
  unit?: string | null
): string {
  if (min == null) return "문의";
  const isUSD = currency === "USD";
  const fmtOne = (n: number) =>
    isUSD ? `$${n.toLocaleString()}` : `${(n / 10000).toFixed(0)}만원`;
  const range = max != null && max !== min ? `${fmtOne(min)}~${fmtOne(max)}` : `${fmtOne(min)}~`;
  const suffix = unit && UNIT_SUFFIX[unit] ? UNIT_SUFFIX[unit] : "";
  return `${range}${suffix}`;
}

const PlaceDetailLayout = ({ place, categoryLabel, extraSection, favoriteType }: Props) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("basic");

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto pb-24 relative">
      {/* Slim top header — back / category chip / favorite */}
      <header className="sticky safe-sticky-header z-50 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between h-[var(--app-header-height)] px-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-base line-clamp-1 flex-1 text-center px-2">{place.name}</h1>
          <div className="flex items-center gap-1">
            <FavoriteButton itemId={place.id} itemType={favoriteType} />
          </div>
        </div>
      </header>

      {/* Detail-page-only tab bar — sticky right under the header */}
      <nav className="sticky safe-sticky-below-header z-40 bg-card border-b border-border">
        <div className="flex">
          <TabButton label="기본정보" active={tab === "basic"} onClick={() => setTab("basic")} />
          <TabButton label="디테일정보" active={tab === "detail"} onClick={() => setTab("detail")} />
          <TabButton label="리뷰" active={tab === "review"} onClick={() => setTab("review")} count={place.review_count} />
        </div>
      </nav>

      <main>
        {tab === "basic" && (
          <BasicTab place={place} categoryLabel={categoryLabel} />
        )}
        {tab === "detail" && (
          <DetailTab place={place} extraSection={extraSection} />
        )}
        {tab === "review" && (
          <ReviewTab placeId={place.id} avgRating={place.rating} reviewCount={place.review_count} />
        )}
      </main>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-background border-t border-border p-3 z-40">
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-2 h-11"
            onClick={() => {
              if (place.tel) {
                void openExternal(`tel:${place.tel}`);
              } else {
                toast.info("전화번호 정보가 아직 없어요.");
              }
            }}
          >
            <Phone className="w-4 h-4" />
            전화 문의
          </Button>
          <Button
            className="flex-1 h-11"
            onClick={() =>
              toast.info("견적 요청 기능 준비 중이에요", {
                description: "곧 업체에게 직접 견적 받을 수 있게 만들어드릴게요",
              })
            }
          >
            예약 문의
          </Button>
        </div>
      </div>
    </div>
  );
};

function TabButton({
  label,
  active,
  onClick,
  count,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 text-sm relative ${
        active ? "text-primary font-bold" : "text-muted-foreground"
      }`}
    >
      <span>{label}</span>
      {count != null && count > 0 && (
        <span className="ml-1 text-[11px] text-muted-foreground">({count})</span>
      )}
      {active && (
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-[2px] bg-primary rounded-full" />
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Tab 1: 기본정보 + 갤러리
// ─────────────────────────────────────────────────────────────────────────────
function BasicTab({ place, categoryLabel }: { place: LegacyDetail; categoryLabel: string }) {
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [advIdx, setAdvIdx] = useState(0);

  const hasContact =
    place.tel || place.website_url || place.instagram_url || place.naver_place_url ||
    place.youtube_url || place.kakao_channel_url;
  const hasLocation = place.subway_station || place.parking_location || place.parking_capacity;

  const gallery = place.image_urls.length > 0 ? place.image_urls : place.thumbnail_url ? [place.thumbnail_url] : [];

  return (
    <>
      {/* Hero gallery */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {gallery.length > 0 ? (
          <>
            <img
              src={gallery[galleryIdx]}
              alt={place.name}
              className="w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
            />
            {gallery.length > 1 && (
              <>
                <button
                  onClick={() => setGalleryIdx((i) => (i - 1 + gallery.length) % gallery.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-background/80 backdrop-blur rounded-full flex items-center justify-center"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setGalleryIdx((i) => (i + 1) % gallery.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-background/80 backdrop-blur rounded-full flex items-center justify-center"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 right-3 px-2 py-0.5 bg-black/60 text-white text-xs rounded-full backdrop-blur">
                  {galleryIdx + 1} / {gallery.length}
                </div>
              </>
            )}
          </>
        ) : (
          /* gallery 비어있을 때 fallback — instagram_url 있으면 인스타 안내,
             없으면 카테고리 아이콘. 깨진 placeholder.svg 대신 의미 있는 안내. */
          <PlaceImagePlaceholder
            category={place.category}
            instagramUrl={place.instagram_url}
          />
        )}
        {place.is_partner && (
          <span className="absolute top-3 left-3 px-2.5 py-1 bg-primary text-primary-foreground text-[11px] font-bold rounded-full">
            파트너
          </span>
        )}
      </div>

      {/* Title block */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-1.5">
          <Badge variant="secondary" className="text-xs">{categoryLabel}</Badge>
          {place.review_count > 0 && (
            <div className="flex items-center gap-0.5 text-sm">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-semibold">{place.rating.toFixed(1)}</span>
              <span className="text-muted-foreground">({place.review_count})</span>
            </div>
          )}
          {place.wedding_count != null && place.wedding_count > 0 && (
            <span className="text-xs text-muted-foreground">· {place.wedding_count.toLocaleString()}건 진행</span>
          )}
        </div>
        <h2 className="text-xl font-bold text-foreground mb-1.5">{place.name}</h2>
        {place.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{place.description}</p>
        )}
        {/* 결혼식장 anchor 등록 CTA — wedding_hall 카테고리에만 표시.
            식장 상세를 보던 흐름 그대로 1탭 등록(§1 L5 JIT). */}
        {place.category === "wedding_hall" && (
          <div className="mt-3">
            <SetAsWeddingVenueButton
              placeId={place.id}
              placeName={place.name}
              city={place.city ?? null}
              district={place.district ?? null}
              address={place.address ?? null}
              lat={place.latitude ?? null}
              lng={place.longitude ?? null}
            />
          </div>
        )}
        {place.tags && place.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {place.tags.slice(0, 8).map((t, i) => (
              <button
                key={i}
                onClick={() => handleTagClick(t)}
                className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-full transition-colors"
              >
                #{t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recommended-for — high consumer trust signal */}
      {place.recommended_for.length > 0 && (
        <section className="px-4 pt-3 pb-2">
          <h3 className="font-bold text-sm mb-2">이런 분께 추천</h3>
          <ul className="text-sm text-foreground space-y-1">
            {place.recommended_for.slice(0, 4).map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary">✓</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Advantages carousel */}
      {place.advantages.length > 0 && (
        <section className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-sm">장점·이벤트</h3>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-2xl">
              <div
                className="flex transition-transform duration-300 ease-out"
                style={{ transform: `translateX(-${advIdx * 100}%)` }}
              >
                {place.advantages.map((a, i) => (
                  <div
                    key={i}
                    className="min-w-full p-4 bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 rounded-2xl"
                  >
                    <h4 className="font-bold text-foreground mb-1.5">{a.title}</h4>
                    {a.content && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{a.content}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {place.advantages.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-2">
                {place.advantages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setAdvIdx(i)}
                    className={`h-1.5 rounded-full transition-all ${i === advIdx ? "w-6 bg-primary" : "w-1.5 bg-muted"}`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Event banner */}
      {place.event_info && (
        <section className="px-4 pb-2">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
            <Calendar className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-900">{place.event_info}</p>
          </div>
        </section>
      )}

      {/* Contact / hours / location / SNS */}
      {(hasContact || place.hours || hasLocation) && (
        <section className="px-4 pt-3 pb-2 space-y-3">
          {place.address && (
            <Row icon={<MapPin className="w-4 h-4" />} label="주소" value={place.address}
              action={
                <button
                  onClick={() => void openExternal(`https://map.kakao.com/?q=${encodeURIComponent(place.address)}`)}
                  className="text-xs text-primary underline"
                >지도</button>
              }
            />
          )}
          {place.tel && (
            <Row icon={<Phone className="w-4 h-4" />} label="전화"
              value={<a href={`tel:${place.tel}`} className="text-primary underline">{place.tel}</a>}
            />
          )}
          {place.hours && (
            <Row icon={<Clock className="w-4 h-4" />} label="영업시간"
              value={
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm">
                  {DAYS.map(({ key, label }) => {
                    const v = place.hours![key as keyof typeof place.hours];
                    if (!v) return null;
                    return (
                      <span key={key} className="text-foreground">
                        <span className="text-muted-foreground">{label}</span> {v}
                      </span>
                    );
                  })}
                </div>
              }
            />
          )}
          {place.closed_days && (
            <Row icon={<AlertCircle className="w-4 h-4" />} label="휴무" value={place.closed_days} />
          )}
          {place.subway_station && (
            <Row icon={<Train className="w-4 h-4" />} label="지하철"
              value={
                <span>
                  {place.subway_line && `${place.subway_line} `}{place.subway_station}
                  {place.walk_minutes != null && ` · 도보 ${place.walk_minutes}분`}
                </span>
              }
            />
          )}
          {(place.parking_location || place.parking_capacity || place.parking_free_guest) && (
            <Row icon={<Car className="w-4 h-4" />} label="주차"
              value={
                <span>
                  {[
                    place.parking_location,
                    place.parking_capacity != null ? `${place.parking_capacity}대` : null,
                    place.parking_free_guest,
                  ].filter(Boolean).join(" · ")}
                </span>
              }
            />
          )}
          {(place.website_url || place.instagram_url || place.naver_place_url || place.kakao_channel_url) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {place.website_url && (
                <SnsChip icon={<Globe className="w-3.5 h-3.5" />} label="홈페이지" href={place.website_url} />
              )}
              {place.instagram_url && (
                <SnsChip icon={<Instagram className="w-3.5 h-3.5" />} label="Instagram" href={place.instagram_url} />
              )}
              {place.naver_place_url && (
                <SnsChip label="N 플레이스" href={place.naver_place_url} />
              )}
              {place.kakao_channel_url && (
                <SnsChip label="카카오톡" href={place.kakao_channel_url} />
              )}
              {place.youtube_url && (
                <SnsChip label="YouTube" href={place.youtube_url} />
              )}
            </div>
          )}
        </section>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Tab 2: 디테일정보 + 홀 및 옵션 정보
// ─────────────────────────────────────────────────────────────────────────────
function DetailTab({
  place,
  extraSection,
}: {
  place: LegacyDetail;
  extraSection?: React.ReactNode;
}) {
  const isEmpty =
    place.price_packages.length === 0 &&
    place.basic_services.length === 0 &&
    place.amenities.length === 0 &&
    !extraSection &&
    place.pros.length === 0 && place.cons.length === 0 &&
    place.hidden_costs.length === 0 &&
    !place.contract_policy;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center text-muted-foreground">
        <Sparkles className="w-8 h-8 mb-3 opacity-50" />
        <p className="text-sm">아직 디테일 정보가 등록되지 않았어요.</p>
      </div>
    );
  }

  return (
    <>
      {/* Price packages */}
      {place.price_packages.length > 0 && (
        <section className="px-4 pt-4 pb-2">
          <h3 className="font-bold text-sm mb-2">가격 패키지</h3>
          <div className="space-y-2">
            {place.price_packages.map((pkg, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-3">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-semibold text-foreground">{pkg.name}</span>
                  <span className="font-bold text-primary text-sm">
                    {fmtPrice(pkg.price_min, pkg.price_max, pkg.currency, pkg.unit)}
                  </span>
                </div>
                {pkg.includes && pkg.includes.length > 0 && (
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {pkg.includes.map((it, j) => <li key={j}>· {it}</li>)}
                  </ul>
                )}
                {pkg.notes && (
                  <p className="text-xs text-amber-700 mt-1.5 italic"> {pkg.notes}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Basic services */}
      {place.basic_services.length > 0 && (
        <section className="px-4 pt-3 pb-2">
          <h3 className="font-bold text-sm mb-2">기본 제공</h3>
          <div className="flex flex-wrap gap-1.5">
            {place.basic_services.map((s, i) => (
              <span key={i} className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                ✓ {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Amenities */}
      {place.amenities.length > 0 && (
        <section className="px-4 pt-3 pb-2">
          <h3 className="font-bold text-sm mb-2">편의시설</h3>
          <div className="flex flex-wrap gap-1.5">
            {place.amenities.map((a, i) => (
              <span key={i} className="text-xs px-2.5 py-1 bg-muted text-foreground rounded-full">{a}</span>
            ))}
          </div>
        </section>
      )}

      {/* Category-specific block — 홀 및 옵션 정보 */}
      {extraSection && <section className="px-4 pt-3 pb-2">{extraSection}</section>}

      {/* Pros / cons */}
      {(place.pros.length > 0 || place.cons.length > 0) && (
        <section className="px-4 pt-3 pb-2">
          <h3 className="font-bold text-sm mb-2">장단점 요약</h3>
          <div className="grid grid-cols-2 gap-2">
            {place.pros.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-emerald-700 mb-1"> 좋아요</p>
                <ul className="text-xs text-emerald-900 space-y-0.5">
                  {place.pros.slice(0, 4).map((p, i) => <li key={i}>· {p}</li>)}
                </ul>
              </div>
            )}
            {place.cons.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-rose-700 mb-1"> 아쉬워요</p>
                <ul className="text-xs text-rose-900 space-y-0.5">
                  {place.cons.slice(0, 4).map((c, i) => <li key={i}>· {c}</li>)}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Hidden costs — P3 페르소나 핵심 페인. 카테고리 표준 추가금 체크리스트 함께. */}
      {(place.hidden_costs.length > 0 || ["wedding_hall", "studio", "dress_shop", "makeup_shop", "honeymoon"].includes(place.category)) && (
        <HiddenCostsCard category={place.category} hiddenCostsByPlace={place.hidden_costs} />
      )}
      {place.contract_policy && (
        <section className="px-4 pt-3 pb-4">
          <h3 className="font-bold text-sm mb-2">계약 / 환불 정책</h3>
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl p-3 leading-relaxed">
            {place.contract_policy}
          </p>
        </section>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Tab 3: 리뷰
// ─────────────────────────────────────────────────────────────────────────────
function ReviewTab({
  placeId,
  avgRating,
  reviewCount,
}: {
  placeId: string;
  avgRating: number;
  reviewCount: number;
}) {
  const { data: reviews = [], isLoading } = usePlaceReviews(placeId);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [writeOpen, setWriteOpen] = useState(false);

  const hasMine = !!user && reviews.some((r) => r.user_id === user.id);

  const handleOpenWrite = () => {
    if (!user) {
      toast.info("로그인 후 후기를 작성할 수 있어요");
      navigate("/auth");
      return;
    }
    if (hasMine) {
      toast.info("이 장소에는 이미 후기를 작성했어요");
      return;
    }
    setWriteOpen(true);
  };

  if (isLoading) {
    return (
      <div className="px-4 pt-4 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Rating summary header */}
      <section className="px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold text-foreground">
            {avgRating > 0 ? avgRating.toFixed(1) : "-"}
          </span>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < Math.round(avgRating)
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/30"
                }`}
              />
            ))}
          </div>
          <span className="text-sm text-muted-foreground ml-auto">
            {reviewCount.toLocaleString()}개 리뷰
          </span>
        </div>
        <Button
          type="button"
          onClick={handleOpenWrite}
          disabled={hasMine}
          className="w-full mt-3 h-10 rounded-xl"
        >
          {hasMine ? "이미 후기를 작성했어요" : "후기 작성하고 3,000포인트 받기"}
        </Button>
      </section>

      {/* Review list or empty state */}
      {reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center text-muted-foreground">
          <Star className="w-8 h-8 mb-3 opacity-30" />
          <p className="text-sm">아직 등록된 리뷰가 없어요.</p>
          <p className="text-xs mt-1">결혼식을 마치셨다면 첫 리뷰를 남겨주세요.</p>
        </div>
      ) : (
        <div className="px-4 py-3 space-y-3">
          {reviews.map((r) => (
            <ReviewCard key={r.review_id} review={r} />
          ))}
        </div>
      )}

      <WriteReviewDialog
        open={writeOpen}
        placeId={placeId}
        onClose={() => setWriteOpen(false)}
      />
    </>
  );
}

function WriteReviewDialog({
  open,
  placeId,
  onClose,
}: {
  open: boolean;
  placeId: string;
  onClose: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const submit = useSubmitPlaceReview();

  const reset = () => {
    setRating(5);
    setTitle("");
    setContent("");
  };

  const close = () => {
    if (submit.isPending) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (content.trim().length < 10) {
      toast.error("후기는 최소 10자 이상 작성해주세요");
      return;
    }
    try {
      const res = await submit.mutateAsync({
        placeId,
        rating,
        title: title.trim() || undefined,
        content: content.trim(),
      });
      if (res.awarded) {
        toast.success(`후기 등록! ${res.amount.toLocaleString()}포인트 적립됐어요`);
      } else {
        toast.success("후기 등록 완료! (장소별 첫 작성 보상은 이미 지급됐어요)");
      }
      reset();
      onClose();
    } catch (e: any) {
      if (e?.message === "ALREADY_REVIEWED") {
        toast.error("이 장소에는 이미 후기를 작성했어요");
        onClose();
      } else {
        toast.error("후기 등록에 실패했어요. 잠시 후 다시 시도해주세요");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle>후기 작성</DialogTitle>
          <DialogDescription>
            첫 후기 작성 시 3,000포인트 즉시 적립 (사용자별 1회)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">별점</p>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => {
                const v = i + 1;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setRating(v)}
                    aria-label={`${v}점`}
                    className="p-1 active:scale-90 transition-transform"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        v <= rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/40"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">
              제목 <span className="text-xs text-muted-foreground font-normal">(선택)</span>
            </p>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="한 줄 요약"
              maxLength={60}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">
              내용 <span className="text-xs text-muted-foreground font-normal">(10자 이상)</span>
            </p>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="실제 경험을 솔직하게 적어주세요"
              maxLength={2000}
              rows={6}
            />
            <p className="text-right text-[11px] text-muted-foreground mt-1">
              {content.length} / 2000
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={submit.isPending}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={submit.isPending}>
            {submit.isPending ? "등록 중..." : "후기 등록"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewCard({ review }: { review: PlaceReview }) {
  const date = review.review_date
    ? new Date(review.review_date).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;
  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1.5">
        {review.rating != null && (
          <div className="flex items-center gap-0.5 text-sm">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="font-semibold">{review.rating.toFixed(1)}</span>
          </div>
        )}
        {review.author && (
          <span className="text-sm text-foreground">{review.author}</span>
        )}
        {/* 출처 칩 — source_type 우선, 없으면 is_verified 폴백. P3·P13·P18 광고/협찬 분간 해소. */}
        {(() => {
          const meta = review.source_type
            ? REVIEW_SOURCE_META[review.source_type]
            : review.is_verified
              ? REVIEW_SOURCE_META.user_verified
              : null;
          if (!meta) return null;
          return (
            <span
              title={meta.hint}
              className={`text-[10px] px-1.5 py-0.5 rounded-full border ${meta.tone}`}
            >
              {meta.label}
            </span>
          );
        })()}
        {date && (
          <span className="text-xs text-muted-foreground ml-auto">{date}</span>
        )}
      </div>
      {review.title && (
        <h4 className="font-semibold text-sm text-foreground mb-1">{review.title}</h4>
      )}
      <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{review.content}</p>
      {review.ai_summary && (
        <div className="mt-2 px-3 py-2 bg-primary/5 border border-primary/10 rounded-lg">
          <p className="text-[11px] font-semibold text-primary mb-0.5">AI 요약</p>
          <p className="text-xs text-foreground">{review.ai_summary}</p>
        </div>
      )}
      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
        {review.source_name && <span>출처: {review.source_name}</span>}
        {review.helpful_count != null && review.helpful_count > 0 && (
          <span> {review.helpful_count}</span>
        )}
        {review.hall_name && <span>{review.hall_name}</span>}
      </div>
    </div>
  );
}

function Row({ icon, label, value, action }: { icon: React.ReactNode; label: string; value: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
        <div className="text-sm text-foreground">{value}</div>
        {action && <div className="mt-1">{action}</div>}
      </div>
    </div>
  );
}

function SnsChip({ icon, label, href }: { icon?: React.ReactNode; label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-foreground text-xs rounded-full hover:bg-accent transition-colors"
    >
      {icon}
      {label}
    </a>
  );
}

export default PlaceDetailLayout;
