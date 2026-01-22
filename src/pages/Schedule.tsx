import { useNavigate, useLocation } from "react-router-dom";
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  Sparkles,
  Heart,
  Camera,
  Gift,
  Plane,
  Home as HomeIcon
} from "lucide-react";
import BottomNav from "@/components/BottomNav";

interface TimelineItem {
  id: string;
  period: string;
  title: string;
  description: string;
  icon: React.ElementType;
  tasks: string[];
  status: "completed" | "current" | "upcoming";
}

const timelineItems: TimelineItem[] = [
  {
    id: "1",
    period: "D-365 ~ D-180",
    title: "웨딩 준비 시작",
    description: "예산 설정 및 웨딩홀 탐색",
    icon: Heart,
    tasks: ["전체 예산 설정하기", "웨딩 스타일 결정하기", "웨딩홀 리스트업", "웨딩플래너 상담"],
    status: "completed"
  },
  {
    id: "2",
    period: "D-180 ~ D-120",
    title: "웨딩홀 & 스드메 계약",
    description: "본격적인 업체 선정 및 계약",
    icon: Camera,
    tasks: ["웨딩홀 계약하기", "스튜디오 선정", "드레스샵 예약", "메이크업샵 예약"],
    status: "current"
  },
  {
    id: "3",
    period: "D-120 ~ D-60",
    title: "혼수 및 예물 준비",
    description: "신혼집 준비와 예물 선택",
    icon: Gift,
    tasks: ["신혼집 계약", "가전제품 구매", "예물 선택", "한복/예복 맞춤"],
    status: "upcoming"
  },
  {
    id: "4",
    period: "D-60 ~ D-30",
    title: "허니문 & 청첩장",
    description: "신혼여행 예약 및 청첩장 발송",
    icon: Plane,
    tasks: ["허니문 예약", "청첩장 제작", "모바일 청첩장 발송", "하객 리스트 정리"],
    status: "upcoming"
  },
  {
    id: "5",
    period: "D-30 ~ D-Day",
    title: "최종 점검",
    description: "마지막 피팅과 리허설",
    icon: HomeIcon,
    tasks: ["드레스 최종 피팅", "웨딩 리허설", "식순 확인", "답례품 준비"],
    status: "upcoming"
  }
];

const Schedule = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleTabChange = (href: string) => {
    navigate(href);
  };

  const getStatusColor = (status: TimelineItem["status"]) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "current": return "bg-primary";
      case "upcoming": return "bg-muted";
    }
  };

  const getStatusBorder = (status: TimelineItem["status"]) => {
    switch (status) {
      case "completed": return "border-green-500/30";
      case "current": return "border-primary/30";
      case "upcoming": return "border-border";
    }
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-lg font-bold text-foreground">웨딩 스케쥴</h1>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-full text-primary text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            AI 맞춤 생성
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20 px-4 py-4">
        {/* Progress Summary */}
        <div className="bg-gradient-to-br from-primary/10 via-accent to-background rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">D-180</h2>
              <p className="text-sm text-muted-foreground">결혼식까지 남은 날</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: "30%" }} />
            </div>
            <span className="text-sm font-medium text-primary">30%</span>
          </div>
        </div>

        {/* Current Tasks */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-foreground">이번 주 할 일</h3>
            <button className="text-sm text-primary font-medium">전체보기</button>
          </div>
          <div className="space-y-2">
            {["스튜디오 방문 예약", "드레스샵 1차 피팅", "웨딩플래너 미팅"].map((task, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border">
                <button className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-transparent" />
                </button>
                <span className="flex-1 text-sm text-foreground">{task}</span>
                <Clock className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div>
          <h3 className="font-bold text-foreground mb-4">웨딩 타임라인</h3>
          <div className="space-y-4">
            {timelineItems.map((item, index) => (
              <div 
                key={item.id}
                className={`relative p-4 bg-card rounded-2xl border ${getStatusBorder(item.status)}`}
              >
                {/* Status indicator */}
                <div className={`absolute -left-1 top-6 w-3 h-3 rounded-full ${getStatusColor(item.status)}`} />
                
                {/* Connecting line */}
                {index < timelineItems.length - 1 && (
                  <div className="absolute -left-[2px] top-9 bottom-0 w-0.5 bg-border" style={{ height: 'calc(100% + 1rem)' }} />
                )}

                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    item.status === "current" ? "bg-primary/20" : "bg-muted"
                  }`}>
                    <item.icon className={`w-5 h-5 ${
                      item.status === "current" ? "text-primary" : "text-muted-foreground"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <span className="text-xs text-muted-foreground">{item.period}</span>
                    <h4 className="font-semibold text-foreground">{item.title}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {item.tasks.slice(0, 3).map((task, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground">
                          {task}
                        </span>
                      ))}
                      {item.tasks.length > 3 && (
                        <span className="px-2 py-0.5 text-xs text-primary">+{item.tasks.length - 3}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default Schedule;
