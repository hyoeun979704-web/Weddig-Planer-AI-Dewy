import { ExternalLink, BookOpen, Calendar } from "lucide-react";
import { useTipBlogs } from "@/hooks/useTipBlogs";

interface BlogTipSectionProps {
  category?: string;
}

/**
 * Tips 페이지의 "이번 주 블로그" 섹션 — 네이버 블로그 / 매거진 RSS 컨텐츠.
 * 카드는 텍스트 우선 디자인 (영상·인스타와 시각적 차별).
 */
const BlogTipSection = ({ category }: BlogTipSectionProps) => {
  const { data = [], isLoading } = useTipBlogs({ category, limit: 8 });

  if (!isLoading && data.length === 0) return null;

  return (
    <section className="border-t border-border/50 pt-3 pb-4">
      <div className="px-4 mb-2.5 flex items-center gap-1.5">
        <BookOpen className="w-4 h-4 text-primary" />
        <h2 className="text-base font-bold text-foreground">이번 주 블로그</h2>
        <span className="text-[11px] text-muted-foreground">· 자세한 후기·가격</span>
      </div>
      {isLoading ? (
        <div className="px-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="px-4 space-y-2">
          {data.map((b) => (
            <a
              key={b.id}
              href={b.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded-xl border border-border bg-card hover:border-primary/30 active:scale-[0.99] transition-all"
            >
              <p className="text-[14px] font-semibold text-foreground line-clamp-2 mb-1">
                {b.title}
              </p>
              {b.description && (
                <p className="text-[12px] text-muted-foreground line-clamp-2 mb-1.5">
                  {b.description}
                </p>
              )}
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                {b.blogger_name && <span className="truncate">{b.blogger_name}</span>}
                {b.post_date && (
                  <span className="flex items-center gap-0.5 shrink-0">
                    <Calendar className="w-2.5 h-2.5" />
                    {b.post_date}
                  </span>
                )}
                <ExternalLink className="w-3 h-3 ml-auto text-primary shrink-0" />
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
};

export default BlogTipSection;
