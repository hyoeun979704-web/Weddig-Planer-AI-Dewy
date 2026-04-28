import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { CategoryTab } from "./CategoryTabBar";
import {
  useTipVideos,
  youTubeUrl,
  type TipVideo,
} from "@/hooks/useTipVideos";

const CARD_W = 120;
const THUMB_H = Math.round((CARD_W * 16) / 9);

function formatViews(n: number): string {
  if (!n) return "0";
  if (n >= 10000) return `${(n / 10000).toFixed(1).replace(/\.0$/, "")}만`;
  return n.toLocaleString();
}

function VideoCard({ video }: { video: TipVideo }) {
  return (
    <a
      href={youTubeUrl(video.video_id)}
      target="_blank"
      rel="noopener noreferrer"
      className="block flex-shrink-0"
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

        {/* 찜 아이콘: 원 배경 없이 아이콘만 */}
        <button
          type="button"
          aria-label="찜하기"
          onClick={(e) => e.preventDefault()}
          className="absolute right-2 top-2"
        >
          <Heart className="h-4 w-4 text-[#f29aa3]" strokeWidth={2} />
        </button>

        {/* 캡션: 썸네일 위에 겹침 */}
        <div className="absolute inset-x-0 bottom-0 px-2 pb-2">
          <div className="bg-white/78 px-2 py-2">
            <p className="line-clamp-2 text-[10px] font-medium leading-[1.3] text-black">
              {video.title}
            </p>
            <p className="mt-1 line-clamp-1 text-[9px] leading-none text-black/45">
            </p>
            <p className="mt-1 line-clamp-1 text-[9px] leading-none text-black/45">
              조회수 {formatViews(video.view_count)}
            </p>
          </div>
        </div>
      </div>
    </a>
  );
}

function CardSkeleton() {
  return (
    <div
      className="flex-shrink-0"
      style={{ width: CARD_W }}
    >
      <div
        className="relative overflow-hidden rounded-[12px] bg-[#cfcfcf]"
        style={{ height: THUMB_H }}
      >
        <div className="h-full w-full animate-pulse bg-[#d8d8d8]" />

        <div className="absolute inset-x-0 bottom-0 px-2 pb-2">
          <div className="bg-white/78 px-2 py-2">
            <div className="h-[10px] w-full animate-pulse rounded bg-[#e5e5e5]" />
            <div className="mt-1 h-[10px] w-4/5 animate-pulse rounded bg-[#e5e5e5]" />
            <div className="mt-2 h-[8px] w-1/3 animate-pulse rounded bg-[#ececec]" />
            <div className="mt-1 h-[8px] w-1/2 animate-pulse rounded bg-[#ececec]" />
          </div>
        </div>
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
  const { data = [], isLoading, isError } = useTipVideos(selectedCategory);

  return (
    <section className="bg-[#f3eaec] px-5 py-6">
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
          <div className="flex gap-3 overflow-x-auto pb-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-[12px] bg-white px-4 py-6 text-center text-[12px] text-black/50">
            영상을 불러오지 못했어요.
          </div>
        ) : data.length === 0 ? (
          <div className="rounded-[12px] bg-white px-4 py-6 text-center text-[12px] text-black/50">
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
