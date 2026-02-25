import { useState } from "react";
import SurveyModal from "./SurveyModal";
import { TIME_OPTIONS } from "./constants";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const TimelineSurvey = ({ isOpen, onClose, onSubmit }: Props) => {
  const [ceremonyTime, setCeremonyTime] = useState("");
  const [venueType, setVenueType] = useState("");
  const [duration, setDuration] = useState("");
  const [reception, setReception] = useState("");
  const [receptionTime, setReceptionTime] = useState("");
  const [photoTeam, setPhotoTeam] = useState<string[]>([]);
  const [brideStartTime, setBrideStartTime] = useState("");
  const [hanbok, setHanbok] = useState("");
  const [groomRoom, setGroomRoom] = useState("");
  const [special, setSpecial] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const togglePhoto = (p: string) => setPhotoTeam(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const validate = () => {
    const e: Record<string, boolean> = {};
    if (!ceremonyTime) e.ceremonyTime = true;
    if (!venueType) e.venueType = true;
    if (!duration) e.duration = true;
    if (!reception) e.reception = true;
    if (photoTeam.length === 0) e.photoTeam = true;
    if (!brideStartTime) e.brideStartTime = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({ ceremonyTime, venueType, duration, reception, receptionTime, photoTeam, brideStartTime, hanbok, groomRoom, special });
    onClose();
  };

  const labelCls = "block text-sm font-semibold text-gray-800 mb-1.5";
  const reqMark = <span className="text-red-500 ml-0.5">*</span>;
  const errorCls = (f: string) => errors[f] ? "border-red-400" : "";
  const helperText = (f: string) => errors[f] ? <p className="text-xs text-red-500 mt-1">필수 입력 항목입니다</p> : null;

  const radioGroup = (options: string[], value: string, onChange: (v: string) => void, field: string) => (
    <div className={cn("flex flex-wrap gap-2", errors[field] && "ring-1 ring-red-400 rounded-xl p-2")}>
      {options.map(v => (
        <button key={v} type="button" onClick={() => onChange(v)} className={cn("px-3 py-1.5 rounded-full text-xs border transition-colors", value === v ? "bg-[#C9A96E] text-white border-[#C9A96E]" : "bg-white text-gray-600 border-gray-200 hover:border-[#C9A96E]")}>
          {v}
        </button>
      ))}
    </div>
  );

  return (
    <SurveyModal isOpen={isOpen} onClose={onClose} title="당일 타임라인 생성을 위한 정보 입력">
      <div className="space-y-5">
        <div>
          <label className={labelCls}>예식 시작 시간 {reqMark}</label>
          <select value={ceremonyTime} onChange={e => setCeremonyTime(e.target.value)} className={cn("w-full px-3 py-2.5 border rounded-xl text-sm bg-white", errorCls("ceremonyTime"))}>
            <option value="">선택해주세요</option>
            {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {helperText("ceremonyTime")}
        </div>

        <div>
          <label className={labelCls}>예식 장소 유형 {reqMark}</label>
          {radioGroup(["호텔", "컨벤션홀", "하우스웨딩", "야외"], venueType, setVenueType, "venueType")}
          {helperText("venueType")}
        </div>

        <div>
          <label className={labelCls}>예식 소요 시간 {reqMark}</label>
          {radioGroup(["30분", "40분", "1시간"], duration, setDuration, "duration")}
          {helperText("duration")}
        </div>

        <div>
          <label className={labelCls}>피로연 여부 {reqMark}</label>
          {radioGroup(["있음", "없음"], reception, setReception, "reception")}
          {helperText("reception")}
          {reception === "있음" && (
            <div className="mt-2">
              <label className="block text-xs text-gray-500 mb-1">피로연 시작 시간</label>
              <select value={receptionTime} onChange={e => setReceptionTime(e.target.value)} className="w-full px-3 py-2.5 border rounded-xl text-sm bg-white">
                <option value="">선택해주세요</option>
                {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}
        </div>

        <div>
          <label className={labelCls}>촬영팀 구성 {reqMark} <span className="text-xs text-gray-400 font-normal">(복수 선택)</span></label>
          <div className={cn("flex flex-wrap gap-2", errors.photoTeam && "ring-1 ring-red-400 rounded-xl p-2")}>
            {["스냅 촬영", "영상 촬영", "드론 촬영", "없음"].map(p => (
              <button key={p} type="button" onClick={() => togglePhoto(p)} className={cn("px-3 py-1.5 rounded-full text-xs border transition-colors", photoTeam.includes(p) ? "bg-[#C9A96E] text-white border-[#C9A96E]" : "bg-white text-gray-600 border-gray-200")}>
                {p}
              </button>
            ))}
          </div>
          {helperText("photoTeam")}
        </div>

        <div>
          <label className={labelCls}>신부 준비 시작 희망 시간 {reqMark}</label>
          <select value={brideStartTime} onChange={e => setBrideStartTime(e.target.value)} className={cn("w-full px-3 py-2.5 border rounded-xl text-sm bg-white", errorCls("brideStartTime"))}>
            <option value="">선택해주세요</option>
            {Array.from({ length: 19 }, (_, i) => { const h = Math.floor(i / 2) + 5; const m = i % 2 === 0 ? "00" : "30"; return `${String(h).padStart(2, '0')}:${m}`; }).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <p className="text-xs text-gray-400 mt-1">보통 예식 4~5시간 전을 권장합니다</p>
          {helperText("brideStartTime")}
        </div>

        <div>
          <label className={labelCls}>한복 전환 여부</label>
          {radioGroup(["있음", "없음"], hanbok, setHanbok, "")}
        </div>

        <div>
          <label className={labelCls}>신랑 측 별도 준비실</label>
          {radioGroup(["있음", "없음", "모름"], groomRoom, setGroomRoom, "")}
        </div>

        <div>
          <label className={labelCls}>특이사항 <span className="text-xs text-gray-400 font-normal">(선택)</span></label>
          <textarea value={special} onChange={e => setSpecial(e.target.value)} placeholder="예: 부모님 폐백, 어린 자녀 있음, 이동 동선 복잡 등" className="w-full px-3 py-2.5 border rounded-xl text-sm resize-none h-20" />
        </div>

        <button onClick={handleSubmit} className="w-full py-3 rounded-xl text-white font-bold text-sm" style={{ background: "linear-gradient(135deg, #F9B8C6, #C9A96E)" }}>
          맞춤 답변 받기 →
        </button>
      </div>
    </SurveyModal>
  );
};

export default TimelineSurvey;
