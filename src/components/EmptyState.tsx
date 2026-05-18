import { cn } from "@/lib/utils";
import type { EmptyCopy } from "@/lib/emptyCopy";

interface EmptyStateProps extends EmptyCopy {
  // card: 섹션 단독 placeholder (기본)
  // compact: 가로 스크롤 안쪽처럼 좁은 공간에서 한 줄로
  // inline: 페이지 가운데에 들어갈 때, 카드 장식 없이
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
          "flex items-center gap-2 px-3 py-2 rounded-full bg-card border border-border text-caption text-muted-foreground",
          className
        )}
      >
        {emoji && <span aria-hidden>{emoji}</span>}
        <span className="whitespace-pre-line">{title}</span>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center text-center py-10 px-4",
          className
        )}
      >
        {emoji && <div className="text-2xl mb-2" aria-hidden>{emoji}</div>}
        <p className="text-body font-semibold text-foreground whitespace-pre-line">
          {title}
        </p>
        {description && (
          <p className="text-caption text-muted-foreground mt-1 whitespace-pre-line">
            {description}
          </p>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className="mt-4 px-4 py-2 rounded-full bg-primary text-primary-foreground text-caption font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all"
          >
            {action.label}
          </button>
        )}
      </div>
    );
  }

  // default: card — 미니멀 (그라데이션·blur 장식 제거)
  return (
    <div
      className={cn(
        "w-full rounded-2xl bg-card border border-border px-5 py-8 flex flex-col items-center text-center",
        className
      )}
    >
      {emoji && <div className="text-3xl mb-3" aria-hidden>{emoji}</div>}
      <p className="text-body font-semibold text-foreground whitespace-pre-line">
        {title}
      </p>
      {description && (
        <p className="text-caption text-muted-foreground mt-1.5 whitespace-pre-line leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-5 py-2 rounded-full bg-primary text-primary-foreground text-caption font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
