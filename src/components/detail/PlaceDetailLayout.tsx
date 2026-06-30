import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
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
  X,
  Expand,
} from "lucide-react";
import { FavoriteButton } from "@/components/FavoriteButton";
import { openExternal } from "@/lib/native/openExternal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { LegacyDetail } from "@/hooks/usePlaceDetail";
import PlaceImagePlaceholder from "@/components/place/PlaceImagePlaceholder";
import { usePlaceReviews, REVIEW_SOURCE_META, type PlaceReview } from "@/hooks/usePlaceReviews";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { rankReviews, regionMatches, VERIFICATION_TIER_META } from "@/lib/reviewRanking";
import HiddenCostsCard from "@/components/detail/HiddenCostsCard";
import SetAsWeddingVenueButton from "@/components/detail/SetAsWeddingVenueButton";
import PlaceReviewWriteSheet from "@/components/detail/PlaceReviewWriteSheet";
import { useAuth } from "@/contexts/AuthContext";
import { checkReferralMilestones } from "@/lib/referralEvent";
import PlaceMap from "@/components/detail/PlaceMap";
import PlaceRecommendations from "@/components/detail/PlaceRecommendations";
import PlaceKeyFacts from "@/components/detail/PlaceKeyFacts";
import PlaceInquirySheet from "@/components/place/PlaceInquirySheet";
import AddToBoardButton from "@/components/place/AddToBoardButton";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  place: LegacyDetail;
  /** Korean category label, e.g. "웨딩홀" — for the category chip */
  categoryLabel: string;
  /** Per-category extra section rendered in the detail tab */
  extraSection?: React.ReactNode;
  /** 혜택(쿠폰) — 첫 화면(기본정보 탭) 혜택군에 노출. 전환 직결이라 디테일 탭에 숨기지 않음. */
  couponsSection?: React.ReactNode;
  /** 혜택(진행중 이벤트) — 쿠폰과 함께 기본정보 탭 혜택군에 노출(전환 직결). */
  eventsSection?: React.ReactNode;
  /** Item type for FavoriteButton (venue / studio / hanbok / etc) */
  favoriteType: "venue" | "studio" | "hanbok" | "suit" | "honeymoon" | "jewelry" | "appliance" | "invitation_venues";
}

type TabKey = "basic" | "detail" | "review";

interface InquiryStats {
  total: number;
  answered: number;
  recent_30d: number;
  avg_response_hours: number | null;
}

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

// 대표 가격(최저가 패키지) 요약 — 첫 화면·sticky CTA 동반용. 가격 없으면 null("견적 문의" 처리).
// 레퍼런스(네이버·에어비앤비 등) 공통: 가격은 항상 노출해 전환·신뢰를 높인다.
function pkgPriceSummary(packages: LegacyDetail["price_packages"]): string | null {
  const withPrice = packages.filter((p) => p.price_min != null);
  if (withPrice.length === 0) return null;
  const lowest = withPrice.reduce((a, b) => ((b.price_min as number) < (a.price_min as number) ? b : a));
  return fmtPrice(lowest.price_min, null, lowest.currency, lowest.unit);
}

const PlaceDetailLayout = ({ place, categoryLabel, extraSection, couponsSection, eventsSection, favoriteType }: Props) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("basic");
  // 입점(클레임) 여부 — 소유자가 있으면 '예약 문의'를 인앱 문의로 연결,
  // 없으면 사장님 클레임 배너를 노출한다.
  const [isClaimed, setIsClaimed] = useState(false);
  // 업체가 직접 작성 + 운영자 검토 통과한 정보인지 — 신뢰 표시용
  const [vendorAuthored, setVendorAuthored] = useState(false);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  // 입점 업체가 고른 문의 채널 — 'chat'(인앱) | 'url' | 'phone'. 사장님이 설정.
  const [inquiry, setInquiry] = useState<{ channel: string; url: string | null; phone: string | null }>({
    channel: "chat",
    url: null,
    phone: null,
  });
  // ② 신뢰 신호(입점 업체 응답 통계) · ③ 입점 유도(조회수 수요 신호)
  const [inquiryStats, setInquiryStats] = useState<InquiryStats | null>(null);
  const [viewCount, setViewCount] = useState<number>(0);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("places")
        .select("owner_user_id, moderation_status, data_source, inquiry_channel, inquiry_url, inquiry_phone, view_count")
        .eq("place_id", place.id)
        .maybeSingle();
      if (cancelled) return;
      const claimed = !!data?.owner_user_id;
      setIsClaimed(claimed);
      setViewCount((data?.view_count as number) ?? 0);
      setInquiry({
        channel: (data?.inquiry_channel as string) ?? "chat",
        url: (data?.inquiry_url as string) ?? null,
        phone: (data?.inquiry_phone as string) ?? null,
      });
      // ② 신뢰 신호 — 입점 업체의 응답 통계(집계만).
      if (claimed) {
        const { data: s } = await (supabase as any).rpc("get_place_inquiry_stats", { p_place_id: place.id });
        if (!cancelled && s) setInquiryStats(s as InquiryStats);
      }
      // '직접 작성' = 업체 계정이 만든 정보(data_source=business)가 운영자 검토를
      // 통과한 경우만. 수집 업체는 기본 approved 라 이 조건이 없으면 헛신호가 난다.
      setVendorAuthored(
        !!data?.owner_user_id &&
          data?.moderation_status === "approved" &&
          data?.data_source === "business",
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [place.id]);

  // AIO(AI 검색 최적화) — 입점(클레임) 업체 한정 LocalBusiness 구조화 데이터 주입.
  // 초기 파트너 약속(혜택 3). AI 검색·크롤러가 업체 정보를 구조적으로 읽게 한다.
  useEffect(() => {
    if (!isClaimed) return;
    const p = place as unknown as Record<string, unknown>;
    const jsonLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: place.name,
      url: window.location.href,
    };
    if (place.tel) jsonLd.telephone = place.tel;
    if (typeof p.description === "string" && p.description) jsonLd.description = p.description;
    if (typeof p.address === "string" && p.address) jsonLd.address = p.address;
    if (typeof p.main_image_url === "string" && p.main_image_url) jsonLd.image = p.main_image_url;
    if (place.rating && place.review_count) {
      jsonLd.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: place.rating,
        reviewCount: place.review_count,
      };
    }
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(jsonLd);
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [isClaimed, place]);
  // 탭 전환 시 새 탭 내용을 위에서부터 보도록 페이지 상단으로 스크롤.
  const selectTab = (t: TabKey) => {
    setTab(t);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  return (
    <div className="min-h-screen bg-background app-col mx-auto pb-24 relative">
      {/* Slim top header — back / category chip / favorite */}
      <header className="sticky safe-sticky-header z-50 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between h-[var(--app-header-height)] px-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2" aria-label="뒤로 가기">
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
          <TabButton label="기본정보" active={tab === "basic"} onClick={() => selectTab("basic")} />
          <TabButton label="상세정보" active={tab === "detail"} onClick={() => selectTab("detail")} />
          <TabButton label="리뷰" active={tab === "review"} onClick={() => selectTab("review")} count={place.review_count} />
        </div>
      </nav>

      <main>
        {/* '이 업체로 결정' → 내 업체 보드에 기록(보드 슬롯이 있는 카테고리만 노출) */}
        <AddToBoardButton placeId={place.id} placeName={place.name} category={place.category} />
        {tab === "basic" && (
          <BasicTab
            place={place}
            categoryLabel={categoryLabel}
            vendorAuthored={vendorAuthored}
            couponsSection={couponsSection}
            eventsSection={eventsSection}
          />
        )}
        {tab === "detail" && (
          <DetailTab place={place} extraSection={extraSection} />
        )}
        {tab === "review" && (
          <ReviewTab placeId={place.id} avgRating={place.rating} reviewCount={place.review_count} />
        )}
      </main>

      {/* 필터 기반 추천 — 탭과 무관하게 페이지 하단에 항상 노출 */}
      <PlaceRecommendations
        place={{
          id: place.id,
          category: place.category,
          city: place.city,
          district: place.district,
          latitude: place.latitude,
          longitude: place.longitude,
        }}
      />

      {/* 미입점 업체 — 사장님 클레임 배너 (③ 수요 가시화로 입점 유도) */}
      {!isClaimed && (
        <button
          type="button"
          onClick={() => navigate("/business")}
          className="block w-full px-4 pb-24 pt-2 text-center"
        >
          {viewCount >= 10 ? (
            <span className="text-[12px] text-muted-foreground">
              지금까지 <b className="text-foreground">{viewCount.toLocaleString()}명</b>이 이 업체를 봤어요 ·{" "}
              <span className="text-primary underline underline-offset-2">사장님이라면 무료 입점하고 문의를 직접 받으세요 →</span>
            </span>
          ) : (
            <span className="text-[12px] text-muted-foreground underline underline-offset-2">
              이 업체의 사장님이신가요? 무료 입점하고 직접 관리하세요 →
            </span>
          )}
        </button>
      )}

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 app-col mx-auto bg-background border-t border-border px-3 pt-2 pb-[calc(0.75rem+var(--safe-bottom))] z-40">
        {/* 가격 동반 표시(레퍼런스 공통) — 최저가 패키지 또는 견적 안내. */}
        <div className="flex items-baseline gap-1.5 pb-1.5">
          {pkgPriceSummary(place.price_packages) ? (
            <>
              <span className="text-[11px] text-muted-foreground">최저</span>
              <span className="text-base font-bold text-foreground">{pkgPriceSummary(place.price_packages)}</span>
            </>
          ) : (
            <span className="text-[13px] text-muted-foreground">가격은 문의로 안내해드려요</span>
          )}
        </div>
        {/* ② 신뢰 신호 — 입점 업체 응답 통계(문의 시작률 ↑) */}
        {isClaimed && inquiryStats && inquiryStats.total >= 1 && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pb-2 text-[11px] text-muted-foreground">
            {inquiryStats.avg_response_hours != null && inquiryStats.avg_response_hours <= 24 && inquiryStats.total >= 3 && (
              <span className="inline-flex items-center gap-0.5 font-bold text-primary">⚡ 빠른 응답</span>
            )}
            {inquiryStats.total >= 3 && (
              <span>응답률 {Math.round((inquiryStats.answered / inquiryStats.total) * 100)}%</span>
            )}
            {inquiryStats.recent_30d > 0 && <span>· 최근 30일 문의 {inquiryStats.recent_30d}건</span>}
          </div>
        )}
        {(() => {
          // dead-end 제거: 연락처 유무를 미리 계산해 '될 때만' 버튼을 살린다.
          //   - 전화 버튼: 번호 있을 때만 렌더(없으면 toast 죽은 버튼 X).
          //   - 메인 버튼: 입점=인앱 채팅 폴백으로 항상 동작 / 미입점=온라인·전화 있으면 그 채널,
          //     둘 다 없으면(예전 '연락처 미등록' 비활성=죽은 버튼) 견적-매칭으로 전환(아래 goQuote).
          const online =
            place.kakao_channel_url || place.naver_place_url || place.website_url ||
            place.instagram_url || place.youtube_url || null;
          const unclaimedHasContact = !!online || !!place.tel;
          const noContact = !isClaimed && !unclaimedHasContact;
          // 같은 카테고리의 응답 가능한 업체들에게 한 번에 견적 요청(전환 경로 복구).
          // 지역은 견적 폼이 사용자의 식장 지역으로 자동 시드 → 카테고리만 넘긴다.
          const goQuote = () => navigate(`/quote/new?category=${encodeURIComponent(place.category)}`);
          return (
            <>
              <div className="flex gap-2">
                {place.tel && (
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 h-11"
                    onClick={() => void openExternal(`tel:${place.tel}`)}
                  >
                    <Phone className="w-4 h-4" />
                    전화 문의
                  </Button>
                )}
                {isClaimed ? (
                  <Button
                    className="flex-1 h-11"
                    onClick={() => {
                      // 사장님이 고른 채널(url/phone), 기본은 인앱 문의 시트(항상 동작).
                      if (inquiry.channel === "url" && inquiry.url) void openExternal(inquiry.url);
                      else if (inquiry.channel === "phone" && inquiry.phone) void openExternal(`tel:${inquiry.phone}`);
                      else setInquiryOpen(true);
                    }}
                  >
                    예약 문의
                  </Button>
                ) : unclaimedHasContact ? (
                  <Button
                    className="flex-1 h-11"
                    onClick={() => void openExternal((online ?? `tel:${place.tel}`) as string)}
                  >
                    문의하기
                  </Button>
                ) : (
                  // 죽은 '연락처 미등록' 버튼 대신 실제 동작하는 견적 요청으로 연결(dead-end 복구).
                  <Button className="flex-1 h-11" onClick={goQuote}>
                    견적 받기
                  </Button>
                )}
              </div>
              {noContact ? (
                <p className="text-[11px] text-muted-foreground text-center pt-2">
                  이 업체는 등록된 연락처가 없어요. 대신 조건이 맞는 업체들에게 한 번에 견적을 받아보세요.
                  <br />
                  사장님이라면 무료 입점 후 문의를 직접 받을 수 있어요.
                </p>
              ) : !isClaimed && unclaimedHasContact ? (
                // 미입점 업체는 외부 채널 응답이 불확실 → 응답 보장되는 비교 견적 경로를 함께 제공.
                <button
                  type="button"
                  onClick={goQuote}
                  className="block w-full text-center pt-2 text-[12px] font-medium text-primary"
                >
                  여러 곳 비교 견적 받기 →
                </button>
              ) : null}
            </>
          );
        })()}
      </div>

      <PlaceInquirySheet
        placeId={place.id}
        placeName={place.name}
        open={inquiryOpen}
        onOpenChange={setInquiryOpen}
      />
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
function BasicTab({
  place,
  categoryLabel,
  vendorAuthored = false,
  couponsSection,
  eventsSection,
}: {
  place: LegacyDetail;
  categoryLabel: string;
  /** 업체가 직접 작성하고 운영자 검토를 통과한 정보 — 신뢰 표시 */
  vendorAuthored?: boolean;
  /** 혜택(쿠폰) — 첫 화면 혜택군에 노출 */
  couponsSection?: React.ReactNode;
  /** 혜택(진행중 이벤트) — 쿠폰과 함께 첫 화면 혜택군에 노출 */
  eventsSection?: React.ReactNode;
}) {
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [advIdx, setAdvIdx] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const navigate = useNavigate();

  const hasContact =
    place.tel || place.website_url || place.instagram_url || place.naver_place_url ||
    place.youtube_url || place.kakao_channel_url;
  const hasLocation = place.subway_station || place.parking_location || place.parking_capacity;
  const hasCoords = place.latitude != null && place.longitude != null;

  const gallery = place.image_urls.length > 0 ? place.image_urls : place.thumbnail_url ? [place.thumbnail_url] : [];

  return (
    <>
      {/* Hero gallery */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {gallery.length > 0 ? (
          <>
            {/* 사진 탭 → 풀스크린 뷰어(레퍼런스 공통: "사진 모두 보기"). */}
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              className="absolute inset-0 w-full h-full"
              aria-label="사진 전체 보기"
            >
              <img
                src={gallery[galleryIdx]}
                alt={place.name}
                className="w-full h-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
              />
            </button>
            {gallery.length > 1 && (
              <>
                <button
                  onClick={() => setGalleryIdx((i) => (i - 1 + gallery.length) % gallery.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-background/80 backdrop-blur rounded-full flex items-center justify-center"
                  aria-label="이전 사진"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setGalleryIdx((i) => (i + 1) % gallery.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-background/80 backdrop-blur rounded-full flex items-center justify-center"
                  aria-label="다음 사진"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setFullscreen(true)}
                  className="absolute bottom-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 bg-black/60 text-white text-xs rounded-full backdrop-blur active:scale-95"
                >
                  <Expand className="w-3 h-3" /> 전체 {gallery.length}장
                </button>
              </>
            )}
          </>
        ) : place.instagram_url ? (
          /* gallery 비어있고 instagram_url 있을 때 — 인스타 계정으로 실제 링크.
             기존엔 안내 div 뿐이라 "Instagram 에서 보기" 가 눌리지 않았음(연동 안 됨). */
          <a
            href={place.instagram_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full h-full"
            aria-label="Instagram에서 보기"
          >
            <PlaceImagePlaceholder category={place.category} instagramUrl={place.instagram_url} />
          </a>
        ) : (
          /* instagram_url 없으면 카테고리 아이콘 placeholder. */
          <PlaceImagePlaceholder category={place.category} instagramUrl={place.instagram_url} />
        )}
        {place.is_partner && (
          <span className="absolute top-3 left-3 px-2.5 py-1 bg-primary text-primary-foreground text-[11px] font-bold rounded-full">
            파트너
          </span>
        )}
      </div>

      {/* 풀스크린 갤러리 — 사진 탭/전체보기 시 큰 화면 스와이프(웨딩은 사진이 핵심 구매요인). */}
      {fullscreen && gallery.length > 0 && (
        <div className="fixed inset-0 z-[70] bg-black flex flex-col" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between px-4 py-3 text-white" style={{ paddingTop: "calc(0.75rem + var(--safe-top))" }}>
            <span className="text-sm">{galleryIdx + 1} / {gallery.length}</span>
            <button type="button" onClick={() => setFullscreen(false)} aria-label="닫기" className="w-9 h-9 flex items-center justify-center">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center relative overflow-hidden">
            <img src={gallery[galleryIdx]} alt={place.name} className="max-w-full max-h-full object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }} />
            {gallery.length > 1 && (
              <>
                <button onClick={() => setGalleryIdx((i) => (i - 1 + gallery.length) % gallery.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/15 rounded-full flex items-center justify-center text-white" aria-label="이전 사진">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={() => setGalleryIdx((i) => (i + 1) % gallery.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/15 rounded-full flex items-center justify-center text-white" aria-label="다음 사진">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Title block — 레퍼런스 공통 위계: 이름 → 평점·카테고리·지역 → 가격 → 설명.
          첫 화면 3줄 안에 의사결정 정보(무엇·평판·어디·얼마)를 압축한다. */}
      <div className="px-4 pt-4 pb-2">
        {/* 1) 업체명 */}
        <h2 className="text-xl font-bold text-foreground mb-1">{place.name}</h2>
        {/* 2) 평점 · 카테고리 · 지역 · 진행수 (한 줄) */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm mb-1.5">
          {place.review_count > 0 && (
            <span className="flex items-center gap-0.5">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-semibold">{place.rating.toFixed(1)}</span>
              <span className="text-muted-foreground">({place.review_count})</span>
            </span>
          )}
          <Badge variant="secondary" className="text-xs">{categoryLabel}</Badge>
          {(place.city || place.district) && (
            <span className="text-xs text-muted-foreground inline-flex items-center gap-0.5">
              <MapPin className="w-3 h-3" />{[place.city, place.district].filter(Boolean).join(" ")}
            </span>
          )}
          {place.wedding_count != null && place.wedding_count > 0 && (
            <span className="text-xs text-muted-foreground">· {place.wedding_count.toLocaleString()}건 진행</span>
          )}
        </div>
        {/* 3) 대표 가격 — 첫 화면 노출(없으면 견적 안내) */}
        {pkgPriceSummary(place.price_packages) ? (
          <p className="text-sm mb-1.5">
            <span className="text-muted-foreground">최저</span>{" "}
            <span className="font-bold text-primary">{pkgPriceSummary(place.price_packages)}</span>
            <span className="text-xs text-muted-foreground"> · 패키지별 상이</span>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground mb-1.5">가격은 문의로 안내해드려요</p>
        )}
        {vendorAuthored && (
          <span className="inline-flex items-center gap-1 text-[11px] text-primary font-medium bg-primary/10 rounded-full px-2 py-0.5 mb-1.5">
            ✓ 업체가 직접 작성·검수
          </span>
        )}
        {place.description && (
          <p className="text-sm text-muted-foreground leading-relaxed mt-1">{place.description}</p>
        )}
        {/* 카테고리별 핵심 스펙 요약 — 첫 화면 비교·판단(상세는 디테일 탭). */}
        <PlaceKeyFacts place={place} />
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
            {/* 같은 태그가 달린 업체 모아보기로 이동(/search/tag/:tag). */}
            {place.tags.slice(0, 8).map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => navigate(`/search/tag/${encodeURIComponent(t)}`)}
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

      {/* 혜택(쿠폰·이벤트) — 첫 화면 혜택군. 전환 직결이라 상세 탭에 숨기지 않음(레퍼런스 원칙 4). */}
      {couponsSection && <section className="px-4 pt-1 pb-2">{couponsSection}</section>}
      {eventsSection && <section className="px-4 pt-1 pb-2">{eventsSection}</section>}

      {/* Contact / hours / location / SNS */}
      {(hasContact || place.hours || hasLocation || hasCoords) && (
        <section className="px-4 pt-3 pb-2 space-y-3">
          {hasCoords && (
            <PlaceMap
              lat={place.latitude!}
              lng={place.longitude!}
              name={place.name}
              address={place.address}
            />
          )}
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
  const navigate = useNavigate();
  const isEmpty =
    place.price_packages.length === 0 &&
    place.basic_services.length === 0 &&
    place.amenities.length === 0 &&
    !extraSection &&
    place.pros.length === 0 && place.cons.length === 0 &&
    place.hidden_costs.length === 0 &&
    !place.contract_policy;

  if (isEmpty) {
    // 상세정보 미등록 업체(다수)가 dead-end 가 되지 않도록 — 빈 안내 대신 실제 동작하는
    // 비교 견적 경로를 함께 둔다. 카테고리만 넘기면 견적 폼이 식장 지역을 자동 시드.
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center text-muted-foreground">
        <Sparkles className="w-8 h-8 mb-3 opacity-50" />
        <p className="text-sm">아직 상세정보가 등록되지 않았어요.</p>
        <p className="text-[13px] mt-1">조건이 맞는 업체들에게 한 번에 견적을 받아보세요.</p>
        <Button
          className="mt-4 h-10"
          onClick={() => navigate(`/quote/new?category=${encodeURIComponent(place.category)}`)}
        >
          비교 견적 받기
        </Button>
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
  const { weddingSettings } = useWeddingSchedule();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [writeOpen, setWriteOpen] = useState(false);

  // 인증(계약>상담>없음) → 같은 지역 → 최신 순으로 정렬해 신뢰·관련 후기를 위로.
  const viewerRegion = weddingSettings.wedding_region;
  const rankedReviews = useMemo(() => rankReviews(reviews, viewerRegion), [reviews, viewerRegion]);

  const handleWriteClick = () => {
    if (!user) { navigate("/auth"); return; }
    setWriteOpen(true);
  };

  const handleSubmitted = () => {
    // 평점/리뷰수는 트리거가 갱신 → 관련 캐시 무효화. 추천 이벤트 미션 체크도 트리거.
    void queryClient.invalidateQueries({ queryKey: ["place-reviews", placeId] });
    void queryClient.invalidateQueries({ queryKey: ["place-detail"] });
    void checkReferralMilestones();
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
        <Button variant="outline" size="sm" className="w-full mt-3" onClick={handleWriteClick}>
          후기 작성
        </Button>
      </section>

      {/* Review list or empty state */}
      {reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center text-muted-foreground">
          <Star className="w-8 h-8 mb-3 opacity-30" />
          <p className="text-sm">아직 등록된 리뷰가 없어요.</p>
          <p className="text-xs mt-1">방문·계약 경험이 있다면 첫 후기를 남겨주세요.</p>
        </div>
      ) : (
        <div className="px-4 py-3 space-y-3">
          {rankedReviews.map((r) => (
            <ReviewCard key={r.review_id} review={r} viewerRegion={viewerRegion} />
          ))}
        </div>
      )}

      <PlaceReviewWriteSheet
        open={writeOpen}
        onOpenChange={setWriteOpen}
        placeId={placeId}
        onSubmitted={handleSubmitted}
      />
    </>
  );
}

function ReviewCard({ review, viewerRegion }: { review: PlaceReview; viewerRegion?: string | null }) {
  const tierMeta = review.verification_tier ? VERIFICATION_TIER_META[review.verification_tier] : null;
  const isLocal = regionMatches(review.author_region, viewerRegion);
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
        {/* 실거래 인증 칩 — 행동로그 기반(계약/상담). 신뢰 신호라 가장 먼저. */}
        {tierMeta && (
          <span
            title={tierMeta.hint}
            className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${tierMeta.tone}`}
          >
            {tierMeta.label}
          </span>
        )}
        {/* 같은 지역 후기 — 개인화 신호. */}
        {isLocal && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20">
            내 지역
          </span>
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
