import { useLocation, useNavigate } from "react-router-dom";
import { Share2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import Seo from "@/components/Seo";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { usePromotionalEvents } from "@/hooks/usePromotionalEvents";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import PromoEventCard from "@/components/events/PromoEventCard";
import PartnerDealsSection from "@/components/events/PartnerDealsSection";
import { EVENT_ASSETS } from "@/components/events/eventAssets";

const Events = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { weddingSettings } = useWeddingSchedule();
  const { featured: FEATURED, list: LIVE_EVENTS, isLoading } = usePromotionalEvents(
    weddingSettings.persona_mode,
    weddingSettings.wedding_style,
  );

  const { toast } = useToast();

  const handleShare = async () => {
    const shareData = {
      title: "Dewy 이벤트",
      text: "Dewy에서 진행 중인 이벤트를 확인해보세요",
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url);
        toast({ description: "링크를 복사했어요" });
      }
    } catch {
      // user cancelled — no-op
    }
  };

  return (
    <div className="min-h-screen bg-background app-col mx-auto relative">
      <Seo title="웨딩 이벤트·혜택 | Dewy" description="결혼 준비에 도움되는 이벤트와 혜택을 모았어요. 웨딩 박람회·할인·경품 등 예비부부를 위한 진행 중인 이벤트 확인." path="/events" />
      <PageHeader
        title="이벤트"
        rightExtra={
          <button
            onClick={handleShare}
            aria-label="공유"
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted active:bg-muted/80 transition-colors"
          >
            <Share2 className="w-5 h-5 text-muted-foreground" />
          </button>
        }
      />

      <main className="pb-24">
        {/* Hero */}
        <section
          className="px-5 pt-7 pb-7"
          style={{
            background:
              "linear-gradient(135deg, #DDEEFB 0%, #A8D2F0 55%, #6FB3DF 110%)",
          }}
        >
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/60 text-[11px] font-bold text-[#1B6BA8]">
            진행중 이벤트 {LIVE_EVENTS.filter((e) => e.status !== "ended").length + (FEATURED ? 1 : 0)}
          </span>
          <h2 className="mt-3 text-[26px] font-extrabold text-foreground leading-tight">Dewy 이벤트</h2>
          <p className="mt-1 text-[13px] font-medium text-[#1B6BA8] leading-relaxed">
            가입·공유·미션으로 받는 보상<br />포인트·하트·프리미엄까지
          </p>
        </section>

        {/* Featured large card — DB driven. 로딩 중엔 스켈레톤. */}
        {FEATURED && (
          <section className="px-4 pt-5">
            <button
              onClick={() => navigate(FEATURED.ctaPath)}
              className="w-full rounded-2xl overflow-hidden border border-border/60 bg-card active:scale-[0.99] transition-transform text-left"
            >
              <div className={cn("px-4 pt-4 pb-5 bg-gradient-to-br flex items-center gap-3", FEATURED.thumbBg ?? "from-muted to-muted")}>
                <div className="flex-1 min-w-0">
                  {FEATURED.badgeLabel && (
                    <span className={cn(
                      "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold",
                      FEATURED.badgeColor ?? "bg-foreground text-background",
                    )}>
                      {FEATURED.badgeLabel}
                    </span>
                  )}
                  <p className="mt-2 text-[18px] font-extrabold text-foreground leading-snug">{FEATURED.title}</p>
                  {FEATURED.subtitle && (
                    <p className="mt-1 text-[12px] font-medium text-[#6B3F10]">{FEATURED.subtitle}</p>
                  )}
                </div>
                {EVENT_ASSETS[FEATURED.slug] && (
                  <img
                    src={EVENT_ASSETS[FEATURED.slug]}
                    alt=""
                    aria-hidden
                    className="w-20 h-20 object-contain flex-shrink-0"
                  />
                )}
              </div>
              <div className="flex items-center justify-end px-4 py-3">
                <span className="px-4 py-2 rounded-lg bg-foreground text-background text-[12px] font-bold">
                  {FEATURED.ctaLabel}
                </span>
              </div>
            </button>
          </section>
        )}

        {/* Live events list */}
        <section className="px-4 pt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-bold text-foreground">진행중 이벤트</h3>
          </div>
          <div className="flex flex-col gap-2">
            {isLoading && LIVE_EVENTS.length === 0 ? (
              <>
                <div className="h-16 rounded-2xl bg-muted/40 animate-pulse" />
                <div className="h-16 rounded-2xl bg-muted/40 animate-pulse" />
              </>
            ) : (
              LIVE_EVENTS.map((e) => <PromoEventCard key={e.id} event={e} />)
            )}
          </div>
        </section>

        {/* 파트너(입점 업체) 혜택 — 행이 없으면 렌더되지 않음 */}
        <PartnerDealsSection />
      </main>

      <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Events;
