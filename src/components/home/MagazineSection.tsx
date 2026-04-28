import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { CategoryTab } from "./CategoryTabBar";
import {
  useTipVideos,
  youTubeUrl,
  type TipVideo,
} from "@/hooks/useTipVideos";

const CARD_W = 130;
const THUMB_H = Math.round((CARD_W * 16) / 9);

function formatViews(n: number): string {
  if (n >= 10_000) {
    return `${(n / 10_000).toFixed(1).replace(/\.0$/, "")}만회`;
  }
  return `${n.toLocaleString()}회`;
}

function VideoCard({ video }: { video: TipVideo }) {
  return (
    <a
      href={youTubeUrl(video.video_id)}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex-shrink-0 overflow-hidden rounded-[18px] bg-[#f6f0f2] shadow-sm transition-shadow hover:shadow-md active:scale-[0.98]"
      style={{ width: CARD_W }}
    >
      <div
        className="relative overflow-hidden bg-[#d9d9d9]"
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
          <div className="flex h-full w-full items-center justify-center text-3xl">
            🎥
          </div>
        )}

        <button
          type="button"
          aria-label="좋아요"
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm"
          onClick={(e) => e.preventDefault()}
        >
          <Heart className="h-4 w-4 text-rose-400" />
        </button>
      </div>

      <div className="bg-white px-3 py-2.5">
        <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-black">
          {video.title}
        </p>

        <p className="mt-1 line-clamp-1 text-[11px] text-black/60">
          {video.channel_name ?? "채널명 없음"}
        </p>

        <p className="text-[11px] text-black/60">
          조회수 {formatViews(video.view_count)}
        </p>
      </div>
    </a>
  );
}

function CardSkeleton() {
  return (
    <div
      className="flex-shrink-0 overflow-hidden rounded-[18px] bg-[#f6f0f2]"
      style={{ width: CARD_W }}
    >
      <div
        className="animate-pulse bg-muted"
        style={{ height: THUMB_H }}
      />
      <div className="space-y-1.5 bg-white px-3 py-2.5">
        <div className="h-3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

type MagazineSectionProps = {
  selectedCategory: CategoryTab;
};

export default function MagazineSection({
  selectedCategory,
}: MagazineSectionProps) {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useTipVideos(selectedCategory);

  return (
    <section className="bg-[#f6eef1] px-5 py-6">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[20px] font-bold text-[#1f1f1f]">오늘의 꿀팁</h2>
          <button
            type="button"
            onClick={() => navigate("/magazine")}
            className="text-sm font-medium text-[#6b6b6b] transition-colors hover:text-black"
          >
            더보기
          </button>
        </div>

        {isLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-muted-foreground">
            영상을 불러오지 못했어요.
          </div>
        ) : !data || data.length === 0 ? (
          <div className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-muted-foreground">
            표시할 영상이 아직 없어요.
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {data.map((video) => (
              <VideoCard key={video.video_id} video={video} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
