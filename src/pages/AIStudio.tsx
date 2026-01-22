import { useNavigate, useLocation } from "react-router-dom";
import { 
  Sparkles, 
  FileText, 
  Image, 
  Video, 
  Mic,
  ChevronRight,
  Star
} from "lucide-react";
import BottomNav from "@/components/BottomNav";

interface ServiceCard {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  url: string;
  badge?: string;
}

const services: ServiceCard[] = [
  {
    id: "invitation",
    title: "청첩장 제작",
    subtitle: "AI 모바일 청첩장",
    description: "나만의 스타일로 청첩장을 제작해보세요. 텍스트만 입력하면 AI가 디자인을 완성합니다.",
    icon: FileText,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    url: "/ai-studio/invitation",
    badge: "인기"
  },
  {
    id: "photoshoot",
    title: "웨딩촬영 시안",
    subtitle: "PPT/포트폴리오 제작",
    description: "원하는 스타일의 웨딩촬영 시안을 AI로 미리 만들어보세요.",
    icon: Image,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    url: "/ai-studio/photoshoot"
  },
  {
    id: "video",
    title: "식전 영상 제작",
    subtitle: "감동적인 오프닝 영상",
    description: "사진과 메시지만 있으면 AI가 감동적인 식전 영상을 만들어드립니다.",
    icon: Video,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    url: "/ai-studio/video",
    badge: "NEW"
  },
  {
    id: "speech",
    title: "스피치 작성",
    subtitle: "혼인선언문 · 주례사 · 축사",
    description: "상황에 맞는 감동적인 스피치를 AI가 작성해드립니다.",
    icon: Mic,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    url: "/ai-studio/speech"
  }
];

const AIStudio = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleTabChange = (href: string) => {
    navigate(href);
  };

  const handleServiceClick = (url: string) => {
    navigate(url);
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-2 px-4 h-14">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <h1 className="text-lg font-bold text-foreground">AI 스튜디오</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        {/* Hero Section */}
        <div className="px-4 py-6 bg-gradient-to-br from-primary/10 via-accent to-background">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-medium text-primary">AI 파워 웨딩</span>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            AI로 만드는<br />특별한 웨딩 콘텐츠
          </h2>
          <p className="text-sm text-muted-foreground">
            청첩장부터 식전 영상까지, AI가 도와드립니다
          </p>
        </div>

        {/* Services Grid */}
        <div className="px-4 py-6">
          <h3 className="font-bold text-foreground mb-4">서비스 선택</h3>
          <div className="space-y-3">
            {services.map((service) => (
              <button
                key={service.id}
                onClick={() => handleServiceClick(service.url)}
                className="w-full p-4 bg-card rounded-2xl border border-border hover:border-primary/30 transition-all text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl ${service.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <service.icon className={`w-7 h-7 ${service.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-foreground">{service.title}</h4>
                      {service.badge && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          service.badge === "NEW" 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-pink-500/10 text-pink-500"
                        }`}>
                          {service.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-primary font-medium mb-1">{service.subtitle}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{service.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Usage Tips */}
        <div className="px-4 py-4">
          <div className="p-4 bg-muted/50 rounded-2xl">
            <h4 className="font-semibold text-foreground text-sm mb-2">💡 이용 안내</h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>• AI 생성 콘텐츠는 무료로 체험하실 수 있습니다</li>
              <li>• 고품질 다운로드 시 포인트가 차감됩니다</li>
              <li>• 생성된 콘텐츠는 마이페이지에서 확인 가능합니다</li>
            </ul>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default AIStudio;
