import { useLocation, useNavigate } from "react-router-dom";
import { Share2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface EventCard {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  cta: string;
  ctaPath: string;
  thumbBg: string;
  status: "live" | "ended";
  badge?: { label: string; color: string };
  endsLabel?: string;
}

// Static catalog for now — once we have a partner_events / promotions table
// these can be backed by Supabase. The shape mirrors what we'd query so
// migration is a drop-in replacement.
const FEATURED: EventCard = {
  id: "welcome",
  icon: "",
  title: "신규 가입 1달 프리미엄 무료",
  subtitle: "AI 플래너 무제한 + 예산 분석 PDF + 보너스 하트",
  cta: "지금 시작",
  ctaPath: "/auth",
  thumbBg: "from-[#FFEBC9] to-[#F5BE7A]",
  status: "live",
  badge: { label: "HOT", color: "bg-[#A86311] text-white" },
  endsLabel: "종료 D-12",
};

const LIVE_EVENTS: EventCard[] = [
  {
    id: "referral",
    icon: "",
    title: "친구 초대 1명당 1,000P",
    subtitle: "초대받은 친구도 500P · 무제한 적립",
    cta: "초대하기",
    ctaPath: "/mypage?tab=invite",
    thumbBg: "from-[#F3F8ED] to-[#DDEEDC]",
    status: "live",
  },
  {
    id: "attendance",
    icon: "",
    title: "미션 출석 7일 도전",
    subtitle: "연속 출석 시 보너스 하트 +5",
    cta: "미션 보기",
    ctaPath: "/mypage?tab=missions",
    thumbBg: "from-[#F5EFFB] to-[#E0CFFB]",
    status: "live",
  },
  {
    id: "review",
    icon: "",
    title: "본식 사진 후기 작성",
    subtitle: "리뷰 작성 시 3,000P 즉시 적립",
    cta: "후기 쓰기",
    ctaPath: "/community/new",
    thumbBg: "from-[#F1F4FB] to-[#CFDDF5]",
    status: "live",
  },
];

const PAST_EVENTS: EventCard[] = [
  {
    id: "mothers-day",
    icon: "",
    title: "어머니의 날 후기 이벤트",
    subtitle: "2026.05.01 ~ 05.08 · 종료",
    cta: "결과 보기",
    ctaPath: "/community?event=mothers-day",
    thumbBg: "from-muted to-muted",
    status: "ended",
  },
];

const EventListRow = ({ event }: { event: EventCard }) => {
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
          event.thumbBg
        )}
      >
        {event.icon && <span className="text-display" aria-hidden>{event.icon}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-[13px] font-bold truncate", isEnded ? "text-muted-foreground" : "text-foreground")}>
          {event.title}
        </p>
        <p className="text-caption text-muted-foreground leading-snug line-clamp-1">{event.subtitle}</p>
      </div>
      {!isEnded && (
        <span className="flex-shrink-0 px-3 py-1.5 rounded-full bg-[hsl(var(--pink-50))] text-primary text-caption font-bold">
          {event.cta}
        </span>
      )}
    </button>
  );
};

const Events = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

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
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/60 text-caption font-bold text-[#1B6BA8]">
            진행중 이벤트 {LIVE_EVENTS.length + 1}
          </span>
          <h2 className="mt-3 text-[26px] font-extrabold text-foreground leading-tight">Dewy 이벤트</h2>
          <p className="mt-1 text-[13px] font-medium text-[#1B6BA8] leading-relaxed">
            가입·공유·미션으로 받는 보상<br />포인트·하트·프리미엄까지
          </p>
        </section>

        {/* Featured large card */}
        <section className="px-4 pt-5">
          <button
            onClick={() => navigate(user ? FEATURED.ctaPath : "/auth")}
            className="w-full rounded-2xl overflow-hidden border border-border/60 bg-card active:scale-[0.99] transition-transform text-left"
          >
            <div className={cn("px-4 pt-4 pb-5 bg-gradient-to-br", FEATURED.thumbBg)}>
              {FEATURED.badge && (
                <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold", FEATURED.badge.color)}>
                  {FEATURED.badge.label}
                </span>
              )}
              <p className="mt-2 text-[18px] font-extrabold text-foreground leading-snug">{FEATURED.title}</p>
              <p className="mt-1 text-[12px] font-medium text-[#6B3F10]">{FEATURED.subtitle}</p>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex flex-col text-caption">
                <span className="font-semibold text-muted-foreground">참여 1,287명 · 만족 4.8</span>
                {FEATURED.endsLabel && <span className="font-bold text-primary">{FEATURED.endsLabel}</span>}
              </div>
              <span className="px-4 py-2 rounded-lg bg-foreground text-background text-[12px] font-bold">
                {FEATURED.cta}
              </span>
            </div>
          </button>
        </section>

        {/* Live events list */}
        <section className="px-4 pt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-body font-bold text-foreground">진행중 이벤트 {LIVE_EVENTS.length}</h3>
          </div>
          <div className="flex flex-col gap-2">
            {LIVE_EVENTS.map((e) => (
              <EventListRow key={e.id} event={e} />
            ))}
          </div>
        </section>

        {/* Past events */}
        {PAST_EVENTS.length > 0 && (
          <section className="px-4 pt-7">
            <h3 className="text-body font-bold text-muted-foreground mb-3">지난 이벤트</h3>
            <div className="flex flex-col gap-2">
              {PAST_EVENTS.map((e) => (
                <EventListRow key={e.id} event={e} />
              ))}
            </div>
          </section>
        )}
      </main>

      <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Events;
