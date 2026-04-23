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

const MagazineCard = ({ icon: Icon, title, color, onClick }: MagazineCardProps) => (
  <button
    onClick={onClick}
    className="flex-shrink-0 w-[90px] h-[160px] rounded-[10px] bg-[#d9d9d9] relative overflow-hidden text-left"
  >
    <div className={`absolute top-2 left-2 w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
      <Icon className="w-4 h-4" />
    </div>
    <p className="absolute bottom-2 left-2 right-2 text-[11px] font-semibold text-white leading-tight line-clamp-2 drop-shadow">
      {title}
    </p>
  </button>
);

interface MagazineData {
  title: string;
  subtitle: string;
  articles: MagazineCardProps[];
}

const magazineDataMap: Record<CategoryTab, MagazineData> = {
  "ai-planner": {
    title: "웨딩 매거진",
    subtitle: "예비부부를 위한 꿀팁",
    articles: [
      { icon: Music, title: "2025 인기 입장곡 TOP 20", description: "분위기별 추천 입장곡 모음", color: "bg-pink-500/15 text-pink-500" },
      { icon: Camera, title: "스냅 촬영 베스트 포즈", description: "자연스러운 커플 포즈 가이드", color: "bg-violet-500/15 text-violet-500" },
      { icon: CheckSquare, title: "결혼 준비 체크리스트", description: "D-365부터 D-Day까지", color: "bg-emerald-500/15 text-emerald-500" },
      { icon: Heart, title: "예비부부 필독 꿀팁", description: "선배 신부가 알려주는 노하우", color: "bg-rose-500/15 text-rose-500" },
    ],
  },
  "ai-studio": {
    title: "AI 스튜디오 가이드",
    subtitle: "AI로 나만의 웨딩 스타일",
    articles: [
      { icon: Camera, title: "드레스 AI 시뮬레이션", description: "내 체형에 맞는 드레스 찾기", color: "bg-purple-500/15 text-purple-500" },
      { icon: Sparkles, title: "헤어·메이크업 미리보기", description: "AI가 추천하는 나만의 스타일", color: "bg-pink-500/15 text-pink-500" },
      { icon: Heart, title: "웨딩 컨셉 추천", description: "분위기별 웨딩 컨셉 가이드", color: "bg-rose-500/15 text-rose-500" },
      { icon: Lightbulb, title: "AI 스튜디오 활용법", description: "더 잘 쓰는 꿀팁 모음", color: "bg-violet-500/15 text-violet-500" },
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
  tips: {
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

const MagazineSection = ({ activeTab = "ai-planner" }: MagazineSectionProps) => {
  const navigate = useNavigate();
  const data = magazineDataMap[activeTab];

  return (
    <section className="pt-[10px] pb-[30px] px-[30px] bg-[hsl(var(--pink-200))]">
      <h2 className="text-[16px] font-bold text-black mb-[10px]">
        {activeTab === "ai-planner" ? "오늘의 꿀팁" : data.title}
      </h2>
      <div className="flex gap-[10px] overflow-x-auto scrollbar-hide">
        {data.articles.map((article, index) => (
          <MagazineCard key={index} {...article} onClick={() => navigate("/magazine")} />
        ))}
      </div>
    </section>
  );
};

export default MagazineSection;
