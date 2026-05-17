import { useState } from "react";
import SurveyModal from "./SurveyModal";
import { REGIONS, BUDGET_OPTIONS_VENUE, WEDDING_STYLES } from "./constants";
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

const VenueSurvey = ({ isOpen, onClose, onSubmit }: Props) => {
  const [date, setDate] = useState<Date>();
  const [region, setRegion] = useState("");
  const [guests, setGuests] = useState("");
  const [budget, setBudget] = useState("");
  const [styles, setStyles] = useState<string[]>([]);
  const [parking, setParking] = useState("");
  const [meal, setMeal] = useState("");
  const [special, setSpecial] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const toggleStyle = (s: string) => setStyles(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const validate = () => {
    const e: Record<string, boolean> = {};
    if (!date) e.date = true;
    if (!region) e.region = true;
    if (!guests) e.guests = true;
    if (!budget) e.budget = true;
    if (styles.length === 0) e.styles = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({
      date: format(date!, "yyyy년 M월 d일"),
      region,
      guests,
      budget,
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
              <Calendar mode="single" selected={date} onSelect={setDate} disabled={d => d < new Date()} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          {helperText("date")}
        </div>

        {/* Region */}
        <div>
          <label className={labelCls}>예식 지역 {reqMark}</label>
          <select value={region} onChange={e => setRegion(e.target.value)} className={cn("w-full px-3 py-2.5 border rounded-xl text-sm bg-white", errorCls("region"))}>
            <option value="">선택해주세요</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
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
          <select value={budget} onChange={e => setBudget(e.target.value)} className={cn("w-full px-3 py-2.5 border rounded-xl text-sm bg-white", errorCls("budget"))}>
            <option value="">선택해주세요</option>
            {BUDGET_OPTIONS_VENUE.map(b => <option key={b} value={b}>{b}</option>)}
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
