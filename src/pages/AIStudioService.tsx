import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { 
  ArrowLeft, 
  Send, 
  Loader2,
  FileText,
  Image,
  Video,
  Mic,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useWeddyStudio } from "@/hooks/useWeddyStudio";
import BottomNav from "@/components/BottomNav";

const serviceConfig = {
  invitation: {
    title: "청첩장 제작",
    subtitle: "AI 모바일 청첩장",
    icon: FileText,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    placeholder: "예: 봄 분위기의 따뜻한 청첩장을 만들어주세요. 신랑 이름은 김철수, 신부 이름은 이영희입니다. 3월 22일 오후 2시 그랜드홀에서 진행됩니다.",
    tips: [
      "신랑/신부 이름과 결혼 일시를 포함해주세요",
      "원하는 분위기나 테마를 알려주세요",
      "포함하고 싶은 문구가 있으면 추가해주세요"
    ]
  },
  photoshoot: {
    title: "웨딩촬영 시안",
    subtitle: "PPT/포트폴리오 제작",
    icon: Image,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    placeholder: "예: 야외 자연 배경에서 로맨틱한 분위기의 웨딩 촬영 시안을 만들어주세요. 봄꽃이 피는 정원에서 촬영하고 싶어요.",
    tips: [
      "원하는 촬영 장소 분위기를 설명해주세요",
      "선호하는 스타일(클래식, 모던, 빈티지 등)을 알려주세요",
      "특별한 컨셉이 있다면 추가해주세요"
    ]
  },
  video: {
    title: "식전 영상 제작",
    subtitle: "감동적인 오프닝 영상",
    icon: Video,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    placeholder: "예: 신랑과 신부의 어린 시절부터 만남까지의 이야기를 담은 감동적인 식전 영상을 만들어주세요. 약 3분 분량으로 잔잔한 음악과 함께요.",
    tips: [
      "두 분의 스토리나 만남 이야기를 알려주세요",
      "원하는 영상 분위기(감동적, 밝은, 재미있는)를 선택해주세요",
      "포함하고 싶은 사진이나 메시지가 있으면 설명해주세요"
    ]
  },
  speech: {
    title: "스피치 작성",
    subtitle: "혼인선언문 · 주례사 · 축사",
    icon: Mic,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    placeholder: "예: 친구의 결혼식 축사를 작성해주세요. 10년 지기 친구이고, 대학교 때 같은 동아리에서 만났어요. 밝고 유머러스한 분위기로 3분 정도 분량으로 부탁드려요.",
    tips: [
      "스피치 종류(축사, 주례사, 혼인선언문)를 알려주세요",
      "신랑/신부와의 관계를 설명해주세요",
      "원하는 분위기와 길이를 알려주세요"
    ]
  }
};

const AIStudioService = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { service } = useParams<{ service: string }>();
  const [prompt, setPrompt] = useState("");
  const { isLoading, result, generate } = useWeddyStudio();

  const config = serviceConfig[service as keyof typeof serviceConfig];

  if (!config) {
    navigate("/ai-studio");
    return null;
  }

  const Icon = config.icon;

  const handleSubmit = async () => {
    if (!prompt.trim() || isLoading) return;
    await generate(service as "invitation" | "photoshoot" | "video" | "speech", prompt);
  };

  const handleTabChange = (href: string) => {
    navigate(href);
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button 
            onClick={() => navigate("/ai-studio")}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full ${config.bgColor} flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${config.color}`} />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground">{config.title}</h1>
              <p className="text-xs text-muted-foreground">{config.subtitle}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-32">
        {/* Tips Section */}
        <div className="px-4 py-4">
          <div className="p-4 bg-muted/50 rounded-2xl">
            <h4 className="font-semibold text-foreground text-sm mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              작성 팁
            </h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {config.tips.map((tip, index) => (
                <li key={index}>• {tip}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Result Display */}
        {result?.success && result.data && (
          <div className="px-4 py-4">
            <div className="p-4 bg-card rounded-2xl border border-border">
              <h4 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                생성 결과
              </h4>
              
              {result.data.content && (
                <div className="text-sm text-foreground whitespace-pre-wrap">
                  {result.data.content}
                </div>
              )}
              
              {result.data.imageUrl && (
                <img 
                  src={result.data.imageUrl} 
                  alt="Generated content"
                  className="w-full rounded-lg mt-3"
                />
              )}
              
              {result.data.videoUrl && (
                <video 
                  src={result.data.videoUrl} 
                  controls
                  className="w-full rounded-lg mt-3"
                />
              )}

              {result.data.status === "processing" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  콘텐츠를 생성 중입니다...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Input Section */}
        <div className="px-4 py-4">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={config.placeholder}
            className="min-h-[200px] resize-none"
            disabled={isLoading}
          />
        </div>
      </main>

      {/* Fixed Bottom Input */}
      <div className="fixed bottom-16 left-0 right-0 max-w-[430px] mx-auto p-4 bg-background border-t border-border">
        <Button 
          onClick={handleSubmit}
          disabled={!prompt.trim() || isLoading}
          className="w-full h-12 text-base font-semibold"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              생성 중...
            </>
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              AI로 생성하기
            </>
          )}
        </Button>
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default AIStudioService;
