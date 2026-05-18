import { cn } from "@/lib/utils";

export type SortMode = "popular" | "latest";

interface SortToggleProps {
  value: SortMode;
  onChange: (v: SortMode) => void;
}

const SortToggle = ({ value, onChange }: SortToggleProps) => (
  <div className="flex items-center gap-1 text-xs">
    <button
      onClick={() => onChange("popular")}
      className={cn(
        "px-2 py-1 rounded transition-colors active:opacity-70",
        value === "popular" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
      )}
    >
      인기순
    </button>
    <span className="text-border" aria-hidden>|</span>
    <button
      onClick={() => onChange("latest")}
      className={cn(
        "px-2 py-1 rounded transition-colors active:opacity-70",
        value === "latest" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
      )}
    >
      최신순
    </button>
  </div>
);

export default SortToggle;
