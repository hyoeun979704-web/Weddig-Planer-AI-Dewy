import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import SurveyModal from "@/components/wedding-planner/SurveyModal";
import WeddingStylePicker from "@/components/schedule/WeddingStylePicker";
import { useWeddingSchedule, type MaritalHistory } from "@/hooks/useWeddingSchedule";
import {
  buildScheduleFromTemplate,
  PLANNING_STAGE_LABELS,
  PLANNING_STAGE_HINTS,
  STAGE_ORDER,
  type PlanningStage,
} from "@/data/checklistTemplate";
import {
  defaultExclusionsFor,
  type WeddingStyle,
} from "@/lib/weddingStyle";

const REGIONS = [
  "서울특별시", "경기도", "인천광역시", "부산광역시", "대구광역시",
  "대전광역시", "광주광역시", "울산광역시", "세종특별자치시",
  "강원특별자치도", "충청북도", "충청남도", "전북특별자치도",
  "전라남도", "경상북도", "경상남도", "제주특별자치도",
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Optional: called after successful save so the parent can dismiss. */
  onSaved?: () => void;
}

/**
 * Onboarding modal — gathers basic wedding info AND seeds the user's
 * recommended schedule. Designed to handle three real-world scenarios:
 *
 *   1. Brand-new (모든 정보 미정) — checks 미정 boxes; we still build a
 *      timeline anchored to "today + 12 months" so the checklist is usable.
 *   2. Confirmed (date + region 입력) — exact D-day calculation.
 *   3. Mid-way (이미 일부 진행) — the planning_stage selector decides which
 *      template tasks are pre-completed. Earlier-stage tasks land as
 *      `completed=true` so the user doesn't see done items as todos.
 */
const WeddingInfoSetupModal = ({ isOpen, onClose, onSaved }: Props) => {
  const navigate = useNavigate();
  const { saveWeddingSettings, generateScheduleFromTemplate, weddingSettings } = useWeddingSchedule();

  const [date, setDate] = useState<Date>();
  const [dateTbd, setDateTbd] = useState(false);
  const [region, setRegion] = useState("");
  const [regionTbd, setRegionTbd] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [stage, setStage] = useState<PlanningStage>("just_started");
  const [weddingStyle, setWeddingStyle] = useState<WeddingStyle>("general");
  const [excludedCategories, setExcludedCategories] = useState<string[]>([]);
  const [maritalHistory, setMaritalHistory] = useState<MaritalHistory | null>(null);
  const [pregnant, setPregnant] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  // Prefill on open. Critical for the "edit later" path: when the user
  // re-opens via 마이페이지 → 결혼 정보 수정, they should see their existing
  // values, not a blank slate. Also clears errors.
  useEffect(() => {
    if (!isOpen) return;
    setDate(weddingSettings.wedding_date ? new Date(weddingSettings.wedding_date) : undefined);
    setDateTbd(weddingSettings.wedding_date_tbd);
    setRegion(weddingSettings.wedding_region ?? "");
    setRegionTbd(weddingSettings.wedding_region_tbd);
    setPartnerName(weddingSettings.partner_name ?? "");
    if (
      weddingSettings.planning_stage &&
      (STAGE_ORDER as readonly string[]).includes(weddingSettings.planning_stage)
    ) {
      setStage(weddingSettings.planning_stage as PlanningStage);
    }
    // Wedding style + exclusions: prefer saved values; otherwise default to
    // 'general' (no exclusions).
    setWeddingStyle((weddingSettings.wedding_style ?? "general") as WeddingStyle);
    setExcludedCategories(
      weddingSettings.excluded_categories.length > 0
        ? weddingSettings.excluded_categories
        : defaultExclusionsFor((weddingSettings.wedding_style ?? "general") as WeddingStyle)
    );
    setMaritalHistory(weddingSettings.marital_history);
    setPregnant(weddingSettings.pregnant);
    setErrors({});
  }, [
    isOpen,
    weddingSettings.wedding_date,
    weddingSettings.wedding_date_tbd,
    weddingSettings.wedding_region,
    weddingSettings.wedding_region_tbd,
    weddingSettings.partner_name,
    weddingSettings.planning_stage,
    weddingSettings.wedding_style,
    weddingSettings.excluded_categories,
    weddingSettings.marital_history,
    weddingSettings.pregnant,
  ]);

  const validate = () => {
    const e: Record<string, boolean> = {};
    if (!date && !dateTbd) e.date = true;
    if (!region && !regionTbd) e.region = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    const weddingDateStr = !dateTbd && date ? format(date, "yyyy-MM-dd") : null;
    const ok = await saveWeddingSettings({
      wedding_date: weddingDateStr,
      wedding_region: !regionTbd && region ? region : null,
      partner_name: partnerName.trim() || null,
      planning_stage: stage,
      wedding_date_tbd: dateTbd,
      wedding_region_tbd: regionTbd,
      wedding_style: weddingStyle,
      excluded_categories: excludedCategories,
      marital_history: maritalHistory,
      pregnant,
    });

    if (ok) {
      // Seed schedule items. When wedding_date is unset, the template anchors
      // to today + 12 months so the checklist is still actionable. Exclusions
      // are applied here so the user never sees seeded items for categories
      // they opted out of.
      const items = buildScheduleFromTemplate(weddingDateStr, stage, excludedCategories, weddingStyle);
      const seeded = await generateScheduleFromTemplate(items);
      onSaved?.();
      onClose();

      // Action toast — only when we actually seeded fresh items. A returning
      // user with existing schedule items gets seeded=0; we don't want to
      // claim "N개 만들어졌어요" when nothing happened.
      if (seeded && seeded > 0) {
        toast.success(`${seeded}개 추천 일정이 만들어졌어요`, {
          description: "일정 탭에서 직접 추가·수정할 수 있어요",
          action: {
            label: "보러가기",
            onClick: () => navigate("/my-schedule"),
          },
          duration: 6000,
        });
      }
    }
    setSubmitting(false);
  };

  const labelCls = "block text-sm font-semibold text-gray-800 mb-1.5";
  const reqMark = <span className="text-red-500 ml-0.5">*</span>;
  const errorCls = (f: string) => (errors[f] ? "border-red-400" : "");
  const helperText = (f: string) =>
    errors[f] ? <p className="text-xs text-red-500 mt-1">날짜 입력 또는 미정 선택해주세요</p> : null;

  return (
    <SurveyModal isOpen={isOpen} onClose={onClose} title="결혼 정보 등록">
      <div className="space-y-5">
        <p className="text-[13px] text-gray-500 leading-relaxed">
          몇 가지만 알려주시면 D-day, 추천 체크리스트, 예산을 한꺼번에 챙겨드려요.
          <br />
          <span className="text-gray-400">아직 정해지지 않았다면 "미정"을 체크해주세요. 마이페이지에서 언제든 수정할 수 있어요.</span>
        </p>

        {/* 결혼 예정일 + 미정 체크 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={labelCls + " mb-0"}>결혼 예정일 {reqMark}</label>
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={dateTbd}
                onChange={(e) => {
                  setDateTbd(e.target.checked);
                  if (e.target.checked) setDate(undefined);
                }}
                className="w-3.5 h-3.5 accent-[#C9A96E]"
              />
              아직 미정
            </label>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button
                disabled={dateTbd}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2.5 border rounded-xl text-sm text-left",
                  !date && "text-gray-400",
                  dateTbd && "bg-gray-50 cursor-not-allowed",
                  errorCls("date"),
                )}
              >
                <CalendarIcon className="w-4 h-4" />
                {dateTbd ? "1년 후로 가정해서 일정을 만들어드려요" : date ? format(date, "yyyy.MM.dd") : "날짜 선택"}
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

        {/* 예식 지역 + 미정 체크 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={labelCls + " mb-0"}>예식 지역 {reqMark}</label>
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={regionTbd}
                onChange={(e) => {
                  setRegionTbd(e.target.checked);
                  if (e.target.checked) setRegion("");
                }}
                className="w-3.5 h-3.5 accent-[#C9A96E]"
              />
              아직 미정
            </label>
          </div>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            disabled={regionTbd}
            className={cn(
              "w-full px-3 py-2.5 border rounded-xl text-sm bg-white",
              regionTbd && "bg-gray-50 cursor-not-allowed text-gray-400",
              errorCls("region"),
            )}
          >
            <option value="">{regionTbd ? "나중에 정할게요" : "선택해주세요"}</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {errors.region && (
            <p className="text-xs text-red-500 mt-1">지역 선택 또는 미정 체크해주세요</p>
          )}
        </div>

        {/* 파트너 이름 (선택) */}
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

        {/* 결혼 준비 단계 */}
        <div>
          <label className={labelCls}>결혼 준비 어디까지 하셨나요? {reqMark}</label>
          <div className="space-y-1.5">
            {STAGE_ORDER.map((s) => (
              <label
                key={s}
                className={cn(
                  "flex items-start gap-2 px-3 py-2.5 border rounded-xl text-sm cursor-pointer transition-colors",
                  stage === s ? "border-[#C9A96E] bg-[#C9A96E]/5" : "border-gray-200",
                )}
              >
                <input
                  type="radio"
                  name="stage"
                  checked={stage === s}
                  onChange={() => setStage(s)}
                  className="w-4 h-4 accent-[#C9A96E] mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-800">{PLANNING_STAGE_LABELS[s]}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {PLANNING_STAGE_HINTS[s]}
                  </p>
                </div>
              </label>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">
            이전 단계 항목들은 자동으로 완료 처리돼요 (나중에 수동 조정 가능)
          </p>
        </div>

        {/* 결혼 스타일 + 카테고리 제외 */}
        <div>
          <label className={labelCls}>
            결혼 스타일 <span className="text-xs text-gray-400 font-normal">(선택)</span>
          </label>
          <WeddingStylePicker
            style={weddingStyle}
            excluded={excludedCategories}
            onChange={({ style: s, excluded }) => {
              setWeddingStyle(s);
              setExcludedCategories(excluded);
            }}
          />
        </div>

        {/* 결혼 차수 (선택) — 재혼 페르소나 G-1, F-2를 위해 카피·체크리스트
            톤을 다르게. 미선택이면 AI 컨텍스트에서 생략. */}
        <div>
          <label className={labelCls}>
            결혼 차수 <span className="text-xs text-gray-400 font-normal">(선택)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: "first", label: "초혼" },
              { value: "remarriage", label: "재혼" },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  setMaritalHistory((prev) => (prev === opt.value ? null : opt.value))
                }
                className={cn(
                  "px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors",
                  maritalHistory === opt.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">
            선택하면 추천 콘텐츠·AI 답변 톤을 맞춰드려요. 다시 누르면 해제.
          </p>
        </div>

        {/* 임신 여부 (선택) — 페르소나 F-1 (임산부 D-60)을 위해. 체크리스트
            우선순위 압축과 AI 답변(드레스 사이즈, 메이크업 약품 등)에 반영. */}
        <div>
          <label className="flex items-start gap-2.5 px-3 py-3 border rounded-xl cursor-pointer bg-gray-50 hover:bg-white transition-colors">
            <input
              type="checkbox"
              checked={pregnant}
              onChange={(e) => setPregnant(e.target.checked)}
              className="w-4 h-4 accent-[#C9A96E] mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">
                현재 임신 중이에요 <span className="text-xs text-gray-400 font-normal">(선택)</span>
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                드레스 사이즈·일정 압축·메이크업 등 임신 친화 정보 위주로 추천해드려요.
              </p>
            </div>
          </label>
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
            {submitting ? "저장 중…" : "저장하고 일정 만들기"}
          </button>
        </div>
      </div>
    </SurveyModal>
  );
};

export default WeddingInfoSetupModal;
