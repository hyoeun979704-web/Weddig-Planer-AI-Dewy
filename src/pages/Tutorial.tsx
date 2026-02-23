import { useNavigate } from "react-router-dom";
import { ChevronLeft, Play } from "lucide-react";
import { FEATURE_GUIDES } from "@/hooks/useTutorial";
import BottomNav from "@/components/BottomNav";

const Tutorial = () => {
  const navigate = useNavigate();

  const handleStartGuide = (guideId: string) => {
    // Navigate home and trigger tutorial via query param
    navigate(`/?tutorial=${guideId}`);
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center px-4 h-14">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">가이드 & 튜토리얼</h1>
        </div>
      </header>

      <main className="px-4 py-6 pb-24 space-y-4">
        <p className="text-sm text-muted-foreground mb-2">
          각 기능의 사용법을 코치마크 가이드로 확인해 보세요.
        </p>

        {FEATURE_GUIDES.map((guide) => (
          <button
            key={guide.id}
            onClick={() => handleStartGuide(guide.id)}
            className="w-full flex items-center gap-4 p-4 bg-card rounded-2xl border border-border hover:border-primary/30 hover:shadow-sm transition-all text-left group"
          >
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-2xl shrink-0">
              {guide.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm">{guide.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{guide.description}</p>
              <span className="text-xs text-primary mt-1 inline-block">{guide.steps.length}단계</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Play className="w-4 h-4 text-primary ml-0.5" />
            </div>
          </button>
        ))}
      </main>

      <BottomNav activeTab="/" onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Tutorial;
