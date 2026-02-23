import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useBudget } from "@/hooks/useBudget";
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
  Plus
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TimelineDetailSheet from "@/components/schedule/TimelineDetailSheet";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { useAuth } from "@/contexts/AuthContext";
import CoupleInvite from "@/components/schedule/CoupleInvite";
import { useCoupleLink } from "@/hooks/useCoupleLink";
import { BookOpen } from "lucide-react";

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
  const handleTabChange = (href: string) => {
    navigate(href);
  };

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
  const progress = days !== null && days > 0 ? Math.max(0, Math.min(100, Math.round((1 - days / 365) * 100))) : 0;

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

  const getStatusColor = (status: "completed" | "current" | "upcoming") => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "current": return "bg-primary";
      case "upcoming": return "bg-muted";
    }
  };

  const getStatusBorder = (status: "completed" | "current" | "upcoming") => {
    switch (status) {
      case "completed": return "border-green-500/30";
      case "current": return "border-primary/30";
      case "upcoming": return "border-border";
    }
  };

  // Get upcoming tasks (not completed, sorted by date)
  const upcomingTasks = scheduleItems
    .filter(item => !item.completed)
    .slice(0, 3);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto relative flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-lg font-bold text-foreground">웨딩 스케쥴</h1>
          <button 
            onClick={() => navigate("/my-schedule")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-full text-primary text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            일정 관리
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20 px-4 py-4">
        {/* Couple Section */}
        <div className="mb-6">
          <CoupleInvite />
        </div>
      
        {/* Couple Diary Link */}
        {isLinked && (
          <button
            onClick={() => navigate("/couple-diary")}
            className="w-full mb-6 p-4 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20 rounded-2xl border border-pink-200/50 dark:border-pink-800/30 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-pink-500" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-foreground text-sm">우리의 일기</h3>
              <p className="text-xs text-muted-foreground">함께 쓰는 웨딩 준비 일기</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        )}

        {/* Budget Mini Widget */}
        {budgetSettings && budgetSettings.total_budget > 0 && (
          <button
            onClick={() => navigate("/budget")}
            className="w-full mb-6 p-4 bg-card rounded-2xl border border-border flex items-center gap-3"
          >
            <span className="text-xl">💰</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold text-foreground">예산 사용 현황</span>
                <span className="text-xs text-muted-foreground">
                  {budgetSummary.totalSpent.toLocaleString()} / {budgetSettings.total_budget.toLocaleString()}만원
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
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
        )}

        {/* Progress Summary - Dynamic */}
        <div
          className="bg-gradient-to-br from-primary/10 via-accent to-background rounded-2xl p-4 mb-6 cursor-pointer"
          onClick={() => navigate("/my-schedule")}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
          <Calendar className="w-6 h-6 text-primary" />
                </div>
            <div>
              {days !== null ? (
                <>
                  <h2 className="font-bold text-foreground">
                    {days > 0 ? `D-${days}` : days === 0 ? "D-Day!" : `D+${Math.abs(days)}`}
                  </h2>
                  <p className="text-sm text-muted-foreground">결혼식까지 남은 날</p>
                </>
              ) : (
                <>
                  <h2 className="font-bold text-foreground">날짜 미설정</h2>
                  <p className="text-sm text-muted-foreground">탭하여 날짜를 설정하세요</p>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-sm font-medium text-primary">{progress}%</span>
          </div>
        </div>

        {/* Current Tasks - Dynamic */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-foreground">다가오는 일정</h3>
            <button onClick={() => navigate("/my-schedule")} className="text-sm text-primary font-medium">전체보기</button>
          </div>
          {user && upcomingTasks.length > 0 ? (
            <div className="space-y-2">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border">
                  <button 
                    onClick={() => toggleItemCompletion(task.id)}
                    className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center hover:border-primary transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4 text-transparent" />
                  </button>
                  <div className="flex-1">
                    <span className="text-sm text-foreground">{task.title}</span>
                    <p className="text-xs text-muted-foreground">{task.scheduled_date}</p>
                  </div>
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          ) : (
            <div 
              className="flex flex-col items-center justify-center py-6 bg-card rounded-xl border border-dashed border-border cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate("/my-schedule")}
            >
              <Plus className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {user ? "일정을 추가해보세요" : "로그인하여 일정을 관리하세요"}
              </p>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div>
          <h3 className="font-bold text-foreground mb-4">웨딩 타임라인</h3>
          <div className="space-y-4">
            {timelinePhases.map((phase, index) => {
              const status = getPhaseStatus(phase.category);
              const phaseProgress = getPhaseProgress(phase.category);
              const phaseItemCount = scheduleItems.filter(item => item.category === phase.category).length;
              
              return (
                <div 
                  key={phase.id}
                  onClick={() => user ? setSelectedPhase(phase) : navigate("/auth")}
                  className={`relative p-4 bg-card rounded-2xl border ${getStatusBorder(status)} cursor-pointer hover:shadow-md transition-shadow`}
                >
                  {/* Status indicator */}
                  <div className={`absolute -left-1 top-6 w-3 h-3 rounded-full ${getStatusColor(status)}`} />
                  
                  {/* Connecting line */}
                  {index < timelinePhases.length - 1 && (
                    <div className="absolute -left-[2px] top-9 bottom-0 w-0.5 bg-border" style={{ height: 'calc(100% + 1rem)' }} />
                  )}

                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      status === "current" ? "bg-primary/20" : "bg-muted"
                    }`}>
                      <phase.icon className={`w-5 h-5 ${
                        status === "current" ? "text-primary" : "text-muted-foreground"
                      }`} />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs text-muted-foreground">{phase.period}</span>
                      <h4 className="font-semibold text-foreground">{phase.title}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{phase.description}</p>
                      
                      {/* Progress bar for phase */}
                      {phaseItemCount > 0 && (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all" 
                              style={{ width: `${phaseProgress}%` }} 
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{phaseProgress}%</span>
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-1.5">
                        {phase.defaultTasks.slice(0, 3).map((task, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground">
                            {task}
                          </span>
                        ))}
                        {phase.defaultTasks.length > 3 && (
                          <span className="px-2 py-0.5 text-xs text-primary">+{phase.defaultTasks.length - 3}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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

      {/* Bottom Navigation */}
      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default Schedule;
