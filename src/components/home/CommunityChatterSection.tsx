import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import PostListCard, { PostListItem } from "./PostListCard";

const PLACEHOLDERS: PostListItem[] = [
  { id: "placeholder-1", title: "제목", content: "내용", views: 1246, like_count: 165 },
  { id: "placeholder-2", title: "제목", content: "내용", views: 1246, like_count: 165 },
];

const SkeletonCard = () => (
  <Skeleton className="flex-1 min-w-0 h-[120px] rounded-[10px]" />
);

const CommunityChatterSection = () => {
  const navigate = useNavigate();

  const { data: posts, isLoading } = useQuery<PostListItem[]>({
    queryKey: ["community-chatter-home"],
    queryFn: async () => {
      const { data } = await supabase
        .from("community_posts")
        .select("id, title, content, views")
        .order("created_at", { ascending: false })
        .limit(2);
      return ((data ?? []) as Array<Omit<PostListItem, "like_count">>).map((p) => ({
        ...p,
        like_count: null,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const items: PostListItem[] = posts && posts.length >= 2 ? posts.slice(0, 2) : PLACEHOLDERS;

  return (
    <section className="pt-[10px] pb-[20px] px-[20px] bg-[hsl(var(--pink-50))]">
      <h2 className="text-[16px] font-bold text-black mb-[10px]">오늘의 수다</h2>
      <div className="flex gap-[8px]">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          items.map((post) => (
            <PostListCard
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
