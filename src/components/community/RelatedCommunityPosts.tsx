import { useNavigate } from "react-router-dom";
import { MessageSquare, Heart, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useRelatedPosts } from "@/hooks/useCommunityPlaces";

// 업체 상세에 노출하는 "이 업체 관련 커뮤니티 글". 글이 없으면 렌더 안 함.
const RelatedCommunityPosts = ({ placeId }: { placeId: string }) => {
  const navigate = useNavigate();
  const { data: posts = [] } = useRelatedPosts(placeId, 5);
  if (posts.length === 0) return null;

  return (
    <div className="px-4 py-4">
      <h3 className="font-bold text-sm mb-2">이 업체 관련 글</h3>
      <div className="space-y-2">
        {posts.map((p) => (
          <button
            key={p.id}
            onClick={() => navigate(`/community/${p.id}`)}
            className="w-full text-left flex items-center gap-2 rounded-xl border border-border p-3 active:bg-muted/40"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                <span>{p.category}</span>
                <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{p.like_count}</span>
                <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" />{p.comment_count}</span>
                <span>{formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: ko })}</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default RelatedCommunityPosts;
