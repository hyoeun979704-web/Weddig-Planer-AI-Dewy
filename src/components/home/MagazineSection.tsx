import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { CategoryTab } from "./CategoryTabBar";
import {
  useTipVideos,
  youTubeUrl,
  type TipVideo,
} from "@/hooks/useTipVideos";
import { PLACE_TO_KOREAN_CATEGORY } from "@/lib/placeMappers";

const CARD_W = 120;
const THUMB_H = Math.round((CARD_W * 16) / 9);

function formatViews(n: number): string {
  if (!n) return "0";
  if (n >= 10000) return `${(n / 10000).toFixed(1).replace(/\.0$/, "")}만`;
  return n.toLocaleString();
}

const koreanCategoryLabel = (slug: string): string =>
  PLACE_TO_KOREAN_CATEGORY[slug] ?? slug;

function VideoCard({ video }: { video: TipVideo }) {
  const [liked, setLiked] = useState(false);

  const [categorySlug, ...subCategorySlugs] = video.categories ?? [];
  const categoryLabel = categorySlug ? koreanCategoryLabel(categorySlug) : null;
  const subCategoryLabels = subCategorySlugs.slice(0, 2).map(koreanCategoryLabel);
  const keywordTags = (video.tags ?? []).filter(Boolean).slice(0, 2);

  return (
    <a
      href={youTubeUrl(video.video_id)}
      target="_blank"
      rel="noopener noreferrer"
      className="block shrink-0"
      style={{ width: CARD_W }}
    >
      <div
        className="relative overflow-hidden rounded-[12px] bg-[#cfcfcf]"
        style={{ height: THUMB_H }}
      >
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-[#cfcfcf]" />
        )}

        {categoryLabel && (
          <span className="absolute left-2 top-2 z-10 px-1 py-[1px] rounded bg-white/85 text-[8px] font-semibold text-[hsl(353,75%,55%)] leading-none">
            {categoryLabel}
          </span>
        )}

        <button
          type="button"
          aria-label={liked ? "찜 해제" : "찜하기"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setLiked((v) => !v);
          }}
          className="absolute right-2 top-2 z-10"
        >
          <Heart
            className={
              liked
                ? "h-4 w-4 fill-[#f29aa3] text-[#f29aa3]"
                : "h-4 w-4 text-white drop-shadow"
            }
            strokeWidth={2}
          />
        </button>

        <div className="absolute inset-x-0 bottom-0 bg-white/65 px-2 py-2">
          <p className="line-clamp-2 h-[26px] text-[10px] font-medium leading-[1.3] text-black">
            {video.title}
          </p>
          {subCategoryLabels.length > 0 && (
            <p className="mt-1 line-clamp-1 h-[10px] text-[8px] leading-none text-[hsl(353,75%,55%)]/85">
              {subCategoryLabels.map((t) => `#${t}`).join(" ")}
            </p>
          )}
          {keywordTags.length > 0 && (
            <p className="mt-1 line-clamp-1 h-[10px] text-[8px] leading-none text-[#5d9bf0]">
              {keywordTags.map((t) => `#${t}`).join(" ")}
            </p>
          )}
          <p className="mt-1 line-clamp-1 h-[10px] text-[9px] leading-none text-black/45">
            {video.channel_name ?? "채널명"}
          </p>
          <p className="mt-1 line-clamp-1 h-[10px] text-[9px] leading-none text-black/45">
            조회수 {formatViews(video.view_count)}
          </p>
        </div>
      </div>
    </a>
  );
}

function CardSkeleton() {
  return (
    <div className="shrink-0" style={{ width: CARD_W }}>
      <div
        className="relative overflow-hidden rounded-[12px] bg-[#cfcfcf]"
        style={{ height: THUMB_H }}
      >
        <div className="h-full w-full animate-pulse bg-[#d8d8d8]" />
        <div className="absolute inset-x-0 bottom-0 bg-white/65 px-2 py-2">
          <div className="h-[10px] w-full animate-pulse rounded bg-[#e5e5e5]" />
          <div className="mt-1 h-[10px] w-4/5 animate-pulse rounded bg-[#e5e5e5]" />
          <div className="mt-1 h-[8px] w-2/5 animate-pulse rounded bg-[#ececec]" />
          <div className="mt-1 h-[8px] w-1/3 animate-pulse rounded bg-[#ececec]" />
          <div className="mt-1 h-[8px] w-1/2 animate-pulse rounded bg-[#ececec]" />
        </div>
      </div>
    </div>
  );
}

type MagazineSectionProps = {
  activeTab: CategoryTab;
};

export default function MagazineSection({ activeTab: _activeTab }: MagazineSectionProps) {
  const navigate = useNavigate();
  const { data = [], isLoading, isError } = useTipVideos();

  return (
    <section className="bg-[#fff1f4] px-5 py-6">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[24px] font-bold leading-none text-black">
            오늘의 꿀팁
          </h2>

          <button
            type="button"
            onClick={() => navigate("/magazine")}
            className="text-[12px] text-black/50"
          >
            더보기
          </button>
        </div>

        {isLoading ? (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="text-[12px] text-black/50">
            영상을 불러오지 못했어요.
          </div>
        ) : data.length === 0 ? (
          <div className="text-[12px] text-black/50">
            표시할 영상이 아직 없어요.
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {data.map((video) => (
              <VideoCard key={video.video_id} video={video} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
