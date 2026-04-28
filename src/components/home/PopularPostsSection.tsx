import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import heartFilledIcon from "@/assets/community/heart-filled.svg";

interface TrendingPost {
  id: string;
  title: string;
  content: string;
  category: string;
  views: number;
  likes_count: number;
}

const previewOf = (s: string) =>
  s.length > 40 ? s.slice(0, 40) + "..." : s;

/**
 * "오늘의 수다" — mirrors the Community page's trending carousel on the
 * home feed. Posts are ranked by likes_count (matching the Community
 * page's ordering) so what surfaces here as "trending" is consistent
 * across the app, not a separate views-based ranking.
 *
 * Card design + counts (조회수 left, 좋아요 right) match Community.tsx
 * so the user's mental model carries from one to the other without a
 * second style language.
 */
const PopularPostsSection = () => {
  const navigate = useNavigate();

  const { data: posts = [], isLoading } = useQuery<TrendingPost[]>({
    queryKey: ["community-trending-home"],
    queryFn: async () => {
      const { data: postsData } = await supabase
        .from("community_posts")
        .select("id, title, content, category, views")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!postsData) return [];

      // Same N+1-with-likes shape Community.tsx uses; we re-rank locally
      // so this section always shows the same "오늘의 수다" ordering.
      const enriched = await Promise.all(
        postsData.map(async (p) => {
          const { count } = await supabase
            .from("community_likes")
            .select("*", { count: "exact", head: true })
            .eq("post_id", p.id);
          return { ...p, likes_count: count ?? 0 } as TrendingPost;
        })
      );

      return enriched
        .sort((a, b) => b.likes_count - a.likes_count)
        .slice(0, 5);
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <section className="py-5 bg-white">
        <div className="flex items-center justify-between px-4 mb-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="flex-shrink-0 w-[260px] h-[150px] rounded-2xl" />
          ))}
        </div>
      </section>
    );
  }

  if (posts.length === 0) return null;

  return (
    <section className="py-5 bg-white">
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-base font-bold text-foreground">오늘의 수다</h2>
        <button
          onClick={() => navigate("/community")}
          className="flex items-center gap-0.5 text-xs text-primary font-semibold"
        >
          더보기
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
        {posts.map((post) => (
          <button
            key={post.id}
            onClick={() => navigate(`/community/${post.id}`)}
            className="flex-shrink-0 w-[260px] text-left bg-white rounded-2xl px-5 pt-4 pb-4 shadow-[var(--shadow-card)] flex flex-col"
          >
            <span className="self-start px-2.5 py-0.5 rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
              {post.category}
            </span>
            <h3 className="mt-2 text-[16px] font-bold text-foreground line-clamp-1">
              {post.title}
            </h3>
            <p className="mt-0.5 text-[13px] text-muted-foreground line-clamp-1">
              {previewOf(post.content)}
            </p>
            <div className="mt-6 flex items-center justify-between text-[12px] text-muted-foreground">
              <span>조회수 {post.views ?? 0}</span>
              <span className="flex items-center gap-1.5">
                <span>{post.likes_count}</span>
                <img src={heartFilledIcon} alt="" className="w-[15px] h-[14px]" />
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default PopularPostsSection;
