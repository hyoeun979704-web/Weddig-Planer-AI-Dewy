import { useState } from "react";
import Seo from "@/components/Seo";
import LoginRequiredOverlay from "@/components/LoginRequiredOverlay";
import { useNavigate, useLocation } from "react-router-dom";
import { useBudget } from "@/hooks/useBudget";
import TutorialOverlay from "@/components/TutorialOverlay";
import { usePageTutorial } from "@/hooks/usePageTutorial";
import { Heart, Loader2, Plus, Check, BookOpen, Settings } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import HomeHeader from "@/components/home/HomeHeader";
import TimelineDetailSheet from "@/components/schedule/TimelineDetailSheet";
import ScheduleCalendar from "@/components/schedule/ScheduleCalendar";
import FamilyAvailabilityOverlap from "@/components/schedule/FamilyAvailabilityOverlap";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { useAuth } from "@/contexts/AuthContext";
import PartnerLinkCard from "@/components/partner/PartnerLinkCard";
import { useCoupleLink } from "@/hooks/useCoupleLink";
import { useSubscription } from "@/hooks/useSubscription";
import UpgradeModal from "@/components/premium/UpgradeModal";
import WeddingInfoSetupModal from "@/components/wedding-planner/WeddingInfoSetupModal";
import { useWeddingInfoPrompt } from "@/hooks/useWeddingInfoPrompt";
import { format, differenceInDays, isToday, isTomorrow } from "date-fns";
import { ko } from "date-fns/locale";
import {
  buildTimelinePhases,
  type TimelinePhase,
  daysUntilWedding,
  getTaskUrgency,
  parseLocalDate,
} from "@/lib/schedule";
import {
  CATEGORY_LABELS,
  SKIPPABLE_CATEGORIES,
  isHiddenByExclusion,
  type SkippableCategory,
} from "@/lib/weddingStyle";
import arrowLeftIcon from "@/assets/icons/arrow-left.svg";
import chevronRightIcon from "@/assets/icons/chevron-right.svg";
import clipboardIcon from "@/assets/icons/clipboard.svg";
import clockIcon from "@/assets/icons/clock.svg";
import calendarIcon from "@/assets/icons/calendar.svg";
import walletGreenIcon from "@/assets/icons/wallet-green.svg";

const Schedule = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isLinked } = useCoupleLink();
  const { 
    weddingSettings, 
    scheduleItems, 
    isLoading, 
    toggleItemCompletion,
    addScheduleItem,
    deleteScheduleItem,
    updateItemNotes,
    updateScheduleItem
  } = useWeddingSchedule();

  const [selectedPhase, setSelectedPhase] = useState<TimelinePhase | null>(null);
  const { settings: budgetSettings, summary: budgetSummary } = useBudget();
  const { isPremium } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const tutorial = usePageTutorial("schedule");
  const weddingInfoPrompt = useWeddingInfoPrompt();
  const [tidyTipDismissed, setTidyTipDismissed] = useState<boolean>(
    () => typeof window !== "undefined" && localStorage.getItem("dewy:schedule:tidy-tip-dismissed") === "1"
  );

  const days = daysUntilWedding(weddingSettings.wedding_date);
  // 압축 모드 — P18(임신 16주 · 식 4개월) / P13(7개월) 등 임박 사용자도 phase
  // 5단계를 의미 있게 받도록 D-Day 까지 잔여일 기준으로 윈도우 비율을 재계산.
  const TIMELINE_PHASES = buildTimelinePhases(days);

  // Filter out items in user-excluded categories. The DB still has them, but
  // the schedule UI hides them — re-enabling the category brings them back.
  const visibleItems = scheduleItems.filter(
    i => !isHiddenByExclusion(i.category, weddingSettings.excluded_categories)
  );

  // Overall completion
  const totalItems = visibleItems.length;
  const completedItems = visibleItems.filter(i => i.completed).length;
  const overallProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Tidy tip: if many template-seeded items are still incomplete, suggest a
  // cleanup pass. Helps "일반 웨딩" users avoid feeling overwhelmed by the
  // 30+ default checklist on first run.
  const incompleteTemplateCount = visibleItems.filter(
    i => i.source === "template" && !i.completed
  ).length;
  const showTidyTip = !tidyTipDismissed && incompleteTemplateCount >= 20;

  const dismissTidyTip = () => {
    localStorage.setItem("dewy:schedule:tidy-tip-dismissed", "1");
    setTidyTipDismissed(true);
  };

  // D-Day based premium banners. Suppressed for high-progress users outside
  // the last-2-week window — 풀패키지 고객이 D-150에 견적서 광고 받는 일을 줄임.
  const getDDayBanner = () => {
    if (days === null || days <= 0) return null;
    if (days > 14 && overallProgress >= 85) return null;
    const banners = [
      { min: 120, max: 180, msg: " 업체 비교 견적서 만들어보세요", route: "/premium/content" },
      { min: 60, max: 119, msg: " 스냅 촬영 타임라인 준비할 때예요!", route: "/premium/content" },
      { min: 31, max: 59, msg: " 예산 중간 점검 리포트를 확인하세요", route: "/premium/content" },
      { min: 15, max: 30, msg: " 본식 타임라인 + 스태프 안내서를 준비하세요", route: "/premium/content" },
      { min: 8, max: 14, msg: " 가방순이·축의대 안내서 전달하셨나요?", route: "/premium/content" },
      { min: 1, max: 7, msg: " 하객에게 리마인드 메시지를 보내세요", route: "/premium/content" },
    ];
    return banners.find(b => days >= b.min && days <= b.max) || null;
  };

  const ddayBanner = getDDayBanner();
  const handleTabChange = (href: string) => {
    navigate(href);
  };

  // Get phase status based on D-Day
  const getPhaseStatus = (category: string): "completed" | "current" | "upcoming" => {
    if (days === null) return "upcoming";

    // 라벨(buildTimelinePhases)과 status 가 같은 윈도우에서 나와야 함.
    // 정적 [365,180,...] 범위를 쓰면 압축 모드(P18) 사용자의 phase 라벨은
    // 'D-120~D-60' 인데 status 는 [180,120] 기준으로 '완료'로 잘못 잡힘.
    const phase = TIMELINE_PHASES.find((p) => p.category === category);
    if (!phase) return "upcoming";

    if (days > phase.startDay) return "upcoming";
    if (days <= phase.endDay) return "completed";
    return "current";
  };

  // Get phase progress
  const getPhaseProgress = (category: string) => {
    const phaseItems = visibleItems.filter(item => item.category === category);
    if (phaseItems.length === 0) return 0;
    const completed = phaseItems.filter(item => item.completed).length;
    return Math.round((completed / phaseItems.length) * 100);
  };

  // Get upcoming tasks (not completed, sorted by date)
  const upcomingTasks = visibleItems
    .filter(item => !item.completed)
    .slice(0, 4);

  const formatRelativeDate = (dateStr: string) => {
    const date = parseLocalDate(dateStr);
    if (isToday(date)) return "오늘";
    if (isTomorrow(date)) return "내일";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysLeft = differenceInDays(date, today);
    if (daysLeft >= 0 && daysLeft <= 6) return format(date, "EEEE", { locale: ko });
    return format(date, "M월 d일", { locale: ko });
  };

  const getDateUrgency = (dateStr: string) => {
    const target = parseLocalDate(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysLeft = differenceInDays(target, today);
    if (daysLeft < 0) return "text-destructive";
    if (daysLeft === 0) return "text-primary font-bold";
    if (daysLeft <= 3) return "text-orange-500";
    if (daysLeft <= 7) return "text-yellow-600";
    return "text-muted-foreground";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background app-col mx-auto relative flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--pink-50))] app-col mx-auto relative">
      <Seo title="결혼 준비 스케줄·D-Day 관리 | Dewy" description="결혼식 D-Day, 시기별 추천 일정, 다가오는 일정과 카테고리별 진행률까지 한눈에. AI 웨딩플래너 Dewy." path="/schedule" />
      {!user && <LoginRequiredOverlay message="D-Day 카운트다운, 체크리스트까지 한눈에 관리하세요" features={["D-Day 카운트다운", "준비 체크리스트", "커플 일정 공유"]} />}

      <HomeHeader />

      {/* Sub-header */}
      <header className="sticky safe-sticky-below-header z-30 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              aria-label="뒤로가기"
            >
              <img src={arrowLeftIcon} alt="" className="w-[15px] h-[15px]" />
            </button>
            <h1 className="text-[18px] font-bold text-foreground">스케줄</h1>
          </div>
          <button
            data-tutorial="schedule-add"
            onClick={() => navigate("/my-schedule")}
            className="px-4 py-1.5 bg-primary/15 rounded-full text-primary text-[13px] font-semibold"
          >
            + 일정 관리
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        {/* ── 최상단 캘린더 — 등록 일정을 월 달력에 표시 + Google/.ics 연동 ── */}
        {user && (
          <section className="px-4 pt-4">
            <ScheduleCalendar
              items={visibleItems}
              weddingDate={weddingSettings.wedding_date}
              onToggleItem={toggleItemCompletion}
            />
          </section>
        )}

        {/* ── Hero: D-Day Card ── */}
        <div
          data-tutorial="schedule-dday"
          className="mx-4 mt-4 mb-4 rounded-2xl overflow-hidden cursor-pointer"
          onClick={() => navigate("/my-schedule")}
        >
          <div className="bg-[hsl(var(--pink-100))] p-5">
            <p className="text-sm text-muted-foreground mb-1">결혼식까지</p>
            {days !== null ? (
              <h2 className="text-[44px] leading-tight font-extrabold tracking-tight text-primary mb-1">
                {days > 0 ? `D-${days}` : days === 0 ? "D-Day " : `D+${Math.abs(days)}`}
              </h2>
            ) : (
              <h2 className="text-[44px] leading-tight font-extrabold text-primary mb-1">D-DAY</h2>
            )}
            {weddingSettings.wedding_date ? (
              <p className="text-sm text-muted-foreground mb-4">
                {format(parseLocalDate(weddingSettings.wedding_date), "yyyy년 M월 d일 (EEEE)", { locale: ko })}
              </p>
            ) : weddingSettings.wedding_date_tbd ? (
              <div className="flex items-center gap-1.5 mb-4">
                <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">예정일 미정</span>
                <span className="text-xs text-muted-foreground">1년 후 기준 일정</span>
              </div>
            ) : (
              <p className="text-sm text-primary font-medium mb-4">결혼식 날짜를 설정해보세요 →</p>
            )}
            <div className="bg-white rounded-xl px-4 py-3">
              <p className="text-xs font-medium text-foreground mb-1.5">준비 진행률</p>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-primary"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── 내 업체 보드 진입 — 카테고리별 업체를 한눈에 정리(미정/견적중/예약완료) ── */}
        <button
          onClick={() => navigate("/board")}
          className="mx-4 mb-3 w-[calc(100%-2rem)] px-4 py-3.5 bg-white rounded-2xl border border-border flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
        >
          <img src={clipboardIcon} alt="" className="w-[17px] h-5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-foreground">내 업체 보드</p>
            <p className="text-xs text-muted-foreground">베뉴·스튜디오·드레스·스냅·청첩장까지 한 보드에서 정리</p>
          </div>
          <img src={chevronRightIcon} alt="" className="w-1.5 h-[9px] shrink-0" />
        </button>

        {/* ── Tidy Tip ── */}
        {showTidyTip && (
          <div className="mx-4 mb-3 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl">
            <div className="flex items-start gap-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-amber-900">
                  추천 일정이 {incompleteTemplateCount}개 있어요
                </p>
                <p className="text-[12px] text-amber-800 mt-0.5 leading-snug">
                  필요 없는 항목은 정리하고, 결혼 스타일을 다시 확인해보세요.
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => navigate("/my-schedule")}
                    className="text-[12px] font-semibold text-amber-900 px-3 py-1 rounded-full bg-amber-200/70"
                  >
                    정리하기
                  </button>
                  <button
                    onClick={dismissTidyTip}
                    className="text-[12px] text-amber-700 px-2"
                  >
                    나중에
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Upcoming Tasks ──
            Moved above the premium banner: the user's actionable items
            should come before the upsell. Premium CTA still surfaces
            right below when applicable. */}
        <section className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-foreground flex items-center gap-2 text-[16px]">
              <img src={clockIcon} alt="" className="w-[17px] h-[17px]" />
              다가오는 일정
            </h3>
            <button onClick={() => navigate("/my-schedule")} className="text-[13px] text-primary font-semibold">전체보기</button>
          </div>
          {user && upcomingTasks.length > 0 ? (
            <div className="space-y-2">
              {upcomingTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl border border-border active:scale-[0.98] transition-transform"
                >
                  <button
                    onClick={() => toggleItemCompletion(task.id)}
                    aria-label="완료 처리"
                    className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 hover:border-primary hover:bg-primary/5 active:bg-primary/10 transition-colors shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm text-foreground block truncate">{task.title}</span>
                      {task.source === "template" && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-medium shrink-0"
                          title="결혼 정보 등록 시 자동으로 추가된 추천 일정"
                        >
                           추천
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {getTaskUrgency(task.scheduled_date) === "past_due" && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-destructive/10 text-destructive rounded-full font-medium">
                        지남
                      </span>
                    )}
                    <span className={`text-xs font-medium whitespace-nowrap ${getDateUrgency(task.scheduled_date)}`}>
                      {formatRelativeDate(task.scheduled_date)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center py-8 bg-card rounded-xl border border-dashed border-border cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate("/my-schedule")}
            >
              <Plus className="w-7 h-7 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {user ? "일정을 추가해보세요" : "로그인하여 일정을 관리하세요"}
              </p>
            </div>
          )}
        </section>

        {/* ── Premium Banner — dynamic content tied to D-Day + progress ── */}
        {ddayBanner && (
          <button
            onClick={() => isPremium ? navigate(ddayBanner.route) : setShowUpgrade(true)}
            className="mx-4 mb-6 w-[calc(100%-2rem)] px-4 py-3.5 bg-white rounded-2xl border border-border flex items-center gap-3 text-left"
          >
            <img src={clipboardIcon} alt="" className="w-[17px] h-5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-foreground">{ddayBanner.msg}</p>
              <p className="text-xs text-muted-foreground">{isPremium ? "탭하여 시작하기" : "프리미엄 전용"}</p>
            </div>
            <img src={chevronRightIcon} alt="" className="w-1.5 h-[9px] shrink-0" />
          </button>
        )}

        {/* ── Category Progress ── */}
        {(() => {
          const counts: Record<string, { total: number; done: number }> = {};
          for (const item of visibleItems) {
            const key = item.category;
            if (!key) continue;
            if (!SKIPPABLE_CATEGORIES.includes(key as SkippableCategory)) continue;
            counts[key] = counts[key] || { total: 0, done: 0 };
            counts[key].total += 1;
            if (item.completed) counts[key].done += 1;
          }
          const entries = Object.entries(counts);
          if (entries.length === 0) return null;
          return (
            <section className="px-4 mb-6">
              <h3 className="font-bold text-foreground mb-3 text-[16px]">카테고리별 진행률</h3>
              <div className="bg-white rounded-2xl border border-border p-4 space-y-3">
                {entries.map(([cat, { total, done }]) => {
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  const meta = CATEGORY_LABELS[cat as SkippableCategory];
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] font-medium text-foreground">{meta?.label ?? cat}</span>
                        <span className="text-[11px] text-muted-foreground">{done}/{total}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct === 100 ? "bg-green-500" : "bg-primary"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })()}

        {/* ── Budget Mini Widget ── */}
        <section className="px-4 mb-6">
          <button
            onClick={() => navigate("/budget")}
            className="w-full px-4 py-3.5 bg-white rounded-2xl border border-border flex items-center gap-3"
          >
            <img src={walletGreenIcon} alt="" className="w-[17px] h-[17px] shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[15px] font-bold text-foreground">예산 사용 현황</span>
                <span className="text-[13px] font-semibold text-primary">
                  {budgetSettings && budgetSettings.total_budget > 0
                    ? `${budgetSummary.totalSpent.toLocaleString()} / ${budgetSettings.total_budget.toLocaleString()}만원`
                    : "예산 미설정"}
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all bg-primary"
                  style={{
                    width: budgetSettings && budgetSettings.total_budget > 0
                      ? `${Math.min((budgetSummary.totalSpent / budgetSettings.total_budget) * 100, 100)}%`
                      : "0%",
                  }}
                />
              </div>
            </div>
            <img src={chevronRightIcon} alt="" className="w-1.5 h-[9px] shrink-0" />
          </button>
        </section>

        {/* 양가 일정 조율 — P1/P8/P9 페르소나 핵심. has_parents_* 기반으로 자동 노출/숨김. */}
        <FamilyAvailabilityOverlap />

        {/* ── Wedding Timeline ── */}
        <section className="px-4 mb-6" data-tutorial="schedule-timeline">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2 text-[16px]">
            <img src={calendarIcon} alt="" className="w-[17px] h-[19px]" />
            타임라인
          </h3>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-border" />

            <div className="space-y-3">
              {TIMELINE_PHASES.map((phase) => {
                const status = getPhaseStatus(phase.category);
                const phaseProgress = getPhaseProgress(phase.category);
                const phaseItemCount = visibleItems.filter(item => item.category === phase.category).length;
                const phaseCompleted = visibleItems.filter(item => item.category === phase.category && item.completed).length;
                const isCurrent = status === "current";
                const isCompleted = status === "completed";
                
                return (
                  <div 
                    key={phase.id}
                    onClick={() => user ? setSelectedPhase(phase) : navigate("/auth")}
                    className={`relative flex items-start gap-3 cursor-pointer group`}
                  >
                    {/* Timeline dot */}
                    <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all border-2 ${
                      isCurrent
                        ? "bg-primary border-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]"
                        : isCompleted
                          ? "bg-green-500 border-green-500"
                          : "bg-background border-border"
                    }`}>
                      {isCompleted ? (
                        <Check className="w-4 h-4 text-white" />
                      ) : (
                        <span className={`text-sm font-bold ${isCurrent ? "text-white" : "text-muted-foreground"}`}>
                          {phase.id}
                        </span>
                      )}
                    </div>

                    {/* Content card */}
                    <div className={`flex-1 pb-1 p-3 rounded-xl border transition-all ${
                      isCurrent
                        ? "bg-primary/5 border-primary/25 shadow-sm"
                        : "bg-card border-border group-hover:border-primary/20 group-hover:shadow-sm"
                    }`}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-[11px] font-medium ${isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                          {phase.period}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                            진행중
                          </span>
                        )}
                        {isCompleted && phaseItemCount > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-600">
                            완료
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-sm text-foreground">{phase.title}</h4>
                      <p className="text-xs text-muted-foreground mb-2">{phase.description}</p>
                      
                      {/* Progress bar */}
                      {phaseItemCount > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${isCompleted && phaseProgress === 100 ? "bg-green-500" : "bg-primary"}`}
                              style={{ width: `${phaseProgress}%` }} 
                            />
                          </div>
                          <span className="text-[11px] font-medium text-muted-foreground">{phaseCompleted}/{phaseItemCount}</span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {phase.defaultTasks.slice(0, 2).map((task, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-muted rounded-full text-[11px] text-muted-foreground">
                              {task}
                            </span>
                          ))}
                          {phase.defaultTasks.length > 2 && (
                            <span className="text-[11px] text-primary font-medium px-1">+{phase.defaultTasks.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Wedding Style Summary ── */}
        {weddingSettings.excluded_categories.length > 0 && (
          <section className="px-4 mb-6">
            <button
              onClick={() => navigate("/my-schedule")}
              className="w-full p-3.5 bg-white rounded-2xl border border-border flex items-center gap-3 text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Settings className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-foreground">결혼 스타일 적용 중</p>
                <p className="text-[11px] text-muted-foreground">
                  {weddingSettings.excluded_categories.length}개 카테고리 숨김 · 탭하여 조정
                </p>
              </div>
              <img src={chevronRightIcon} alt="" className="w-1.5 h-[9px] shrink-0" />
            </button>
          </section>
        )}

        {/* ── Couple Section ── */}
        <section className="px-4 mb-6" data-tutorial="schedule-couple">
          <h3 className="font-bold text-foreground mb-3 flex items-center gap-2 text-[16px]">
            <Heart className="w-[17px] h-[17px] text-pink-500" />
            파트너 연결
          </h3>
          <PartnerLinkCard variant="schedule" hideWhenLoggedOut />
        </section>
      
        {/* Couple Diary Link */}
        {isLinked && (
          <section className="px-4 mb-6">
            <button
              onClick={() => navigate("/couple-diary")}
              className="w-full p-3.5 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20 rounded-xl border border-pink-200/50 dark:border-pink-800/30 flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                <BookOpen className="w-4.5 h-4.5 text-pink-500" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-foreground text-sm">우리의 일기</h3>
                <p className="text-[11px] text-muted-foreground">함께 쓰는 웨딩 준비 일기</p>
              </div>
              <img src={chevronRightIcon} alt="" className="w-1.5 h-[9px]" />
            </button>
          </section>
        )}
      </main>

      {/* Timeline Detail Sheet */}
      <TimelineDetailSheet
        open={selectedPhase !== null}
        onOpenChange={(open) => !open && setSelectedPhase(null)}
        phase={selectedPhase}
        items={visibleItems}
        onAddItem={addScheduleItem}
        onToggleItem={toggleItemCompletion}
        onDeleteItem={deleteScheduleItem}
        onUpdateNotes={updateItemNotes}
        onUpdateItem={updateScheduleItem}
        weddingDate={weddingSettings.wedding_date}
      />

      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} trigger="pdf_feature" />

      <WeddingInfoSetupModal
        isOpen={weddingInfoPrompt.open}
        onClose={weddingInfoPrompt.dismiss}
      />

      {/* Bottom Navigation */}
      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />

      {tutorial.isActive && tutorial.currentStep && (
        <TutorialOverlay
          isActive={tutorial.isActive}
          currentStep={tutorial.currentStep}
          currentStepIndex={tutorial.currentStepIndex}
          totalSteps={tutorial.totalSteps}
          onNext={tutorial.nextStep}
          onPrev={tutorial.prevStep}
          onSkip={tutorial.skipTutorial}
        />
      )}
    </div>
  );
};

export default Schedule;
