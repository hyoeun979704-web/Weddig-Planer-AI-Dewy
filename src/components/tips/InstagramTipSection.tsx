import { ExternalLink, Instagram } from "lucide-react";
import { useTipInstagrams } from "@/hooks/useTipInstagrams";
import { PLACE_TO_KOREAN_CATEGORY } from "@/lib/placeMappers";

interface InstagramTipSectionProps {
  category?: string;
}

const REEL_CARD_WIDTH = 140;

const koreanCategoryLabel = (slug: string): string =>
  PLACE_TO_KOREAN_CATEGORY[slug] ?? slug;

const InstagramTipSection = ({ category }: InstagramTipSectionProps) => {
  const { data = [], isLoading } = useTipInstagrams({ category, limit: 9 });

  if (!isLoading && data.length === 0) return null;

  return (
    <section className="border-t border-border/50 pt-3 pb-4">
      <div className="px-4 mb-2.5 flex items-center gap-1.5">
        <Instagram className="w-4 h-4 text-primary" />
        <h2 className="text-base font-bold text-foreground">인스타그램 릴스</h2>
        <span className="text-[11px] text-muted-foreground">· 탭하면 이동</span>
      </div>
      {isLoading ? (
        <div className="flex gap-2.5 overflow-x-auto scrollbar-hide px-4 pb-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="shrink-0"
              style={{ width: REEL_CARD_WIDTH }}
            >
              <div className="relative aspect-[9/16] overflow-hidden rounded-[12px] bg-[#cfcfcf]">
                <div className="h-full w-full animate-pulse bg-[#d8d8d8]" />
                <div className="absolute inset-x-0 bottom-0 bg-white/65 px-2 py-2">
                  <div className="h-[10px] w-full animate-pulse rounded bg-[#e5e5e5]" />
                  <div className="mt-1 h-[10px] w-4/5 animate-pulse rounded bg-[#e5e5e5]" />
                  <div className="mt-1 h-[8px] w-1/2 animate-pulse rounded bg-[#ececec]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-2.5 overflow-x-auto scrollbar-hide px-4 pb-1">
          {data.map((p) => {
            const [categorySlug, ...subCategorySlugs] = p.categories ?? [];
            const categoryLabel = categorySlug ? koreanCategoryLabel(categorySlug) : null;
            const subCategoryLabels = subCategorySlugs.slice(0, 2).map(koreanCategoryLabel);
            const author = p.author?.replace(/^@/, "");

            return (
              <a
                key={p.id}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block shrink-0"
                style={{ width: REEL_CARD_WIDTH }}
                aria-label={`${p.title ?? "Instagram Reel"} 인스타그램에서 보기`}
              >
                <div className="relative aspect-[9/16] overflow-hidden rounded-[12px] bg-[#cfcfcf]">
                  <img
                    src={p.thumbnail_url!}
                    alt={p.title ?? ""}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />

                  {categoryLabel && (
                    <span className="absolute left-2 top-2 z-10 rounded bg-white/85 px-1 py-[1px] text-[8px] font-semibold leading-none text-[hsl(353,75%,55%)]">
                      {categoryLabel}
                    </span>
                  )}
                  <span className="absolute right-2 top-2 z-10 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/35 text-white">
                    <ExternalLink className="h-3 w-3" />
                  </span>

                  <div className="absolute inset-x-0 bottom-0 bg-white/65 px-2 py-2">
                    <p className="line-clamp-2 h-[26px] text-[10px] font-medium leading-[1.3] text-black">
                      {p.title ?? (author ? `@${author} 릴스` : "Instagram Reel")}
                    </p>
                    {subCategoryLabels.length > 0 && (
                      <p className="mt-1 line-clamp-1 h-[10px] text-[8px] leading-none text-[hsl(353,75%,55%)]/85">
                        {subCategoryLabels.join(" · ")}
                      </p>
                    )}
                    <p className="mt-1 line-clamp-1 h-[10px] text-[9px] leading-none text-black/45">
                      {author ? `@${author}` : "Instagram"}
                    </p>
                    <p className="mt-1 line-clamp-1 h-[10px] text-[9px] leading-none text-black/45">
                      Reels
                    </p>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default InstagramTipSection;
