import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { PromotionalEvent } from "@/hooks/usePromotionalEvents";
import { EVENT_ASSETS } from "./eventAssets";

// 진행 중 이벤트 리스트 한 줄. ctaPath 는 훅(usePromotionalEvents)에서 이미
// 로그인 여부에 맞게 해석됨(비로그인→/auth, 로그인+welcome→/premium)이라
// 여기서는 그대로 navigate 만 한다. ended 카드는 회색·클릭 비활성.
const PromoEventCard = ({ event }: { event: PromotionalEvent }) => {
  const navigate = useNavigate();
  const isEnded = event.status === "ended";
  const asset = EVENT_ASSETS[event.slug];

  return (
    <button
      type="button"
      onClick={() => { if (!isEnded) navigate(event.ctaPath); }}
      disabled={isEnded}
      aria-disabled={isEnded}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-transform",
        isEnded ? "bg-muted/60 border-transparent" : "bg-card border-border/60 active:scale-[0.99]",
      )}
    >
      {asset ? (
        <img
          src={asset}
          alt=""
          aria-hidden
          className={cn(
            "w-14 h-14 object-contain flex-shrink-0",
            isEnded && "opacity-50 grayscale",
          )}
        />
      ) : (
        <div
          className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br",
            event.thumbBg ?? "from-muted to-muted",
            isEnded && "opacity-50 grayscale",
          )}
        >
          {event.icon && <span className="text-[28px]" aria-hidden>{event.icon}</span>}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {event.badgeLabel && (
            <span className={cn(
              "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0",
              event.badgeColor ?? "bg-foreground text-background",
            )}>
              {event.badgeLabel}
            </span>
          )}
          <p className={cn("text-[13px] font-bold truncate", isEnded ? "text-muted-foreground" : "text-foreground")}>
            {event.title}
          </p>
        </div>
        {event.subtitle && (
          <p className="text-[11px] text-muted-foreground leading-snug line-clamp-1">{event.subtitle}</p>
        )}
      </div>

      {isEnded ? (
        <span className="flex-shrink-0 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-[11px] font-bold">
          {event.endsLabel ?? "종료"}
        </span>
      ) : (
        <span className="flex-shrink-0 px-3 py-1.5 rounded-full bg-[hsl(var(--pink-50))] text-primary text-[11px] font-bold whitespace-nowrap">
          {event.ctaLabel}
        </span>
      )}
    </button>
  );
};

export default PromoEventCard;
