import { useEffect, useMemo, useState } from "react";
import SurveyModal from "./SurveyModal";
import { REGIONS, BUDGET_OPTIONS_VENUE, WEDDING_STYLES } from "./constants";
import { useWeddingFormContext } from "@/hooks/useWeddingFormContext";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import type { CeremonyType } from "@/lib/weddingPersona";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

// Round 10 — ceremony_type → WEDDING_STYLES 칩 매핑. picker fatigue 완화.
// ceremony_type 이 명시돼있으면 그 의도와 일치하는 venue style 을 prefill 한다.
const CEREMONY_TYPE_TO_STYLES: Partial<Record<CeremonyType, string[]>> = {
  hotel: ["호텔 웨딩"],
  small_real: ["스몰웨딩 (50인 이하)"],
  restaurant: ["스몰웨딩 (50인 이하)"],
  outdoor: ["야외 가든"],
  public_facility: ["스몰웨딩 (50인 이하)"],
};

const VenueSurvey = ({ isOpen, onClose, onSubmit }: Props) => {
  const { defaultWeddingDate, defaultRegion, defaultGuests, defaultVenueBudgetLabel } = useWeddingFormContext();
  const { weddingSettings } = useWeddingSchedule();
  const [date, setDate] = useState<Date>();
  const [region, setRegion] = useState("");
  const [guests, setGuests] = useState("");
  const [budgetLabel, setBudgetLabel] = useState("");
  const [styles, setStyles] = useState<string[]>([]);
  const [parking, setParking] = useState("");
  const [meal, setMeal] = useState("");
  const [special, setSpecial] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  // 달력의 각 날짜 셀마다 new Date() 를 만들지 않도록 기준 '오늘'을 한 번만 생성.
  const today = useMemo(() => new Date(), []);

  // 저장된 결혼일·지역·하객 수 + ceremony_type + 식장 예산으로 prefill.
  // Round 11 self-review fix — styles 는 styles.length===0 일 때만 prefill. 재오픈 시
  // 사용자가 이전 세션에서 수동 선택한 값을 ceremony_type 매핑으로 덮어쓰지 않도록.
  useEffect(() => {
    if (!isOpen) return;
    if (defaultWeddingDate) setDate(defaultWeddingDate);
    setRegion(defaultRegion ?? "");
    setGuests(defaultGuests ?? "");
    // Round 14 — 식장 예산 prefill (budgetSettings.category_budgets.venue → BUDGET_OPTIONS_VENUE 라벨).
    if (defaultVenueBudgetLabel && budgetLabel === "") setBudgetLabel(defaultVenueBudgetLabel);
    const prefilledStyles = weddingSettings.ceremony_type
      ? CEREMONY_TYPE_TO_STYLES[weddingSettings.ceremony_type] ?? []
      : [];
    if (prefilledStyles.length > 0 && styles.length === 0) setStyles(prefilledStyles);
    // styles/budgetLabel 은 read-only dependency — guard 가 자체적으로 idempotent 보장.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultWeddingDate, defaultRegion, defaultGuests, defaultVenueBudgetLabel, weddingSettings.ceremony_type]);

  // Round 14 — 모든 required field 가 prefilled 면 단축 진행 버튼 노출. 사용자가
  // 매번 같은 정보 재입력 안 하도록 (A4 picker fatigue 완화).
  const allRequiredPrefilled =
    !!date && !!region && !!guests && !!budgetLabel && styles.length > 0;

  const toggleStyle = (s: string) => setStyles(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const validate = () => {
    const e: Record<string, boolean> = {};
    if (!date) e.date = true;
    if (!region) e.region = true;
    if (!guests) e.guests = true;
    if (!budgetLabel) e.budget = true;
    if (styles.length === 0) e.styles = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const regionObj = REGIONS.find(r => r.searchKey === region);
    const budgetObj = BUDGET_OPTIONS_VENUE.find(b => b.label === budgetLabel);
    onSubmit({
      date: format(date!, "yyyy년 M월 d일"),
      region: regionObj?.searchKey ?? "",
      regionLabel: regionObj?.label ?? "",
      guests,
      budget: budgetObj?.max ?? null,
      budgetLabel: budgetObj?.label ?? "",
      styles,
      parking,
      meal,
      special,
    });
    onClose();
  };

  const labelCls = "block text-sm font-semibold text-gray-800 mb-1.5";
  const reqMark = <span className="text-red-500 ml-0.5">*</span>;
  const errorCls = (field: string) => errors[field] ? "border-red-400 animate-[shake_0.3s_ease-in-out]" : "";
  const helperText = (field: string) => errors[field] ? <p className="text-xs text-red-500 mt-1">필수 입력 항목입니다</p> : null;

  return (
    <SurveyModal isOpen={isOpen} onClose={onClose} title="웨딩홀 추천을 위한 정보 입력">
      <div className="space-y-5">
        {/* Round 14 — 모든 required 가 prefilled 면 단축 진행 카드 노출 (A4 picker fatigue 완화) */}
        {allRequiredPrefilled && (
          <div className="rounded-2xl border border-[#C9A96E]/30 bg-[#FBF5E8] p-3 space-y-2">
            <div className="space-y-0.5">
              <p className="text-[12px] font-bold text-gray-800">저장된 정보로 바로 답변받기</p>
              <p className="text-[11px] text-gray-600">
                {format(date!, "yyyy.MM.dd")} · {REGIONS.find(r => r.searchKey === region)?.label ?? region} · {guests}명 · {budgetLabel} · {styles.join("·")}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              className="w-full py-2 rounded-xl text-white font-bold text-[12px] transition-opacity"
              style={{ background: "linear-gradient(135deg, #F9B8C6, #C9A96E)" }}
            >
              이 정보로 답변받기 →
            </button>
            <p className="text-[10px] text-gray-500 text-center">아래 항목을 바꾸려면 그대로 수정하세요.</p>
          </div>
        )}

        {/* Date */}
        <div>
          <label className={labelCls}>희망 예식 날짜 {reqMark}</label>
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn("w-full flex items-center gap-2 px-3 py-2.5 border rounded-xl text-sm text-left", !date && "text-gray-400", errorCls("date"))}>
                <CalendarIcon className="w-4 h-4" />
                {date ? format(date, "yyyy.MM.dd") : "날짜 선택"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={date} onSelect={setDate} disabled={d => d < today} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          {helperText("date")}
        </div>

        {/* Region */}
        <div>
          <label className={labelCls}>예식 지역 {reqMark}</label>
          <select value={region} onChange={e => setRegion(e.target.value)} className={cn("w-full px-3 py-2.5 border rounded-xl text-sm bg-white", errorCls("region"))}>
            <option value="">선택해주세요</option>
            {REGIONS.map(r => <option key={r.searchKey} value={r.searchKey}>{r.label}</option>)}
          </select>
          {helperText("region")}
        </div>

        {/* Guests */}
        <div>
          <label className={labelCls}>예상 하객 수 {reqMark}</label>
          <div className="relative">
            <input type="number" value={guests} onChange={e => setGuests(e.target.value)} min={10} max={1000} placeholder="예: 150" className={cn("w-full px-3 py-2.5 border rounded-xl text-sm pr-10", errorCls("guests"))} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">명</span>
          </div>
          {helperText("guests")}
        </div>

        {/* Budget */}
        <div>
          <label className={labelCls}>웨딩홀 예산 {reqMark}</label>
          <select value={budgetLabel} onChange={e => setBudgetLabel(e.target.value)} className={cn("w-full px-3 py-2.5 border rounded-xl text-sm bg-white", errorCls("budget"))}>
            <option value="">선택해주세요</option>
            {BUDGET_OPTIONS_VENUE.map(b => <option key={b.label} value={b.label}>{b.label}</option>)}
          </select>
          {helperText("budget")}
        </div>

        {/* Styles */}
        <div>
          <label className={labelCls}>선호 웨딩 스타일 {reqMark} <span className="text-xs text-gray-400 font-normal">(복수 선택)</span></label>
          <div className={cn("flex flex-wrap gap-2", errorCls("styles") && "ring-1 ring-red-400 rounded-xl p-2")}>
            {WEDDING_STYLES.map(s => (
              <button key={s} type="button" onClick={() => toggleStyle(s)} className={cn("px-3 py-1.5 rounded-full text-xs border transition-colors", styles.includes(s) ? "bg-[#C9A96E] text-white border-[#C9A96E]" : "bg-white text-gray-600 border-gray-200 hover:border-[#C9A96E]")}>
                {s}
              </button>
            ))}
          </div>
          {helperText("styles")}
        </div>

        {/* Parking */}
        <div>
          <label className={labelCls}>주차 필수 여부</label>
          <div className="flex gap-2">
            {["필수", "있으면 좋음", "상관없음"].map(v => (
              <button key={v} type="button" onClick={() => setParking(v)} className={cn("flex-1 px-3 py-2 rounded-xl text-xs border transition-colors", parking === v ? "bg-[#C9A96E] text-white border-[#C9A96E]" : "bg-white text-gray-600 border-gray-200")}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Meal */}
        <div>
          <label className={labelCls}>선호 식사 형태</label>
          <div className="flex gap-2 flex-wrap">
            {["뷔페", "한상차림", "코스요리", "상관없음"].map(v => (
              <button key={v} type="button" onClick={() => setMeal(v)} className={cn("px-3 py-2 rounded-xl text-xs border transition-colors", meal === v ? "bg-[#C9A96E] text-white border-[#C9A96E]" : "bg-white text-gray-600 border-gray-200")}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Special */}
        <div>
          <label className={labelCls}>특별 요청사항 <span className="text-xs text-gray-400 font-normal">(선택)</span></label>
          <textarea value={special} onChange={e => setSpecial(e.target.value)} placeholder="예: 야외 포토존 필수, 주차 200대 이상 등" className="w-full px-3 py-2.5 border rounded-xl text-sm resize-none h-20" />
        </div>

        {/* CTA */}
        <button
          onClick={handleSubmit}
          className="w-full py-3 rounded-xl text-white font-bold text-sm transition-opacity"
          style={{ background: "linear-gradient(135deg, #F9B8C6, #C9A96E)" }}
        >
          맞춤 답변 받기 →
        </button>
      </div>
    </SurveyModal>
  );
};

export default VenueSurvey;
