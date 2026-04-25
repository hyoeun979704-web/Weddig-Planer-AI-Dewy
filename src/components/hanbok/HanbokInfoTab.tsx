import { MapPin, Phone, Clock, Globe, Car, Sparkles, ChevronLeft, ChevronRight, AlertTriangle, ThumbsDown, Heart, Train } from "lucide-react";
import { useState } from "react";
import type { LegacyDetail } from "@/hooks/usePlaceDetail";

type Hanbok = LegacyDetail;

interface HanbokInfoTabProps {
  hanbok: Hanbok;
}

interface Highlight {
  id: string;
  title: string;
  description: string;
  icon: string;
}

const fmtPrice = (won: number | null | undefined): string =>
  won ? `${(won / 10000).toFixed(0)}만원` : "문의";

// Map Korean weekday → place_details.hours_<day> column
const WEEKDAYS: { key: keyof Pick<NonNullable<Hanbok["details"]>, "hours_mon" | "hours_tue" | "hours_wed" | "hours_thu" | "hours_fri" | "hours_sat" | "hours_sun">; label: string }[] = [
  { key: "hours_mon", label: "월" },
  { key: "hours_tue", label: "화" },
  { key: "hours_wed", label: "수" },
  { key: "hours_thu", label: "목" },
  { key: "hours_fri", label: "금" },
  { key: "hours_sat", label: "토" },
  { key: "hours_sun", label: "일" },
];

const buildHighlights = (d: NonNullable<Hanbok["details"]>): Highlight[] => {
  // Prefer explicit advantage_1/2/3 if curated; else derive from pros.
  const explicit: Highlight[] = [];
  if (d.advantage_1_title) explicit.push({ id: "a1", title: d.advantage_1_title, description: d.advantage_1_content ?? "", icon: "✨" });
  if (d.advantage_2_title) explicit.push({ id: "a2", title: d.advantage_2_title, description: d.advantage_2_content ?? "", icon: "💎" });
  if (d.advantage_3_title) explicit.push({ id: "a3", title: d.advantage_3_title, description: d.advantage_3_content ?? "", icon: "🌟" });
  if (explicit.length > 0) return explicit;

  const proIcons = ["✨", "💎", "🌟", "👍", "💖"];
  return (d.pros ?? []).slice(0, 5).map((p, i) => ({
    id: `p${i}`,
    title: p,
    description: "",
    icon: proIcons[i % proIcons.length],
  }));
};

const HanbokInfoTab = ({ hanbok }: HanbokInfoTabProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const d = hanbok.details;
  const card = hanbok.card;

  const highlights = d ? buildHighlights(d) : [];
  const atmosphere = d?.atmosphere ?? [];
  const cons = d?.cons ?? [];
  const hiddenCosts = d?.hidden_costs ?? [];
  const recommendedFor = d?.recommended_for ?? [];

  const handlePrev = () => setCurrentIndex((prev) => (prev === 0 ? highlights.length - 1 : prev - 1));
  const handleNext = () => setCurrentIndex((prev) => (prev === highlights.length - 1 ? 0 : prev + 1));

  const tel = d?.tel ?? null;
  const address = d?.address ?? hanbok.address;
  const naverPlaceUrl = d?.naver_place_url ?? null;
  const naverBlogUrl = d?.naver_blog_url ?? null;
  const instagramUrl = d?.instagram_url ?? null;
  const websiteUrl = d?.website_url ?? null;
  const youtubeUrl = d?.youtube_url ?? null;
  const facebookUrl = d?.facebook_url ?? null;
  const kakaoUrl = d?.kakao_channel_url ?? null;
  const snsLinks = [
    naverPlaceUrl && { label: "네이버 플레이스", url: naverPlaceUrl },
    naverBlogUrl && { label: "네이버 블로그", url: naverBlogUrl },
    instagramUrl && { label: "인스타그램", url: instagramUrl },
    websiteUrl && { label: "웹사이트", url: websiteUrl },
    youtubeUrl && { label: "유튜브", url: youtubeUrl },
    facebookUrl && { label: "페이스북", url: facebookUrl },
    kakaoUrl && { label: "카카오채널", url: kakaoUrl },
  ].filter(Boolean) as { label: string; url: string }[];

  const hanbokTypes = (card?.hanbok_types as string[] | null) ?? hanbok.hanbok_types ?? [];
  const customAvailable = card?.custom_available as boolean | null | undefined;
  const pricePerPerson = (card?.price_per_person as number | null | undefined) ?? null;

  const hoursWithValues = WEEKDAYS.map((w) => ({ ...w, value: d?.[w.key] ?? null })).filter((w) => w.value);
  const hasHours = hoursWithValues.length > 0;
  const hasParking = d && (d.parking_capacity || d.parking_location || d.parking_free_guest);
  const hasSubway = d && (d.subway_station || d.subway_line || d.walk_minutes);

  return (
    <div className="p-4 space-y-6">
      {/* Summary */}
      {d?.summary && (
        <div className="bg-muted/40 rounded-2xl p-4">
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">{d.summary}</p>
        </div>
      )}

      {/* Atmosphere chips */}
      {atmosphere.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {atmosphere.map((a, i) => (
            <span key={i} className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">#{a}</span>
          ))}
        </div>
      )}

      {/* Highlights Carousel — shown only when we have data */}
      {highlights.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            장점·이벤트
          </h3>
          <div className="relative">
            <div className="overflow-hidden rounded-2xl">
              <div className="flex transition-transform duration-300 ease-out" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
                {highlights.map((point) => (
                  <div key={point.id} className="min-w-full p-5 bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 rounded-2xl">
                    <div className="flex items-start gap-4">
                      <span className="text-3xl">{point.icon}</span>
                      <div className="flex-1">
                        <h4 className="font-bold text-foreground mb-1.5">{point.title}</h4>
                        {point.description && <p className="text-sm text-muted-foreground leading-relaxed">{point.description}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {highlights.length > 1 && (
              <>
                <button onClick={handlePrev} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-background/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={handleNext} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-background/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center">
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="flex justify-center gap-1.5 mt-3">
                  {highlights.map((_, index) => (
                    <button key={index} onClick={() => setCurrentIndex(index)} className={`w-2 h-2 rounded-full transition-colors ${index === currentIndex ? "bg-primary" : "bg-muted"}`} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Recommended for */}
      {recommendedFor.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-bold text-base flex items-center gap-2">
            <Heart className="w-4 h-4 text-primary" />
            이런 분께 추천
          </h3>
          <ul className="space-y-1.5">
            {recommendedFor.map((r, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2"><span className="text-primary">•</span>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Cons */}
      {cons.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-bold text-base flex items-center gap-2">
            <ThumbsDown className="w-4 h-4 text-muted-foreground" />
            아쉬운 점
          </h3>
          <ul className="space-y-1.5">
            {cons.map((c, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2"><span>·</span>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Hidden costs warning */}
      {hiddenCosts.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-4 space-y-2">
          <h3 className="font-bold text-sm flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4" />
            추가 비용 주의
          </h3>
          <ul className="space-y-1">
            {hiddenCosts.map((h, i) => (
              <li key={i} className="text-xs text-amber-800 dark:text-amber-200 flex gap-2"><span>·</span>{h}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-border" />

      {/* Address */}
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><MapPin className="w-5 h-5 text-primary" /></div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-0.5">주소</p>
          <p className="font-medium text-foreground">{address}</p>
          <button onClick={() => { window.open(`https://map.kakao.com/?q=${encodeURIComponent(address)}`, '_blank'); }} className="text-primary text-sm mt-1 underline underline-offset-2">지도보기</button>
        </div>
      </div>

      {/* Subway */}
      {hasSubway && (
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Train className="w-5 h-5 text-primary" /></div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-0.5">지하철</p>
            <p className="font-medium text-foreground">
              {[d?.subway_line, d?.subway_station].filter(Boolean).join(" ")}
              {d?.walk_minutes ? ` · 도보 ${d.walk_minutes}분` : ""}
            </p>
          </div>
        </div>
      )}

      {/* Phone */}
      {tel && (
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Phone className="w-5 h-5 text-primary" /></div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-0.5">전화번호</p>
            <a href={`tel:${tel}`} className="font-medium text-foreground underline underline-offset-2">{tel}</a>
          </div>
        </div>
      )}

      {/* SNS */}
      {snsLinks.length > 0 && (
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Globe className="w-5 h-5 text-primary" /></div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-0.5">바로가기</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {snsLinks.map((s) => (
                <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="px-2.5 py-1 bg-muted text-foreground text-xs rounded-full hover:bg-muted/70">
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Operating Hours */}
      {hasHours && (
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Clock className="w-5 h-5 text-primary" /></div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-1">영업시간</p>
            <ul className="text-sm space-y-0.5">
              {hoursWithValues.map((h) => (
                <li key={h.key} className="flex gap-3"><span className="text-muted-foreground w-6">{h.label}</span><span className="font-medium text-foreground">{h.value}</span></li>
              ))}
            </ul>
            {d?.closed_days && <p className="text-xs text-muted-foreground mt-1">휴무: {d.closed_days}</p>}
          </div>
        </div>
      )}

      {/* Parking */}
      {hasParking && (
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Car className="w-5 h-5 text-primary" /></div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-0.5">주차정보</p>
            <p className="font-medium text-foreground">
              {d?.parking_location ?? ""}
              {d?.parking_capacity ? ` · ${d.parking_capacity}대` : ""}
            </p>
            {d?.parking_free_guest && <p className="text-xs text-muted-foreground mt-0.5">하객: {d.parking_free_guest}</p>}
            {d?.parking_free_parents && <p className="text-xs text-muted-foreground">혼주: {d.parking_free_parents}</p>}
          </div>
        </div>
      )}

      <div className="border-t border-border" />

      {/* Hanbok types + Pricing */}
      <div className="space-y-3">
        <h3 className="font-bold text-lg">종류·가격</h3>
        {hanbokTypes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {hanbokTypes.map((t, i) => (
              <span key={i} className="px-3 py-1.5 bg-muted text-foreground text-sm rounded-full">{t}</span>
            ))}
            {customAvailable === true && (
              <span className="px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-full">맞춤제작 가능</span>
            )}
          </div>
        )}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex justify-between items-center p-4">
            <span className="text-muted-foreground text-sm">1인 평균가</span>
            <span className="font-bold text-primary">{fmtPrice(pricePerPerson)}</span>
          </div>
        </div>
        {pricePerPerson == null && (
          <p className="text-xs text-muted-foreground">정확한 가격은 업체에 직접 문의해주세요.</p>
        )}
      </div>
    </div>
  );
};

export default HanbokInfoTab;
