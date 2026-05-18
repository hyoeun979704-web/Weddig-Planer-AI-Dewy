import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { youTubeUrl, type TipVideo } from "@/hooks/useTipVideos";
import { PLACE_TO_KOREAN_CATEGORY } from "@/lib/placeMappers";

// Same threshold Tips.tsx uses for its 롱폼/숏폼 segmented filter. ≤180s = Shorts.
const SHORT_MAX_SECONDS = 180;

function formatViews(n: number): string {
  if (!n) return "0";
  if (n >= 10000) return `${(n / 10000).toFixed(1).replace(/\.0$/, "")}만`;
  return n.toLocaleString();
}

const koreanCategoryLabel = (slug: string): string =>
  PLACE_TO_KOREAN_CATEGORY[slug] ?? slug;

interface TipVideoCardProps {
  video: TipVideo;
  /** Fixed pixel width. Omit to fill the parent (grid cell). */
  width?: number;
  /** HOT-row rank badge (1-based). Replaces the category badge when set. */
  rank?: number;
}

export function TipVideoCard({ video, width, rank }: TipVideoCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite, isToggling } = useFavorites();

  const isFav = isFavorite(video.video_id, "tip_video");

  // 롱폼은 16:9 가로 + 썸네일 아래 메타(YouTube 정석), 쇼츠는 9:16 + 오버레이.
  const isShort =
    video.duration_seconds != null && video.duration_seconds <= SHORT_MAX_SECONDS;

  const [categorySlug, ...subCategorySlugs] = video.categories ?? [];
  const categoryLabel = categorySlug ? koreanCategoryLabel(categorySlug) : null;
  const subCategoryLabels = subCategorySlugs.slice(0, 2).map(koreanCategoryLabel);
  const keywordTags = (video.tags ?? []).filter(Boolean).slice(0, 2);

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate("/auth");
      return;
    }
    await toggleFavorite(video.video_id, "tip_video");
  };

  const rankBadge =
    rank != null ? (
      <span className="absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold leading-none text-white">
        {rank}
      </span>
    ) : (
      categoryLabel && (
        <span className="absolute left-2 top-2 z-10 rounded bg-white/85 px-1 py-[1px] text-[8px] font-semibold leading-none text-[hsl(353,75%,55%)]">
          {categoryLabel}
        </span>
      )
    );

  const heartButton = (
    <button
      type="button"
      aria-label={isFav ? "찜 해제" : "찜하기"}
      onClick={handleFavorite}
      disabled={isToggling}
      className="absolute right-2 top-2 z-10 active:scale-90 transition-transform"
    >
      <Heart
        className={
          isFav
            ? "h-4 w-4 fill-primary text-primary"
            : "h-4 w-4 text-white drop-shadow"
        }
        strokeWidth={2}
      />
    </button>
  );

  return (
    <a
      href={youTubeUrl(video.video_id)}
      target="_blank"
      rel="noopener noreferrer"
      className={width ? "block shrink-0" : "block w-full"}
      style={width ? { width } : undefined}
    >
      {isShort ? (
        /* 숏폼: 9:16 + 텍스트 오버레이 (기존 디자인 유지) */
        <div className="relative aspect-[9/16] overflow-hidden rounded-[12px] bg-muted">
          {video.thumbnail_url ? (
            <img
              src={video.thumbnail_url}
              alt={video.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full bg-muted" />
          )}

          {rankBadge}
          {heartButton}

          <div className="absolute inset-x-0 bottom-0 bg-white/65 px-2 py-2">
            <p className="line-clamp-2 h-[26px] text-[10px] font-medium leading-[1.3] text-black">
              {video.title}
            </p>
            {subCategoryLabels.length > 0 && (
              <p className="mt-1 line-clamp-1 h-[10px] text-[8px] leading-none text-[hsl(353,75%,55%)]/85">
                {subCategoryLabels.join(" · ")}
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
      ) : (
        /* 롱폼: 16:9 썸네일 + 카드 하단 메타 */
        <div className="overflow-hidden rounded-[12px] bg-card">
          <div className="relative aspect-video overflow-hidden bg-muted">
            {video.thumbnail_url ? (
              <img
                src={video.thumbnail_url}
                alt={video.title}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="h-full w-full bg-muted" />
            )}

            {rankBadge}
            {heartButton}
          </div>

          <div className="px-2 py-2">
            <p className="line-clamp-2 text-[11px] font-medium leading-[1.35] text-foreground">
              {video.title}
            </p>
            {subCategoryLabels.length > 0 && (
              <p className="mt-1 line-clamp-1 text-[9px] leading-none text-primary/85">
                {subCategoryLabels.join(" · ")}
              </p>
            )}
            {keywordTags.length > 0 && (
              <p className="mt-1 line-clamp-1 text-[9px] leading-none text-[#5d9bf0]">
                {keywordTags.map((t) => `#${t}`).join(" ")}
              </p>
            )}
            <p className="mt-1 line-clamp-1 text-[10px] leading-none text-muted-foreground">
              {video.channel_name ?? "채널명"}
            </p>
            <p className="mt-0.5 line-clamp-1 text-[10px] leading-none text-muted-foreground">
              조회수 {formatViews(video.view_count)}
            </p>
          </div>
        </div>
      )}
    </a>
  );
}

export function TipVideoCardSkeleton({ width }: { width?: number }) {
  return (
    <div
      className={width ? "shrink-0" : "w-full"}
      style={width ? { width } : undefined}
    >
      <div className="relative aspect-[9/16] overflow-hidden rounded-[12px] bg-muted">
        <div className="h-full w-full animate-pulse bg-muted/60" />
        <div className="absolute inset-x-0 bottom-0 bg-white/65 px-2 py-2">
          <div className="h-[10px] w-full animate-pulse rounded bg-muted-foreground/15" />
          <div className="mt-1 h-[10px] w-4/5 animate-pulse rounded bg-muted-foreground/15" />
          <div className="mt-1 h-[8px] w-2/5 animate-pulse rounded bg-muted-foreground/10" />
          <div className="mt-1 h-[8px] w-1/3 animate-pulse rounded bg-muted-foreground/10" />
          <div className="mt-1 h-[8px] w-1/2 animate-pulse rounded bg-muted-foreground/10" />
        </div>
      </div>
    </div>
  );
}
