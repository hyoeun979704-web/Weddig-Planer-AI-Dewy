import { useEffect, useState } from "react";
import LoginRequiredOverlay from "@/components/LoginRequiredOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import TutorialOverlay from "@/components/TutorialOverlay";
import { usePageTutorial } from "@/hooks/usePageTutorial";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Flame, Image as ImageIcon, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import BottomNav from "@/components/BottomNav";
import HomeHeader from "@/components/home/HomeHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import CommunitySearchOverlay from "@/components/community/CommunitySearchOverlay";
import EmptyState from "@/components/EmptyState";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import type { WeddingStyle } from "@/lib/weddingStyle";
import arrowLeftIcon from "@/assets/icons/arrow-left.svg";
import noteIcon from "@/assets/community/note.svg";
import searchBoxIcon from "@/assets/community/search-box.svg";
import editIcon from "@/assets/community/edit.svg";
import heartFilledIcon from "@/assets/community/heart-filled.svg";

type PostWeddingStyle = "general" | "small" | "self";

interface Post {
  id: string;
  category: string;
  title: string;
  content: string;
  has_image: boolean;
  views: number;
  created_at: string;
  likes_count: number;
  comments_count: number;
  wedding_style: PostWeddingStyle | null;
}

const categories = ["전체", "웨딩홀", "스드메", "허니문", "혼수", "자유"];

type StyleFilter = "all" | PostWeddingStyle;

const STYLE_FILTERS: { key: StyleFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "general", label: "일반 결혼식" },
  { key: "small", label: "스몰웨딩" },
  { key: "self", label: "셀프웨딩" },
];

const STYLE_BADGE: Record<PostWeddingStyle, { label: string; classes: string }> = {
  general: { label: "일반", classes: "bg-blue-100 text-blue-700" },
  small: { label: "스몰", classes: "bg-emerald-100 text-emerald-700" },
  self: { label: "셀프", classes: "bg-amber-100 text-amber-700" },
};

const EMPTY_STATES: Record<StyleFilter, { title: string; cta: string }> = {
  all: {
    title: "아직 게시글이 없어요.",
    cta: "첫 번째 글을 작성해 다른 부부와 이야기 나눠보세요.",
  },
  general: {
    title: "일반 결혼식 글이 아직 없어요.",
    cta: "웨딩홀·스드메 후기를 공유하고 첫 글을 남겨보세요.",
  },
  small: {
    title: "스몰웨딩 글이 아직 없어요.",
    cta: "하우스웨딩·레스토랑 후기 등 작은 결혼식 노하우를 나눠주세요.",
  },
  self: {
    title: "셀프웨딩 글이 아직 없어요.",
    cta: "셀프 촬영, 부케 DIY, 직접 만든 청첩장 이야기를 남겨보세요.",
  },
};

type SortKey = "latest" | "popular" | "comments";

// 인기글 트렌딩 점수: 참여(댓글)와 호응(좋아요), 최근성을 함께 고려.
// 최근 7일 글에는 부스트, 그 외에는 시간에 따라 완만하게 감쇠.
const trendingScore = (post: Post) => {
  const ageHours = (Date.now() - new Date(post.created_at).getTime()) / 36e5;
  const recency = ageHours < 24 ? 8 : ageHours < 72 ? 4 : ageHours < 168 ? 2 : 0;
  return post.likes_count * 2 + post.comments_count * 3 + recency;
};

const isHotPost = (post: Post) => {
  const ageHours = (Date.now() - new Date(post.created_at).getTime()) / 36e5;
  return ageHours <= 168 && post.likes_count + post.comments_count >= 3;
};

const Community = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { weddingSettings } = useWeddingSchedule();
  const myStyle: WeddingStyle | null = weddingSettings.wedding_style;
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [styleFilter, setStyleFilter] = useState<StyleFilter>("all");
  const [styleAutoApplied, setStyleAutoApplied] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("latest");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const tutorial = usePageTutorial("community");

  // 사용자의 결혼 유형이 로드되면 첫 1회만 같은 유형을 기본 필터로 적용.
  // 이후 사용자가 직접 바꾸면 자동 적용을 멈춰서 의도를 덮어쓰지 않도록 함.
  // sessionStorage 가드로 같은 세션에선 안내 토스트가 중복 노출되지 않도록.
  useEffect(() => {
    if (styleAutoApplied) return;
    if (!myStyle || myStyle === "custom") return;
    setStyleFilter(myStyle);
    setStyleAutoApplied(true);

    const NOTICE_KEY = "dewy:community:auto-style-notice";
    if (typeof window !== "undefined" && sessionStorage.getItem(NOTICE_KEY) !== "1") {
      const label =
        myStyle === "general" ? "일반 결혼식"
        : myStyle === "small" ? "스몰웨딩"
        : "셀프웨딩";
      toast(`${label} 글로 자동 필터링했어요`, {
        description: "상단 필터 버튼으로 다른 스타일 글도 볼 수 있어요.",
        duration: 4000,
      });
      sessionStorage.setItem(NOTICE_KEY, "1");
    }
  }, [myStyle, styleAutoApplied]);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["community-posts"],
    queryFn: async () => {
      const { data: postsData, error: postsError } = await supabase
        .from("community_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;

      const postsWithCounts = await Promise.all(
        (postsData || []).map(async (post) => {
          const [likesResult, commentsResult] = await Promise.all([
            supabase
              .from("community_likes")
              .select("*", { count: "exact", head: true })
              .eq("post_id", post.id),
            supabase
              .from("community_comments")
              .select("*", { count: "exact", head: true })
              .eq("post_id", post.id),
          ]);

          return {
            ...post,
            likes_count: likesResult.count || 0,
            comments_count: commentsResult.count || 0,
          };
        })
      );

      return postsWithCounts as Post[];
    },
  });

  // 스타일 필터: 선택된 유형과 일치하는 글 + 유형 미지정(NULL) 글을 함께 노출.
  // NULL = "모든 부부 대상" 글이므로 어떤 필터에서도 가려져선 안 됨 (작성 UI 약속).
  const matchesStyle = (post: Post, filter: StyleFilter) =>
    filter === "all" || post.wedding_style === filter || post.wedding_style === null;

  // 콜드스타트 가드: 자동 적용된 스타일 필터에서 결과가 0개면 안전하게 전체로 폴백.
  // 사용자가 직접 칩을 누른 경우(수동)에는 폴백하지 않음 — 의도 존중.
  const matchedForSelectedStyle = posts.filter((p) => matchesStyle(p, styleFilter));
  const isColdStartFallback =
    styleAutoApplied &&
    styleFilter !== "all" &&
    posts.length > 0 &&
    matchedForSelectedStyle.length === 0;
  const effectiveStyleFilter: StyleFilter = isColdStartFallback ? "all" : styleFilter;

  const styleFiltered = posts.filter((p) => matchesStyle(p, effectiveStyleFilter));

  const trendingPosts = [...styleFiltered]
    .sort((a, b) => trendingScore(b) - trendingScore(a))
    .slice(0, 5);

  const filteredPosts =
    selectedCategory === "전체"
      ? styleFiltered
      : styleFiltered.filter((post) => post.category === selectedCategory);

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sortBy === "popular") return trendingScore(b) - trendingScore(a);
    if (sortBy === "comments") return b.comments_count - a.comments_count;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleTabChange = (href: string) => navigate(href);
  const handlePostClick = (postId: string) => navigate(`/community/${postId}`);
  const handleWriteClick = () => navigate("/community/write");

  const getPreview = (content: string) =>
    content.length > 40 ? content.slice(0, 40) + "..." : content;

  const formatRelative = (dateString: string) =>
    formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ko })
      .replace("약 ", "");

  const renderStyleBadge = (style: PostWeddingStyle | null) => {
    if (!style) return null;
    const { label, classes } = STYLE_BADGE[style];
    return (
      <span className={`px-2 py-0.5 rounded-full text-caption font-semibold ${classes}`}>
        {label}
      </span>
    );
  };

  const renderPostCard = (post: Post) => (
    <button
      key={post.id}
      onClick={() => handlePostClick(post.id)}
      className="w-full text-left bg-white rounded-2xl px-5 pt-4 pb-4 shadow-[var(--shadow-card)] flex flex-col"
    >
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="px-2.5 py-0.5 rounded-full bg-muted text-caption font-medium text-muted-foreground">
          {post.category}
        </span>
        {renderStyleBadge(post.wedding_style)}
        {isHotPost(post) && (
          <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 text-caption font-semibold">
            <Flame className="w-3 h-3" /> HOT
          </span>
        )}
        {post.has_image && (
          <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </div>
      <h3 className="mt-2 text-title font-bold text-foreground line-clamp-1">
        {post.title}
      </h3>
      <p className="mt-0.5 text-body text-muted-foreground line-clamp-1">
        {getPreview(post.content)}
      </p>
      <div className="mt-5 flex items-center justify-between text-caption text-muted-foreground">
        <span>{formatRelative(post.created_at)} · 조회 {post.views}</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <MessageSquare className="w-[13px] h-[13px]" />
            <span>{post.comments_count}</span>
          </span>
          <span className="flex items-center gap-1">
            <span>{post.likes_count}</span>
            <img src={heartFilledIcon} alt="" className="w-[15px] h-[14px]" />
          </span>
        </span>
      </div>
    </button>
  );

  return (
    <div className="min-h-screen bg-[hsl(var(--pink-50))] max-w-[430px] mx-auto relative">
      {!user && (
        <LoginRequiredOverlay
          message="다른 예비부부들의 생생한 후기를 확인하세요"
          features={["실시간 후기", "웨딩 꿀팁", "업체 추천"]}
        />
      )}

      <CommunitySearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      <HomeHeader />

      <header
        data-tutorial="community-header"
        className="sticky top-14 z-30 bg-card border-b border-border"
      >
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              aria-label="뒤로가기"
            >
              <img src={arrowLeftIcon} alt="" className="w-[15px] h-[15px]" />
            </button>
            <h1 className="text-title font-bold text-foreground">커뮤니티</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate("/community/bookmarks")}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              aria-label="북마크"
            >
              <img src={noteIcon} alt="" className="w-[19px] h-[19px]" />
            </button>
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              aria-label="검색"
            >
              <img src={searchBoxIcon} alt="" className="w-[19px] h-[19px]" />
            </button>
            <button
              data-tutorial="community-write"
              onClick={handleWriteClick}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              aria-label="글쓰기"
            >
              <img src={editIcon} alt="" className="w-[21px] h-[21px]" />
            </button>
          </div>
        </div>
      </header>

      <main className="pb-24">
        <div className="px-4 pt-3 pb-1 bg-card">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center gap-2 px-4 h-10 rounded-full bg-card border border-border text-left hover:bg-muted/40 transition-colors"
            aria-label="게시글 검색"
          >
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-body text-muted-foreground">
              게시글 제목·내용 검색
            </span>
          </button>
        </div>

        <div className="flex overflow-x-auto scrollbar-hide gap-2 px-4 pt-3 pb-2 bg-[hsl(var(--pink-50))]">
          {STYLE_FILTERS.map((filter) => {
            const isActive = styleFilter === filter.key;
            const isMine =
              filter.key !== "all" && myStyle && myStyle === filter.key;
            return (
              <button
                key={filter.key}
                onClick={() => {
                  setStyleFilter(filter.key);
                  setStyleAutoApplied(true);
                }}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-body font-semibold transition-colors flex items-center gap-1 ${
                  isActive
                    ? "bg-foreground text-background"
                    : "bg-muted/60 text-muted-foreground"
                }`}
              >
                {filter.label}
                {isMine && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                      isActive ? "bg-background/20" : "bg-primary/15 text-primary"
                    }`}
                  >
                    내 스타일
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div
          data-tutorial="community-categories"
          className="flex overflow-x-auto scrollbar-hide gap-2 px-4 pt-1 pb-3 bg-[hsl(var(--pink-50))]"
        >
          {categories.map((category) => {
            const isActive = selectedCategory === category;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {isColdStartFallback && (
          <div className="mx-4 mt-2 mb-1 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-caption text-amber-800 leading-snug">
            {STYLE_FILTERS.find((f) => f.key === styleFilter)?.label} 글이 아직 없어 전체 게시글을 함께 보여드려요.
            글이 쌓이면 자동으로 필터링해드릴게요.
          </div>
        )}

        <section className="bg-[hsl(var(--pink-100))] px-4 pt-5 pb-6">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-title font-bold text-foreground">
              오늘의 수다
            </h2>
            <span className="text-caption text-muted-foreground">
              {effectiveStyleFilter === "all"
                ? "전체"
                : STYLE_FILTERS.find((f) => f.key === effectiveStyleFilter)?.label}
              {" "}· 핫토픽
            </span>
          </div>
          {isLoading ? (
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
              {[1, 2].map((i) => (
                <Skeleton
                  key={i}
                  className="flex-shrink-0 w-[260px] h-[170px] rounded-2xl"
                />
              ))}
            </div>
          ) : trendingPosts.length === 0 ? (
            <EmptyState emoji="" title="아직 인기 게시글이 없어요" variant="inline" />
          ) : (
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
              {trendingPosts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => handlePostClick(post.id)}
                  className="flex-shrink-0 w-[260px] text-left bg-white rounded-2xl px-5 pt-4 pb-4 shadow-[var(--shadow-card)] flex flex-col"
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-muted text-caption font-medium text-muted-foreground">
                      {post.category}
                    </span>
                    {renderStyleBadge(post.wedding_style)}
                    {isHotPost(post) && (
                      <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 text-caption font-semibold">
                        <Flame className="w-3 h-3" /> HOT
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-title font-bold text-foreground line-clamp-1">
                    {post.title}
                  </h3>
                  <p className="mt-0.5 text-body text-muted-foreground line-clamp-1">
                    {getPreview(post.content)}
                  </p>
                  <div className="mt-6 flex items-center justify-between text-caption text-muted-foreground">
                    <span>{formatRelative(post.created_at)}</span>
                    <span className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-[13px] h-[13px]" />
                        {post.comments_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <span>{post.likes_count}</span>
                        <img src={heartFilledIcon} alt="" className="w-[15px] h-[14px]" />
                      </span>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="px-4 pt-5 pb-3 flex items-baseline gap-4">
          <button
            onClick={() => setSortBy("latest")}
            className={`text-body transition-colors ${
              sortBy === "latest"
                ? "font-bold text-foreground"
                : "font-medium text-muted-foreground"
            }`}
          >
            최신순
          </button>
          <button
            onClick={() => setSortBy("popular")}
            className={`text-body transition-colors ${
              sortBy === "popular"
                ? "font-bold text-foreground"
                : "font-medium text-muted-foreground"
            }`}
          >
            인기순
          </button>
          <button
            onClick={() => setSortBy("comments")}
            className={`text-body transition-colors ${
              sortBy === "comments"
                ? "font-bold text-foreground"
                : "font-medium text-muted-foreground"
            }`}
          >
            댓글많은순
          </button>
        </div>

        <div className="px-4 pb-6 space-y-3">
          {isLoading ? (
            [1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[120px] rounded-2xl" />
            ))
          ) : sortedPosts.length === 0 ? (
            <div className="py-12 px-6 text-center bg-white rounded-2xl shadow-[var(--shadow-card)]">
              <p className="text-foreground text-sm font-semibold mb-1">
                {selectedCategory !== "전체"
                  ? `'${selectedCategory}' 글이 아직 없어요.`
                  : EMPTY_STATES[effectiveStyleFilter].title}
              </p>
              <p className="text-muted-foreground text-xs mb-4 leading-relaxed">
                {selectedCategory !== "전체"
                  ? `다른 카테고리로 둘러보거나 첫 글을 작성해보세요.`
                  : EMPTY_STATES[effectiveStyleFilter].cta}
              </p>
              <div className="flex items-center justify-center gap-2">
                {selectedCategory !== "전체" && (
                  <button
                    onClick={() => setSelectedCategory("전체")}
                    className="px-4 py-2 rounded-full bg-muted text-foreground text-xs font-semibold"
                  >
                    전체 카테고리 보기
                  </button>
                )}
                <button
                  onClick={handleWriteClick}
                  className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold"
                >
                  글 작성하기
                </button>
              </div>
            </div>
          ) : (
            sortedPosts.map(renderPostCard)
          )}
        </div>
      </main>

      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />

      {tutorial.isActive && tutorial.currentStep && (
        <TutorialOverlay
          isActive={tutorial.isActive}
          currentStep={tutorial.currentStep}
          currentStepIndex={tutorial.currentStepIndex}
          totalSteps={tutorial.totalSteps}
          onNext={tutorial.nextStep}
          onPrev={tutorial.prevStep}
          onSkip={tutorial.skipTutorial}
        />
      )}
    </div>
  );
};

export default Community;
