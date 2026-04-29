import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VendorInfoLine } from "@/lib/placeMappers";

export interface VendorMediaCardData {
  id: string;
  thumbnail_url: string | null;
  region?: string | null;
  name: string;
  category?: string | null;
  concept?: string | null;
  mood?: string | null;
  strength?: string | null;
  is_partner?: boolean;
  info_lines: VendorInfoLine[];
}

interface VendorMediaCardProps {
  data: VendorMediaCardData;
  onClick: () => void;
}

export const CARD_W = 140;
export const CARD_H = 195;
const IMG_H = 100;

const KEYWORD_CHIP_CLASSES = {
  category: "bg-[#fde7ec] text-[#d35c75]",
  concept: "bg-[#dff0f9] text-[#3aa1d8]",
  mood: "bg-[#fcf2d4] text-[#a87a14]",
  strength: "bg-[#f1e3f5] text-[#a64bb8]",
} as const;

const VendorMediaCard = ({ data, onClick }: VendorMediaCardProps) => {
  const [liked, setLiked] = useState(false);

  const keywordChips: Array<{ value: string; className: string }> = [];
  if (data.category) keywordChips.push({ value: data.category, className: KEYWORD_CHIP_CLASSES.category });
  if (data.concept) keywordChips.push({ value: data.concept, className: KEYWORD_CHIP_CLASSES.concept });
  if (data.mood) keywordChips.push({ value: data.mood, className: KEYWORD_CHIP_CLASSES.mood });
  if (data.strength) keywordChips.push({ value: data.strength, className: KEYWORD_CHIP_CLASSES.strength });

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
        {data.region && (
          <p className="text-[9px] leading-tight text-black/55 line-clamp-1">
            {data.region}
          </p>
        )}

        <p className="text-[12px] font-bold leading-tight text-black line-clamp-1">
          {data.name}
        </p>

        {data.info_lines.length > 0 && (
          <div className="flex flex-col gap-[1px]">
            {data.info_lines.map((line, idx) => (
              <div
                key={`${line.label}-${idx}`}
                className="flex items-center gap-[3px] text-[9px] leading-tight overflow-hidden"
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
                {line.pair && (
                  <>
                    <span className="text-black/30 shrink-0">·</span>
                    <span className="text-black/55 shrink-0">{line.pair.label}</span>
                    <span
                      className={cn(
                        "truncate",
                        line.pair.isPrice
                          ? "font-bold text-[hsl(353,75%,55%)]"
                          : "text-black/75"
                      )}
                    >
                      {line.pair.value}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {keywordChips.length > 0 && (
          <div className="mt-auto flex flex-nowrap gap-[2px] overflow-hidden">
            {keywordChips.map((chip, i) => (
              <span
                key={i}
                className={cn(
                  "shrink-0 px-1 py-[1px] rounded-full text-[8px] font-medium leading-tight whitespace-nowrap",
                  chip.className
                )}
              >
                {chip.value}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
};

export default VendorMediaCard;
