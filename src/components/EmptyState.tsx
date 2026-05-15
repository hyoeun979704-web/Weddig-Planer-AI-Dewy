import { cn } from "@/lib/utils";
import type { EmptyCopy } from "@/lib/emptyCopy";

interface EmptyStateProps extends EmptyCopy {
  // compact: 가로 스크롤 안쪽처럼 좁은 공간에서 한 줄로 표시할 때
  // card: 섹션 단독 placeholder. 부드러운 카드 형태.
  variant?: "card" | "compact" | "inline";
  className?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const EmptyState = ({
  emoji,
  title,
  description,
  variant = "card",
  className,
  action,
}: EmptyStateProps) => {
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-full bg-[hsl(var(--pink-50))] text-[12px]",
          className
        )}
      >
        <span aria-hidden>{emoji}</span>
        <span className="text-foreground/70 whitespace-pre-line">{title}</span>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center text-center py-8 px-4",
          className
        )}
      >
        <div className="text-[32px] leading-none mb-2" aria-hidden>{emoji}</div>
        <p className="text-[13px] font-semibold text-foreground/75 whitespace-pre-line leading-snug">
          {title}
        </p>
        {description && (
          <p className="text-[11px] text-muted-foreground/80 mt-1.5 whitespace-pre-line">
            {description}
          </p>
        )}
      </div>
    );
  }

  // default: card
  return (
    <div
      className={cn(
        "relative w-full rounded-2xl bg-gradient-to-br from-[hsl(var(--pink-50))] to-background border border-border/40 px-5 py-7 flex flex-col items-center text-center overflow-hidden",
        className
      )}
    >
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-primary/8 blur-2xl" aria-hidden />
      <div className="text-[40px] leading-none mb-3 relative z-10" aria-hidden>{emoji}</div>
      <p className="relative z-10 text-[14px] font-bold text-foreground/85 leading-snug whitespace-pre-line">
        {title}
      </p>
      {description && (
        <p className="relative z-10 text-[12px] text-muted-foreground mt-2 whitespace-pre-line leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="relative z-10 mt-4 px-4 py-2 rounded-full bg-primary text-primary-foreground text-[12px] font-bold active:scale-[0.98] transition-transform"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
