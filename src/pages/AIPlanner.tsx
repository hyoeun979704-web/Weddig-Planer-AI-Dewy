import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Paperclip } from "lucide-react";
import { askGemini } from "@/lib/gemini";
import ChatBubble from "@/components/wedding-planner/ChatBubble";
import TypingIndicator from "@/components/wedding-planner/TypingIndicator";
import VenueSurvey from "@/components/wedding-planner/VenueSurvey";
import SdmeSurvey from "@/components/wedding-planner/SdmeSurvey";
import TimelineSurvey from "@/components/wedding-planner/TimelineSurvey";
import BudgetSurvey from "@/components/wedding-planner/BudgetSurvey";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ModalType = "venue" | "sdme" | "timeline" | "budget" | null;

const QUICK_QUESTIONS = [
  { emoji: "🏛️", label: "웨딩홀 어떻게 골라요?", modal: "venue" as ModalType },
  { emoji: "📸", label: "스드메 순서 알려줘", modal: "sdme" as ModalType },
  { emoji: "📅", label: "결혼 준비 타임라인", modal: "timeline" as ModalType },
  { emoji: "💰", label: "예산 어떻게 짜요?", modal: "budget" as ModalType, premium: true },
];

const AIPlanner = () => {
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

  // 버튼 클릭 → 모달 열기 (설문 후 Gemini 호출)
  const handleQuickClick = (item: typeof QUICK_QUESTIONS[0]) => {
    setActiveModal(item.modal);
  };

  // 모달 제출 → 설문 내용을 프롬프트로 Gemini 호출
  const handleVenueSubmit = (data: Record<string, string>) => {
    setActiveModal(null);
    const prompt = `웨딩홀 추천해줘. 지역: ${data.region ?? "미정"}, 예산: ${data.budget ?? "미정"}, 하객수: ${data.guests ?? "미정"}명`;
    sendMessage(prompt);
  };
  const handleSdmeSubmit = (data: Record<string, string>) => {
    setActiveModal(null);
    const prompt = `스드메 견적 알려줘. 스타일: ${data.style ?? "미정"}, 예산: ${data.budget ?? "미정"}`;
    sendMessage(prompt);
  };
  const handleTimelineSubmit = (data: Record<string, string>) => {
    setActiveModal(null);
    const prompt = `결혼 준비 타임라인 짜줘. 예식일: ${data.weddingDate ?? "미정"}, 현재 진행상황: ${data.progress ?? "초기단계"}`;
    sendMessage(prompt);
  };
  const handleBudgetSubmit = (data: Record<string, string>) => {
    setActiveModal(null);
    const prompt = `결혼 예산 계획 세워줘. 총 예산: ${data.total ?? "미정"}, 우선순위: ${data.priority ?? "없음"}`;
    sendMessage(prompt);
  };

  return (
    <div className="flex flex-col h-screen bg-[#FDF8F5]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-100 z-40 px-4 py-3">
        <div className="max-w-[760px] mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F9B8C6] to-[#C9A96E] flex items-center justify-center text-white text-sm">🌸</div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Dewy</p>
            <p className="text-xs text-green-500">● 온라인</p>
          </div>
        </div>
      </header>

      {/* Main chat area */}
      <main className="flex-1 overflow-y-auto pt-16 pb-24 px-4">
        <div className="max-w-[760px] mx-auto space-y-4 py-4">

          {/* Quick question buttons */}
          {messages.length <= 1 && (
            <div className="grid grid-cols-2 gap-2 mt-4">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q.label}
                  onClick={() => handleQuickClick(q)}
                  className="relative text-left px-4 py-3 bg-white rounded-2xl border border-gray-100 shadow-sm text-sm hover:border-[#C9A96E]/40 hover:shadow-md transition-all"
                >
                  <span>{q.emoji} {q.label}</span>
                  {q.premium && (
                    <span className="absolute -top-1.5 -right-1.5 text-xs bg-[#C9A96E] text-white rounded-full w-5 h-5 flex items-center justify-center">👑</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Chat messages */}
          {messages.map(msg => (
            <ChatBubble key={msg.id} msg={msg} />
          ))}

          {/* Typing indicator */}
          {isTyping && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Bottom Input Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-3 z-40">
        <div className="max-w-[760px] mx-auto flex items-center gap-2">
          <button disabled className="p-2 text-gray-300 cursor-not-allowed" title="준비중">
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="결혼 준비에 대해 무엇이든 물어보세요..."
            className="flex-1 bg-gray-50 border-none outline-none rounded-xl px-4 py-2.5 text-sm placeholder:text-gray-400"
          />
          <button
            onClick={handleFreeTextSend}
            disabled={!input.trim() || isTyping}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-opacity disabled:opacity-30"
            style={{ background: input.trim() ? "linear-gradient(135deg, #F9B8C6, #C9A96E)" : "#E5E7EB" }}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Survey Modals - 4개 전부 유지 */}
      <VenueSurvey isOpen={activeModal === "venue"} onClose={() => setActiveModal(null)} onSubmit={handleVenueSubmit} />
      <SdmeSurvey isOpen={activeModal === "sdme"} onClose={() => setActiveModal(null)} onSubmit={handleSdmeSubmit} />
      <TimelineSurvey isOpen={activeModal === "timeline"} onClose={() => setActiveModal(null)} onSubmit={handleTimelineSubmit} />
      <BudgetSurvey isOpen={activeModal === "budget"} onClose={() => setActiveModal(null)} onSubmit={handleBudgetSubmit} />
    </div>
  );
};

export default AIPlanner;
