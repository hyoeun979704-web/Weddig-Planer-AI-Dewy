import { useNavigate } from "react-router-dom";
import { 
  Building2, 
  Camera, 
  Gem, 
  Sparkles, 
  BookOpen 
} from "lucide-react";

interface CategoryCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  onClick: () => void;
}

const CategoryCard = ({ icon: Icon, title, description, color, onClick }: CategoryCardProps) => (
  <button
    onClick={onClick}
    className="flex items-center gap-3 p-4 bg-card rounded-2xl border border-border hover:border-primary/30 hover:shadow-md transition-all duration-200 text-left"
  >
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon className="w-6 h-6" />
    </div>
    <div className="min-w-0">
      <h3 className="font-semibold text-foreground text-sm">{title}</h3>
      <p className="text-xs text-muted-foreground truncate">{description}</p>
    </div>
  </button>
);

const CategoryGrid = () => {
  const navigate = useNavigate();

  const categories = [
    {
      icon: Building2,
      title: "웨딩홀",
      description: "지역별 맞춤 웨딩홀 검색",
      color: "bg-rose-100 text-rose-500",
      onClick: () => navigate("/venues"),
    },
    {
      icon: Camera,
      title: "스튜디오·드레스·메이크업",
      description: "스드메 패키지 비교",
      color: "bg-violet-100 text-violet-500",
      onClick: () => {},
    },
    {
      icon: Gem,
      title: "예물·가전",
      description: "혼수 특가 혜택 받기",
      color: "bg-amber-100 text-amber-500",
      onClick: () => {},
    },
    {
      icon: Sparkles,
      title: "듀이 AI 플래너",
      description: "AI와 함께하는 웨딩 준비",
      color: "bg-pink-100 text-pink-500",
      onClick: () => navigate("/ai-planner"),
    },
    {
      icon: BookOpen,
      title: "매거진·콘텐츠",
      description: "웨딩 트렌드 & 팁",
      color: "bg-emerald-100 text-emerald-500",
      onClick: () => {},
    },
  ];

  return (
    <section className="px-4 py-6">
      <h2 className="text-lg font-bold text-foreground mb-4">카테고리</h2>
      <div className="grid grid-cols-1 gap-3">
        {categories.map((category) => (
          <CategoryCard key={category.title} {...category} />
        ))}
      </div>
    </section>
  );
};

export default CategoryGrid;
