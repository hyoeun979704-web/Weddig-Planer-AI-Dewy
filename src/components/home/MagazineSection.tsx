import { useNavigate } from "react-router-dom";
import { ChevronRight, Music, Camera, CheckSquare, Heart, Sparkles, Lightbulb, Gift, ShoppingBag } from "lucide-react";
import { CategoryTab } from "./CategoryTabBar";

interface MagazineCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  onClick?: () => void;
}

const MagazineCard = ({ icon: Icon, title, description, color, onClick }: MagazineCardProps) => (
  <button 
    onClick={onClick}
    className="flex-shrink-0 w-40 p-4 bg-card rounded-2xl border border-border hover:border-primary/30 hover:shadow-md transition-all duration-200 text-left"
  >
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <h4 className="font-semibold text-foreground text-sm mb-1 line-clamp-2">{title}</h4>
    <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
  </button>
);

interface MagazineData {
  title: string;
  subtitle: string;
  articles: MagazineCardProps[];
}

const magazineDataMap: Record<CategoryTab, MagazineData> = {
  home: {
    title: "웨딩 매거진",
    subtitle: "예비부부를 위한 꿀팁",
    articles: [
      { icon: Music, title: "2025 인기 입장곡 TOP 20", description: "분위기별 추천 입장곡 모음", color: "bg-pink-500/15 text-pink-500" },
      { icon: Camera, title: "스냅 촬영 베스트 포즈", description: "자연스러운 커플 포즈 가이드", color: "bg-violet-500/15 text-violet-500" },
      { icon: CheckSquare, title: "결혼 준비 체크리스트", description: "D-365부터 D-Day까지", color: "bg-emerald-500/15 text-emerald-500" },
      { icon: Heart, title: "예비부부 필독 꿀팁", description: "선배 신부가 알려주는 노하우", color: "bg-rose-500/15 text-rose-500" },
    ],
  },
  events: {
    title: "이벤트 가이드",
    subtitle: "놓치면 후회할 혜택",
    articles: [
      { icon: Gift, title: "이달의 파트너 혜택", description: "제휴 업체 특별 할인", color: "bg-amber-500/15 text-amber-500" },
      { icon: Sparkles, title: "시즌 이벤트 총정리", description: "결혼 시즌 한정 이벤트", color: "bg-pink-500/15 text-pink-500" },
      { icon: Heart, title: "커플 이벤트 모음", description: "둘이 함께하는 특별한 혜택", color: "bg-rose-500/15 text-rose-500" },
      { icon: Lightbulb, title: "할인 꿀팁", description: "현명한 예산 관리법", color: "bg-emerald-500/15 text-emerald-500" },
    ],
  },
  shopping: {
    title: "쇼핑 가이드",
    subtitle: "똑똑한 웨딩 쇼핑",
    articles: [
      { icon: ShoppingBag, title: "웨딩 소품 베스트", description: "인기 웨딩 소품 모음", color: "bg-sky-500/15 text-sky-500" },
      { icon: Gift, title: "혼수 체크리스트", description: "품목별 혼수 준비 가이드", color: "bg-emerald-500/15 text-emerald-500" },
      { icon: Lightbulb, title: "가전 구매 꿀팁", description: "할인 시즌 완벽 정리", color: "bg-amber-500/15 text-amber-500" },
      { icon: CheckSquare, title: "구매 시기 꿀팁", description: "특가 시즌 완벽 정리", color: "bg-pink-500/15 text-pink-500" },
    ],
  },
  info: {
    title: "웨딩 정보 매거진",
    subtitle: "리얼 웨딩 스토리",
    articles: [
      { icon: Camera, title: "웨딩 촬영 비하인드", description: "리얼 촬영 비하인드", color: "bg-violet-500/15 text-violet-500" },
      { icon: Heart, title: "전문가 추천템", description: "실제 사용 후기 모음", color: "bg-rose-500/15 text-rose-500" },
      { icon: Sparkles, title: "웨딩 트렌드 2025", description: "전문가가 알려주는 트렌드", color: "bg-pink-500/15 text-pink-500" },
      { icon: Lightbulb, title: "예산 절약 노하우", description: "현명한 결혼 준비 팁", color: "bg-amber-500/15 text-amber-500" },
    ],
  },
};

interface MagazineSectionProps {
  activeTab?: CategoryTab;
}

const MagazineSection = ({ activeTab = "home" }: MagazineSectionProps) => {
  const navigate = useNavigate();
  const data = magazineDataMap[activeTab];

  return (
    <section className="py-6">
      <div className="flex items-center justify-between px-4 mb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">{data.title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{data.subtitle}</p>
        </div>
        <button 
          onClick={() => navigate("/magazine")}
          className="flex items-center gap-1 text-sm text-primary font-medium"
        >
          전체보기
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {data.articles.map((article, index) => (
          <MagazineCard key={index} {...article} onClick={() => navigate("/magazine")} />
        ))}
      </div>
    </section>
  );
};

export default MagazineSection;
