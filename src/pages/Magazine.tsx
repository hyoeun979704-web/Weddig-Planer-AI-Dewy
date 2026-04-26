import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Play, Flame } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useTipVideos, youTubeUrl, type TipVideo } from "@/hooks/useTipVideos";

// Shorts threshold: YouTube classifies up to 3 min as Shorts. We use 180s.
const SHORT_MAX_SECONDS = 180;
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
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="w-4 h-4 text-black fill-black ml-0.5" />
          </div>
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
  const navigate = useNavigate();
  const location = useLocation();
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("popular");

  // HOT row: published in last 7 days. Over-fetch (40) so the client filter
  // still has candidates when fresh content is sparse.
  const { data: hotPool } = useTipVideos({
    category: category ?? undefined,
    limit: 40,
    freshOnly: false,
  });
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const hotList = (hotPool ?? [])
    .filter((v) => v.published_at && new Date(v.published_at).getTime() >= sevenDaysAgo)
    .slice(0, 8);

  // Grid: full list filtered by category, client-sorted by user choice.
  const { data: allVideos, isLoading } = useTipVideos({
    category: category ?? undefined,
    limit: 60,
    freshOnly: false,
  });
  const gridList = [...(allVideos ?? [])].sort((a, b) => {
    if (sort === "popular") return b.view_count - a.view_count;
    const da = a.published_at ? new Date(a.published_at).getTime() : 0;
    const db = b.published_at ? new Date(b.published_at).getTime() : 0;
    return db - da;
  });

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto pb-20">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center px-4 h-14">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center -ml-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold flex-1 text-center -mr-8">꿀팁</h1>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-3">
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
      </header>

      <main>
        {hotList.length > 0 && (
          <section className="pt-4 pb-2">
            <div className="flex items-center gap-2 px-4 mb-3">
              <Flame className="w-5 h-5 text-rose-500 fill-rose-500" />
              <h2 className="text-base font-bold text-foreground">HOT</h2>
              <span className="text-xs text-muted-foreground">최근 7일</span>
            </div>
            <div className="flex gap-2.5 overflow-x-auto scrollbar-hide px-4 pb-2">
              {hotList.map((v, i) => (
                <HotCard key={v.video_id} video={v} rank={i + 1} />
              ))}
            </div>
          </section>
        )}

        <section className="pt-3 pb-6 border-t border-border/50">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="text-base font-bold text-foreground">전체 꿀팁</h2>
            <div className="flex bg-muted rounded-full p-0.5">
              {(["popular", "recent"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={`px-3 h-7 rounded-full text-[11px] font-medium transition-colors ${
                    sort === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  {s === "popular" ? "인기순" : "최신순"}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-2 px-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-[10px] overflow-hidden bg-card">
                  <div className="aspect-video bg-muted animate-pulse" />
                  <div className="p-2 space-y-1.5">
                    <div className="h-3 bg-muted rounded animate-pulse" />
                    <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : gridList.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 px-4">
              {gridList.map((v) => (
                <GridCard key={v.video_id} video={v} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">
              해당 카테고리의 영상이 아직 없어요.
            </p>
          )}
        </section>
      </main>

      <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Magazine;
