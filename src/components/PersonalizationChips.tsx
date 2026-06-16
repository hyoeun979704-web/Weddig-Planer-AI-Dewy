import { Sparkles } from "lucide-react";

/**
 * "내 정보가 반영돼요" 칩 — 퍼스널컬러 컨설팅·선호 메모리 등에서 합성한 개인화 신호를
 * 추천 surface 상단에 노출한다(유기성 배선 가시화). 칩이 없으면 아무것도 렌더하지 않음.
 */
export const PersonalizationChips = ({ chips }: { chips: string[] }) => {
  if (!chips.length) return null;
  return (
    <section className="mb-5 p-3 bg-violet-50 rounded-xl border border-violet-100">
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="w-4 h-4 text-violet-500" />
        <p className="text-[12px] font-semibold text-violet-900">
          내 정보가 추천에 반영돼요
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <span
            key={c}
            className="px-2.5 py-1 rounded-full bg-white border border-violet-200 text-[11px] text-violet-800"
          >
            {c}
          </span>
        ))}
      </div>
    </section>
  );
};

export default PersonalizationChips;
