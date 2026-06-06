import { useState } from "react";
import { Search, X, Store } from "lucide-react";
import { useVendorSearch, type VendorLite } from "@/hooks/useCommunityPlaces";
import { joinRegion } from "@/lib/placeMappers";

// 글에 업체를 태그하는 피커. 선택된 업체는 칩으로 표시, 검색 결과에서 추가.
interface VendorTagPickerProps {
  value: VendorLite[];
  onChange: (vendors: VendorLite[]) => void;
  max?: number;
}

const VendorTagPicker = ({ value, onChange, max = 3 }: VendorTagPickerProps) => {
  const [query, setQuery] = useState("");
  const { data: results = [], isFetching } = useVendorSearch(query);

  const add = (v: VendorLite) => {
    if (value.some((x) => x.place_id === v.place_id)) return;
    if (value.length >= max) return;
    onChange([...value, v]);
    setQuery("");
  };
  const remove = (placeId: string) => onChange(value.filter((x) => x.place_id !== placeId));

  const region = (v: VendorLite) => joinRegion(v.city, v.district) ?? "";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Store className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">업체 태그</span>
        <span className="text-xs text-muted-foreground">(선택 · 최대 {max}개)</span>
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v) => (
            <span key={v.place_id} className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              {v.name}
              <button type="button" onClick={() => remove(v.place_id)} aria-label="태그 제거" className="p-0.5 hover:bg-primary/20 rounded-full">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {value.length < max && (
        <div className="relative">
          <div className="flex items-center gap-2 rounded-xl border border-border px-3 py-2">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="웨딩홀·스튜디오 등 업체명 검색"
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          {query.trim().length >= 1 && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto">
              {isFetching && <p className="px-3 py-2.5 text-xs text-muted-foreground">검색 중…</p>}
              {!isFetching && results.length === 0 && (
                <p className="px-3 py-2.5 text-xs text-muted-foreground">검색 결과가 없어요.</p>
              )}
              {results.map((v) => (
                <button
                  key={v.place_id}
                  type="button"
                  onClick={() => add(v)}
                  className="w-full text-left px-3 py-2.5 hover:bg-muted/50 flex items-center gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{v.name}</p>
                    {region(v) && <p className="text-[11px] text-muted-foreground truncate">{region(v)}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VendorTagPicker;
