import { Instagram } from "lucide-react";
import { useTipInstagrams } from "@/hooks/useTipInstagrams";

interface InstagramTipSectionProps {
  category?: string;
}

/**
 * Tips 페이지의 "감성 인스타" 섹션 — 1:1 정사각 이미지 그리드 (인스타 룩).
 * 운영자 큐레이션 + 사용자 추천 (추후) Instagram 게시물.
 */
const InstagramTipSection = ({ category }: InstagramTipSectionProps) => {
  const { data = [], isLoading } = useTipInstagrams({ category, limit: 9 });

  if (!isLoading && data.length === 0) return null;

  return (
    <section className="border-t border-border/50 pt-3 pb-4">
      <div className="px-4 mb-2.5 flex items-center gap-1.5">
        <Instagram className="w-4 h-4 text-primary" />
        <h2 className="text-base font-bold text-foreground">감성 인스타</h2>
        <span className="text-[11px] text-muted-foreground">· 트렌드·무드</span>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-3 gap-1 px-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 px-4">
          {data.map((p) => (
            <a
              key={p.id}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="aspect-square rounded-lg overflow-hidden bg-muted relative group"
            >
              {p.thumbnail_url ? (
                <img
                  src={p.thumbnail_url}
                  alt={p.title ?? ""}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget.style.display = "none");
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/30">
                  <Instagram className="w-6 h-6 text-primary/50" />
                </div>
              )}
              {p.author && (
                <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1 bg-gradient-to-t from-black/60 to-transparent">
                  <p className="text-[10px] text-white font-medium truncate">
                    @{p.author.replace(/^@/, "")}
                  </p>
                </div>
              )}
            </a>
          ))}
        </div>
      )}
    </section>
  );
};

export default InstagramTipSection;
