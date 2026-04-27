import { useState } from "react";
import { Play, Flame } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useTipVideos, youTubeUrl, type TipVideo } from "@/hooks/useTipVideos";

// Shorts threshold: YouTube classifies up to 3 min as Shorts. We use 180s.
const SHORT_MAX_SECONDS = 180;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
type FormatKey = "all" | "short" | "long";

const CATEGORY_CHIPS: Array<{ slug: string | null; label: string }> = [
  { slug: null, label: "전체" },
  { slug: "general", label: "일반" },
  { slug: "wedding_hall", label: "웨딩홀" },
  { slug: "studio", label: "스튜디오" },
  { slug: "dress_shop", label: "드레스" },
  { slug: "makeup_shop", label: "메이크업" },
  { slug: "hanbok", label: "한복" },
  { slug: "tailor_shop", label: "예복" },
  { slug: "honeymoon", label: "허니문" },
  { slug: "appliance", label: "혼수" },
  { slug: "invitation_venue", label: "청첩장" },
];

type SortKey = "popular" | "recent";

function formatViews(n: number): string {
  if (n >= 10_000) return `${(n / 10_000).toFixed(1).replace(/\.0$/, "")}만회`;
  return `${n.toLocaleString()}회`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (days < 1) return "오늘";
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  if (days < 365) return `${Math.floor(days / 30)}개월 전`;
  return `${Math.floor(days / 365)}년 전`;
}

function HotCard({ video, rank }: { video: TipVideo; rank: number }) {
  return (
    <a
      href={youTubeUrl(video.video_id)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-shrink-0 w-[180px] active:scale-[0.97] transition-transform"
    >
      <div className="relative aspect-[9/16] bg-muted rounded-[10px] overflow-hidden">
        {video.thumbnail_url && (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
        <span className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center">
          {rank}
        </span>
        <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px]">
          {formatViews(video.view_count)}
        </div>
      </div>
      <p className="text-[12px] font-medium text-foreground leading-snug line-clamp-2 mt-1.5">
        {video.title}
      </p>
    </a>
  );
}

function GridCard({ video, wide }: { video: TipVideo; wide?: boolean }) {
  // wide=true → long-form full-row card with 16:9 thumbnail.
  // wide=false → short-form 2-col card with 9:16 portrait thumbnail.
  return (
    <a
      href={youTubeUrl(video.video_id)}
      target="_blank"
      rel="noopener noreferrer"
      className={`block bg-card rounded-[10px] overflow-hidden shadow-sm active:scale-[0.98] transition-transform ${
        wide ? "col-span-2" : ""
      }`}
    >
      <div className={`relative bg-muted overflow-hidden ${wide ? "aspect-video" : "aspect-[9/16]"}`}>
        {video.thumbnail_url && (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
        {/* Always-visible play badge (corner) so mobile users see the video affordance */}
        <div className="absolute bottom-1.5 left-1.5 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
        </div>
      </div>
      <div className="p-2">
        <p className="text-[12px] font-semibold text-foreground leading-snug line-clamp-2 min-h-[2.6em]">
          {video.title}
        </p>
        <p className="text-[10px] text-muted-foreground line-clamp-1 mt-1">
          {video.channel_name ?? ""}
        </p>
        <p className="text-[10px] text-muted-foreground/80 mt-0.5">
          조회 {formatViews(video.view_count)} · {formatDate(video.published_at)}
        </p>
      </div>
    </a>
  );
}

const Magazine = () => {
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("popular");
  const [format, setFormat] = useState<FormatKey>("all");

  // HOT row: published in last 7 days. Over-fetch (40) so the client filter
  // still has candidates when fresh content is sparse.
  const { data: hotPool, isLoading: hotLoading } = useTipVideos({
    category: category ?? undefined,
    limit: 40,
    freshOnly: false,
  });
  const sevenDaysAgo = Date.now() - SEVEN_DAYS_MS;
  const freshList = (hotPool ?? []).filter(
    (v) => v.published_at && new Date(v.published_at).getTime() >= sevenDaysAgo
  );
  // Always render HOT row: prefer last-7-days; fall back to top-by-views
  // when no fresh content (HOT header should always be present per spec).
  const hotList = (freshList.length > 0 ? freshList : (hotPool ?? [])).slice(0, 8);
  const hotIsFallback = freshList.length === 0;

  // Grid: full list filtered by category, then by format, client-sorted.
  const { data: allVideos, isLoading } = useTipVideos({
    category: category ?? undefined,
    limit: 60,
    freshOnly: false,
  });
  const isShort = (v: TipVideo) =>
    v.duration_seconds != null && v.duration_seconds <= SHORT_MAX_SECONDS;
  const formatFiltered = (allVideos ?? []).filter((v) => {
    if (format === "short") return isShort(v);
    if (format === "long") return !isShort(v);
    return true;
  });
  const gridList = [...formatFiltered].sort((a, b) => {
    if (sort === "popular") return b.view_count - a.view_count;
    const da = a.published_at ? new Date(a.published_at).getTime() : 0;
    const db = b.published_at ? new Date(b.published_at).getTime() : 0;
    return db - da;
  });

  return (
    <AppLayout activeCategoryTab="tips">
      <div className="sticky top-[112px] z-30 bg-card border-b border-border">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3">
          {CATEGORY_CHIPS.map((c) => {
            const active = category === c.slug;
            return (
              <button
                key={c.slug ?? "all"}
                onClick={() => setCategory(c.slug)}
                className={`flex-shrink-0 px-3 h-8 rounded-full text-[12px] font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

        <section className="pt-4 pb-2">
          <div className="flex items-center gap-2 px-4 mb-3">
            <Flame className="w-5 h-5 text-rose-500 fill-rose-500" />
            <h2 className="text-base font-bold text-foreground">HOT</h2>
            <span className="text-xs text-muted-foreground">
              {hotIsFallback ? "전체 인기" : "최근 7일"}
            </span>
          </div>
          {hotLoading ? (
            <div className="flex gap-2.5 overflow-x-auto scrollbar-hide px-4 pb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-[180px] aspect-[9/16] bg-muted animate-pulse rounded-[10px]"
                />
              ))}
            </div>
          ) : hotList.length > 0 ? (
            <div className="flex gap-2.5 overflow-x-auto scrollbar-hide px-4 pb-2">
              {hotList.map((v, i) => (
                <HotCard key={v.video_id} video={v} rank={i + 1} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground px-4 py-6">
              인기 영상을 모으는 중이에요.
            </p>
          )}
        </section>

        <section className="pt-3 pb-6 border-t border-border/50">
          <div className="flex items-center justify-between px-4 mb-3 gap-2 flex-wrap">
            <h2 className="text-base font-bold text-foreground">전체 꿀팁</h2>
            <div className="flex items-center gap-2">
              {/* Format filter — controls layout (long=full row 16:9, short=2-col 9:16, all=mixed) */}
              <div className="flex bg-muted rounded-full p-0.5">
                {(["all", "long", "short"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`px-2.5 h-7 rounded-full text-[11px] font-medium transition-colors ${
                      format === f
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    {f === "all" ? "전체" : f === "long" ? "롱폼" : "숏폼"}
                  </button>
                ))}
              </div>
              {/* Sort */}
              <div className="flex bg-muted rounded-full p-0.5">
                {(["popular", "recent"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSort(s)}
                    className={`px-2.5 h-7 rounded-full text-[11px] font-medium transition-colors ${
                      sort === s
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    {s === "popular" ? "인기순" : "최신순"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-2 px-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-[10px] overflow-hidden bg-card">
                  <div className="aspect-[9/16] bg-muted animate-pulse" />
                  <div className="p-2 space-y-1.5">
                    <div className="h-3 bg-muted rounded animate-pulse" />
                    <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : gridList.length > 0 ? (
            // grid-flow-row-dense lets the browser pack short cards into gaps
            // a long-form (col-span-2) card would otherwise leave behind, so the
            // mixed layout reads as [LONG]/[SHORT][SHORT] without empty cells.
            <div className="grid grid-cols-2 gap-2 px-4 grid-flow-row-dense">
              {gridList.map((v) => {
                // Layout: in 'long' format every card is wide; in 'short' none are;
                // in 'all' long-form cards take a full row, shorts pair up.
                const wide = format === "long" || (format === "all" && !isShort(v));
                return <GridCard key={v.video_id} video={v} wide={wide} />;
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">
              해당 조건에 맞는 영상이 아직 없어요.
            </p>
          )}
        </section>
    </AppLayout>
  );
};

export default Magazine;
