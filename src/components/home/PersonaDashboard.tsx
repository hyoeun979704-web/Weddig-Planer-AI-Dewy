import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ArrowRight, BookOpen, Check, Flame, Sparkles, Timer, Gift, Lightbulb, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { usePersonaInsights } from "@/hooks/usePersonaInsights";
import { useSmartSuggestions } from "@/hooks/useSmartSuggestions";
import { useDailyStreak } from "@/hooks/useDailyStreak";
import { useSessionTimer } from "@/hooks/useSessionTimer";
import { useTutorialProgress } from "@/hooks/useTutorialProgress";
import { useAttendance } from "@/hooks/useAttendance";
import { usePoints } from "@/hooks/usePoints";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  loadMissionProgress,
  markMissionComplete,
  type PersonaMission,
} from "@/data/personaMissions";
import { shouldHideWeddingCeremony } from "@/lib/weddingPersona";
import { trackHomeNav } from "@/lib/track";
import { shouldPromptConfirm, SIGNAL_KEYS } from "@/lib/behavioralSignals";
import PregnancyConfirmFlow from "@/components/persona/PregnancyConfirmFlow";
import RemarriageConfirmFlow from "@/components/persona/RemarriageConfirmFlow";
import SingleHouseholdConfirmFlow from "@/components/persona/SingleHouseholdConfirmFlow";
import GroomConfirmFlow from "@/components/persona/GroomConfirmFlow";

const formatMinutes = (seconds: number) => {
  if (seconds < 60) return `${seconds}초`;
  const min = Math.floor(seconds / 60);
  if (min < 60) return `${min}분`;
  const hr = Math.floor(min / 60);
  return `${hr}시간 ${min % 60}분`;
};

/**
 * Style-aware home dashboard card. Renders only for signed-in users that
 * have completed onboarding (real date OR explicit 미정). Combines the four
 * persona-simulation engagement levers into one above-the-fold surface:
 *  - D-Day + checklist progress ring
 *  - Style-specific intro line ("오늘의 스몰웨딩 큐레이션" 등)
 *  - Next 3 actionable items from the seeded schedule
 *  - Daily streak + today's session minutes (self-quantification)
 *  - 3 daily missions tailored to wedding_style
 *
 * Returns null for guests / pre-onboarding so the existing HeroBanner/marketing
 * surface keeps its slot.
 */
const PersonaDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const insights = usePersonaInsights();
  // 유기성 배선 D2 — 기능 간 빈틈을 감지해 각 기능으로 딥링크하는 크로스-피처 제안.
  const smartSuggestions = useSmartSuggestions(3);
  const { weddingSettings } = useWeddingSchedule();
  const streak = useDailyStreak();
  const session = useSessionTimer();
  const tutorialProgress = useTutorialProgress();
  const tutorialOverall = tutorialProgress.styleProgress(weddingSettings.wedding_style);

  const [missionProgress, setMissionProgress] = useState(() => loadMissionProgress());
  // 100P 보너스 RPC 가 같은 mount 안에서 중복 호출되지 않도록 가드 (DB 측 partial
  // unique index 가 최종 가드지만 RPC 자체를 안 부르는 게 더 깔끔).
  const claimedBonusRef = useRef(false);
  const attendance = useAttendance();
  const { refetch: refetchPoints } = usePoints();

  // 행동 신호 + 부드러운 확인 카드 — v2 §4.3 + §5.6 + §1 L4.
  // 임신 관련 콘텐츠 N회 누적 + 가입 후 3일 경과 후에만 노출.
  // pregnant 이미 true 면 카드 표시 안 함(이미 임신 모드).
  // F#14: Date.parse 결과가 NaN 이면 minAccountAgeDays 가드가 우회됨. Number.isFinite 로 명시 검증.
  const accountCreatedAt = (() => {
    if (!user?.created_at) return null;
    const ms = Date.parse(user.created_at);
    return Number.isFinite(ms) && ms > 0 ? ms : null;
  })();
  const [signalKey, setSignalKey] = useState(0); // re-render 트리거 (4 ConfirmFlow 공유)
  // Round 8 B — pregnancy 외 remarriage/single-household/groom 도 같은 패턴으로 노출.
  // 단일 사용자에게 한꺼번에 3장 카드가 뜨는 건 피로 — 우선순위 1장만:
  //   pregnancy > remarriage > single_household > groom (민감도·고유성 순).
  const showPregnancyConfirm =
    !!user &&
    !weddingSettings.pregnant &&
    shouldPromptConfirm(SIGNAL_KEYS.pregnancyInterest, {
      threshold: 3,
      accountCreatedAt,
      minAccountAgeDays: 3,
    });
  const showRemarriageConfirm =
    !!user &&
    !showPregnancyConfirm &&
    // Round 9 fix — marital_history 가 명시적으로 'first' 면 사용자가 이미 선택한 것
    // → 다시 묻지 않음. null(미선택) 일 때만 prompt. 'remarriage' 면 당연히 prompt X.
    weddingSettings.marital_history == null &&
    shouldPromptConfirm(SIGNAL_KEYS.remarriageInterest, {
      threshold: 2, // 커뮤니티 카테고리 진입 빈도 낮아 임계값 낮춤.
      accountCreatedAt,
      minAccountAgeDays: 3,
    });
  const showSingleHouseholdConfirm =
    !!user &&
    !showPregnancyConfirm &&
    !showRemarriageConfirm &&
    // has_parents_* 둘 다 true(기본값) 일 때만 노출. 한쪽이라도 false 면 사용자가 이미 인지.
    weddingSettings.has_parents_bride &&
    weddingSettings.has_parents_groom &&
    shouldPromptConfirm(SIGNAL_KEYS.singleHouseholdHint, {
      threshold: 2,
      accountCreatedAt,
      minAccountAgeDays: 3,
    });
  const showGroomConfirm =
    !!user &&
    !showPregnancyConfirm &&
    !showRemarriageConfirm &&
    !showSingleHouseholdConfirm &&
    weddingSettings.role !== "groom" &&
    shouldPromptConfirm(SIGNAL_KEYS.groomRoleHint, {
      threshold: 3, // 예복·신랑한복 자주 보는 사용자가 신랑일 확률 높음.
      accountCreatedAt,
      minAccountAgeDays: 3,
    });
  // signalKey 가 의존성에 들어가야 confirm/dismiss 후 즉시 재평가됨.
  void signalKey;

  if (!user || !insights.isLoaded || !insights.hasOnboarded) {
    return null;
  }

  const {
    daysUntilWedding,
    progressPercent,
    completedCount,
    totalCount,
    nextActions,
    missions,
    styleLabel,
    styleIntro,
    personaMode,
    personaLabel,
    personaHeader,
  } = insights;

  // 비표준 페르소나(재혼·임신·해외·국제·신랑·1인진행·노식·스냅 등)는 페르소나 헤더가
  // wedding_style 헤더보다 우선. 표준 신부는 기존 styleIntro 그대로.
  const isStandardBride = personaMode === "standard_bride";
  const headerTitle = isStandardBride ? styleIntro.title : personaHeader.title;
  const headerSubtitle = isStandardBride ? styleIntro.subtitle : personaHeader.subtitle;
  const modeChipLabel = isStandardBride ? `${styleLabel} 모드` : `${personaLabel} 모드`;

  const weddingDate = weddingSettings.wedding_date;
  // 노식·스냅 페르소나는 D-Day 의미가 다름 — "촬영일"·"기념일"로 대체.
  // 0(오늘) / 음수(지남) 도 표준 분기와 동일하게 다뤄야 함 — F#14.
  const hideCeremony = shouldHideWeddingCeremony(personaMode);
  const buildLabel = (d: number | null, todayLabel: string, doneLabel: string, futurePrefix: string): string => {
    if (d === null) return "미정";
    if (d > 0) return `${futurePrefix}${d}`;
    if (d === 0) return todayLabel;
    return `${doneLabel} D+${Math.abs(d)}`;
  };
  const dDayLabel = hideCeremony
    ? personaMode === "snap_only"
      ? daysUntilWedding === null
        ? "기념일 미정"
        : buildLabel(daysUntilWedding, "촬영 당일", "촬영 완료", "촬영 D-")
      : daysUntilWedding === null
        ? "노웨딩"
        : buildLabel(daysUntilWedding, "오늘 신고", "혼인신고", "D-")
    : daysUntilWedding === null
      ? "예정일 미정"
      : daysUntilWedding > 0
        ? `D-${daysUntilWedding}`
        : daysUntilWedding === 0
          ? "오늘!"
          : `D+${Math.abs(daysUntilWedding)}`;

  const handleMissionClick = (m: PersonaMission) => {
    if (!missionProgress.completedKeys.includes(m.key)) {
      const next = markMissionComplete(m.key);
      setMissionProgress(next);
      // 마지막 미션 완료 시 100P 보너스 RPC 호출 (idempotent — partial unique
      // index 가 같은 KST 날짜 두 번째 INSERT 차단).
      if (
        next.completedKeys.length >= missions.length &&
        !claimedBonusRef.current
      ) {
        claimedBonusRef.current = true;
        void (async () => {
          const { data, error } = await (supabase as any).rpc("claim_mission_bonus");
          if (error) {
            console.error("claim_mission_bonus failed", error);
            return;
          }
          const row = Array.isArray(data) ? data[0] : data;
          if (row?.claimed) {
            toast.success(`🎉 오늘의 미션 완료! ${row.amount}P 보너스 적립`);
            await refetchPoints();
          }
        })();
      }
    }
    navigate(m.href);
  };

  const completedMissions = missionProgress.completedKeys.length;
  const progressDeg = Math.max(0, Math.min(360, (progressPercent / 100) * 360));

  // D-day 잔여일별 톤. 분홍 단조로움을 4단계로 분기해 "급함"이 한눈에 읽히게.
  // >180일·미정·D+(지난 식)은 톤 없음 = 기존 primary 유지.
  const urgencyTone: { ring: string; text: string; chipBg: string; chipFg: string; hint: string } | null = (() => {
    if (daysUntilWedding === null || daysUntilWedding <= 0) return null;
    if (daysUntilWedding <= 30) {
      return {
        ring: "hsl(0 84% 60%)",
        text: "text-red-600",
        chipBg: "bg-red-100",
        chipFg: "text-red-700",
        hint: "마지막 마무리 시기예요",
      };
    }
    if (daysUntilWedding <= 90) {
      return {
        ring: "hsl(25 95% 53%)",
        text: "text-orange-600",
        chipBg: "bg-orange-100",
        chipFg: "text-orange-700",
        hint: "지금이 결정 타이밍",
      };
    }
    if (daysUntilWedding <= 180) {
      return {
        ring: "hsl(38 92% 50%)",
        text: "text-amber-700",
        chipBg: "bg-amber-100",
        chipFg: "text-amber-700",
        hint: "차근차근 진행하기 좋아요",
      };
    }
    return null;
  })();
  const ringColor = urgencyTone?.ring ?? "hsl(var(--primary))";

  return (
    <>
    {/* 행동 신호 누적 시 부드러운 확인 카드. 동시 1장 — pregnancy > remarriage >
        single > groom 우선순위. v2 §4.3·§5. */}
    <PregnancyConfirmFlow
      show={showPregnancyConfirm}
      onChange={() => setSignalKey((k) => k + 1)}
    />
    <RemarriageConfirmFlow
      show={showRemarriageConfirm}
      onChange={() => setSignalKey((k) => k + 1)}
    />
    <SingleHouseholdConfirmFlow
      show={showSingleHouseholdConfirm}
      onChange={() => setSignalKey((k) => k + 1)}
    />
    <GroomConfirmFlow
      show={showGroomConfirm}
      onChange={() => setSignalKey((k) => k + 1)}
    />
    <section
      data-tutorial="persona-dashboard"
      className="px-4 pt-4 pb-2 animate-fade-in"
    >
      <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-accent/40 to-card border border-primary/15 p-4 relative overflow-hidden">
        {/* Decorative blur */}
        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-primary/10 blur-3xl" aria-hidden />

        {/* Row 1: Style intro + D-Day ring */}
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 flex-wrap mb-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-card/80 rounded-full text-[10px] font-semibold text-primary">
                {styleIntro.accentEmoji && <span>{styleIntro.accentEmoji}</span>}
                <span>{modeChipLabel}</span>
              </span>
              {urgencyTone && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${urgencyTone.chipBg} ${urgencyTone.chipFg}`}>
                  {urgencyTone.hint}
                </span>
              )}
              {weddingSettings.pregnant && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-700">
                  {insights.pregnancy.currentWeek !== null
                    ? `임신 ${insights.pregnancy.currentWeek}주차`
                    : "임신 모드"}
                  {insights.pregnancy.trimesterAtWedding && (
                    <span className="ml-1 opacity-80">
                      · 본식 {insights.pregnancy.weeksAtWedding}주
                    </span>
                  )}
                </span>
              )}
              {weddingSettings.marital_history === "remarriage" && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700">
                  재혼
                </span>
              )}
              {tutorialOverall.total > 0 && tutorialOverall.percent < 100 && (
                <button
                  onClick={() => navigate("/tutorial")}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-100 rounded-full text-[10px] font-semibold text-violet-700 active:scale-95 transition-transform"
                >
                  <BookOpen className="w-2.5 h-2.5" />
                  가이드 {tutorialOverall.done}/{tutorialOverall.total}
                </button>
              )}
            </div>
            <h2 className="text-[15px] font-bold text-foreground leading-tight">
              {headerTitle}
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {headerSubtitle}
            </p>
          </div>

          <button
            onClick={() => navigate("/my-schedule")}
            className="shrink-0 active:scale-95 transition-transform"
            aria-label="일정 관리"
          >
            <div
              className="w-[68px] h-[68px] rounded-full flex items-center justify-center"
              style={{
                background: `conic-gradient(${ringColor} ${progressDeg}deg, hsl(var(--muted)) ${progressDeg}deg)`,
              }}
            >
              <div className="w-[58px] h-[58px] rounded-full bg-card flex flex-col items-center justify-center">
                <span className={`text-[15px] font-extrabold leading-none ${urgencyTone?.text ?? "text-primary"}`}>
                  {dDayLabel}
                </span>
                <span className="text-[9px] text-muted-foreground mt-0.5">
                  {totalCount > 0 ? `${progressPercent}% 완료` : "준비 시작"}
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* Row 2: streak + session time + wedding date strip */}
        <div className="relative mt-3 grid grid-cols-3 gap-1.5">
          <div className="flex items-center gap-1.5 bg-card/70 rounded-xl px-2 py-1.5">
            <Flame className="w-3.5 h-3.5 text-rose-500" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground leading-none">연속</p>
              <p className="text-[11px] font-bold text-foreground flex items-center gap-0.5">
                {streak.streak}일
                {/* 프리즈(하루 빠짐 보호권) 보유 시 표시 — 끊길 걱정 줄이는 안심 신호. */}
                {streak.streak > 0 && streak.freezesAvailable > 0 && (
                  <span className="inline-flex items-center text-[9px] font-medium text-sky-500">
                    <Shield className="w-2.5 h-2.5" />{streak.freezesAvailable}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-card/70 rounded-xl px-2 py-1.5">
            <Timer className="w-3.5 h-3.5 text-amber-500" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground leading-none">오늘</p>
              <p className="text-[11px] font-bold text-foreground">
                {formatMinutes(session.todaySeconds)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-card/70 rounded-xl px-2 py-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground leading-none">완료</p>
              <p className="text-[11px] font-bold text-foreground">
                {completedCount}/{totalCount}
              </p>
            </div>
          </div>
        </div>

        {/* Row 3: next actions */}
        {nextActions.length > 0 && (
          <div className="relative mt-3 bg-card/70 rounded-2xl p-2.5">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <p className="text-[11px] font-bold text-foreground">다음 액션</p>
              <button
                onClick={() => navigate("/my-schedule")}
                className="text-[10px] font-medium text-primary flex items-center gap-0.5"
              >
                전체 보기 <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
            <div className="space-y-1">
              {nextActions.map(item => (
                <button
                  key={item.id}
                  onClick={() => navigate("/my-schedule")}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-muted/60 active:scale-[0.98] transition-all text-left"
                >
                  <span className="flex-1 text-[12px] font-medium text-foreground truncate">
                    {item.title}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {format(new Date(item.scheduled_date), "M/d", { locale: ko })}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Row 3.2: 스마트 제안 — "다음 한 걸음" 단일 강조(선택 과부하 해소). 최우선 1개를
            큰 primary CTA 로, 나머지는 작은 보조 링크로. 기능 간 빈틈을 각 기능으로 딥링크
            (유기성 D2). 모든 클릭은 전환 퍼널 측정(trackHomeNav). 빈틈 없으면 미렌더. */}
        {smartSuggestions.length > 0 && (
          <div className="relative mt-3">
            <div className="flex items-center gap-1 mb-1.5 px-1">
              <Lightbulb className="w-3 h-3 text-amber-500" />
              <p className="text-[11px] font-bold text-foreground">지금 한 걸음</p>
            </div>
            {/* 최우선 1개 — 큰 primary CTA */}
            <button
              onClick={() => {
                trackHomeNav("smart_primary", smartSuggestions[0].href, { id: smartSuggestions[0].id });
                navigate(smartSuggestions[0].href);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/30 active:scale-[0.99] transition-all text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-foreground truncate">
                  {smartSuggestions[0].label}
                </p>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  {smartSuggestions[0].reason}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-primary shrink-0" />
            </button>
            {/* 나머지 — 작은 보조 링크 */}
            {smartSuggestions.length > 1 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5 px-1">
                {smartSuggestions.slice(1).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      trackHomeNav("smart_secondary", s.href, { id: s.id });
                      navigate(s.href);
                    }}
                    className="px-2.5 py-1 rounded-full bg-card/80 border border-border text-[11px] text-foreground/80 active:scale-95 transition-transform"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Row 3.5: 출석 체크 — useAttendance 활용. KST 기준 1일 1회 50P + 연속 보너스. */}
        {user && (
          <button
            onClick={async () => {
              if (attendance.alreadyClaimedToday || attendance.isClaiming) return;
              const result = await attendance.claim();
              if (!result) {
                toast.error("출석 처리에 실패했어요");
                return;
              }
              if (!result.claimed) {
                toast.info("오늘은 이미 출석을 완료했어요");
                return;
              }
              await refetchPoints();
              const bonusText = result.bonusAmount > 0
                ? ` + 연속 ${result.currentStreak}일 보너스 ${result.bonusAmount}P!`
                : "";
              toast.success(`출석 완료! ${result.baseAmount}P 적립${bonusText}`);
            }}
            disabled={attendance.alreadyClaimedToday || attendance.isClaiming}
            className={`relative mt-3 w-full flex items-center gap-3 p-3 rounded-2xl border transition-all active:scale-[0.99] text-left ${
              attendance.alreadyClaimedToday
                ? "bg-muted/50 border-border"
                : "bg-gradient-to-r from-primary/15 to-primary/5 border-primary/30"
            }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              attendance.alreadyClaimedToday ? "bg-muted-foreground/20" : "bg-primary/20"
            }`}>
              {attendance.alreadyClaimedToday
                ? <Check className="w-4 h-4 text-muted-foreground" />
                : <Flame className="w-4 h-4 text-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-foreground">
                {attendance.alreadyClaimedToday ? "오늘 출석 완료" : "오늘 출석하고 50P 받기"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {attendance.currentStreak > 0
                  ? `연속 ${attendance.currentStreak}일 출석 중`
                  : "오늘부터 시작!"}
              </p>
            </div>
            {!attendance.alreadyClaimedToday && (
              <span className="text-[11px] font-bold text-primary shrink-0">받기 →</span>
            )}
          </button>
        )}

        {/* Row 4: daily missions — vertical stack with horizontal card layout.
            각 카드 안에서 [체크 아이콘] | [라벨 / 힌트] 가로 배치. 카드 자체는
            화면 너비 100% 사용해 한 줄에 하나씩 — 텍스트 잘림·가독성 회복. */}
        <div className="relative mt-3">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <p className="text-[11px] font-bold text-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary" />
              오늘의 미션 {completedMissions > 0 && (
                <span className="text-primary">({completedMissions}/{missions.length})</span>
              )}
            </p>
            {/* 보너스 표시 — 미완료 시 안내. */}
            {completedMissions < missions.length && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Gift className="w-2.5 h-2.5 text-primary" />
                모두 완료 시 100P
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            {missions.map(m => {
              const done = missionProgress.completedKeys.includes(m.key);
              return (
                <button
                  key={m.key}
                  onClick={() => handleMissionClick(m)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all active:scale-[0.99] text-left ${
                    done
                      ? "bg-primary/10 border-primary/30"
                      : "bg-card/80 border-border hover:border-primary/30"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    done ? "bg-primary/20" : "bg-muted/60"
                  }`}>
                    {done
                      ? <Check className="w-4 h-4 text-primary" />
                      : <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-foreground truncate">
                      {m.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {m.hint}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 결정 위임 단축버튼 — 결정 피로 페르소나가 한 번에 위임할 수 있게. */}
        <button
          onClick={() => navigate("/ai-planner")}
          className="relative mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary/8 hover:bg-primary/12 active:scale-[0.98] transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-bold text-primary">결정이 어려우신가요? Dewy가 추천해드려요</span>
        </button>

        {/* Wedding date footer (small). 노식·스냅 페르소나는 식 일자 라벨 숨김. */}
        {weddingDate && !hideCeremony && (
          <p className="relative text-[10px] text-muted-foreground mt-3 text-center">
            예식 {format(new Date(weddingDate), "yyyy.MM.dd (EEEE)", { locale: ko })}
          </p>
        )}
        {weddingDate && hideCeremony && personaMode === "snap_only" && (
          <p className="relative text-[10px] text-muted-foreground mt-3 text-center">
            촬영 예정 {format(new Date(weddingDate), "yyyy.MM.dd", { locale: ko })}
          </p>
        )}
      </div>
    </section>
    </>
  );
};

export default PersonaDashboard;
