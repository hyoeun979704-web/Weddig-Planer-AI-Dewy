import { useNavigate } from "react-router-dom";
import { ChevronRight, Heart, Eye, MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface PopularPost {
  id: string;
  title: string;
  category: string;
  views: number;
  image_url: string | null;
  like_count: number;
  comment_count: number;
}

const StudioGallery = () => {
  const navigate = useNavigate();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["popular-posts-home"],
    queryFn: async (): Promise<PopularPost[]> => {
      // Fetch top posts by views
      const { data, error } = await supabase
        .from("community_posts")
        .select("id, title, category, views, image_urls")
        .order("views", { ascending: false })
        .limit(6);

      if (error) throw error;
      if (!data) return [];

      // Fetch like counts
      const postIds = data.map((p) => p.id);
      const { data: likes } = await supabase
        .from("community_likes")
        .select("post_id")
        .in("post_id", postIds);

      const { data: comments } = await supabase
        .from("community_comments")
        .select("post_id")
        .in("post_id", postIds);

      const likeCounts: Record<string, number> = {};
      const commentCounts: Record<string, number> = {};
      (likes || []).forEach((l) => {
        likeCounts[l.post_id] = (likeCounts[l.post_id] || 0) + 1;
      });
      (comments || []).forEach((c) => {
        commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1;
      });

      return data.map((p) => ({
        id: p.id,
        title: p.title,
        category: p.category,
        views: p.views || 0,
        image_url: p.image_urls && p.image_urls.length > 0 ? p.image_urls[0] : null,
        like_count: likeCounts[p.id] || 0,
        comment_count: commentCounts[p.id] || 0,
      }));
    },
  });

  return (
    <section className="py-6 bg-muted/30">
      <div className="flex items-center justify-between px-4 mb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">실시간 인기 게시물</h2>
          <p className="text-xs text-muted-foreground mt-0.5">커뮤니티에서 가장 핫한 글</p>
        </div>
        <button
          onClick={() => navigate("/community")}
          className="flex items-center gap-1 text-sm text-primary font-medium"
        >
          더보기
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2 px-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))
        ) : posts.length > 0 ? (
          posts.map((post) => (
            <button
              key={post.id}
              onClick={() => navigate(`/community/${post.id}`)}
              className="w-full flex items-center gap-3 p-3 bg-card rounded-xl border border-border hover:shadow-sm transition-shadow text-left"
            >
              {post.image_url && (
                <img
                  src={post.image_url}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              )}
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-primary font-medium">{post.category}</span>
                <h4 className="text-sm font-semibold text-foreground truncate">{post.title}</h4>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    <Eye className="w-3 h-3" /> {post.views}
                  </span>
                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    <Heart className="w-3 h-3" /> {post.like_count}
                  </span>
                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    <MessageSquare className="w-3 h-3" /> {post.comment_count}
                  </span>
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">아직 게시물이 없습니다</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default StudioGallery;
