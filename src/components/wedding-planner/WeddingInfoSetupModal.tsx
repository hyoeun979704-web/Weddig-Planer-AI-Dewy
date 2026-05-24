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
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { useDataCollectionConsent } from "@/hooks/useDataCollectionConsent";
import DataCollectionConsentModal from "@/components/consent/DataCollectionConsentModal";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
import { computePregnancyContext, trimesterLabel } from "@/lib/pregnancy";
import type { CeremonyType, UserRole } from "@/lib/weddingPersona";

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
  const { user } = useAuth();
  const { saveWeddingSettings, generateScheduleFromTemplate, weddingSettings } = useWeddingSchedule();

  const [date, setDate] = useState<Date>();
  const [dateTbd, setDateTbd] = useState(false);
  const [region, setRegion] = useState("");
  const [regionTbd, setRegionTbd] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [stage, setStage] = useState<PlanningStage>("just_started");
  const [weddingStyle, setWeddingStyle] = useState<WeddingStyle>("general");
  const [excludedCategories, setExcludedCategories] = useState<string[]>([]);
  // 민감 정보 3종(marital_history / pregnant / has_parents_*) 은 이 모달에서 받지 않는다.
  // v2 §5 Sensitive Info + §8 A8 Sensitive Cliff 회피: 첫 가입 모달 노출 금지.
  // 대신 ① 행동 신호 + 부드러운 확인 카드(§4.3) 로 추론, ② 마이페이지에서 자기 관리.
  // 기존 DB 값은 saveWeddingSettings patch 에 안 넣어 그대로 보존됨.
  // 페르소나 v1 추가 신호 — 모달에서 "선택" 표기로 가볍게 묻고 미입력 시 기본값 유지.
  const [role, setRole] = useState<UserRole | null>(null);
  const [country, setCountry] = useState<string>("KR");
  const [weddingCountry, setWeddingCountry] = useState<string>("KR");
  const [sigungu, setSigungu] = useState<string>("");
  // has_parents_* 는 본 모달에서 받지 않음 (위 주석 참조). 기본값으로 그대로 두면
  // 트리거가 standard_bride 페르소나로 분기. 부모 부재는 별도 흐름에서 추론.
  const [ceremonyType, setCeremonyType] = useState<CeremonyType | null>(null);
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
    // 민감 3종(marital_history/pregnant/has_parents_*) prefill 제거 — 모달 UI에 없음.
    setRole(weddingSettings.role);
    setCountry(weddingSettings.country ?? "KR");
    setWeddingCountry(weddingSettings.wedding_country ?? "KR");
    setSigungu(weddingSettings.wedding_region_sigungu ?? "");
    setCeremonyType(weddingSettings.ceremony_type);
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
    weddingSettings.role,
    weddingSettings.country,
    weddingSettings.wedding_country,
    weddingSettings.wedding_region_sigungu,
    weddingSettings.ceremony_type,
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

    // 민감 3종(pregnant/marital_history/has_parents_*) 은 이 모달에서 받지 않음.
    // 기존 DB 값이 있으면 그대로 보존(patch 에 안 넣음). 사용자 별도 흐름
    // (행동+확인 카드 or 마이페이지 추가 정보) 에서 명시 설정.
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
      role,
      country: country || "KR",
      wedding_country: weddingCountry || "KR",
      wedding_region_sigungu: sigungu.trim() || null,
      ceremony_type: ceremonyType,
    });

    if (ok) {
      // Seed schedule items. 민감 3종은 기존 DB 값을 그대로 사용해 스케줄 분기.
      // 모달에서 안 받으므로 사용자가 이전에 설정한 값(또는 false/null 기본값) 기준.
      const existingPregnant = weddingSettings.pregnant;
      const existingDueDate = weddingSettings.pregnancy_due_date;
      const existingMarital = weddingSettings.marital_history;
      const { trimesterAtWedding } = computePregnancyContext(
        existingPregnant,
        existingDueDate,
        weddingDateStr,
      );
      const items = buildScheduleFromTemplate(
        weddingDateStr,
        stage,
        excludedCategories,
        weddingStyle,
        existingPregnant,
        trimesterAtWedding,
        ceremonyType,
        existingMarital === "remarriage",
      );
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
      } else if (seeded === null) {
        // 설정은 저장됐지만 추천 일정 생성에 실패 — 빈 일정으로 떨어져 혼란하지
        // 않도록 안내하고 재시도 경로를 준다.
        toast.error("추천 일정을 만드는 데 실패했어요", {
          description: "일정 탭에서 다시 시도하거나 직접 추가할 수 있어요",
          action: {
            label: "일정으로",
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

  // 데이터 수집 동의 게이트 — 모달이 열리려는 시점에 consent 확인.
  //   undefined  : 아직 fetch 중 → 아무것도 안 보임
  //   null       : 미동의 → consent 모달 먼저 표시
  //   false      : 거부됨 → wedding info 모달 안 띄움 + 외부 dismiss
  //   true       : 동의 → wedding info 모달 정상 표시
  const consent = useDataCollectionConsent();
  useEffect(() => {
    if (isOpen && consent.state === false) {
      // 사용자가 명시적으로 거부한 상태에서 모달이 열리려고 함 — 즉시 닫음
      onClose();
    }
  }, [isOpen, consent.state, onClose]);

  if (isOpen && consent.state === null) {
    return (
      <DataCollectionConsentModal
        isOpen
        onAgree={async () => {
          await consent.agree();
          // 동의 후엔 wedding info 모달이 자연스럽게 이어 표시됨
        }}
        onRefuse={async () => {
          await consent.refuse();
          onClose();
        }}
      />
    );
  }

  // consent.state 가 undefined (loading) 또는 false 면 wedding info 모달
  // 자체를 띄우지 않음. 진짜 동의(true)일 때만 아래 분기.
  if (consent.state !== true) {
    return null;
  }

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

        {/* 정확도 보강 섹션 — 접힘 기본. 사용자가 필요할 때만 펼침으로 첫인상 부담 줄임.
            details/summary 는 네이티브라 의존성 없이 가볍게 동작. 기존 입력값이
            있으면 편집 케이스에서 숨겨지지 않도록 자동 펼침. */}
        <details
          className="group rounded-xl border border-gray-200 bg-white"
          open={!!(sigungu || role || ceremonyType)}
        >
          <summary className="cursor-pointer list-none px-3 py-2.5 flex items-center justify-between text-sm font-semibold text-gray-700">
            <span> 더 정확한 큐레이션 받기 <span className="text-[11px] text-gray-400 font-normal">(선택)</span></span>
            <span className="text-gray-400 text-xs group-open:rotate-180 transition-transform"></span>
          </summary>
          <div className="px-3 pb-3 pt-1 space-y-4 border-t border-gray-100">

        {/* 예식 시군구 (선택) — 시도 외 좁힘. 천안·양평·강남 등 시군구 큐레이션 활성화. */}
        <div>
          <label className={labelCls}>
            예식 시군구 <span className="text-xs text-gray-400 font-normal">(선택)</span>
          </label>
          <input
            type="text"
            value={sigungu}
            onChange={(e) => setSigungu(e.target.value)}
            placeholder="예: 천안시, 마포구, 양평군"
            disabled={regionTbd}
            className={cn(
              "w-full px-3 py-2.5 border rounded-xl text-sm",
              regionTbd && "bg-gray-50 cursor-not-allowed text-gray-400",
            )}
          />
          <p className="text-[11px] text-gray-400 mt-1">
            입력하시면 시도 안에서 더 정확한 식장·후기·평균을 보여드려요.
          </p>
        </div>

        {/* 사용자 역할 — 호칭·미션·AI 톤 분기. */}
        <div>
          <label className={labelCls}>
            준비 주체 <span className="text-xs text-gray-400 font-normal">(선택)</span>
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {([
              { v: null, label: "선택 안 함" },
              { v: "bride", label: "신부" },
              { v: "groom", label: "신랑" },
              { v: "shared", label: "공동" },
            ] as const).slice(0, 4).map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setRole(opt.v)}
                className={cn(
                  "py-2 rounded-xl text-sm border transition-colors",
                  role === opt.v
                    ? "border-[#C9A96E] bg-[#C9A96E]/5 text-gray-800 font-semibold"
                    : "border-gray-200 text-gray-500"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            신랑님이 직접 준비하시면 예복·예물·신랑 양가 가이드를 먼저 보여드려요.
          </p>
        </div>

        {/* 식 형태 (세분) — 스몰웨딩·노식·스냅 분기. */}
        <div>
          <label className={labelCls}>
            식 형태 <span className="text-xs text-gray-400 font-normal">(선택)</span>
          </label>
          <select
            value={ceremonyType ?? ""}
            onChange={(e) => setCeremonyType((e.target.value || null) as CeremonyType | null)}
            className="w-full px-3 py-2.5 border rounded-xl text-sm bg-white"
          >
            <option value="">선택 안 함 (위 결혼 스타일 따름)</option>
            <option value="standard">표준 예식장</option>
            <option value="hotel">호텔 웨딩</option>
            <option value="small_real">진짜 스몰 (40~80명, 레스토랑·하우스·카페)</option>
            <option value="restaurant">레스토랑 웨딩</option>
            <option value="outdoor">야외·가든·정원</option>
            <option value="public_facility">공공시설(구민회관·시민회관)</option>
            <option value="self_only">셀프웨딩 (식 진행)</option>
            <option value="none">결혼식 안 함 (혼인신고만)</option>
            <option value="snap_only">스냅 촬영만</option>
            <option value="dual_ceremony">이중식 (한국+해외)</option>
          </select>
        </div>

        {/* 거주·예식 국가 — 해외 거주 / 국제결혼 분기. country !== "KR" 일 때만 정보 가치.
            기본값은 디바이스 locale 에서 자동 (L2). v2 §1 위계 적용. */}
        <div>
          <label className={labelCls}>
            거주·예식 국가 <span className="text-xs text-gray-400 font-normal">(해외/국제결혼만)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[11px] text-gray-500 mb-1">현재 거주</p>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
              >
                <option value="KR">대한민국</option>
                <option value="US">미국</option>
                <option value="JP">일본</option>
                <option value="SG">싱가포르</option>
                <option value="GB">영국</option>
                <option value="DE">독일</option>
                <option value="AU">호주</option>
                <option value="OTHER">기타 해외</option>
              </select>
            </div>
            <div>
              <p className="text-[11px] text-gray-500 mb-1">예식 국가</p>
              <select
                value={weddingCountry}
                onChange={(e) => setWeddingCountry(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
              >
                <option value="KR">대한민국</option>
                <option value="US">미국</option>
                <option value="JP">일본</option>
                <option value="DUAL">한국 + 해외 (이중식)</option>
                <option value="OTHER">기타</option>
              </select>
            </div>
          </div>
          {(country !== "KR" || weddingCountry !== "KR") && (
            <p className="text-[11px] text-amber-700 mt-1.5 leading-snug">
              해외/국제결혼 모드로 전환돼요. 원격 진행·양가 부모 위임·영문 자료 안내가 활성화됩니다.
            </p>
          )}
        </div>

          </div>{/* end 더 정확한 큐레이션 */}
        </details>


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
