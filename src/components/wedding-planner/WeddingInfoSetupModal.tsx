import { useState } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import SurveyModal from "@/components/wedding-planner/SurveyModal";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";

const REGIONS = [
  "서울특별시", "경기도", "인천광역시", "부산광역시", "대구광역시",
  "대전광역시", "광주광역시", "울산광역시", "세종특별자치시",
  "강원특별자치도", "충청북도", "충청남도", "전북특별자치도",
  "전라남도", "경상북도", "경상남도", "제주특별자치도",
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Optional: called after successful save so the parent can also dismiss /
   *  refresh local state. */
  onSaved?: () => void;
}

/**
 * Shared "missing info" modal — pops on Schedule / Budget / MyPage when the
 * user hasn't entered basic wedding info. Asks for date + region + partner
 * name + (optional) total budget, persists to user_wedding_settings (and
 * budget_settings for the budget). Designed to be friendly + skippable —
 * "나중에 할게요" dismisses for the session.
 */
const WeddingInfoSetupModal = ({ isOpen, onClose, onSaved }: Props) => {
  const { saveWeddingSettings } = useWeddingSchedule();
  const [date, setDate] = useState<Date>();
  const [region, setRegion] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e: Record<string, boolean> = {};
    if (!date) e.date = true;
    if (!region) e.region = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    const ok = await saveWeddingSettings({
      wedding_date: date ? format(date, "yyyy-MM-dd") : null,
      wedding_region: region || null,
      partner_name: partnerName.trim() || null,
    });
    setSubmitting(false);
    if (ok) {
      onSaved?.();
      onClose();
    }
  };

  const labelCls = "block text-sm font-semibold text-gray-800 mb-1.5";
  const reqMark = <span className="text-red-500 ml-0.5">*</span>;
  const errorCls = (f: string) => (errors[f] ? "border-red-400" : "");
  const helperText = (f: string) =>
    errors[f] ? <p className="text-xs text-red-500 mt-1">필수 입력 항목입니다</p> : null;

  return (
    <SurveyModal isOpen={isOpen} onClose={onClose} title="결혼 정보 등록">
      <div className="space-y-5">
        <p className="text-[13px] text-gray-500">
          몇 가지 정보만 알려주시면 D-day, 체크리스트, 예산을 한꺼번에 챙겨드려요.
        </p>

        <div>
          <label className={labelCls}>결혼 예정일 {reqMark}</label>
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2.5 border rounded-xl text-sm text-left",
                  !date && "text-gray-400",
                  errorCls("date"),
                )}
              >
                <CalendarIcon className="w-4 h-4" />
                {date ? format(date, "yyyy.MM.dd") : "날짜 선택"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          {helperText("date")}
        </div>

        <div>
          <label className={labelCls}>예식 지역 {reqMark}</label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className={cn(
              "w-full px-3 py-2.5 border rounded-xl text-sm bg-white",
              errorCls("region"),
            )}
          >
            <option value="">선택해주세요</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {helperText("region")}
        </div>

        <div>
          <label className={labelCls}>
            파트너 이름 <span className="text-xs text-gray-400 font-normal">(선택)</span>
          </label>
          <input
            type="text"
            value={partnerName}
            onChange={(e) => setPartnerName(e.target.value)}
            placeholder="예: 홍길동"
            className="w-full px-3 py-2.5 border rounded-xl text-sm"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-gray-600 font-semibold text-sm border border-gray-200"
          >
            나중에
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-[2] py-3 rounded-xl text-white font-bold text-sm disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #F9B8C6, #C9A96E)" }}
          >
            {submitting ? "저장 중…" : "저장하기"}
          </button>
        </div>
      </div>
    </SurveyModal>
  );
};

export default WeddingInfoSetupModal;
