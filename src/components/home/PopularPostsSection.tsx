import { useNavigate } from "react-router-dom";
import { ChevronRight, Eye, Heart, MessageCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const PopularPostsSection = () => {
  const navigate = useNavigate();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["popular-posts-home"],
    queryFn: async () => {
      const { data } = await supabase
        .from("community_posts")
        .select("id, title, category, views, created_at, image_urls")
        .order("views", { ascending: false })
        .limit(5);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <section className="py-5">
        <div className="px-4 mb-3">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="space-y-2 px-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (posts.length === 0) return null;

  return (
    <section className="py-5">
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-base font-bold text-foreground">오늘의 수다</h2>
        <button
          onClick={() => navigate("/community")}
          className="flex items-center gap-0.5 text-xs text-primary font-medium"
        >
          더보기
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-1.5 px-4">
        {posts.map((post, idx) => (
          <button
            key={post.id}
            onClick={() => navigate(`/community/${post.id}`)}
            className="w-full flex items-center gap-3 p-3 bg-card rounded-xl border border-border text-left active:scale-[0.98] transition-transform"
          >
            <span className="text-sm font-bold text-primary/60 w-5 text-center shrink-0">
              {idx + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{post.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">{post.category}</span>
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Eye className="w-3 h-3" />
                  {post.views || 0}
                </span>
              </div>
            </div>
            {post.image_urls && post.image_urls.length > 0 && (
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                <img
                  src={post.image_urls[0]}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            )}
          </button>
        ))}
      </div>
    </section>
  );
};

export default PopularPostsSection;
