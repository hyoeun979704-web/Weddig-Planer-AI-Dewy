import { useState } from "react";
import LoginRequiredOverlay from "@/components/LoginRequiredOverlay";
import { useNavigate, useLocation } from "react-router-dom";
import { useBudget } from "@/hooks/useBudget";
import TutorialOverlay from "@/components/TutorialOverlay";
import { usePageTutorial } from "@/hooks/usePageTutorial";
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  Heart,
  Camera,
  Gift,
  Plane,
  Home as HomeIcon,
  Loader2,
  Plus,
  Sparkles,
  ListChecks
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TimelineDetailSheet from "@/components/schedule/TimelineDetailSheet";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { useAuth } from "@/contexts/AuthContext";
import CoupleInvite from "@/components/schedule/CoupleInvite";
import { useCoupleLink } from "@/hooks/useCoupleLink";
import { BookOpen } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import UpgradeModal from "@/components/premium/UpgradeModal";
import { format, differenceInDays, isToday, isTomorrow, isThisWeek } from "date-fns";
import { ko } from "date-fns/locale";

interface TimelinePhase {
  id: string;
  period: string;
  title: string;
  description: string;
  icon: React.ElementType;
  defaultTasks: string[];
  category: string;
}

const timelinePhases: TimelinePhase[] = [
  {
    id: "1",
    period: "D-365 ~ D-180",
    title: "웨딩 준비 시작",
    description: "예산 설정 및 웨딩홀 탐색",
    icon: Heart,
    defaultTasks: ["전체 예산 설정하기", "웨딩 스타일 결정하기", "웨딩홀 리스트업", "웨딩플래너 상담"],
    category: "phase-1"
  },
  {
    id: "2",
    period: "D-180 ~ D-120",
    title: "웨딩홀 & 스드메 계약",
    description: "본격적인 업체 선정 및 계약",
    icon: Camera,
    defaultTasks: ["웨딩홀 계약하기", "스튜디오 선정", "드레스샵 예약", "메이크업샵 예약"],
    category: "phase-2"
  },
  {
    id: "3",
    period: "D-120 ~ D-60",
    title: "혼수 및 예물 준비",
    description: "신혼집 준비와 예물 선택",
    icon: Gift,
    defaultTasks: ["신혼집 계약", "가전제품 구매", "예물 선택", "한복/예복 맞춤"],
    category: "phase-3"
  },
  {
    id: "4",
    period: "D-60 ~ D-30",
    title: "허니문 & 청첩장",
    description: "신혼여행 예약 및 청첩장 발송",
    icon: Plane,
    defaultTasks: ["허니문 예약", "청첩장 제작", "모바일 청첩장 발송", "하객 리스트 정리"],
    category: "phase-4"
  },
  {
    id: "5",
    period: "D-30 ~ D-Day",
    title: "최종 점검",
    description: "마지막 피팅과 리허설",
    icon: HomeIcon,
    defaultTasks: ["드레스 최종 피팅", "웨딩 리허설", "식순 확인", "답례품 준비"],
    category: "phase-5"
  }
];

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

  // Calculate D-Day
  const daysUntilWedding = () => {
    if (!weddingSettings.wedding_date) return null;
    const wedding = new Date(weddingSettings.wedding_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((wedding.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const days = daysUntilWedding();

  // Overall completion
  const totalItems = scheduleItems.length;
  const completedItems = scheduleItems.filter(i => i.completed).length;
  const overallProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // D-Day based premium banners
  const getDDayBanner = () => {
    if (days === null || days <= 0) return null;
    const banners = [
      { min: 120, max: 180, msg: "📋 업체 비교 견적서 만들어보세요", route: "/premium/content" },
      { min: 60, max: 90, msg: "📸 스냅 촬영 타임라인 준비할 때예요!", route: "/premium/content" },
      { min: 30, max: 60, msg: "📊 예산 중간 점검 리포트를 확인하세요", route: "/premium/content" },
      { min: 14, max: 30, msg: "💒 본식 타임라인 + 스태프 안내서를 준비하세요", route: "/premium/content" },
      { min: 7, max: 14, msg: "👜 가방순이·축의대 안내서 전달하셨나요?", route: "/premium/content" },
      { min: 1, max: 7, msg: "📱 하객에게 리마인드 메시지를 보내세요", route: "/premium/content" },
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
    
    const phaseRanges: Record<string, [number, number]> = {
      "phase-1": [365, 180],
      "phase-2": [180, 120],
      "phase-3": [120, 60],
      "phase-4": [60, 30],
      "phase-5": [30, 0],
    };
    
    const range = phaseRanges[category];
    if (!range) return "upcoming";
    
    const [start, end] = range;
    if (days > start) return "upcoming";
    if (days <= end) return "completed";
    return "current";
  };

  // Get phase progress
  const getPhaseProgress = (category: string) => {
    const phaseItems = scheduleItems.filter(item => item.category === category);
    if (phaseItems.length === 0) return 0;
    const completed = phaseItems.filter(item => item.completed).length;
    return Math.round((completed / phaseItems.length) * 100);
  };

  // Get upcoming tasks (not completed, sorted by date)
  const upcomingTasks = scheduleItems
    .filter(item => !item.completed)
    .slice(0, 4);

  // Format relative date
  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "오늘";
    if (isTomorrow(date)) return "내일";
    const daysLeft = differenceInDays(date, new Date());
    if (daysLeft >= 0 && daysLeft <= 6) return format(date, "EEEE", { locale: ko });
    return format(date, "M월 d일", { locale: ko });
  };

  const getDateUrgency = (dateStr: string) => {
    const daysLeft = differenceInDays(new Date(dateStr), new Date());
    if (daysLeft <= 0) return "text-destructive";
    if (daysLeft <= 3) return "text-orange-500";
    if (daysLeft <= 7) return "text-yellow-600";
    return "text-muted-foreground";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto relative flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {!user && <LoginRequiredOverlay message="D-Day 카운트다운, 체크리스트까지 한눈에 관리하세요" features={["D-Day 카운트다운", "준비 체크리스트", "커플 일정 공유"]} />}
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-lg font-bold text-foreground">웨딩 스케쥴</h1>
          <button 
            data-tutorial="schedule-add"
            onClick={() => navigate("/my-schedule")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-full text-primary text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            일정 관리
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        {/* ── Hero: D-Day Card ── */}
        <div
          data-tutorial="schedule-dday"
          className="mx-4 mt-4 mb-5 rounded-2xl overflow-hidden cursor-pointer"
          onClick={() => navigate("/my-schedule")}
        >
          <div className="bg-gradient-to-br from-primary/15 via-primary/8 to-accent/30 p-5 relative">
            {/* Decorative ring */}
            <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full border-[3px] border-primary/10" />
            <div className="absolute -top-3 -right-3 w-16 h-16 rounded-full border-[2px] border-primary/8" />

            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">결혼식까지</p>
                {days !== null ? (
                  <h2 className="text-4xl font-extrabold tracking-tight text-primary">
                    {days > 0 ? `D-${days}` : days === 0 ? "D-Day 🎉" : `D+${Math.abs(days)}`}
                  </h2>
                ) : (
                  <h2 className="text-xl font-bold text-foreground">날짜를 설정해주세요 ✨</h2>
                )}
                {weddingSettings.wedding_date && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(new Date(weddingSettings.wedding_date), "yyyy년 M월 d일 (EEEE)", { locale: ko })}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-center gap-1">
                <Calendar className="w-7 h-7 text-primary/40" />
              </div>
            </div>

            {/* Progress summary */}
            {totalItems > 0 && (
              <div className="bg-background/60 backdrop-blur-sm rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <ListChecks className="w-3.5 h-3.5 text-primary" />
                    준비 진행률
                  </span>
                  <span className="text-xs font-semibold text-primary">{completedItems}/{totalItems} 완료</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${overallProgress}%`,
                      background: `linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Premium Banner (contextual) ── */}
        {ddayBanner && (
          <button
            onClick={() => {
              if (isPremium) navigate(ddayBanner.route);
              else setShowUpgrade(true);
            }}
            className="mx-4 mb-4 w-[calc(100%-2rem)] p-3.5 bg-gradient-to-r from-primary/12 to-primary/4 rounded-xl border border-primary/15 flex items-center gap-3 text-left"
          >
            <Sparkles className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{ddayBanner.msg}</p>
              <p className="text-[11px] text-muted-foreground">{isPremium ? "탭하여 시작하기" : "프리미엄 전용"}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-primary shrink-0" />
          </button>
        )}

        {/* ── Upcoming Tasks ── */}
        <section className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              다가오는 일정
            </h3>
            <button onClick={() => navigate("/my-schedule")} className="text-xs text-primary font-medium">전체보기</button>
          </div>
          {user && upcomingTasks.length > 0 ? (
            <div className="space-y-2">
              {upcomingTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border active:scale-[0.98] transition-transform"
                >
                  <button 
                    onClick={() => toggleItemCompletion(task.id)}
                    className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center hover:border-primary transition-colors shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4 text-transparent" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-foreground block truncate">{task.title}</span>
                  </div>
                  <span className={`text-xs font-medium whitespace-nowrap ${getDateUrgency(task.scheduled_date)}`}>
                    {formatRelativeDate(task.scheduled_date)}
                  </span>
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

        {/* ── Budget Mini Widget ── */}
        {budgetSettings && budgetSettings.total_budget > 0 && (
          <section className="px-4 mb-6">
            <button
              onClick={() => navigate("/budget")}
              className="w-full p-3.5 bg-card rounded-xl border border-border flex items-center gap-3"
            >
              <span className="text-lg">💰</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-foreground">예산 사용 현황</span>
                  <span className="text-[11px] text-muted-foreground">
                    {budgetSummary.totalSpent.toLocaleString()} / {budgetSettings.total_budget.toLocaleString()}만원
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min((budgetSummary.totalSpent / budgetSettings.total_budget) * 100, 100)}%`,
                      backgroundColor:
                        budgetSummary.totalSpent / budgetSettings.total_budget >= 0.9
                          ? "hsl(var(--destructive))"
                          : budgetSummary.totalSpent / budgetSettings.total_budget >= 0.7
                          ? "#F59E0B"
                          : "hsl(var(--primary))",
                    }}
                  />
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          </section>
        )}

        {/* ── Wedding Timeline ── */}
        <section className="px-4 mb-6" data-tutorial="schedule-timeline">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            웨딩 타임라인
          </h3>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-border" />

            <div className="space-y-3">
              {timelinePhases.map((phase) => {
                const status = getPhaseStatus(phase.category);
                const phaseProgress = getPhaseProgress(phase.category);
                const phaseItemCount = scheduleItems.filter(item => item.category === phase.category).length;
                const phaseCompleted = scheduleItems.filter(item => item.category === phase.category && item.completed).length;
                const isCurrent = status === "current";
                const isCompleted = status === "completed";
                
                return (
                  <div 
                    key={phase.id}
                    onClick={() => user ? setSelectedPhase(phase) : navigate("/auth")}
                    className={`relative flex items-start gap-3 cursor-pointer group`}
                  >
                    {/* Timeline dot */}
                    <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      isCurrent 
                        ? "bg-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]" 
                        : isCompleted
                          ? "bg-green-500"
                          : "bg-muted border-2 border-border"
                    }`}>
                      <phase.icon className={`w-4.5 h-4.5 ${
                        isCurrent || isCompleted ? "text-white" : "text-muted-foreground"
                      }`} />
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

        {/* ── Couple Section ── */}
        <section className="px-4 mb-6" data-tutorial="schedule-couple">
          <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-500" />
            커플 연결
          </h3>
          <CoupleInvite />
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
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </section>
        )}
      </main>

      {/* Timeline Detail Sheet */}
      <TimelineDetailSheet
        open={selectedPhase !== null}
        onOpenChange={(open) => !open && setSelectedPhase(null)}
        phase={selectedPhase}
        items={scheduleItems}
        onAddItem={addScheduleItem}
        onToggleItem={toggleItemCompletion}
        onDeleteItem={deleteScheduleItem}
        onUpdateNotes={updateItemNotes}
        onUpdateItem={updateScheduleItem}
        weddingDate={weddingSettings.wedding_date}
      />

      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} trigger="pdf_feature" />

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
