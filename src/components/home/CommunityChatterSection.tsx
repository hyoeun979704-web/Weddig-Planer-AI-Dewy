import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import PostListCard, { PostListItem } from "./PostListCard";

const PLACEHOLDERS: PostListItem[] = [
  {
    id: "placeholder-1",
    title: "제목",
    content: "내용",
    views: 1246,
    like_count: 165,
    category_tag: "수다",
    keyword_tags: ["일상", "공유"],
  },
  {
    id: "placeholder-2",
    title: "제목",
    content: "내용",
    views: 1246,
    like_count: 165,
    category_tag: "수다",
    keyword_tags: ["일상", "공유"],
  },
];

const SkeletonCard = () => (
  <Skeleton className="flex-1 min-w-0 h-[150px] rounded-[10px]" />
);

interface CommunityRow {
  id: string;
  title: string;
  content: string;
  views: number | null;
  category: string | null;
}

const extractHashtags = (content: string): string[] => {
  const matches = content.match(/#([\p{L}\p{N}_]+)/gu) ?? [];
  const tags = matches.map((m) => m.slice(1));
  return Array.from(new Set(tags)).slice(0, 2);
};

const CommunityChatterSection = () => {
  const navigate = useNavigate();

  const { data: posts, isLoading } = useQuery<PostListItem[]>({
    queryKey: ["community-chatter-home"],
    queryFn: async () => {
      const { data } = await supabase
        .from("community_posts")
        .select("id, title, content, views, category")
        .order("created_at", { ascending: false })
        .limit(2);
      return ((data ?? []) as CommunityRow[]).map((p) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        views: p.views,
        like_count: null,
        category_tag: p.category,
        keyword_tags: extractHashtags(p.content ?? ""),
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
