import { Heart } from "lucide-react";

export interface PostListItem {
  id: string;
  title: string;
  content: string;
  views: number | null;
  like_count: number | null;
  category_tag?: string | null;
  keyword_tags?: string[];
  author?: string;
}

function formatCount(n: number | null | undefined): string {
  if (!n) return "0";
  if (n >= 10000) return `${(n / 10000).toFixed(1).replace(/\.0$/, "")}만`;
  return n.toLocaleString();
}

interface PostListCardProps {
  post: PostListItem;
  onClick: () => void;
}

const PostListCard = ({ post, onClick }: PostListCardProps) => {

  return (
    <button
      onClick={onClick}
      className="flex-1 min-w-0 min-h-[150px] flex flex-col bg-white rounded-[10px] p-[12px] text-left active:scale-[0.98] transition-transform"
    >
      {post.category_tag && (
        <span className="self-start mb-1 px-1 py-[1px] rounded bg-[hsl(var(--pink-100))] text-[8px] font-semibold text-[hsl(353,75%,55%)] leading-none">
          {post.category_tag}
        </span>
      )}

      <p className="text-[12px] font-bold leading-tight text-black line-clamp-1 mb-1">
        {post.title}
      </p>

      {post.keyword_tags && post.keyword_tags.length > 0 && (
        <p className="text-[8px] leading-tight text-[#5d9bf0] line-clamp-1 mb-1">
          {post.keyword_tags.map((t) => `#${t}`).join(" ")}
        </p>
      )}

      <p className="text-[10px] leading-[1.35] text-black/65 line-clamp-3 flex-1">
        {post.content}
      </p>

      {post.author && (
        <p className="text-[9px] text-black/45 truncate mt-1">{post.author}</p>
      )}

      <div className="flex items-center justify-between mt-1 text-[10px] text-black/55">
        <span>조회수 {formatCount(post.views)}</span>
        {/* 표시 전용 — 홈 프리뷰 카드의 좋아요는 서버 미저장 토글이라 새로고침 시
            원복돼 사용자를 오인시켰다(260613). 실제 좋아요는 글 상세에서 누른다. */}
        <span className="inline-flex items-center gap-1">
          {formatCount(post.like_count)}
          <Heart className="h-3 w-3 fill-[#f29aa3] text-[#f29aa3]" strokeWidth={1.5} />
        </span>
      </div>
    </button>
  );
};

export default PostListCard;
