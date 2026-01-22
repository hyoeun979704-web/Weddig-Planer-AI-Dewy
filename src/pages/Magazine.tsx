import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Music, Camera, CheckSquare, Heart, Sparkles, Lightbulb, Gift, Plane, Tv, Shirt } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const allArticles = [
  { icon: Music, title: "2025 인기 입장곡 TOP 20", description: "분위기별 추천 입장곡 모음", color: "bg-pink-100 text-pink-500", category: "웨딩홀" },
  { icon: Camera, title: "스냅 촬영 베스트 포즈", description: "자연스러운 커플 포즈 가이드", color: "bg-violet-100 text-violet-500", category: "스드메" },
  { icon: CheckSquare, title: "결혼 준비 체크리스트", description: "D-365부터 D-Day까지", color: "bg-emerald-100 text-emerald-500", category: "준비" },
  { icon: Heart, title: "예비부부 필독 꿀팁", description: "선배 신부가 알려주는 노하우", color: "bg-rose-100 text-rose-500", category: "꿀팁" },
  { icon: Sparkles, title: "2025 드레스 트렌드", description: "올해 인기 드레스 스타일", color: "bg-pink-100 text-pink-500", category: "스드메" },
  { icon: Plane, title: "2025 허니문 핫플", description: "올해 인기 여행지 TOP 10", color: "bg-sky-100 text-sky-500", category: "허니문" },
  { icon: Gift, title: "혼수 체크리스트", description: "품목별 혼수 준비 가이드", color: "bg-emerald-100 text-emerald-500", category: "혼수" },
  { icon: Tv, title: "가전 브랜드 비교", description: "삼성 vs LG 완벽 분석", color: "bg-sky-100 text-sky-500", category: "가전" },
  { icon: Shirt, title: "턱시도 vs 수트", description: "예식 스타일별 예복 선택", color: "bg-slate-100 text-slate-500", category: "예복" },
  { icon: Lightbulb, title: "예산 배분 전략", description: "합리적인 혼수 예산 관리", color: "bg-amber-100 text-amber-500", category: "꿀팁" },
];

const Magazine = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleTabChange = (href: string) => {
    navigate(href);
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">웨딩 매거진</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20 px-4 py-4">
        <p className="text-sm text-muted-foreground mb-6">
          예비부부를 위한 웨딩 꿀팁과 트렌드
        </p>
        
        <div className="grid grid-cols-2 gap-3">
          {allArticles.map((article, index) => (
            <button
              key={index}
              className="p-4 bg-card rounded-2xl border border-border hover:border-primary/30 hover:shadow-md transition-all text-left"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${article.color}`}>
                  <article.icon className="w-5 h-5" />
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {article.category}
                </span>
              </div>
              <h4 className="font-semibold text-foreground text-sm mb-1 line-clamp-2">{article.title}</h4>
              <p className="text-xs text-muted-foreground line-clamp-2">{article.description}</p>
            </button>
          ))}
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default Magazine;
