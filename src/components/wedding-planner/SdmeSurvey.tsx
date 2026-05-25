import { useEffect, useState } from "react";
import SurveyModal from "./SurveyModal";
import { REGIONS, BUDGET_OPTIONS_SDME } from "./constants";
import { useWeddingFormContext } from "@/hooks/useWeddingFormContext";
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
  const { defaultWeddingDate, defaultRegion, defaultSdmeBudgetLabel } = useWeddingFormContext();
  const [date, setDate] = useState<Date>();
  const [region, setRegion] = useState("");
  const [studioStyle, setStudioStyle] = useState("");
  const [dressOptions, setDressOptions] = useState<string[]>([]);
  const [makeup, setMakeup] = useState("");
  const [album, setAlbum] = useState("");
  const [budgetLabel, setBudgetLabel] = useState("");
  const [priority, setPriority] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  // 저장된 결혼일·지역 + 스드메 예산으로 prefill (Round 14).
  useEffect(() => {
    if (!isOpen) return;
    if (defaultWeddingDate) setDate(defaultWeddingDate);
    setRegion(defaultRegion ?? "");
    if (defaultSdmeBudgetLabel && budgetLabel === "") setBudgetLabel(defaultSdmeBudgetLabel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultWeddingDate, defaultRegion, defaultSdmeBudgetLabel]);

  // Round 14 — required (date, region, studioStyle, makeup, budgetLabel) 중 prefilled 가능
  // 한 건 date/region/budgetLabel 3개. studioStyle, makeup 은 사용자가 매번 선택. 즉 단축
  // 진행 불가능 — 다만 prefilled 정보 요약은 보여주는 게 도움.
  const allRequiredPrefilled = !!date && !!region && !!studioStyle && !!makeup && !!budgetLabel;

  const toggleDress = (d: string) => setDressOptions(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const validate = () => {
    const e: Record<string, boolean> = {};
    if (!date) e.date = true;
    if (!region) e.region = true;
    if (!studioStyle) e.studioStyle = true;
    if (!makeup) e.makeup = true;
    if (!budgetLabel) e.budget = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const regionObj = REGIONS.find(r => r.searchKey === region);
    const budgetObj = BUDGET_OPTIONS_SDME.find(b => b.label === budgetLabel);
    onSubmit({
      date: format(date!, "yyyy년 M월 d일"),
      region: regionObj?.searchKey ?? "",
      regionLabel: regionObj?.label ?? "",
      studioStyle,
      dressOptions,
      makeup,
      album,
      budget: budgetObj?.max ?? null,
      budgetLabel: budgetObj?.label ?? "",
      priority,
    });
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
        {/* Round 14 — 모든 required 채워지면 단축 진행 카드 노출 */}
        {allRequiredPrefilled && (
          <div className="rounded-2xl border border-[#C9A96E]/30 bg-[#FBF5E8] p-3 space-y-2">
            <div className="space-y-0.5">
              <p className="text-[12px] font-bold text-gray-800">저장된 정보로 바로 답변받기</p>
              <p className="text-[11px] text-gray-600">
                {format(date!, "yyyy.MM.dd")} · {REGIONS.find(r => r.searchKey === region)?.label ?? region} · {studioStyle} · {makeup} · {budgetLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              className="w-full py-2 rounded-xl text-white font-bold text-[12px]"
              style={{ background: "linear-gradient(135deg, #F9B8C6, #C9A96E)" }}
            >
              이 정보로 답변받기 →
            </button>
            <p className="text-[10px] text-gray-500 text-center">아래 항목을 바꾸려면 그대로 수정하세요.</p>
          </div>
        )}

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
            {REGIONS.map(r => <option key={r.searchKey} value={r.searchKey}>{r.label}</option>)}
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
          <select value={budgetLabel} onChange={e => setBudgetLabel(e.target.value)} className={cn("w-full px-3 py-2.5 border rounded-xl text-sm bg-white", errorCls("budget"))}>
            <option value="">선택해주세요</option>
            {BUDGET_OPTIONS_SDME.map(b => <option key={b.label} value={b.label}>{b.label}</option>)}
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
