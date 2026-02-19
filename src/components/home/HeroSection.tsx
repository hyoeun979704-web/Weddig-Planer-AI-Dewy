import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Search } from "lucide-react";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background px-4 py-10 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-4 right-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
      <div className="absolute bottom-4 left-4 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
      
      <div className="relative z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-full mb-4">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-primary">AI 웨딩 플래닝</span>
        </div>

        {/* Main Copy */}
        <h1 className="text-2xl font-bold text-foreground leading-tight mb-3">
          결혼 준비의 새로운 기준,
          <br />
          <span className="text-primary">AI로 쉽게 시작하는</span>
          <br />
          웨딩 플래닝
        </h1>

        {/* Sub Copy */}
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          웨딩홀부터 스드메, 예물·가전까지
          <br />
          한 번에 비교하고 예약하세요.
        </p>

        {/* CTA Buttons */}
        <div className="flex gap-3">
          <Button 
            onClick={() => navigate("/venues")}
            className="flex-1 h-12 rounded-xl font-semibold gap-2"
          >
            <Search className="w-4 h-4" />
            웨딩홀 찾기
          </Button>
          <Button 
            variant="outline"
            className="flex-1 h-12 rounded-xl font-semibold gap-2 border-primary/30 hover:bg-accent"
          >
            <Sparkles className="w-4 h-4" />
            AI 플래너에게 물어보기
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
