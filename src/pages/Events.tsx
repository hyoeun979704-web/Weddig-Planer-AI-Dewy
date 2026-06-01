import { useLocation, useNavigate } from "react-router-dom";
import { Share2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import Seo from "@/components/Seo";
import DailyBenefitChallenge from "@/components/events/DailyBenefitChallenge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { usePromotionalEvents, type PromotionalEvent } from "@/hooks/usePromotionalEvents";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";

const EventListRow = ({ event }: { event: PromotionalEvent }) => {
  const navigate = useNavigate();
  const isEnded = event.status === "ended";
  return (
    <button
      onClick={() => navigate(event.ctaPath)}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-2xl border text-left active:scale-[0.99] transition-transform",
        isEnded ? "bg-muted/60 border-transparent" : "bg-card border-border/60"
      )}
    >
      <div
        className={cn(
          "w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br",
          event.thumbBg ?? "from-muted to-muted"
        )}
      >
        {event.icon && <span className="text-[28px]" aria-hidden>{event.icon}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-[13px] font-bold truncate", isEnded ? "text-muted-foreground" : "text-foreground")}>
          {event.title}
        </p>
        {event.subtitle && (
          <p className="text-[11px] text-muted-foreground leading-snug line-clamp-1">{event.subtitle}</p>
        )}
      </div>
      {!isEnded && (
        <span className="flex-shrink-0 px-3 py-1.5 rounded-full bg-[hsl(var(--pink-50))] text-primary text-[11px] font-bold">
          {event.ctaLabel}
        </span>
      )}
    </button>
  );
};

const Events = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
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
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
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

      <main className="pb-40">
        {/* Hero — Dewy 브랜드 핑크 그라데이션 */}
        <section
          className="px-5 pt-7 pb-7"
          style={{
            background:
              "linear-gradient(135deg, #FFF1F4 0%, #FBC7D2 55%, #F6909B 110%)",
          }}
        >
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/70 text-[11px] font-bold text-[#B23A53]">
            진행중 이벤트 {LIVE_EVENTS.length + (FEATURED ? 1 : 0)}
          </span>
          <h2 className="mt-3 text-[26px] font-extrabold text-foreground leading-tight">Dewy 이벤트</h2>
          <p className="mt-1 text-[13px] font-medium text-[#B23A53] leading-relaxed">
            가입·공유·미션으로 받는 보상<br />포인트·하트·프리미엄까지
          </p>
        </section>

        {/* 데일리 혜택 챌린지 — 레퍼런스 모티프를 브랜드 톤으로 번안 */}
        <DailyBenefitChallenge />

        {/* Featured large card — DB driven. 로딩 중엔 스켈레톤. */}
        {FEATURED && (
          <section className="px-4 pt-5">
            <button
              onClick={() => navigate(user ? FEATURED.ctaPath : "/auth")}
              className="w-full rounded-2xl overflow-hidden border border-border/60 bg-card active:scale-[0.99] transition-transform text-left"
            >
              <div className={cn("px-4 pt-4 pb-5 bg-gradient-to-br", FEATURED.thumbBg ?? "from-muted to-muted")}>
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
            <h3 className="text-[14px] font-bold text-foreground">
              진행중 이벤트 {isLoading ? "" : LIVE_EVENTS.length}
            </h3>
          </div>
          <div className="flex flex-col gap-2">
            {isLoading && LIVE_EVENTS.length === 0 ? (
              <>
                <div className="h-16 rounded-2xl bg-muted/40 animate-pulse" />
                <div className="h-16 rounded-2xl bg-muted/40 animate-pulse" />
              </>
            ) : (
              LIVE_EVENTS.map((e) => <EventListRow key={e.id} event={e} />)
            )}
          </div>
        </section>
      </main>

      {/* 한정 혜택 sticky CTA — 레퍼런스 하단 고정 배너 차용 */}
      <button
        onClick={() => navigate("/coupons")}
        className="fixed left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[398px] z-40 py-3.5 rounded-full text-white text-[14px] font-extrabold shadow-lg active:scale-[0.99] transition-transform"
        style={{
          bottom: "calc(var(--app-bottom-nav-total-height) + 12px)",
          background: "linear-gradient(135deg, #FBA9B8 0%, #F6909B 100%)",
        }}
      >
        20:00 한정! 웨딩 30% 할인 쿠폰
      </button>

      <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Events;
