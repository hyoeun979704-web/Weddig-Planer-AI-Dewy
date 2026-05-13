import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CATEGORY_LABELS,
  SKIPPABLE_CATEGORIES,
  WEDDING_STYLE_PRESETS,
  defaultExclusionsFor,
  inferStyleFromExclusions,
  type SkippableCategory,
  type WeddingStyle,
} from "@/lib/weddingStyle";

interface Props {
  style: WeddingStyle | null;
  excluded: string[];
  onChange: (next: { style: WeddingStyle; excluded: string[] }) => void;
  /** Hide the description block above the presets (e.g. when embedded). */
  compact?: boolean;
}

const presetOrder: Array<keyof typeof WEDDING_STYLE_PRESETS> = ["general", "small", "self"];

const WeddingStylePicker = ({ style, excluded, onChange, compact }: Props) => {
  const handlePreset = (preset: keyof typeof WEDDING_STYLE_PRESETS) => {
    onChange({ style: preset, excluded: defaultExclusionsFor(preset) });
  };

  const handleCategoryToggle = (cat: SkippableCategory) => {
    const isExcluded = excluded.includes(cat);
    const next = isExcluded ? excluded.filter(c => c !== cat) : [...excluded, cat];
    onChange({ style: inferStyleFromExclusions(next), excluded: next });
  };

  return (
    <div className="space-y-4">
      {!compact && (
        <p className="text-[13px] text-gray-500 leading-relaxed">
          준비 과정 중 생략할 카테고리를 골라주세요. 프리셋을 선택한 뒤 아래에서 개별 조정할 수 있어요.
        </p>
      )}

      {/* Presets */}
      <div className="grid grid-cols-3 gap-2">
        {presetOrder.map((p) => {
          const preset = WEDDING_STYLE_PRESETS[p];
          const isActive = style === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => handlePreset(p)}
              className={cn(
                "px-3 py-2.5 rounded-xl border text-left transition-colors",
                isActive ? "border-primary bg-primary/5" : "border-gray-200 bg-white hover:border-gray-300"
              )}
            >
              <p className={cn("text-sm font-semibold", isActive ? "text-primary" : "text-gray-800")}>{preset.label}</p>
            </button>
          );
        })}
      </div>
      {style && (
        <p className="text-[11px] text-gray-500">
          {style === "custom" ? "직접 선택한 조합이에요" : WEDDING_STYLE_PRESETS[style].description}
        </p>
      )}

      {/* Category checklist */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-gray-700">제외할 카테고리</p>
        {SKIPPABLE_CATEGORIES.map((cat) => {
          const meta = CATEGORY_LABELS[cat];
          const isExcluded = excluded.includes(cat);
          return (
            <label
              key={cat}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 border rounded-xl cursor-pointer transition-colors",
                isExcluded ? "border-primary/40 bg-primary/5" : "border-gray-200 bg-white"
              )}
            >
              <input
                type="checkbox"
                checked={isExcluded}
                onChange={() => handleCategoryToggle(cat)}
                className="sr-only"
              />
              <span
                className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0",
                  isExcluded ? "bg-primary border-primary" : "border-gray-300"
                )}
                aria-hidden
              >
                {isExcluded && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm", isExcluded ? "text-primary font-medium" : "text-gray-800")}>
                  {meta.label}
                </p>
                <p className="text-[11px] text-gray-400">{meta.hint}</p>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default WeddingStylePicker;
