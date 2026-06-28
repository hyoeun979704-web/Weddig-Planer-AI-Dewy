import { X, Check, BadgeCheck } from "lucide-react";
import { formatManwon } from "@dewy/lib";
import { getCompareFields, bestValueIndices } from "@/lib/vendorCompare";
import type { CompareItem } from "@/hooks/useCompareItems";

const COL = "w-36 shrink-0"; // 144px — 모바일에서 2.x열 노출 + 가로 스크롤
const LABEL = "sticky left-0 z-20 w-20 shrink-0 bg-background";

// 업체 비교표 — 좌측 속성열 고정(sticky) + 업체 컬럼 가로 스크롤. 숫자 행은 최적값 강조.
const CompareTable = ({
  items,
  category,
  onRemove,
  onDecide,
  decidedPlaceId,
  showQuote = false,
}: {
  items: CompareItem[];
  category: string;
  onRemove?: (placeId: string) => void;
  onDecide?: (item: CompareItem) => void;
  decidedPlaceId?: string | null;
  showQuote?: boolean;
}) => {
  const fields = getCompareFields(category);
  const details = items.map((i) => i.detail);

  const quoteRange = (q: CompareItem["quote"]): string => {
    if (!q || (q.priceMin == null && q.priceMax == null)) return "—";
    if (q.priceMin != null && q.priceMax != null && q.priceMin !== q.priceMax)
      return `${formatManwon(q.priceMin)}~${formatManwon(q.priceMax)}`;
    return `${formatManwon((q.priceMin ?? q.priceMax) as number)}~`;
  };

  return (
    <div className="overflow-x-auto -mx-4 px-4 pb-1">
      <div className="inline-block min-w-full align-top text-[12px]">
        {/* 헤더 — 업체 썸네일·이름 */}
        <div className="flex border-b border-border">
          <div className={`${LABEL}`} />
          {items.map((it) => (
            <div key={it.placeId} className={`${COL} px-1.5 py-2`}>
              <div className="relative">
                {onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(it.placeId)}
                    className="absolute -top-1 -right-0.5 z-10 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground active:scale-95"
                    aria-label="비교에서 제거"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                <div className="w-full h-16 rounded-lg bg-muted overflow-hidden mb-1">
                  {it.image ? (
                    <img src={it.image} alt={it.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">No img</div>
                  )}
                </div>
                <div className="flex items-start gap-0.5">
                  <p className="font-semibold text-foreground text-[12px] leading-tight line-clamp-2 flex-1">{it.name}</p>
                  {it.detail.is_partner && <BadgeCheck className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 견적 응답가(견적 비교 모드 전용) */}
        {showQuote && (
          <div className="flex border-b border-border bg-amber-50/60">
            <div className={`${LABEL} bg-amber-50/60 flex items-center px-1 py-2 text-[11px] font-bold text-amber-700`}>응답가</div>
            {items.map((it) => (
              <div key={it.placeId} className={`${COL} px-1.5 py-2 font-bold text-amber-700`}>{quoteRange(it.quote)}</div>
            ))}
          </div>
        )}

        {/* 속성 행 — 숫자형은 최적값 강조 */}
        {fields.map((f) => {
          const best = bestValueIndices(f, details);
          return (
            <div key={f.key} className="flex border-b border-border/60">
              <div className={`${LABEL} flex items-center px-1 py-2 text-[11px] text-muted-foreground`}>{f.label}</div>
              {items.map((it, i) => {
                const raw = f.get(it.detail);
                const text = raw == null ? "—" : f.format ? f.format(raw) : String(raw);
                const isBest = best.has(i);
                return (
                  <div
                    key={it.placeId}
                    className={`${COL} px-1.5 py-2 leading-tight ${
                      isBest ? "font-bold text-primary" : "text-foreground"
                    }`}
                  >
                    {text}
                    {isBest && <span className="ml-1 align-middle text-[9px] font-bold text-primary">▲</span>}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* 결정 액션 — 비교 → 보드 기록 루프 */}
        {onDecide && (
          <div className="flex pt-2.5">
            <div className={`${LABEL}`} />
            {items.map((it) => {
              const decided = decidedPlaceId === it.placeId;
              return (
                <div key={it.placeId} className={`${COL} px-1.5`}>
                  <button
                    type="button"
                    onClick={() => onDecide(it)}
                    className={`w-full h-9 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 ${
                      decided ? "bg-emerald-100 text-emerald-700" : "bg-primary text-primary-foreground active:scale-[0.98]"
                    }`}
                  >
                    {decided ? <><Check className="w-3 h-3" /> 결정함</> : "이 업체로 결정"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompareTable;
