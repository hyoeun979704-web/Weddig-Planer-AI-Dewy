import { useNavigate } from "react-router-dom";
import { Play } from "lucide-react";
import { CategoryTab } from "./CategoryTabBar";
import { useTipVideos, youTubeUrl, type TipVideo } from "@/hooks/useTipVideos";

// 9:16 portrait (Shorts-style) thumbnail. Width unchanged from prior 16:9
// version; the height grows so videos with vertical subjects (most wedding
// content) read well. object-cover crops 16:9 thumbs to the center.
const CARD_W = 130;
const THUMB_H = Math.round((CARD_W * 16) / 9); // 391

function formatViews(n: number): string {
  if (n >= 10_000) return `${(n / 10_000).toFixed(1).replace(/\.0$/, "")}만회`;
  return `${n.toLocaleString()}회`;
}

function VideoCard({ video }: { video: TipVideo }) {
  return (
    <a
      href={youTubeUrl(video.video_id)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-shrink-0 rounded-[10px] overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow active:scale-[0.98]"
      style={{ width: CARD_W }}
    >
      <div
        className="relative bg-[#d9d9d9] overflow-hidden"
        style={{ height: THUMB_H }}
      >
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">🎥</div>
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="w-5 h-5 text-black fill-black ml-0.5" />
          </div>
        </div>
      </div>
      <div className="p-2.5">
        <p className="text-[12px] font-semibold text-black leading-snug line-clamp-2 mb-1">
          {video.title}
        </p>
        <p className="text-[10px] text-muted-foreground line-clamp-1">
          {video.channel_name ?? ""} · 조회 {formatViews(video.view_count)}
        </p>
      </div>
    </a>
  );
}

function CardSkeleton() {
  return (
    <div
      className="flex-shrink-0 rounded-[10px] overflow-hidden bg-white"
      style={{ width: CARD_W }}
    >
      <div className="bg-muted animate-pulse" style={{ height: THUMB_H }} />
      <div className="p-2.5 space-y-1.5">
        <div className="h-3 bg-muted rounded animate-pulse" />
        <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
      </div>
    </div>
  );
}

interface MagazineSectionProps {
  activeTab?: CategoryTab;
}

const MagazineSection = ({ activeTab = "ai-planner" }: MagazineSectionProps) => {
  const navigate = useNavigate();
  // Homepage 오늘의 꿀팁: top picks across all categories.
  const { data: videos, isLoading } = useTipVideos({ limit: 12 });

  const headerTitle = activeTab === "ai-planner" ? "오늘의 꿀팁" : "꿀팁 모아보기";

  return (
    <section className="pt-[10px] pb-[30px] px-[30px] bg-[hsl(var(--pink-200))]">
      <div className="flex items-center justify-between mb-[10px]">
        <h2 className="text-[16px] font-bold text-black">{headerTitle}</h2>
        <button
          onClick={() => navigate("/magazine")}
          className="text-[12px] text-muted-foreground hover:text-foreground"
        >
          전체보기
        </button>
      </div>
      <div className="flex gap-[10px] overflow-x-auto scrollbar-hide">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : videos && videos.length > 0 ? (
          videos.map((v) => <VideoCard key={v.video_id} video={v} />)
        ) : (
          <p className="text-sm text-muted-foreground py-4">
            꿀팁 영상을 수집하고 있어요. 잠시만 기다려주세요.
          </p>
        )}
      </div>
    </section>
  );
};

export default MagazineSection;
