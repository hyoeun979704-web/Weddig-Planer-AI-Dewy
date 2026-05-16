import { cn } from "@/lib/utils";
import { PLACE_VALUE_TAG_OPTIONS } from "@/lib/placeValueTags";
import { useFilterStore } from "@/stores/useFilterStore";

/**
 * Horizontal chip row that surfaces value-based filters (친환경/비건/반려동물/
 * 영문안내) above the venue grid. Persona-simulation v2 권고 #7 후속:
 * S-2 같은 가치 중심 페르소나가 필터 시트 안쪽까지 들어가지 않아도 한 번에
 * 자기 가치축으로 좁힐 수 있도록 칩을 노출.
 *
 * 선택된 태그는 useFilterStore.valueTags 에 저장되어 useVenues 의 .overlaps
 * 쿼리에 그대로 들어간다.
 */
const ValueTagChipRow = () => {
  const valueTags = useFilterStore((s) => s.valueTags);
  const toggleValueTag = useFilterStore((s) => s.toggleValueTag);

  return (
    <div className="px-4 pb-2">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {PLACE_VALUE_TAG_OPTIONS.map((opt) => {
          const active = valueTags.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleValueTag(opt.value)}
              title={opt.hint}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors",
                active
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-card border-border text-muted-foreground hover:border-foreground/30",
              )}
            >
              <span aria-hidden>{opt.emoji}</span>
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ValueTagChipRow;
