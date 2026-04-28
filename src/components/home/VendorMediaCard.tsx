import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VendorInfoLine } from "@/lib/placeMappers";

export interface VendorMediaCardData {
  id: string;
  thumbnail_url: string | null;
  name: string;
  category_tag: string | null;
  style_tags?: string[];
  keyword_tags: string[];
  is_partner?: boolean;
  info_lines: VendorInfoLine[];
}

interface VendorMediaCardProps {
  data: VendorMediaCardData;
  onClick: () => void;
}

export const CARD_W = 110;
export const CARD_H = 200;
const IMG_H = 90;

const VendorMediaCard = ({ data, onClick }: VendorMediaCardProps) => {
  const [liked, setLiked] = useState(false);

  return (
    <button
      onClick={onClick}
      aria-label={data.name}
      className="flex-shrink-0 flex flex-col bg-[#d9d9d9] rounded-[10px] overflow-hidden text-left active:scale-[0.97]"
      style={{ width: CARD_W, height: CARD_H }}
    >
      <div className="relative w-full" style={{ height: IMG_H }}>
        {data.thumbnail_url ? (
          <img
            src={data.thumbnail_url}
            alt={data.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/15 to-primary/5" />
        )}

        {data.is_partner && (
          <span className="absolute left-1.5 top-1.5 z-10 px-1 py-[1px] rounded bg-[hsl(353,75%,55%)] text-white text-[8px] font-bold tracking-tight">
            제휴
          </span>
        )}

        <span
          role="button"
          aria-label={liked ? "찜 해제" : "찜하기"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setLiked((v) => !v);
          }}
          className="absolute right-1.5 top-1.5 z-10 inline-flex"
        >
          <Heart
            className={cn(
              "h-4 w-4",
              liked ? "fill-[#f29aa3] text-[#f29aa3]" : "text-white drop-shadow"
            )}
            strokeWidth={2}
          />
        </span>
      </div>

      <div className="flex-1 flex flex-col gap-[3px] bg-white px-2 py-2">
        {data.category_tag && (
          <span className="self-start px-1 py-[1px] rounded bg-[hsl(var(--pink-100))] text-[8px] font-semibold text-[hsl(353,75%,55%)] leading-none">
            {data.category_tag}
          </span>
        )}

        <p className="text-[11px] font-bold leading-tight text-black line-clamp-1">
          {data.name}
        </p>

        {data.style_tags && data.style_tags.length > 0 && (
          <p className="text-[8px] leading-tight text-black/45 line-clamp-1">
            {data.style_tags.map((t) => `#${t}`).join(" ")}
          </p>
        )}

        {data.keyword_tags.length > 0 && (
          <p className="text-[8px] leading-tight text-[#5d9bf0] line-clamp-1">
            {data.keyword_tags.map((t) => `#${t}`).join(" ")}
          </p>
        )}

        <div className="mt-auto flex flex-col gap-[1px]">
          {data.info_lines.map((line, idx) => (
            <div
              key={`${line.label}-${idx}`}
              className="flex items-center justify-between gap-1 text-[9px] leading-tight"
            >
              <span className="text-black/55 shrink-0">{line.label}</span>
              <span
                className={cn(
                  "truncate",
                  line.isPrice
                    ? "font-bold text-[hsl(353,75%,55%)]"
                    : "text-black/75"
                )}
              >
                {line.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </button>
  );
};

export default VendorMediaCard;
