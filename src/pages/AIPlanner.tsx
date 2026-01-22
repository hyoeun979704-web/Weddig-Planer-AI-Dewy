import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Sparkles, Send, MessageSquare } from "lucide-react";
import { useState } from "react";
import BottomNav from "@/components/BottomNav";

const suggestedQuestions = [
  "결혼 준비 어디서부터 시작해야 하나요?",
  "예산 3000만원으로 웨딩홀 추천해주세요",
  "스드메 패키지 비용은 얼마나 하나요?",
  "허니문 인기 여행지 추천해주세요",
];

const AIPlanner = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [message, setMessage] = useState("");

  const handleTabChange = (href: string) => {
    navigate(href);
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-lg font-bold text-foreground">AI 플래너</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-36 px-4 py-6">
        {/* Welcome Message */}
        <div className="flex gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="bg-muted rounded-2xl rounded-tl-sm p-4">
              <p className="text-sm text-foreground leading-relaxed">
                안녕하세요! 👋<br /><br />
                저는 AI 웨딩 플래너입니다. 결혼 준비에 관한 모든 것을 도와드릴게요.<br /><br />
                웨딩홀, 스드메, 혼수, 허니문 등 궁금한 것이 있으시면 편하게 물어보세요!
              </p>
            </div>
          </div>
        </div>

        {/* Suggested Questions */}
        <div className="mb-6">
          <p className="text-xs text-muted-foreground mb-3 px-1">이런 질문은 어떠세요?</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => setMessage(question)}
                className="px-3 py-2 bg-card border border-border rounded-full text-xs text-foreground hover:border-primary/30 hover:bg-accent transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        {/* Coming Soon Notice */}
        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-foreground text-sm mb-1">서비스 준비중</h4>
              <p className="text-xs text-muted-foreground">
                AI 플래너 서비스가 곧 오픈 예정입니다.<br />
                더 똑똑한 웨딩 플래닝을 경험해보세요!
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Input Area */}
      <div className="fixed bottom-16 left-0 right-0 bg-background border-t border-border p-4">
        <div className="max-w-[430px] mx-auto">
          <div className="flex items-center gap-2 bg-muted rounded-2xl px-4 py-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="메시지를 입력하세요..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
            />
            <button className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
              <Send className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default AIPlanner;
