import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Send, Paperclip, ArrowLeft } from "lucide-react";
import { askGemini } from "@/lib/gemini";
import ChatBubble from "@/components/wedding-planner/ChatBubble";
import TypingIndicator from "@/components/wedding-planner/TypingIndicator";
import VenueSurvey from "@/components/wedding-planner/VenueSurvey";
import SdmeSurvey from "@/components/wedding-planner/SdmeSurvey";
import TimelineSurvey from "@/components/wedding-planner/TimelineSurvey";
import BudgetSurvey from "@/components/wedding-planner/BudgetSurvey";
import BottomNav from "@/components/BottomNav";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};
type ModalType = "venue" | "sdme" | "timeline" | "budget" | null;

const QUICK_QUESTIONS = [
  { emoji: "🏛️", label: "웨딩홀 추천해줘.", modal: "venue" as ModalType },
  { emoji: "📸", label: "스드메 순서 알려줘", modal: "sdme" as ModalType },
  { emoji: "📅", label: "결혼 준비 타임라인", modal: "timeline" as ModalType },
  { emoji: "💰", label: "예산 계획 도와줘", modal: "budget" as ModalType, premium: true },
];

const AIPlanner = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      role: "assistant",
      content: "안녕하세요 신부님! 💍 저는 웨딩플래너 dewy예요. 결혼 준비, 무엇이든 물어보세요 🌸",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = useCallback(async (text: string, historyOverride?: Message[]) => {
    if (!text.trim() || isTyping) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    const baseHistory = historyOverride ?? messages;
    const newMessages = [...baseHistory, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);
    try {
      const history = baseHistory.map(m => ({ role: m.role, content: m.content }));
      const reply = await askGemini(text, history);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", content: "AI 응답을 받지 못했어요. 잠시 후 다시 시도해주세요." }]);
    } finally {
      setIsTyping(false);
    }
  }, [messages, isTyping]);

  const handleFreeTextSend = () => sendMessage(input);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleFreeTextSend();
    }
  };
  const handleQuickClick = (item: typeof QUICK_QUESTIONS[0]) => setActiveModal(item.modal);
  const handleVenueSubmit = (data: Record<string, string>) => {
    setActiveModal(null);
    sendMessage(`웨딩홀 추천해줘. 지역: ${data.region ?? "미정"}, 예산: ${data.budget ?? "미정"}, 하객수: ${data.guests ?? "미정"}명`);
  };
  const handleSdmeSubmit = (data: Record<string, string>) => {
    setActiveModal(null);
    sendMessage(`스드메 견적 알려줘. 스타일: ${data.style ?? "미정"}, 예산: ${data.budget ?? "미정"}`);
  };
  const handleTimelineSubmit = (data: Record<string, string>) => {
    setActiveModal(null);
    sendMessage(`결혼 준비 타임라인 짜줘. 예식일: ${data.weddingDate ?? "미정"}, 현재 진행상황: ${data.progress ?? "초기단계"}`);
  };
  const handleBudgetSubmit = (data: Record<string, string>) => {
    setActiveModal(null);
    sendMessage(`결혼 예산 계획 세워줘. 총 예산: ${data.total ?? "미정"}, 우선순위: ${data.priority ?? "없음"}`);
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative flex flex-col">
      {/* ✅ 다른 페이지와 동일한 헤더 구조 */}
      <header className="sticky top-0 bg-card border-b border-border z-40 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-primary flex items-center justify-center text-white text-sm">🌸</div>
          <div>
            <p className="text-sm font-semibold text-foreground">Dewy</p>
            <p className="text-xs text-green-500">● 온라인</p>
          </div>
        </div>
      </header>

      {/* ✅ 채팅 영역 - pb-20으로 BottomNav 공간 확보 */}
      <main className="flex-1 overflow-y-auto pb-32 px-4">
        <div className="space-y-4 py-4">
          {messages.length <= 1 && (
            <div className="grid grid-cols-2 gap-2 mt-4">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q.label}
                  onClick={() => handleQuickClick(q)}
                  className="relative text-left px-4 py-3 bg-card rounded-2xl border border-border shadow-sm text-sm hover:border-primary/40 hover:shadow-md transition-all"
                >
                  <span>{q.emoji} {q.label}</span>
                  {q.premium && (
                    <span className="absolute -top-1.5 -right-1.5 text-xs bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center">👑</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {messages.map(msg => (
            <ChatBubble key={msg.id} msg={msg} />
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* ✅ 입력창 - BottomNav 바로 위에 위치 */}
      <div className="fixed bottom-16 left-0 right-0 max-w-[430px] mx-auto bg-card border-t border-border p-3 z-40">
        <div className="flex items-center gap-2">
          <button disabled className="p-2 text-muted-foreground cursor-not-allowed">
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="결혼 준비에 대해 무엇이든 물어보세요..."
            className="flex-1 bg-muted border-none outline-none rounded-xl px-4 py-2.5 text-sm placeholder:text-muted-foreground"
          />
          <button
            onClick={handleFreeTextSend}
            disabled={!input.trim() || isTyping}
            className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center transition-opacity disabled:opacity-30"
          >
            <Send className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      </div>

      {/* ✅ 다른 페이지와 동일한 BottomNav */}
      <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />

      <VenueSurvey isOpen={activeModal === "venue"} onClose={() => setActiveModal(null)} onSubmit={handleVenueSubmit} />
      <SdmeSurvey isOpen={activeModal === "sdme"} onClose={() => setActiveModal(null)} onSubmit={handleSdmeSubmit} />
      <TimelineSurvey isOpen={activeModal === "timeline"} onClose={() => setActiveModal(null)} onSubmit={handleTimelineSubmit} />
      <BudgetSurvey isOpen={activeModal === "budget"} onClose={() => setActiveModal(null)} onSubmit={handleBudgetSubmit} />
    </div>
  );
};

export default AIPlanner;
