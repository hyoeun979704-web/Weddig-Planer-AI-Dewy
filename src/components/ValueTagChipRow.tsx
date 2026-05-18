import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PLACE_VALUE_TAG_OPTIONS } from "@/lib/placeValueTags";
import { useFilterStore } from "@/stores/useFilterStore";
import { useValueTagAvailability } from "@/hooks/useValueTagAvailability";
import { trackEvent } from "@/lib/track";

interface Props {
  /** 카테고리(places.category) — 가용성 조회에 사용. 기본 wedding_hall. */
  placeCategory?: string;
}

/**
 * Horizontal chip row that surfaces value-based filters (친환경/비건/반려동물/
 * 영문안내) above the venue grid. Persona-simulation v2 권고 #7 후속:
 * S-2 같은 가치 중심 페르소나가 필터 시트 안쪽까지 들어가지 않아도 한 번에
 * 자기 가치축으로 좁힐 수 있도록 칩을 노출.
 *
 * **W1 가드(회고 반영)** — places.tags 에 실제 데이터가 0건일 가능성이 있어,
 * 가용성 훅으로 카테고리별 매칭 수를 받아 0건 칩은 disabled + "준비 중"
 * 으로 표시한다. 모든 칩이 0이면 행 자체를 숨겨 빈 필터 노출을 피함.
 *
 * 선택된 태그는 useFilterStore.valueTags 에 저장되어 useVenues 의 .overlaps
 * 쿼리에 그대로 들어간다.
 */
const ValueTagChipRow = ({ placeCategory = "wedding_hall" }: Props) => {
  const valueTags = useFilterStore((s) => s.valueTags);
  const toggleValueTag = useFilterStore((s) => s.toggleValueTag);
  const availability = useValueTagAvailability(placeCategory);

  const counts = availability.data;

  // 가용성 데이터가 없는 동안(로딩/에러)에는 칩 행 자체를 숨겨 FOUC 와
  // 짧은 비활성화를 피한다. 데이터가 들어와서 4건 모두 0 이어도 숨김 —
  // 사용자에게 "필터를 켜도 빈 결과" 노출을 막는 게 W1 가드 핵심.
  if (!counts) return null;
  const hasAnyMatches = PLACE_VALUE_TAG_OPTIONS.some((o) => (counts[o.value] ?? 0) > 0);
  if (!hasAnyMatches) return null;

  return (
    <div className="px-4 pb-2">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {PLACE_VALUE_TAG_OPTIONS.map((opt) => {
          const active = valueTags.includes(opt.value);
          const count = counts[opt.value] ?? 0;
          const empty = count === 0;

          const handleClick = () => {
            if (empty) {
              trackEvent("value_tag_click", {
                tag: opt.value,
                category: placeCategory,
                state: "empty",
              });
              toast.info(`${opt.emoji} ${opt.label}`, {
                description: "매칭 데이터를 곧 추가할 예정이에요",
              });
              return;
            }
            trackEvent("value_tag_click", {
              tag: opt.value,
              category: placeCategory,
              state: active ? "deactivate" : "activate",
              count,
            });
            toggleValueTag(opt.value);
          };

          return (
            <button
              key={opt.value}
              type="button"
              onClick={handleClick}
              title={opt.hint}
              aria-disabled={empty}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors",
                empty
                  ? "bg-muted/40 border-border text-muted-foreground/60 cursor-default"
                  : active
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-card border-border text-muted-foreground hover:border-foreground/30",
              )}
            >
              <span aria-hidden>{opt.emoji}</span>
              <span>{opt.label}</span>
              {empty && (
                <span className="text-caption font-semibold ml-0.5 px-1 rounded bg-muted text-muted-foreground">
                  준비 중
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ValueTagChipRow;
