import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Flame, Search, Sparkles, X } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import HomeHeader from "@/components/home/HomeHeader";
import CategoryTabBar, { useCategoryTabNavigation } from "@/components/home/CategoryTabBar";
import { Input } from "@/components/ui/input";
import { TipVideoCard, TipVideoCardSkeleton } from "@/components/TipVideoCard";
import { useTipVideos, type TipVideo } from "@/hooks/useTipVideos";
import { useWeddingProfile } from "@/hooks/useWeddingProfile";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { rankTipVideosForUser, buildCurationFactors } from "@/lib/tipCuration";
import EmptyState from "@/components/EmptyState";
import { emptyCopy } from "@/lib/emptyCopy";

// Shorts threshold: YouTube classifies up to 3 min as Shorts. We use 180s.
const SHORT_MAX_SECONDS = 180;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const HOT_CARD_WIDTH = 140;
type FormatKey = "all" | "short" | "long";

// Chip order roughly follows the wedding-prep timeline: research → vendor
// shopping → ceremony day → post-wedding. "전체"/"일반" stay at the head
// as catch-alls. Categories the user opted out of are hidden at render
// time (visibleChips below).
const CATEGORY_CHIPS: Array<{ slug: string | null; label: string }> = [
  { slug: null, label: "전체" },
  { slug: "general", label: "일반" },
  { slug: "family_meeting", label: "상견례" },
  { slug: "wedding_hall", label: "웨딩홀" },
  { slug: "studio", label: "스튜디오" },
  { slug: "dress_shop", label: "드레스" },
  { slug: "makeup_shop", label: "메이크업" },
  { slug: "hanbok", label: "한복" },
  { slug: "tailor_shop", label: "예복" },
  { slug: "wedding_gifts", label: "예단·예물" },
  { slug: "newlywed_home", label: "신혼집" },
  { slug: "appliance", label: "혼수" },
  { slug: "invitation_venue", label: "청첩장" },
  { slug: "bridal_care", label: "신부 관리" },
  { slug: "ceremony", label: "본식 진행" },
  { slug: "legal_paperwork", label: "혼인신고" },
  { slug: "honeymoon", label: "허니문" },
];

type SortKey = "curated" | "popular" | "recent";

const Tips = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const profile = useWeddingProfile();
  const curationFactors = buildCurationFactors(profile);
  // Hide chips for categories the user opted out of (small/self/custom
  // weddings). "전체" is always available so the user can still browse
  // the full ranked list.
  const visibleChips = useMemo(() => {
    const excluded = new Set(profile.excludedCategories);
    if (excluded.size === 0) return CATEGORY_CHIPS;
    return CATEGORY_CHIPS.filter((c) => c.slug === null || !excluded.has(c.slug));
  }, [profile.excludedCategories]);
  const [category, setCategory] = useState<string | null>(() => {
    // Deep-link entry from MySchedule (and other pages that want to
    // surface tips for a specific topic). Read once on mount so the chip
    // honors the URL when the user lands here, then let normal click
    // interactions take over — we deliberately don't keep state and URL
    // in sync afterwards. If the slug is unknown, fall back to "전체".
    const params = new URLSearchParams(location.search);
    const slug = params.get("category");
    if (!slug) return null;
    return CATEGORY_CHIPS.some((c) => c.slug === slug) ? slug : null;
  });
  // If the user changes their style/exclusions while a now-hidden category
  // is selected, fall back to "전체" so they don't end up on a dead tab.
  useEffect(() => {
    if (category && !visibleChips.some((c) => c.slug === category)) {
      setCategory(null);
    }
  }, [visibleChips, category]);

  // Free-text search. Two pieces of state:
  //   - `uiSearchMode` flips the moment the user starts typing (chips and
  //     HOT collapse, header switches to "검색 결과") so the interface
  //     responds immediately.
  //   - `debouncedQuery` lags 250ms behind so we don't fire a Supabase
  //     request for every keystroke. While the two are out of sync the
  //     grid shows a loading skeleton (see `isGridLoading` below).
  // Both bypass the chip filter, exclusion filter, HOT row, and curation
  // so the user can find ANY video by keyword.
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const trimmedInput = searchInput.trim();
  useEffect(() => {
    // Skip the debounce when clearing — otherwise debouncedQuery stays
    // stale for 250ms after the user empties the input, which makes the
    // grid render the previous search results under the default-mode UI.
    if (trimmedInput === "") {
      setDebouncedQuery("");
      return;
    }
    const t = setTimeout(() => setDebouncedQuery(trimmedInput), 250);
    return () => clearTimeout(t);
  }, [trimmedInput]);
  const uiSearchMode = trimmedInput.length > 0;
  const isSearching = debouncedQuery.length > 0;
  const isDebouncing = uiSearchMode && trimmedInput !== debouncedQuery;
  // Default to "추천순". When user has no personalization signal yet,
  // rankTipVideosForUser falls back to the popularity order — same result as
  // "인기순" — so this is safe even for logged-out / fresh users.
  const [sort, setSort] = useState<SortKey>("curated");
  const [format, setFormat] = useState<FormatKey>("all");

  // 스몰웨딩 사용자가 진입했을 때 1회 한정으로 '청첩장' 칩을 자동 선택해서
  // 소규모 모임 관련 콘텐츠를 바로 보여줌. 사용자가 다른 칩으로 옮기면 유지.
  // 단, invitation_venue가 사용자의 excluded_categories에 들어가 chip 자체가
  // 숨겨졌다면(default small preset 케이스) 자동 선택을 건너뜀 — 위쪽 reset
  // useEffect가 즉시 풀어버려서 결국 사용자에겐 변화로 보이지 않기 때문.
  const { weddingSettings, isLoading: scheduleLoading } = useWeddingSchedule();
  const didInitCategoryRef = useRef(false);
  useEffect(() => {
    if (didInitCategoryRef.current || scheduleLoading) return;
    didInitCategoryRef.current = true;
    if (
      weddingSettings.wedding_style === "small" &&
      visibleChips.some((c) => c.slug === "invitation_venue")
    ) {
      setCategory("invitation_venue");
    }
  }, [scheduleLoading, weddingSettings.wedding_style, visibleChips]);

  // HOT row: published in last 7 days. Over-fetch (40) so the client filter
  // still has candidates when fresh content is sparse. Disabled the moment
  // the user starts typing — the section is hidden in search mode and we
  // shouldn't pay for a request whose result will never render.
  const { data: hotPool, isLoading: hotLoading } = useTipVideos({
    category: category ?? undefined,
    limit: 40,
    freshOnly: false,
    enabled: !uiSearchMode,
  });
  // Drop videos whose primary category the user opted out of — keeps the
  // HOT row and grid consistent with the chip set (an excluded chip is
  // hidden, so its videos shouldn't sneak in via "전체" or HOT either).
  const excludedSet = useMemo(
    () => new Set(profile.excludedCategories),
    [profile.excludedCategories]
  );
  const isExcludedByPrimary = (v: TipVideo) => {
    if (excludedSet.size === 0) return false;
    const primary = v.categories[0];
    return primary != null && excludedSet.has(primary);
  };

  // "7 days ago" anchors to the moment the page mounted — recomputing it
  // every render would make `freshList` a fresh reference each time and
  // defeat downstream memoization.
  const sevenDaysAgo = useMemo(() => Date.now() - SEVEN_DAYS_MS, []);
  const visibleHotPool = (hotPool ?? []).filter((v) => !isExcludedByPrimary(v));
  const freshList = visibleHotPool.filter(
    (v) => v.published_at && new Date(v.published_at).getTime() >= sevenDaysAgo
  );
  // Always render HOT row: prefer last-7-days; fall back to top-by-views
  // when no fresh content (HOT header should always be present per spec).
  const hotList = (freshList.length > 0 ? freshList : visibleHotPool).slice(0, 8);
  const hotIsFallback = freshList.length === 0;

  // Grid: full list filtered by category (or search), then by format,
  // client-sorted. Search mode passes `searchQuery` and ignores `category`.
  // While the user is mid-typing (uiSearchMode true but debouncedQuery
  // still stale) we disable the non-search query so we don't briefly show
  // the default-mode list under a "검색 결과" header.
  const { data: allVideos, isLoading } = useTipVideos({
    category: isSearching ? undefined : (category ?? undefined),
    limit: 60,
    freshOnly: false,
    searchQuery: isSearching ? debouncedQuery : undefined,
    enabled: !uiSearchMode || isSearching,
  });
  const isShort = (v: TipVideo) =>
    v.duration_seconds != null && v.duration_seconds <= SHORT_MAX_SECONDS;
  // Exclusions and format filter both bypassed in search mode — the user
  // explicitly asked for a global view.
  const formatFiltered = (allVideos ?? [])
    .filter((v) => uiSearchMode || !isExcludedByPrimary(v))
    .filter((v) => {
      if (uiSearchMode) return true;
      if (format === "short") return isShort(v);
      if (format === "long") return !isShort(v);
      return true;
    });
  const gridList = (() => {
    // Search mode: keep the server's view_count desc order — relevance
    // ranking would require a smarter scorer than our personalization one.
    if (uiSearchMode) return formatFiltered;
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
  // Show the skeleton both during the actual network fetch and while the
  // debounce timer is still running — otherwise the grid would briefly
  // show stale results during the 250ms wait.
  const isGridLoading = isLoading || isDebouncing;
  const showCuratedBadge = !uiSearchMode && sort === "curated" && curationFactors.hasSignal;

  const handleCategoryTabChange = useCategoryTabNavigation();

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto pb-20">
      <HomeHeader />
      <CategoryTabBar activeTab="tips" onTabChange={handleCategoryTabChange} />

      <div className="px-4 pt-3 pb-2 border-b border-border">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            role="searchbox"
            inputMode="search"
            enterKeyHint="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="영상 제목·채널 검색"
            className="pl-9 pr-10 h-9 text-sm"
            aria-label="꿀팁 영상 검색 (숨긴 카테고리 포함 전체 검색)"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              aria-label="검색어 지우기"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {!uiSearchMode && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3 border-b border-border">
          {visibleChips.map((c) => {
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
      )}

      <main>
        {!uiSearchMode && (
          <section className="pt-4 pb-2 bg-[hsl(var(--pink-100))]">
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
        )}

        <section className={`pt-3 pb-6 ${uiSearchMode ? "" : "border-t border-border/50"}`}>
          <div className="flex items-center justify-between px-4 mb-3 gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 min-w-0">
              <h2 className="text-base font-bold text-foreground truncate max-w-[220px]">
                {uiSearchMode
                  ? `'${isDebouncing ? trimmedInput : debouncedQuery}' 검색 결과`
                  : "전체 꿀팁"}
              </h2>
              {uiSearchMode ? (
                !isGridLoading && gridList.length > 0 && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {gridList.length}건 · 인기순
                  </span>
                )
              ) : (
                showCuratedBadge && (
                  <span className="inline-flex items-center gap-1 px-2 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                    <Sparkles className="w-2.5 h-2.5" />맞춤
                  </span>
                )
              )}
            </div>
            {!uiSearchMode && (
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
            )}
          </div>

          {isGridLoading ? (
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
          ) : uiSearchMode ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              '{debouncedQuery}'에 맞는 영상이 없어요.<br />
              다른 키워드로 검색해보세요.
            </p>
          ) : category ? (
            // Category chip selected but the filtered list is empty —
            // surface popular videos from the visible pool as a fallback
            // so the screen isn't a dead end. The pool is already
            // exclusion-filtered, so we don't need to re-check here.
            <div className="px-4 py-8">
              <div className="text-center mb-6">
                <p className="text-sm text-foreground mb-1">
                  '{CATEGORY_CHIPS.find((c) => c.slug === category)?.label ?? "이 카테고리"}' 영상이 아직 부족해요.
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  대신 인기 영상을 둘러보세요.
                </p>
                <button
                  onClick={() => setCategory(null)}
                  className="text-xs font-semibold text-primary px-3 py-1.5 rounded-full bg-primary/10"
                >
                  전체 영상 보기
                </button>
              </div>
              {visibleHotPool.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {visibleHotPool.slice(0, 4).map((v) => (
                    <TipVideoCard key={v.video_id} video={v} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <EmptyState {...emptyCopy.tipsVideos} variant="inline" />
          )}
        </section>
      </main>

      <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Tips;
