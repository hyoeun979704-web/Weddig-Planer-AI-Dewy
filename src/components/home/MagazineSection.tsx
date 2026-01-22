import { useNavigate } from "react-router-dom";
import { ChevronRight, Music, Camera, CheckSquare, Heart, Sparkles, Lightbulb, Gift, Plane, Tv, Shirt } from "lucide-react";
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
  "home": {
    title: "웨딩 매거진",
    subtitle: "예비부부를 위한 꿀팁",
    articles: [
      { icon: Music, title: "2025 인기 입장곡 TOP 20", description: "분위기별 추천 입장곡 모음", color: "bg-pink-100 text-pink-500" },
      { icon: Camera, title: "스냅 촬영 베스트 포즈", description: "자연스러운 커플 포즈 가이드", color: "bg-violet-100 text-violet-500" },
      { icon: CheckSquare, title: "결혼 준비 체크리스트", description: "D-365부터 D-Day까지", color: "bg-emerald-100 text-emerald-500" },
      { icon: Heart, title: "예비부부 필독 꿀팁", description: "선배 신부가 알려주는 노하우", color: "bg-rose-100 text-rose-500" },
    ],
  },
  "wedding-hall": {
    title: "웨딩 매거진",
    subtitle: "예비부부를 위한 꿀팁",
    articles: [
      { icon: Music, title: "2025 인기 입장곡 TOP 20", description: "분위기별 추천 입장곡 모음", color: "bg-pink-100 text-pink-500" },
      { icon: Camera, title: "스냅 촬영 베스트 포즈", description: "자연스러운 커플 포즈 가이드", color: "bg-violet-100 text-violet-500" },
      { icon: CheckSquare, title: "결혼 준비 체크리스트", description: "D-365부터 D-Day까지", color: "bg-emerald-100 text-emerald-500" },
      { icon: Heart, title: "예비부부 필독 꿀팁", description: "선배 신부가 알려주는 노하우", color: "bg-rose-100 text-rose-500" },
    ],
  },
  "sdm": {
    title: "스드메 가이드",
    subtitle: "완벽한 웨딩 화보를 위해",
    articles: [
      { icon: Camera, title: "스튜디오 선택 가이드", description: "촬영 스타일별 스튜디오 추천", color: "bg-violet-100 text-violet-500" },
      { icon: Sparkles, title: "2025 드레스 트렌드", description: "올해 인기 드레스 스타일", color: "bg-pink-100 text-pink-500" },
      { icon: Heart, title: "메이크업 Q&A", description: "신부 메이크업 고민 해결", color: "bg-rose-100 text-rose-500" },
      { icon: Lightbulb, title: "스드메 예산 가이드", description: "합리적인 패키지 선택법", color: "bg-amber-100 text-amber-500" },
    ],
  },
  "honeymoon-gifts": {
    title: "혼수 가이드",
    subtitle: "똑똑한 혼수 준비",
    articles: [
      { icon: Gift, title: "혼수 체크리스트", description: "품목별 혼수 준비 가이드", color: "bg-emerald-100 text-emerald-500" },
      { icon: Tv, title: "가전 선택 가이드", description: "브랜드별 특징 비교", color: "bg-sky-100 text-sky-500" },
      { icon: Lightbulb, title: "예산 배분 전략", description: "합리적인 혼수 예산 관리", color: "bg-amber-100 text-amber-500" },
      { icon: CheckSquare, title: "구매 시기 꿀팁", description: "특가 시즌 완벽 정리", color: "bg-pink-100 text-pink-500" },
    ],
  },
  "honeymoon": {
    title: "허니문 가이드",
    subtitle: "꿈같은 신혼여행을 위해",
    articles: [
      { icon: Plane, title: "2025 허니문 핫플", description: "올해 인기 여행지 TOP 10", color: "bg-sky-100 text-sky-500" },
      { icon: Heart, title: "로맨틱 허니문 코스", description: "커플 필수 여행 코스", color: "bg-rose-100 text-rose-500" },
      { icon: Lightbulb, title: "허니문 예산 가이드", description: "합리적인 여행 경비 관리", color: "bg-amber-100 text-amber-500" },
      { icon: CheckSquare, title: "여행 준비 체크리스트", description: "출발 전 필수 확인 사항", color: "bg-emerald-100 text-emerald-500" },
    ],
  },
  "appliances": {
    title: "가전·예물 가이드",
    subtitle: "현명한 선택을 위한 팁",
    articles: [
      { icon: Tv, title: "가전 브랜드 비교", description: "삼성 vs LG 완벽 분석", color: "bg-sky-100 text-sky-500" },
      { icon: Sparkles, title: "예물 트렌드 2025", description: "올해 인기 예물 스타일", color: "bg-pink-100 text-pink-500" },
      { icon: Lightbulb, title: "가전 구매 꿀팁", description: "할인 시즌 완벽 정리", color: "bg-amber-100 text-amber-500" },
      { icon: Heart, title: "예물 선택 가이드", description: "커플링 선택 노하우", color: "bg-rose-100 text-rose-500" },
    ],
  },
  "suit": {
    title: "예복 가이드",
    subtitle: "신랑 스타일링 완벽 가이드",
    articles: [
      { icon: Shirt, title: "턱시도 vs 수트", description: "예식 스타일별 예복 선택", color: "bg-slate-100 text-slate-500" },
      { icon: Sparkles, title: "2025 예복 트렌드", description: "올해 인기 신랑 스타일", color: "bg-violet-100 text-violet-500" },
      { icon: Lightbulb, title: "맞춤 vs 렌탈", description: "예복 선택 고민 해결", color: "bg-amber-100 text-amber-500" },
      { icon: CheckSquare, title: "예복 피팅 체크", description: "완벽한 핏을 위한 팁", color: "bg-emerald-100 text-emerald-500" },
    ],
  },
  "hanbok": {
    title: "한복 가이드",
    subtitle: "아름다운 전통 한복",
    articles: [
      { icon: Sparkles, title: "2025 한복 트렌드", description: "현대적인 한복 스타일", color: "bg-rose-100 text-rose-500" },
      { icon: Heart, title: "폐백 한복 가이드", description: "전통 폐백 완벽 정리", color: "bg-pink-100 text-pink-500" },
      { icon: Lightbulb, title: "한복 대여 vs 맞춤", description: "상황별 선택 가이드", color: "bg-amber-100 text-amber-500" },
      { icon: Camera, title: "한복 촬영 포즈", description: "전통 한복 화보 가이드", color: "bg-violet-100 text-violet-500" },
    ],
  },
  "invitation": {
    title: "청첩장 모임 가이드",
    subtitle: "특별한 모임을 위해",
    articles: [
      { icon: Heart, title: "청첩장 모임 에티켓", description: "자연스러운 진행 팁", color: "bg-pink-100 text-pink-500" },
      { icon: Lightbulb, title: "장소 선택 가이드", description: "인원별 추천 장소", color: "bg-amber-100 text-amber-500" },
      { icon: Gift, title: "메뉴 구성 팁", description: "다양한 입맛 고려하기", color: "bg-emerald-100 text-emerald-500" },
      { icon: Camera, title: "모임 사진 꿀팁", description: "추억 남기기 가이드", color: "bg-violet-100 text-violet-500" },
    ],
  },
};

interface MagazineSectionProps {
  activeTab?: CategoryTab;
}

const MagazineSection = ({ activeTab = "wedding-hall" }: MagazineSectionProps) => {
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
