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
  home: {
    badge: "AI 웨딩 플래닝",
    title: ["결혼 준비의 새로운 기준,", "AI로 쉽게 시작하는", "웨딩 플래닝"],
    subtitle: "웨딩홀부터 스드메, 예물·가전까지\n한 번에 비교하고 예약하세요.",
    cta: "AI 플래너에게 물어보기",
    bgColor: "from-accent via-accent/50 to-background",
  },
  events: {
    badge: "이벤트 & 혜택",
    title: ["놓치면 아쉬운", "웨딩 특별 이벤트", "모아보기"],
    subtitle: "파트너 업체 제휴 혜택부터\n시즌 한정 이벤트까지.",
    cta: "이벤트 확인하기",
    bgColor: "from-amber-100/50 via-amber-50/30 to-background",
  },
  shopping: {
    badge: "웨딩 쇼핑",
    title: ["결혼 준비 필수템,", "한 곳에서 쇼핑하고", "특가로 구매하기"],
    subtitle: "웨딩 소품부터 혼수까지\n특별한 가격으로 만나보세요.",
    cta: "쇼핑하러 가기",
    bgColor: "from-emerald-100/50 via-emerald-50/30 to-background",
  },
  info: {
    badge: "웨딩 정보",
    title: ["실제 결혼 준비 후기,", "전문가 정보로", "똑똑하게 준비"],
    subtitle: "웨딩 전문가들의 리얼 후기와\n추천 업체를 확인하세요.",
    cta: "정보 보러가기",
    bgColor: "from-violet-100/50 via-violet-50/30 to-background",
  },
};

const tabCtaRoutes: Record<CategoryTab, string> = {
  home: "/ai-planner",
  events: "/deals",
  shopping: "/store",
  info: "/influencers",
};

interface TabHeroContentProps {
  activeTab: CategoryTab;
}

const TabHeroContent = ({ activeTab }: TabHeroContentProps) => {
  const navigate = useNavigate();
  const data = heroDataMap[activeTab];

  return (
    <section className={`relative bg-gradient-to-br ${data.bgColor} px-4 py-10 overflow-hidden`}>
      <div className="absolute top-4 right-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
      <div className="absolute bottom-4 left-4 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />

      <div className="relative z-10 animate-fade-in">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-full mb-4">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-primary">{data.badge}</span>
        </div>

        <h1 className="text-2xl font-bold text-foreground leading-tight mb-3">
          {data.title[0]}
          <br />
          <span className="text-primary">{data.title[1]}</span>
          <br />
          {data.title[2]}
        </h1>

        <p className="text-sm text-muted-foreground leading-relaxed mb-6 whitespace-pre-line">
          {data.subtitle}
        </p>

        <div className="flex">
          <Button
            onClick={() => navigate(tabCtaRoutes[activeTab])}
            className="flex-1 h-12 rounded-xl font-semibold gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {data.cta}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default TabHeroContent;
