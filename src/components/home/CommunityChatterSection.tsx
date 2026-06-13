import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import PostListCard, { PostListItem } from "./PostListCard";
import { useCommunityAuthors } from "@/hooks/useCommunityAuthors";

const SkeletonCard = () => (
  <Skeleton className="flex-1 min-w-0 h-[150px] rounded-[10px]" />
);

interface CommunityRow {
  id: string;
  user_id: string;
  title: string;
  content: string;
  views: number | null;
  like_count: number | null;
  category: string | null;
}

const extractHashtags = (content: string): string[] => {
  const matches = content.match(/#([\p{L}\p{N}_]+)/gu) ?? [];
  const tags = matches.map((m) => m.slice(1));
  return Array.from(new Set(tags)).slice(0, 2);
};

const CommunityChatterSection = () => {
  const navigate = useNavigate();

  const { data: rows, isLoading } = useQuery<CommunityRow[]>({
    queryKey: ["community-chatter-home"],
    queryFn: async () => {
      const { data } = await supabase
        .from("community_posts")
        .select("id, user_id, title, content, views, like_count, category")
        .order("created_at", { ascending: false })
        .limit(2);
      return (data ?? []) as CommunityRow[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const authors = useCommunityAuthors((rows ?? []).map((r) => r.user_id));

  const posts: PostListItem[] = (rows ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    content: p.content,
    views: p.views,
    like_count: p.like_count,
    category_tag: p.category,
    keyword_tags: extractHashtags(p.content ?? ""),
    author: authors.get(p.user_id).nickname,
  }));

  const items: PostListItem[] = posts.slice(0, 2);

  // 실제 글이 없으면 섹션을 숨긴다 — 과거엔 가짜 "제목/내용" 카드를 띄웠지만
  // 가짜 콘텐츠 노출 금지(260613). 로딩 중에는 스켈레톤만 보여준다.
  if (!isLoading && items.length === 0) return null;

  return (
    <section className="pt-[10px] pb-[20px] px-[20px] bg-[hsl(var(--pink-50))]">
      <div className="flex items-center justify-between mb-[10px]">
        <h2 className="text-[16px] font-bold text-black">오늘의 수다</h2>
        <button
          onClick={() => navigate("/community")}
          className="flex items-center gap-0.5 text-[12px] font-medium text-primary"
        >
          더보기
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
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
              onClick={() => navigate(`/community/${post.id}`)}
            />
          ))
        )}
      </div>
    </section>
  );
};

export default CommunityChatterSection;
