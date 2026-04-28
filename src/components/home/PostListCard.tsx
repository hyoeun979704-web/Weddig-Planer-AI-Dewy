import { useState } from "react";
import { Heart } from "lucide-react";

export interface PostListItem {
  id: string;
  title: string;
  content: string;
  views: number | null;
  like_count: number | null;
  category_tag?: string | null;
  keyword_tags?: string[];
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
  const [liked, setLiked] = useState(false);
  const likeCount = (post.like_count ?? 0) + (liked ? 1 : 0);

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
        <p className="text-[8px] leading-tight text-black/45 line-clamp-1 mb-1">
          {post.keyword_tags.map((t) => `#${t}`).join(" ")}
        </p>
      )}

      <p className="text-[10px] leading-[1.35] text-black/65 line-clamp-3 flex-1">
        {post.content}
      </p>

      <div className="flex items-center justify-between mt-2 text-[10px] text-black/55">
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
          {formatCount(likeCount)}
          <Heart
            className={
              liked
                ? "h-3 w-3 fill-[#f29aa3] text-[#f29aa3]"
                : "h-3 w-3 fill-[#f29aa3]/40 text-[#f29aa3]"
            }
            strokeWidth={1.5}
          />
        </span>
      </div>
    </button>
  );
};

export default PostListCard;
