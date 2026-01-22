import { Camera, Plane, Gift, Gem, Shirt, Sparkles } from "lucide-react";
import { CategoryType } from "@/stores/useCategoryFilterStore";

interface CategoryConfig {
  icon: React.ElementType;
  iconColor: string;
  bgGradient: string;
  accentBg: string;
  label: string;
  title: [string, string];
  highlight: string;
  description: string;
}

const categoryConfigs: Record<CategoryType, CategoryConfig> = {
  studios: {
    icon: Camera,
    iconColor: "text-violet-600",
    bgGradient: "from-violet-100/50 via-violet-50/30 to-background",
    accentBg: "bg-violet-200/30",
    label: "스드메 촬영",
    title: ["특별한 순간을", "사진으로 담다"],
    highlight: "text-violet-600",
    description: "스튜디오, 드레스, 메이크업 패키지",
  },
  honeymoon: {
    icon: Plane,
    iconColor: "text-sky-600",
    bgGradient: "from-sky-100/50 via-sky-50/30 to-background",
    accentBg: "bg-sky-200/30",
    label: "허니문 여행",
    title: ["신혼여행,", "어디로 갈까?"],
    highlight: "text-sky-600",
    description: "발리, 몰디브, 유럽 등 인기 허니문 패키지",
  },
  honeymoon_gifts: {
    icon: Gift,
    iconColor: "text-amber-600",
    bgGradient: "from-amber-100/50 via-amber-50/30 to-background",
    accentBg: "bg-amber-200/30",
    label: "혼수 골든타임",
    title: ["지금이 혼수 준비", "골든타임!"],
    highlight: "text-amber-600",
    description: "결혼 시즌 한정 특가! 가전·가구 비교",
  },
  appliances: {
    icon: Gem,
    iconColor: "text-emerald-600",
    bgGradient: "from-emerald-100/50 via-emerald-50/30 to-background",
    accentBg: "bg-emerald-200/30",
    label: "가전·예물",
    title: ["소중한 시작을", "특별하게"],
    highlight: "text-emerald-600",
    description: "예물, 가전, 웨딩 필수템 한번에",
  },
  suits: {
    icon: Shirt,
    iconColor: "text-indigo-600",
    bgGradient: "from-indigo-100/50 via-indigo-50/30 to-background",
    accentBg: "bg-indigo-200/30",
    label: "예복",
    title: ["신랑을 위한", "완벽한 스타일"],
    highlight: "text-indigo-600",
    description: "턱시도, 정장 맞춤 & 렌탈",
  },
  hanbok: {
    icon: Sparkles,
    iconColor: "text-rose-600",
    bgGradient: "from-rose-100/50 via-rose-50/30 to-background",
    accentBg: "bg-rose-200/30",
    label: "한복",
    title: ["전통의 아름다움,", "현대적 감각"],
    highlight: "text-rose-600",
    description: "신부·혼주 맞춤 한복 & 대여",
  },
};

interface CategoryHeroBannerProps {
  category: CategoryType;
}

export default function CategoryHeroBanner({ category }: CategoryHeroBannerProps) {
  const config = categoryConfigs[category];
  const Icon = config.icon;

  return (
    <div className={`relative bg-gradient-to-br ${config.bgGradient} px-4 py-8 overflow-hidden`}>
      <div className={`absolute top-4 right-4 w-24 h-24 ${config.accentBg} rounded-full blur-2xl`} />
      <div className="relative z-10">
        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${config.accentBg.replace('/30', '')} bg-opacity-50 rounded-full mb-3`}>
          <Icon className={`w-4 h-4 ${config.iconColor}`} />
          <span className={`text-xs font-medium ${config.iconColor}`}>{config.label}</span>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          {config.title[0]}<br />
          <span className={config.highlight}>{config.title[1]}</span>
        </h2>
        <p className="text-sm text-muted-foreground">
          {config.description}
        </p>
      </div>
    </div>
  );
}
