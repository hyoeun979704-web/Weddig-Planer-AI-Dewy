import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface ChatterPost {
  id: string;
  title: string;
  content: string;
  views: number | null;
  like_count: number | null;
}

function formatCount(n: number | null | undefined): string {
  if (!n) return "0";
  if (n >= 10000) return `${(n / 10000).toFixed(1).replace(/\.0$/, "")}만`;
  return n.toLocaleString();
}

const PostCard = ({ post, onClick }: { post: ChatterPost; onClick: () => void }) => {
  const [liked, setLiked] = useState(false);

  return (
    <button
      onClick={onClick}
      className="flex-1 min-w-0 flex flex-col gap-2 p-[15px] bg-[#d9d9d9] rounded-[10px] text-left active:scale-[0.98] transition-transform"
    >
      <p className="text-[13px] font-semibold text-black line-clamp-1">{post.title}</p>
      <p className="text-[11px] leading-snug text-black/70 line-clamp-3 flex-1 min-h-[44px]">
        {post.content}
      </p>
      <div className="flex items-center justify-between text-[10px] text-black/55">
        <span>조회수 {formatCount(post.views)}</span>
        <span
          role="button"
          aria-label={liked ? "찜 해제" : "찜하기"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setLiked((v) => !v);
          }}
          className="inline-flex items-center gap-1"
        >
          <Heart
            className={
              liked
                ? "h-3 w-3 fill-[#f29aa3] text-[#f29aa3]"
                : "h-3 w-3 text-[#f29aa3]"
            }
            strokeWidth={2}
          />
          {formatCount((post.like_count ?? 0) + (liked ? 1 : 0))}
        </span>
      </div>
    </button>
  );
};

const SkeletonCard = () => (
  <div className="flex-1 min-w-0 flex flex-col gap-2 p-[15px] bg-[#d9d9d9] rounded-[10px]">
    <Skeleton className="h-[13px] w-3/5" />
    <Skeleton className="h-[44px] w-full" />
    <div className="flex items-center justify-between">
      <Skeleton className="h-[10px] w-16" />
      <Skeleton className="h-[10px] w-10" />
    </div>
  </div>
);

const CommunityChatterSection = () => {
  const navigate = useNavigate();

  const { data: posts, isLoading } = useQuery<ChatterPost[]>({
    queryKey: ["community-chatter-home"],
    queryFn: async () => {
      const { data } = await supabase
        .from("community_posts")
        .select("id, title, content, views")
        .order("created_at", { ascending: false })
        .limit(2);
      return ((data ?? []) as Array<Omit<ChatterPost, "like_count">>).map((p) => ({
        ...p,
        like_count: null,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const items: ChatterPost[] = posts && posts.length >= 2
    ? posts.slice(0, 2)
    : [
        { id: "placeholder-1", title: "제목", content: "내용", views: 1246, like_count: 165 },
        { id: "placeholder-2", title: "제목", content: "내용", views: 1246, like_count: 165 },
      ];

  return (
    <section className="pt-[10px] pb-[30px] px-[30px] bg-[hsl(var(--pink-50))]">
      <h2 className="text-[16px] font-bold text-black mb-[10px]">오늘의 수다</h2>
      <div className="flex gap-[10px]">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          items.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onClick={() =>
                post.id.startsWith("placeholder")
                  ? navigate("/community")
                  : navigate(`/community/${post.id}`)
              }
            />
          ))
        )}
      </div>
    </section>
  );
};

export default CommunityChatterSection;
