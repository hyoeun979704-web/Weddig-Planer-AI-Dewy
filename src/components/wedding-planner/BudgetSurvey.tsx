import { useState } from "react";
import SurveyModal from "./SurveyModal";
import { REGIONS } from "./constants";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Gem, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const BUDGET_ITEMS = ["웨딩홀/예식장", "스드메 (스튜디오/드레스/메이크업)", "허니문", "예물 (반지/시계 등)", "예단/혼수", "신혼집", "기타 (청첩장/답례품/꽃장식 등)"];
const PRIORITY_OPTIONS = ["웨딩홀", "스드메", "허니문", "예물", "신혼집 인테리어"];

const getSeason = (date: Date) => {
  const m = date.getMonth() + 1;
  return (m >= 3 && m <= 5) || (m >= 9 && m <= 11) ? "성수기" : "비수기";
};

const BudgetSurvey = ({ isOpen, onClose, onSubmit }: Props) => {
  const [step, setStep] = useState<"lock" | "form">("lock");
  const [totalBudget, setTotalBudget] = useState("");
  const [items, setItems] = useState<Record<string, string>>({});
  const [region, setRegion] = useState("");
  const [date, setDate] = useState<Date>();
  const [support, setSupport] = useState("");
  const [supportAmount, setSupportAmount] = useState("");
  const [priorities, setPriorities] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const togglePriority = (p: string) => {
    setPriorities(prev => {
      if (prev.includes(p)) return prev.filter(x => x !== p);
      if (prev.length >= 2) return prev;
      return [...prev, p];
    });
  };

  const validate = () => {
    const e: Record<string, boolean> = {};
    if (!totalBudget) e.totalBudget = true;
    if (!region) e.region = true;
    if (!date) e.date = true;
    if (!support) e.support = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const season = getSeason(date!);
    onSubmit({
      totalBudget,
      items,
      region,
      date: format(date!, "yyyy년 M월 d일"),
      season,
      support,
      supportAmount,
      priorities,
    });
    onClose();
    setStep("lock");
  };

  const handleClose = () => {
    onClose();
    setStep("lock");
  };

  const labelCls = "block text-sm font-semibold text-gray-800 mb-1.5";
  const reqMark = <span className="text-red-500 ml-0.5">*</span>;
  const errorCls = (f: string) => errors[f] ? "border-red-400" : "";
  const helperText = (f: string) => errors[f] ? <p className="text-xs text-red-500 mt-1">필수 입력 항목입니다</p> : null;

  const season = date ? getSeason(date) : null;

  return (
    <SurveyModal isOpen={isOpen} onClose={handleClose} title={step === "lock" ? "프리미엄 전용 기능" : "결혼 예산 분석을 위한 정보 입력"}>
      <AnimatePresence mode="wait">
        {step === "lock" ? (
          <motion.div key="lock" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col items-center text-center py-6">
            <div className="w-16 h-16 rounded-full bg-[#C9A96E]/10 flex items-center justify-center mb-4">
              <Gem className="w-8 h-8 text-[#C9A96E]" />
            </div>
            <span className="px-3 py-1 rounded-full bg-[#C9A96E]/10 text-[#C9A96E] text-xs font-bold mb-3">프리미엄 전용 기능</span>
            <h3 className="text-lg font-bold text-gray-900 mb-2">결혼 예산 전체를 분석해드립니다</h3>
            <p className="text-sm text-gray-500 mb-5 leading-relaxed">항목별 예산 배분, 절약 전략, 지역별 시세 비교까지<br/>AI가 맞춤 분석 리포트를 제공합니다.</p>
            <div className="text-left w-full space-y-2 mb-6">
              {["항목별 예산 적정성 진단", "지역/시즌별 웨딩 물가 비교", "초과 예산 경고 및 절약 대안 제시", "허니문 연계 예산 추천"].map(f => (
                <div key={f} className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-[#C9A96E]" /> {f}
                </div>
              ))}
            </div>
            <button onClick={() => setStep("form")} className="w-full py-3 rounded-xl text-white font-bold text-sm mb-2" style={{ background: "linear-gradient(135deg, #C9A96E, #B8963E)" }}>
              프리미엄 시작하기 — 월 9,900원
            </button>
            <button onClick={handleClose} className="text-sm text-gray-400 hover:text-gray-600">닫기</button>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">
            <div>
              <label className={labelCls}>총 결혼 준비 예산 {reqMark}</label>
              <div className="relative">
                <input type="number" value={totalBudget} onChange={e => setTotalBudget(e.target.value)} placeholder="예: 5000" className={cn("w-full px-3 py-2.5 border rounded-xl text-sm pr-12", errorCls("totalBudget"))} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">만원</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">양가 지원금 포함 총액 기준</p>
              {helperText("totalBudget")}
            </div>

            <div>
              <label className={labelCls}>항목별 예산 배분 <span className="text-xs text-gray-400 font-normal">(선택 — 미입력 시 AI 자동 배분)</span></label>
              <div className="space-y-2">
                {BUDGET_ITEMS.map(item => (
                  <div key={item} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 min-w-[140px] truncate">{item}</span>
                    <div className="relative flex-1">
                      <input type="number" value={items[item] || ""} onChange={e => setItems(prev => ({ ...prev, [item]: e.target.value }))} placeholder="0" className="w-full px-3 py-1.5 border rounded-lg text-sm pr-10" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">만원</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>예식 지역 {reqMark}</label>
              <select value={region} onChange={e => setRegion(e.target.value)} className={cn("w-full px-3 py-2.5 border rounded-xl text-sm bg-white", errorCls("region"))}>
                <option value="">선택해주세요</option>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              {helperText("region")}
            </div>

            <div>
              <label className={labelCls}>결혼 예정일 {reqMark}</label>
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
              {season && (
                <span className={cn("inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold", season === "성수기" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600")}>
                  {season === "성수기" ? "🔴 성수기" : "🟢 비수기"}
                </span>
              )}
              {helperText("date")}
            </div>

            <div>
              <label className={labelCls}>양가 지원 여부 {reqMark}</label>
              <div className={cn("flex gap-2", errors.support && "ring-1 ring-red-400 rounded-xl p-2")}>
                {["있음", "없음", "협의중"].map(v => (
                  <button key={v} type="button" onClick={() => setSupport(v)} className={cn("flex-1 px-3 py-1.5 rounded-full text-xs border transition-colors", support === v ? "bg-[#C9A96E] text-white border-[#C9A96E]" : "bg-white text-gray-600 border-gray-200")}>
                    {v}
                  </button>
                ))}
              </div>
              {support === "있음" && (
                <div className="mt-2 relative">
                  <input type="number" value={supportAmount} onChange={e => setSupportAmount(e.target.value)} placeholder="지원 금액" className="w-full px-3 py-2 border rounded-xl text-sm pr-12" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">만원</span>
                </div>
              )}
              {helperText("support")}
            </div>

            <div>
              <label className={labelCls}>가장 비중을 높이고 싶은 항목 <span className="text-xs text-gray-400 font-normal">(최대 2개)</span></label>
              <div className="flex flex-wrap gap-2">
                {PRIORITY_OPTIONS.map(p => (
                  <button key={p} type="button" onClick={() => togglePriority(p)} className={cn("px-3 py-1.5 rounded-full text-xs border transition-colors", priorities.includes(p) ? "bg-[#C9A96E] text-white border-[#C9A96E]" : "bg-white text-gray-600 border-gray-200")}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleSubmit} className="w-full py-3 rounded-xl text-white font-bold text-sm" style={{ background: "linear-gradient(135deg, #F9B8C6, #C9A96E)" }}>
              맞춤 답변 받기 →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </SurveyModal>
  );
};

export default BudgetSurvey;
