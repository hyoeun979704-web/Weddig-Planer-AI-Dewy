import { useMemo, useState } from "react";
import LoginRequiredOverlay from "@/components/LoginRequiredOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import TutorialOverlay from "@/components/TutorialOverlay";
import { usePageTutorial } from "@/hooks/usePageTutorial";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import CommunitySearchOverlay from "@/components/community/CommunitySearchOverlay";
import arrowLeftIcon from "@/assets/icons/arrow-left.svg";
import noteIcon from "@/assets/community/note.svg";
import searchBoxIcon from "@/assets/community/search-box.svg";
import editIcon from "@/assets/community/edit.svg";
import heartFilledIcon from "@/assets/community/heart-filled.svg";

interface Post {
  id: string;
  category: string;
  title: string;
  content: string;
  has_image: boolean;
  views: number;
  created_at: string;
  likes_count: number;
}

const categories = ["전체", "웨딩홀", "스드메", "허니문", "혼수", "자유"];
type SortKey = "latest" | "popular";

const Community = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [sortBy, setSortBy] = useState<SortKey>("latest");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const tutorial = usePageTutorial("community");

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
          const likesResult = await supabase
            .from("community_likes")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id);

          return {
            ...post,
            likes_count: likesResult.count || 0,
          };
        })
      );

      return postsWithCounts as Post[];
    },
  });

  const trendingPosts = useMemo(
    () => [...posts].sort((a, b) => b.likes_count - a.likes_count).slice(0, 5),
    [posts]
  );

  const sortedPosts = useMemo(() => {
    const filtered =
      selectedCategory === "전체"
        ? posts
        : posts.filter((post) => post.category === selectedCategory);
    return [...filtered].sort((a, b) => {
      if (sortBy === "popular") return b.likes_count - a.likes_count;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [posts, selectedCategory, sortBy]);

  const handlePostClick = (postId: string) => navigate(`/community/${postId}`);
  const handleWriteClick = () => navigate("/community/write");

  const getPreview = (content: string) =>
    content.length > 40 ? content.slice(0, 40) + "..." : content;

  const renderPostCard = (post: Post) => (
    <button
      key={post.id}
      onClick={() => handlePostClick(post.id)}
      className="w-full text-left bg-white rounded-2xl px-5 pt-4 pb-4 shadow-[var(--shadow-card)] flex flex-col"
    >
      <span className="self-start px-2.5 py-0.5 rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
        {post.category}
      </span>
      <h3 className="mt-2 text-[16px] font-bold text-foreground line-clamp-1">
        {post.title}
      </h3>
      <p className="mt-0.5 text-[13px] text-muted-foreground line-clamp-1">
        {getPreview(post.content)}
      </p>
      <div className="mt-6 flex items-center justify-between text-[12px] text-muted-foreground">
        <span>조회수 {post.views}</span>
        <span className="flex items-center gap-1.5">
          <span>{post.likes_count}</span>
          <img src={heartFilledIcon} alt="" className="w-[15px] h-[14px]" />
        </span>
      </div>
    </button>
  );

  return (
    <AppLayout hideCategoryTabBar className="bg-[hsl(var(--pink-50))]" mainClassName="">
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

      <header
        data-tutorial="community-header"
        className="sticky top-14 z-30 bg-card border-b border-border"
      >
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-1">
            <button
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              aria-label="뒤로가기"
            >
              <img src={arrowLeftIcon} alt="" className="w-[15px] h-[15px]" />
            </button>
            <h1 className="text-[18px] font-bold text-foreground">커뮤니티</h1>
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

      <div className="pb-24">
        <div
          data-tutorial="community-categories"
          className="flex overflow-x-auto scrollbar-hide gap-2 px-4 py-3 bg-card"
        >
          {categories.map((category) => {
            const isActive = selectedCategory === category;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                aria-pressed={isActive}
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

        <section className="bg-[hsl(var(--pink-100))] px-4 pt-5 pb-6">
          <h2 className="text-[18px] font-bold text-foreground mb-4">
            오늘의 수다
          </h2>
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
            <p className="text-sm text-muted-foreground py-6 text-center">
              아직 게시글이 없습니다.
            </p>
          ) : (
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
              {trendingPosts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => handlePostClick(post.id)}
                  className="flex-shrink-0 w-[260px] text-left bg-white rounded-2xl px-5 pt-4 pb-4 shadow-[var(--shadow-card)] flex flex-col"
                >
                  <span className="self-start px-2.5 py-0.5 rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                    {post.category}
                  </span>
                  <h3 className="mt-2 text-[16px] font-bold text-foreground line-clamp-1">
                    {post.title}
                  </h3>
                  <p className="mt-0.5 text-[13px] text-muted-foreground line-clamp-1">
                    {getPreview(post.content)}
                  </p>
                  <div className="mt-8 flex items-center justify-between text-[12px] text-muted-foreground">
                    <span>조회수 {post.views}</span>
                    <span className="flex items-center gap-1.5">
                      <span>{post.likes_count}</span>
                      <img src={heartFilledIcon} alt="" className="w-[15px] h-[14px]" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="px-4 pt-5 pb-3 flex items-baseline gap-3">
          <button
            onClick={() => setSortBy("latest")}
            aria-pressed={sortBy === "latest"}
            className={`text-[16px] transition-colors ${
              sortBy === "latest"
                ? "font-bold text-foreground"
                : "font-medium text-muted-foreground"
            }`}
          >
            최신순
          </button>
          <button
            onClick={() => setSortBy("popular")}
            aria-pressed={sortBy === "popular"}
            className={`text-[14px] transition-colors ${
              sortBy === "popular"
                ? "font-bold text-foreground"
                : "font-medium text-muted-foreground"
            }`}
          >
            인기순
          </button>
        </div>

        <div className="px-4 pb-6 space-y-3">
          {isLoading ? (
            [1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[120px] rounded-2xl" />
            ))
          ) : sortedPosts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground text-sm">게시글이 없습니다.</p>
            </div>
          ) : (
            sortedPosts.map(renderPostCard)
          )}
        </div>
      </div>

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
    </AppLayout>
  );
};

export default Community;
