import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  Search, 
  Camera, 
  Gift, 
  Plane, 
  Tv, 
  Shirt
} from "lucide-react";
import { CategoryTab } from "./CategoryTabBar";

interface HeroData {
  badge: string;
  badgeIcon: React.ElementType;
  title: string[];
  subtitle: string;
  primaryCta: string;
  primaryCtaAction: string;
  secondaryCta: string;
  bgColor: string;
}

const heroDataMap: Record<CategoryTab, HeroData> = {
  "wedding-hall": {
    badge: "AI 웨딩 플래닝",
    badgeIcon: Sparkles,
    title: ["결혼 준비의 새로운 기준,", "AI로 쉽게 시작하는", "웨딩 플래닝"],
    subtitle: "웨딩홀부터 스드메, 예물·가전까지\n한 번에 비교하고 예약하세요.",
    primaryCta: "웨딩홀 찾기",
    primaryCtaAction: "/venues",
    secondaryCta: "AI 플래너에게 물어보기",
    bgColor: "from-accent via-accent/50 to-background",
  },
  "sdm": {
    badge: "스튜디오·드레스·메이크업",
    badgeIcon: Camera,
    title: ["완벽한 웨딩 화보,", "스드메 패키지로", "한 번에 해결"],
    subtitle: "인기 스드메 업체 비교부터\n실시간 예약까지 한곳에서.",
    primaryCta: "스드메 둘러보기",
    primaryCtaAction: "/studios",
    secondaryCta: "스드메 상담 받기",
    bgColor: "from-violet-100/50 via-violet-50/30 to-background",
  },
  "honeymoon-gifts": {
    badge: "혼수 골든타임",
    badgeIcon: Gift,
    title: ["지금이 혼수 준비", "골든타임!", "최대 혜택 받기"],
    subtitle: "결혼 시즌 한정 특가!\n예물·가전·가구 한 번에 비교.",
    primaryCta: "혼수 특가 보기",
    primaryCtaAction: "/honeymoon-gifts",
    secondaryCta: "맞춤 컨설팅 받기",
    bgColor: "from-amber-100/50 via-amber-50/30 to-background",
  },
  "honeymoon": {
    badge: "허니문 여행",
    badgeIcon: Plane,
    title: ["신혼여행,", "어디로 갈까?", "맞춤 추천받기"],
    subtitle: "발리, 몰디브, 유럽 등\n인기 허니문 패키지 비교.",
    primaryCta: "허니문 패키지 보기",
    primaryCtaAction: "/honeymoon",
    secondaryCta: "1:1 상담 받기",
    bgColor: "from-sky-100/50 via-sky-50/30 to-background",
  },
  "appliances": {
    badge: "가전·예물",
    badgeIcon: Tv,
    title: ["가전·예물 준비,", "최저가 비교로", "똑똑하게"],
    subtitle: "삼성, LG 가전 특가부터\n예물 브랜드 할인까지.",
    primaryCta: "가전 특가 보기",
    primaryCtaAction: "/appliances",
    secondaryCta: "예물 컨설팅 받기",
    bgColor: "from-emerald-100/50 via-emerald-50/30 to-background",
  },
  "suit": {
    badge: "예복",
    badgeIcon: Shirt,
    title: ["신랑 예복,", "스타일부터 맞춤까지", "한 번에"],
    subtitle: "턱시도, 수트 렌탈 및 맞춤\n인기 예복샵 비교.",
    primaryCta: "예복샵 둘러보기",
    primaryCtaAction: "/suit",
    secondaryCta: "예약 문의하기",
    bgColor: "from-slate-100/50 via-slate-50/30 to-background",
  },
  "hanbok": {
    badge: "한복",
    badgeIcon: Sparkles,
    title: ["아름다운 전통,", "현대적인 한복으로", "특별하게"],
    subtitle: "전통 혼례부터 폐백까지\n맞춤 한복 컨설팅.",
    primaryCta: "한복샵 둘러보기",
    primaryCtaAction: "/hanbok",
    secondaryCta: "맞춤 상담 받기",
    bgColor: "from-rose-100/50 via-rose-50/30 to-background",
  },
};

interface TabHeroContentProps {
  activeTab: CategoryTab;
}

const TabHeroContent = ({ activeTab }: TabHeroContentProps) => {
  const navigate = useNavigate();
  const data = heroDataMap[activeTab];
  const BadgeIcon = data.badgeIcon;

  return (
    <section className={`relative bg-gradient-to-br ${data.bgColor} px-4 py-10 overflow-hidden`}>
      {/* Background decorations */}
      <div className="absolute top-4 right-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
      <div className="absolute bottom-4 left-4 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
      
      <div className="relative z-10 animate-fade-in">
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-full mb-4">
          <BadgeIcon className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-primary">{data.badge}</span>
        </div>

        {/* Main Copy */}
        <h1 className="text-2xl font-bold text-foreground leading-tight mb-3">
          {data.title[0]}
          <br />
          <span className="text-primary">{data.title[1]}</span>
          <br />
          {data.title[2]}
        </h1>

        {/* Sub Copy */}
        <p className="text-sm text-muted-foreground leading-relaxed mb-6 whitespace-pre-line">
          {data.subtitle}
        </p>

        {/* CTA Buttons */}
        <div className="flex gap-3">
          <Button 
            onClick={() => navigate(data.primaryCtaAction)}
            className="flex-1 h-12 rounded-xl font-semibold gap-2"
          >
            <Search className="w-4 h-4" />
            {data.primaryCta}
          </Button>
          <Button 
            variant="outline"
            className="flex-1 h-12 rounded-xl font-semibold gap-2 border-primary/30 hover:bg-accent"
          >
            <Sparkles className="w-4 h-4" />
            {data.secondaryCta}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default TabHeroContent;
