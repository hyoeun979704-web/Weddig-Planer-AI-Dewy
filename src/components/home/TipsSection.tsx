import { useNavigate } from "react-router-dom";
import { CategoryTab } from "./CategoryTabBar";
import { TipVideoCard, TipVideoCardSkeleton } from "@/components/TipVideoCard";
import { usePersonalizedTipVideos } from "@/hooks/usePersonalizedTipVideos";
import EmptyState from "@/components/EmptyState";
import { emptyCopy } from "@/lib/emptyCopy";

const CARD_W = 120;

type TipsSectionProps = {
  activeTab: CategoryTab;
};

export default function TipsSection({ activeTab: _activeTab }: TipsSectionProps) {
  const navigate = useNavigate();
  const { data, isLoading, isError, isPersonalized } = usePersonalizedTipVideos({
    limit: 8,
  });

  return (
    <section className="bg-[#fff1f4] px-5 py-6">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[24px] font-bold leading-none text-black">
            {isPersonalized ? "당신을 위한 꿀팁" : "오늘의 꿀팁"}
          </h2>

          <button
            type="button"
            onClick={() => navigate("/tips")}
            className="text-[12px] text-black/50"
          >
            더보기
          </button>
        </div>

        {isLoading ? (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <TipVideoCardSkeleton key={i} width={CARD_W} />
            ))}
          </div>
        ) : isError ? (
          <div className="text-[12px] text-black/50">
            영상을 불러오지 못했어요.
          </div>
        ) : data.length === 0 ? (
          <EmptyState variant="inline" {...emptyCopy.tipsVideos} />
        ) : (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {data.map((video) => (
              <TipVideoCard key={video.video_id} video={video} width={CARD_W} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
