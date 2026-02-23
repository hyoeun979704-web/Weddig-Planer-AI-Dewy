import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, FileText, BarChart3, Camera, Church, Users, Briefcase, DollarSign, Mic, UserCheck, MessageSquare, ChevronRight, Lock, Download } from "lucide-react";
import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import { useSubscription } from "@/hooks/useSubscription";
import UpgradeModal from "@/components/premium/UpgradeModal";
import EstimateSheet from "@/components/premium/EstimateSheet";
import BudgetReportSheet from "@/components/premium/BudgetReportSheet";
import TimelineSheet from "@/components/premium/TimelineSheet";
import StaffGuideSheet from "@/components/premium/StaffGuideSheet";
import GuestMessageSheet from "@/components/premium/GuestMessageSheet";

type SheetType = "estimate" | "budget-report" | "timeline-snap" | "timeline-ceremony" | "timeline-guest" | "staff-gabang" | "staff-reception" | "staff-mc" | "staff-parents" | "guest-message" | null;

const sections = [
  {
    title: "AI 리포트",
    items: [
      { icon: FileText, emoji: "📋", label: "견적서 자동생성", desc: "조건 입력 → AI 견적 PDF", sheet: "estimate" as SheetType },
      { icon: BarChart3, emoji: "📊", label: "예산 분석 리포트", desc: "지출 현황 분석 PDF", sheet: "budget-report" as SheetType },
    ],
  },
  {
    title: "타임라인",
    items: [
      { icon: Camera, emoji: "📸", label: "스냅촬영일 타임라인", desc: "촬영 일정표 PDF", sheet: "timeline-snap" as SheetType },
      { icon: Church, emoji: "💒", label: "본식 당일 타임라인", desc: "당일 일정표 PDF", sheet: "timeline-ceremony" as SheetType },
      { icon: Users, emoji: "👥", label: "하객 안내 타임라인", desc: "하객용 안내서 PDF", sheet: "timeline-guest" as SheetType },
    ],
  },
  {
    title: "스태프 안내서",
    items: [
      { icon: Briefcase, emoji: "👜", label: "가방순이 전달사항", desc: "역할 안내 PDF", sheet: "staff-gabang" as SheetType },
      { icon: DollarSign, emoji: "💰", label: "축의대 전달사항", desc: "운영 안내 PDF", sheet: "staff-reception" as SheetType },
      { icon: Mic, emoji: "🎤", label: "사회자 큐시트", desc: "진행 안내 PDF", sheet: "staff-mc" as SheetType },
      { icon: UserCheck, emoji: "👪", label: "부모님 안내서", desc: "양가 안내 PDF", sheet: "staff-parents" as SheetType },
      { icon: MessageSquare, emoji: "📱", label: "하객 안내 메시지", desc: "메시지 템플릿", sheet: "guest-message" as SheetType },
    ],
  },
];

const PremiumContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isPremium } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [activeSheet, setActiveSheet] = useState<SheetType>(null);

  const handleItemClick = (sheet: SheetType) => {
    if (!isPremium) {
      setShowUpgrade(true);
      return;
    }
    setActiveSheet(sheet);
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative flex flex-col">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-lg font-bold">프리미엄 콘텐츠</h1>
          {isPremium && <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">💎 Premium</span>}
        </div>
      </header>

      <main className="flex-1 pb-20 px-4 py-4 space-y-6">
        {!isPremium && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/20 text-center">
            <p className="text-sm font-bold text-foreground">🔒 프리미엄 전용 기능입니다</p>
            <p className="text-xs text-muted-foreground mt-1">무료 체험을 시작하고 모든 PDF를 이용해보세요</p>
            <button onClick={() => setShowUpgrade(true)} className="mt-3 px-5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold">
              무료 체험 시작
            </button>
          </div>
        )}

        {sections.map((section) => (
          <div key={section.title}>
            <p className="text-xs font-bold text-muted-foreground mb-2 uppercase">{section.title}</p>
            <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
              {section.items.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleItemClick(item.sheet)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-accent/30 transition-colors"
                >
                  <span className="text-lg">{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  {isPremium ? (
                    <Download className="w-4 h-4 text-primary" />
                  ) : (
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </main>

      <EstimateSheet open={activeSheet === "estimate"} onClose={() => setActiveSheet(null)} />
      <BudgetReportSheet open={activeSheet === "budget-report"} onClose={() => setActiveSheet(null)} />
      <TimelineSheet open={activeSheet?.startsWith("timeline") ? activeSheet as "timeline-snap" | "timeline-ceremony" | "timeline-guest" : null} onClose={() => setActiveSheet(null)} />
      <StaffGuideSheet open={activeSheet?.startsWith("staff") ? activeSheet as "staff-gabang" | "staff-reception" | "staff-mc" | "staff-parents" : null} onClose={() => setActiveSheet(null)} />
      <GuestMessageSheet open={activeSheet === "guest-message"} onClose={() => setActiveSheet(null)} />

      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} trigger="pdf_feature" />
      <BottomNav activeTab={location.pathname} onTabChange={(h) => navigate(h)} />
    </div>
  );
};

export default PremiumContent;
