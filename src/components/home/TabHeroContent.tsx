import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { CategoryTab } from "./CategoryTabBar";

interface HeroData {
  badge: string;
  title: string[];
  subtitle: string;
  cta: string;
  bgColor: string;
}

const heroDataMap: Record<CategoryTab, HeroData> = {
  "ai-planner": {
    badge: "AI 웨딩 플래닝",
    title: ["결혼 준비의 새로운 기준,", "AI로 쉽게 시작하는", "웨딩 플래닝"],
    subtitle: "웨딩홀부터 스드메, 예물·가전까지\n한 번에 비교하고 예약하세요.",
    cta: "AI 플래너에게 물어보기",
    bgColor: "from-accent via-accent/50 to-background",
  },
  "ai-studio": {
    badge: "AI 스튜디오",
    title: ["AI가 만들어주는", "나만의 웨딩 스타일", "미리 체험하기"],
    subtitle: "드레스, 헤어, 메이크업까지\nAI로 미리 시뮬레이션해보세요.",
    cta: "AI 스튜디오 체험하기",
    bgColor: "from-purple-100/50 via-purple-50/30 to-background",
  },
  tips: {
    badge: "웨딩 꿀팁",
    title: ["실전 결혼 준비 꿀팁,", "전문가들이 알려주는", "스마트한 준비법"],
    subtitle: "예산 절약부터 일정 관리까지\n꼭 알아야 할 정보만 모았어요.",
    cta: "꿀팁 보러가기",
    bgColor: "from-amber-100/50 via-amber-50/30 to-background",
  },
  events: {
    badge: "이벤트 & 혜택",
    title: ["놓치면 아쉬운", "웨딩 특별 이벤트", "모아보기"],
    subtitle: "파트너 업체 제휴 혜택부터\n시즌 한정 이벤트까지.",
    cta: "이벤트 확인하기",
    bgColor: "from-rose-100/50 via-rose-50/30 to-background",
  },
  shopping: {
    badge: "웨딩 쇼핑",
    title: ["결혼 준비 필수템,", "한 곳에서 쇼핑하고", "특가로 구매하기"],
    subtitle: "웨딩 소품부터 혼수까지\n특별한 가격으로 만나보세요.",
    cta: "쇼핑하러 가기",
    bgColor: "from-emerald-100/50 via-emerald-50/30 to-background",
  },
};

const tabCtaRoutes: Record<CategoryTab, string> = {
  "ai-planner": "/ai-planner",
  "ai-studio": "/ai-studio",
  tips: "/tips",
  events: "/deals",
  shopping: "/store",
};

interface TabHeroContentProps {
  activeTab: CategoryTab;
}

// ai-planner 탭 hero 는 HomeDashboard 가 대체하므로 여기서는 비 ai-planner
// 탭(이벤트/쇼핑/AI 스튜디오/꿀팁)의 정적 hero 만 렌더합니다.
const TabHeroContent = ({ activeTab }: TabHeroContentProps) => {
  const navigate = useNavigate();
  const data = heroDataMap[activeTab];

  return (
    <section className={`relative bg-gradient-to-br ${data.bgColor} px-4 pt-6 pb-5 overflow-hidden`}>
      <div className="absolute top-4 right-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />

      <div className="relative z-10 animate-fade-in">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-full mb-3">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium text-primary">{data.badge}</span>
        </div>

        <h1 className="text-xl font-bold text-foreground leading-tight mb-2">
          {data.title[0]}
          <br />
          <span className="text-primary">{data.title[1]}</span>
        </h1>

        <p className="text-xs text-muted-foreground leading-relaxed mb-4 whitespace-pre-line">
          {data.subtitle}
        </p>

        <Button
          onClick={() => navigate(tabCtaRoutes[activeTab])}
          className="w-full h-11 rounded-xl font-semibold gap-2 text-sm"
        >
          <Sparkles className="w-4 h-4" />
          {data.cta}
        </Button>
      </div>
    </section>
  );
};

export default TabHeroContent;
