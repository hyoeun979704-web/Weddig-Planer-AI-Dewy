import { useState } from "react";
import SurveyModal from "./SurveyModal";
import { REGIONS, BUDGET_OPTIONS_SDME } from "./constants";
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

const DRESS_OPTIONS = ["국내 브랜드 대여", "해외 브랜드 대여", "드레스 구매", "한복 포함", "미정"];

const SdmeSurvey = ({ isOpen, onClose, onSubmit }: Props) => {
  const [date, setDate] = useState<Date>();
  const [region, setRegion] = useState("");
  const [studioStyle, setStudioStyle] = useState("");
  const [dressOptions, setDressOptions] = useState<string[]>([]);
  const [makeup, setMakeup] = useState("");
  const [album, setAlbum] = useState("");
  const [budget, setBudget] = useState("");
  const [priority, setPriority] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const toggleDress = (d: string) => setDressOptions(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const validate = () => {
    const e: Record<string, boolean> = {};
    if (!date) e.date = true;
    if (!region) e.region = true;
    if (!studioStyle) e.studioStyle = true;
    if (!makeup) e.makeup = true;
    if (!budget) e.budget = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({ date: format(date!, "yyyy년 M월 d일"), region, studioStyle, dressOptions, makeup, album, budget, priority });
    onClose();
  };

  const labelCls = "block text-sm font-semibold text-gray-800 mb-1.5";
  const reqMark = <span className="text-red-500 ml-0.5">*</span>;
  const errorCls = (f: string) => errors[f] ? "border-red-400" : "";
  const helperText = (f: string) => errors[f] ? <p className="text-xs text-red-500 mt-1">필수 입력 항목입니다</p> : null;

  const radioGroup = (options: string[], value: string, onChange: (v: string) => void, field: string) => (
    <div className={cn("flex flex-wrap gap-2", errorCls(field) && "ring-1 ring-red-400 rounded-xl p-2")}>
      {options.map(v => (
        <button key={v} type="button" onClick={() => onChange(v)} className={cn("px-3 py-1.5 rounded-full text-xs border transition-colors", value === v ? "bg-[#C9A96E] text-white border-[#C9A96E]" : "bg-white text-gray-600 border-gray-200 hover:border-[#C9A96E]")}>
          {v}
        </button>
      ))}
    </div>
  );

  return (
    <SurveyModal isOpen={isOpen} onClose={onClose} title="스드메 견적을 위한 정보 입력">
      <div className="space-y-5">
        <div>
          <label className={labelCls}>예식 날짜 {reqMark}</label>
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn("w-full flex items-center gap-2 px-3 py-2.5 border rounded-xl text-sm text-left", !date && "text-gray-400", errorCls("date"))}>
                <CalendarIcon className="w-4 h-4" />{date ? format(date, "yyyy.MM.dd") : "날짜 선택"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={date} onSelect={setDate} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          {helperText("date")}
        </div>

        <div>
          <label className={labelCls}>스드메 이용 지역 {reqMark}</label>
          <select value={region} onChange={e => setRegion(e.target.value)} className={cn("w-full px-3 py-2.5 border rounded-xl text-sm bg-white", errorCls("region"))}>
            <option value="">선택해주세요</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {helperText("region")}
        </div>

        <div>
          <label className={labelCls}>스튜디오 촬영 스타일 {reqMark}</label>
          {radioGroup(["야외촬영 포함 (로케이션)", "실내 스튜디오만", "미정"], studioStyle, setStudioStyle, "studioStyle")}
          {helperText("studioStyle")}
        </div>

        <div>
          <label className={labelCls}>드레스 선호 <span className="text-xs text-gray-400 font-normal">(선택, 복수)</span></label>
          <div className="flex flex-wrap gap-2">
            {DRESS_OPTIONS.map(d => (
              <button key={d} type="button" onClick={() => toggleDress(d)} className={cn("px-3 py-1.5 rounded-full text-xs border transition-colors", dressOptions.includes(d) ? "bg-[#C9A96E] text-white border-[#C9A96E]" : "bg-white text-gray-600 border-gray-200")}>
                {d}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>메이크업 구성 {reqMark}</label>
          {radioGroup(["본식 당일 1회", "본식 + 리허설 메이크업", "미정"], makeup, setMakeup, "makeup")}
          {helperText("makeup")}
        </div>

        <div>
          <label className={labelCls}>앨범 포함 여부</label>
          {radioGroup(["포함 원함", "불필요", "미정"], album, setAlbum, "")}
        </div>

        <div>
          <label className={labelCls}>총 스드메 예산 {reqMark}</label>
          <select value={budget} onChange={e => setBudget(e.target.value)} className={cn("w-full px-3 py-2.5 border rounded-xl text-sm bg-white", errorCls("budget"))}>
            <option value="">선택해주세요</option>
            {BUDGET_OPTIONS_SDME.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          {helperText("budget")}
        </div>

        <div>
          <label className={labelCls}>가장 중요한 항목 1순위</label>
          {radioGroup(["스튜디오", "드레스", "메이크업"], priority, setPriority, "")}
        </div>

        <button onClick={handleSubmit} className="w-full py-3 rounded-xl text-white font-bold text-sm" style={{ background: "linear-gradient(135deg, #F9B8C6, #C9A96E)" }}>
          맞춤 답변 받기 →
        </button>
      </div>
    </SurveyModal>
  );
};

export default SdmeSurvey;
