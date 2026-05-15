import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Flame, Sparkles } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { TipVideoCard, TipVideoCardSkeleton } from "@/components/TipVideoCard";
import { useTipVideos, type TipVideo } from "@/hooks/useTipVideos";
import { useWeddingProfile } from "@/hooks/useWeddingProfile";
import { rankTipVideosForUser, buildCurationFactors } from "@/lib/tipCuration";

// Shorts threshold: YouTube classifies up to 3 min as Shorts. We use 180s.
const SHORT_MAX_SECONDS = 180;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const HOT_CARD_WIDTH = 140;
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

type SortKey = "curated" | "popular" | "recent";

const Tips = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const profile = useWeddingProfile();
  const curationFactors = buildCurationFactors(profile);
  const [category, setCategory] = useState<string | null>(null);
  // Default to "추천순". When user has no personalization signal yet,
  // rankTipVideosForUser falls back to the popularity order — same result as
  // "인기순" — so this is safe even for logged-out / fresh users.
  const [sort, setSort] = useState<SortKey>("curated");
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
  const gridList = (() => {
    if (sort === "curated") {
      return rankTipVideosForUser(formatFiltered, profile);
    }
    return [...formatFiltered].sort((a, b) => {
      if (sort === "popular") return b.view_count - a.view_count;
      const da = a.published_at ? new Date(a.published_at).getTime() : 0;
      const db = b.published_at ? new Date(b.published_at).getTime() : 0;
      return db - da;
    });
  })();
  const showCuratedBadge = sort === "curated" && curationFactors.hasSignal;

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
                <TipVideoCardSkeleton key={i} width={HOT_CARD_WIDTH} />
              ))}
            </div>
          ) : hotList.length > 0 ? (
            <div className="flex gap-2.5 overflow-x-auto scrollbar-hide px-4 pb-2">
              {hotList.map((v, i) => (
                <TipVideoCard
                  key={v.video_id}
                  video={v}
                  width={HOT_CARD_WIDTH}
                  rank={i + 1}
                />
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
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-bold text-foreground">전체 꿀팁</h2>
              {showCuratedBadge && (
                <span className="inline-flex items-center gap-1 px-2 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                  <Sparkles className="w-2.5 h-2.5" />맞춤
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Format filter (long/short/all) */}
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
                {(["curated", "popular", "recent"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSort(s)}
                    className={`px-2.5 h-7 rounded-full text-[11px] font-medium transition-colors ${
                      sort === s
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    {s === "curated" ? "추천순" : s === "popular" ? "인기순" : "최신순"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-2 px-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <TipVideoCardSkeleton key={i} />
              ))}
            </div>
          ) : gridList.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 px-4">
              {gridList.map((v) => (
                <TipVideoCard key={v.video_id} video={v} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">
              해당 조건에 맞는 영상이 아직 없어요.
            </p>
          )}
        </section>
      </main>

      <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Tips;
