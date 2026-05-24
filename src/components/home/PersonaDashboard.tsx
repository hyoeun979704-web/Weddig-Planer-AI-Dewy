import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ArrowRight, BookOpen, Check, Flame, Sparkles, Timer } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { usePersonaInsights } from "@/hooks/usePersonaInsights";
import { useDailyStreak } from "@/hooks/useDailyStreak";
import { useSessionTimer } from "@/hooks/useSessionTimer";
import { useTutorialProgress } from "@/hooks/useTutorialProgress";
import {
  loadMissionProgress,
  markMissionComplete,
  type PersonaMission,
} from "@/data/personaMissions";
import { shouldHideWeddingCeremony } from "@/lib/weddingPersona";
import {
  shouldPromptConfirm,
  markConfirmed,
  markDismissed,
  SIGNAL_KEYS,
} from "@/lib/behavioralSignals";
import SoftConfirmCard from "@/components/persona/SoftConfirmCard";
import { supabase } from "@/integrations/supabase/client";

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
  const { weddingSettings } = useWeddingSchedule();
  const streak = useDailyStreak();
  const session = useSessionTimer();
  const tutorialProgress = useTutorialProgress();
  const tutorialOverall = tutorialProgress.styleProgress(weddingSettings.wedding_style);

  const [missionProgress, setMissionProgress] = useState(() => loadMissionProgress());

  // 행동 신호 + 부드러운 확인 카드 — v2 §4.3 + §5.6 + §1 L4.
  // 임신 관련 콘텐츠 N회 누적 + 가입 후 3일 경과 후에만 노출.
  // pregnant 이미 true 면 카드 표시 안 함(이미 임신 모드).
  const accountCreatedAt = user?.created_at ? Date.parse(user.created_at) : null;
  const [pregnancySignalKey, setPregnancySignalKey] = useState(0); // re-render 트리거
  const showPregnancyConfirm =
    !!user &&
    !weddingSettings.pregnant &&
    shouldPromptConfirm(SIGNAL_KEYS.pregnancyInterest, {
      threshold: 3,
      accountCreatedAt,
      minAccountAgeDays: 3,
    });
  // pregnancySignalKey 가 의존성에 들어가야 confirm/dismiss 후 즉시 재평가됨.
  // shouldPromptConfirm 자체는 localStorage 만 보므로 React 가 재렌더링 트리거가 필요.
  void pregnancySignalKey;

  const handlePregnancyConfirm = async () => {
    if (!user) return;
    markConfirmed(SIGNAL_KEYS.pregnancyInterest);
    setPregnancySignalKey((k) => k + 1);
    // pregnant=true 설정 + 민감정보(건강) 동의 기록. 모달과 동일 패턴.
    try {
      await (supabase as any).from("user_consents").insert({
        user_id: user.id,
        consent_type: "sensitive_health_pregnancy_v1",
        consent_version: 1,
        agreed: true,
        user_agent:
          typeof navigator !== "undefined"
            ? navigator.userAgent?.slice(0, 500)
            : null,
      });
    } catch (e) {
      console.error("pregnancy consent log failed", e);
    }
    try {
      await (supabase as any)
        .from("user_wedding_settings")
        .update({ pregnant: true })
        .eq("user_id", user.id);
    } catch (e) {
      console.error("pregnant flag update failed", e);
    }
    // 마이페이지 결혼 정보로 이동해 출산예정일 입력 유도 (정확도 향상).
    navigate("/mypage?openWeddingInfo=1");
  };

  const handlePregnancyDecline = () => {
    markDismissed(SIGNAL_KEYS.pregnancyInterest);
    setPregnancySignalKey((k) => k + 1);
  };

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
      setMissionProgress(markMissionComplete(m.key));
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
    {/* 임신 관련 콘텐츠 조회 누적 시 부드러운 확인 카드. 본 대시보드 위에 배치 —
        스크롤 없이 첫 화면에서 보이도록. v2 §4.3·§5 패턴 적용. */}
    {showPregnancyConfirm && (
      <SoftConfirmCard
        tone="warm"
        title="임신 중에 결혼 준비하시는 분들을 위한 가이드가 있어요"
        description="본식 시점 차수에 맞춰 일정·드레스·신혼여행이 자동으로 맞춰져요. 한 번에 받아보시겠어요?"
        confirmLabel="받기"
        declineLabel="지금은 괜찮아요"
        onConfirm={handlePregnancyConfirm}
        onDecline={handlePregnancyDecline}
      />
    )}
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
              <p className="text-[11px] font-bold text-foreground">{streak.streak}일</p>
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

        {/* Row 4: daily missions */}
        <div className="relative mt-3">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <p className="text-[11px] font-bold text-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary" />
              오늘의 미션 {completedMissions > 0 && (
                <span className="text-primary">({completedMissions}/{missions.length})</span>
              )}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {missions.map(m => {
              const done = missionProgress.completedKeys.includes(m.key);
              return (
                <button
                  key={m.key}
                  onClick={() => handleMissionClick(m)}
                  className={`text-left p-2 rounded-xl border transition-all active:scale-[0.97] ${
                    done
                      ? "bg-primary/10 border-primary/30"
                      : "bg-card/80 border-border hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center justify-end mb-0.5 min-h-[16px]">
                    {done && <Check className="w-3 h-3 text-primary" />}
                  </div>
                  <p className="text-[11px] font-semibold text-foreground leading-tight">
                    {m.label}
                  </p>
                  <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">
                    {m.hint}
                  </p>
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
