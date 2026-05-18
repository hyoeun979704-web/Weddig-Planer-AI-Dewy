import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ChipProps {
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}

/**
 * 표준 필터·카테고리 칩.
 * 활성: bg-primary + text-primary-foreground
 * 비활성: bg-muted + text-muted-foreground
 * 크기: px-3 py-1.5 text-body rounded-full
 */
const Chip = ({
  active = false,
  onClick,
  disabled,
  className,
  children,
  "aria-label": ariaLabel,
}: ChipProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={active}
    aria-label={ariaLabel}
    className={cn(
      "flex-shrink-0 px-3 py-1.5 rounded-full text-body font-medium whitespace-nowrap transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100",
      active
        ? "bg-primary text-primary-foreground"
        : "bg-muted text-muted-foreground hover:bg-primary/10",
      className
    )}
  >
    {children}
  </button>
);

export default Chip;
