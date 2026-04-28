import { useNavigate } from "react-router-dom";
import { Play } from "lucide-react";
import { CategoryTab } from "./CategoryTabBar";
import { useTipVideos, youTubeUrl, type TipVideo } from "@/hooks/useTipVideos";

// Per design spec: card itself is 9:16 portrait (not just the thumbnail).
// Caption sits on top of the bottom of the thumbnail in a white/50%
// translucent panel — no separate caption row beneath the card.
const CARD_W = 160;

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
      className="relative flex-shrink-0 aspect-[9/16] rounded-[10px] overflow-hidden bg-[#d9d9d9] shadow-sm hover:shadow-md transition-shadow active:scale-[0.98]"
      style={{ width: CARD_W }}
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
      {/* Caption overlay — white/50% backdrop-blur strip across the bottom. */}
      <div className="absolute inset-x-0 bottom-0 px-2.5 py-2 bg-white/50 backdrop-blur-sm">
        <p className="text-[12px] font-semibold text-black leading-snug line-clamp-2">
          {video.title}
        </p>
        <p className="text-[10px] text-black/60 line-clamp-1 mt-0.5">
          {video.channel_name ?? ""} · 조회 {formatViews(video.view_count)}
        </p>
      </div>
    </a>
  );
}

function CardSkeleton() {
  return (
    <div
      className="flex-shrink-0 aspect-[9/16] rounded-[10px] overflow-hidden bg-muted animate-pulse"
      style={{ width: CARD_W }}
    />
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
