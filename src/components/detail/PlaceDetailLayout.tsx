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

const handleTagClick = (tag: string) => {
  // Tag-based filtering on the list pages isn't wired yet — the list hooks
  // (useVenues, useCategoryData) don't read ?tag= from the query string.
  // Until that lands, surface an honest "coming soon" rather than navigating
  // to a list that visibly hasn't filtered. Routing-back-to-list when nothing
  // changes is the worst of both worlds (user clicks, sees no effect, loses
  // trust). This toast at least confirms the tag they tapped.
  toast.info(`#${tag}`, {
    description: "태그로 비슷한 업체 찾기 기능은 곧 출시될 예정이에요",
  });
};
import { FavoriteButton } from "@/components/FavoriteButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { LegacyDetail } from "@/hooks/usePlaceDetail";

interface Props {
  place: LegacyDetail;
  /** Korean category label, e.g. "웨딩홀" — for the category chip */
  categoryLabel: string;
  /** Per-category extra section rendered below the common ones */
  extraSection?: React.ReactNode;
  /** Item type for FavoriteButton (venue / studio / hanbok / etc) */
  favoriteType: "venue" | "studio" | "hanbok" | "suit" | "honeymoon" | "jewelry" | "appliance" | "invitation_venues";
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
  // USD doesn't divide by 10000 — display raw
  const isUSD = currency === "USD";
  const fmtOne = (n: number) =>
    isUSD ? `$${n.toLocaleString()}` : `${(n / 10000).toFixed(0)}만원`;
  const range = max != null && max !== min ? `${fmtOne(min)}~${fmtOne(max)}` : `${fmtOne(min)}~`;
  const suffix = unit && UNIT_SUFFIX[unit] ? UNIT_SUFFIX[unit] : "";
  return `${range}${suffix}`;
}

const PlaceDetailLayout = ({ place, categoryLabel, extraSection, favoriteType }: Props) => {
  const navigate = useNavigate();
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [advIdx, setAdvIdx] = useState(0);

  const hasContact =
    place.tel || place.website_url || place.instagram_url || place.naver_place_url ||
    place.youtube_url || place.kakao_channel_url;
  const hasLocation = place.subway_station || place.parking_location || place.parking_capacity;

  const gallery = place.image_urls.length > 0 ? place.image_urls : place.thumbnail_url ? [place.thumbnail_url] : [];

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto pb-24 relative">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-base line-clamp-1 flex-1 text-center px-2">{place.name}</h1>
          <div className="flex items-center gap-1">
            <FavoriteButton itemId={place.id} itemType={favoriteType} />
          </div>
        </div>
      </header>

      <main>
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
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-6xl">
              🏢
            </div>
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
          {/* Tags chips — clickable; routes to the category list filtered by tag */}
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

        {/* Recommended-for — "이런 분께 추천" — high consumer trust signal */}
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

        {/* Advantages carousel — only when there's real content */}
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

        {/* Price packages */}
        {place.price_packages.length > 0 && (
          <section className="px-4 pt-3 pb-2">
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
                    <p className="text-xs text-amber-700 mt-1.5 italic">⚠ {pkg.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Contact / hours / location — section only renders if at least one field exists */}
        {(hasContact || place.hours || hasLocation) && (
          <section className="px-4 pt-3 pb-2 space-y-3">
            {/* Address */}
            {place.address && (
              <Row icon={<MapPin className="w-4 h-4" />} label="주소" value={place.address}
                action={
                  <button
                    onClick={() => window.open(`https://map.kakao.com/?q=${encodeURIComponent(place.address)}`, "_blank")}
                    className="text-xs text-primary underline"
                  >지도</button>
                }
              />
            )}
            {/* Phone */}
            {place.tel && (
              <Row icon={<Phone className="w-4 h-4" />} label="전화"
                value={<a href={`tel:${place.tel}`} className="text-primary underline">{place.tel}</a>}
              />
            )}
            {/* Hours */}
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
            {/* Subway */}
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
            {/* Parking */}
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
            {/* SNS */}
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

        {/* Basic services — patrons get these regardless of package tier */}
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

        {/* Amenities — facilities present at the venue */}
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

        {/* Category-specific block (passed in by caller) */}
        {extraSection && <section className="px-4 pt-3 pb-2">{extraSection}</section>}

        {/* Pros / cons (Gemini analyzer output, optional) */}
        {(place.pros.length > 0 || place.cons.length > 0) && (
          <section className="px-4 pt-3 pb-2">
            <h3 className="font-bold text-sm mb-2">장단점 요약</h3>
            <div className="grid grid-cols-2 gap-2">
              {place.pros.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-emerald-700 mb-1">👍 좋아요</p>
                  <ul className="text-xs text-emerald-900 space-y-0.5">
                    {place.pros.slice(0, 4).map((p, i) => <li key={i}>· {p}</li>)}
                  </ul>
                </div>
              )}
              {place.cons.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-rose-700 mb-1">👎 아쉬워요</p>
                  <ul className="text-xs text-rose-900 space-y-0.5">
                    {place.cons.slice(0, 4).map((c, i) => <li key={i}>· {c}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Hidden costs / contract policy — high-trust signal */}
        {place.hidden_costs.length > 0 && (
          <section className="px-4 pt-3 pb-2">
            <h3 className="font-bold text-sm mb-2 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-amber-700">계약 전 확인</span>
            </h3>
            <ul className="text-xs text-amber-900 space-y-1 bg-amber-50 border border-amber-200 rounded-xl p-3">
              {place.hidden_costs.map((c, i) => <li key={i} className="flex gap-1.5"><span>⚠</span><span>{c}</span></li>)}
            </ul>
          </section>
        )}
        {place.contract_policy && (
          <section className="px-4 pt-3 pb-2">
            <h3 className="font-bold text-sm mb-2">계약 / 환불 정책</h3>
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl p-3 leading-relaxed">
              {place.contract_policy}
            </p>
          </section>
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
                window.location.href = `tel:${place.tel}`;
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
