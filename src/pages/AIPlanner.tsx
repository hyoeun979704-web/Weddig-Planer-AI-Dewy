import { useState, useRef, useEffect, useCallback } from "react";
import { Paperclip, Send } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import ChatBubble from "@/components/wedding-planner/ChatBubble";
import { askGemini } from "@/lib/gemini";
import TypingIndicator from "@/components/wedding-planner/TypingIndicator";
import VenueSurvey from "@/components/wedding-planner/VenueSurvey";
import SdmeSurvey from "@/components/wedding-planner/SdmeSurvey";
import TimelineSurvey from "@/components/wedding-planner/TimelineSurvey";
import BudgetSurvey from "@/components/wedding-planner/BudgetSurvey";
import {
  generateVenueResponse,
  generateSdmeResponse,
  generateTimelineResponse,
  generateBudgetResponse,
} from "@/components/wedding-planner/mockResponses";
import type { ChatMessage } from "@/components/wedding-planner/constants";

type ModalType = "venue" | "sdme" | "timeline" | "budget" | null;

const EXAMPLE_QUESTIONS = [
  { emoji: "💒", label: "웨딩홀을 추천해주세요.", modal: "venue" as ModalType },
  { emoji: "💄", label: "스드메 패키지 비용은 얼마나 하나요?", modal: "sdme" as ModalType },
  { emoji: "📋", label: "본식 당일 타임라인 만들어주세요.", modal: "timeline" as ModalType },
  { emoji: "💰", label: "결혼예산 분석해주세요.", modal: "budget" as ModalType, premium: true },
];

const GENERIC_RESPONSE = "죄송해요, 현재는 예시 질문을 통해 맞춤 답변을 제공하고 있어요. 위 버튼을 선택해주시면 더 정확한 답변을 드릴 수 있습니다 😊";

const AIPlanner = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [showChips, setShowChips] = useState(true);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);

  const nextId = () => String(++idCounter.current);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const addAssistantMessage = useCallback((content: string, isHtml = false) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { id: nextId(), role: "assistant", content, isHtml }]);
    }, 1800);
  }, []);

  const handleChipClick = (modal: ModalType) => {
    setShowChips(false);
    setActiveModal(modal);
  };

 const handleFreeTextSend = async () => {
  const text = input.trim();
  if (!text || isTyping) return; // ✅ 중복 전송 방지

  const userMsg: ChatMessage = { id: nextId(), role: "user", content: text };
  setMessages(prev => [...prev, userMsg]);
  setInput("");
  setShowChips(false);
  setIsTyping(true);

  try {
    // ✅ HTML 메시지 제외하고 순수 텍스트 히스토리만 전달
    const history = messages
  .filter(m => !m.isHtml)
  .slice(-20)
  .map(m => ({ role: m.role, content: m.content }));

    const reply = await askGemini(text, history);
    setIsTyping(false);
    setMessages(prev => [...prev, { id: nextId(), role: "assistant", content: reply }]);
  } catch (error) {
    setIsTyping(false);
    const errorMessage = error instanceof Error ? error.message : "일시적인 오류가 발생했어요.";
    setMessages(prev => [...prev, {
      id: nextId(),
      role: "assistant",
      content: `죄송해요, ${errorMessage} 잠시 후 다시 시도해주세요 😢`
    }]);
  }
};


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleFreeTextSend();
    }
  };

  // Survey submission handlers
  const handleVenueSubmit = (data: any) => {
    const summary = `📍 지역: ${data.region} | 📅 날짜: ${data.date} | 👥 하객: ${data.guests}명 | 💰 예산: ${data.budget}\n🏛 스타일: ${data.styles.join(", ")}`;
    setMessages(prev => [...prev, { id: nextId(), role: "user", content: summary }]);
    addAssistantMessage(generateVenueResponse(data), true);
  };

  const handleSdmeSubmit = (data: any) => {
    const summary = `📍 지역: ${data.region} | 📅 날짜: ${data.date} | 📸 촬영: ${data.studioStyle} | 💰 예산: ${data.budget}`;
    setMessages(prev => [...prev, { id: nextId(), role: "user", content: summary }]);
    addAssistantMessage(generateSdmeResponse(data), true);
  };

  const handleTimelineSubmit = (data: any) => {
    const summary = `⏰ 예식: ${data.ceremonyTime} | 🏛 장소: ${data.venueType} | ⏱ 소요: ${data.duration} | 📸 촬영: ${data.photoTeam.join(", ")}`;
    setMessages(prev => [...prev, { id: nextId(), role: "user", content: summary }]);
    addAssistantMessage(generateTimelineResponse(data), true);
  };

  const handleBudgetSubmit = (data: any) => {
    const summary = `💰 총예산: ${data.totalBudget}만원 | 📍 지역: ${data.region} | 📅 날짜: ${data.date} | ${data.season}`;
    setMessages(prev => [...prev, { id: nextId(), role: "user", content: summary }]);
    addAssistantMessage(generateBudgetResponse(data), true);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#FAFAFA", fontFamily: "'Noto Sans KR', sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 h-14 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">💕</span>
          <h1 className="text-base font-bold" style={{ color: "rgb(50, 50, 50)" }}>AI 웨딩플래너 듀이</h1>
        </div>
        <button className="px-3 py-1.5 rounded-full border text-xs font-medium transition-colors hover:bg-[#dd6dae]/5" style={{ borderColor: "#C9A96E", color: "#C9A96E" }}>
          프리미엄 시작하기
        </button>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-[760px] mx-auto px-4 py-6 space-y-4">
          {/* Welcome message (always visible) */}
          {messages.length === 0 && (
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-[rgb(255, 234, 239)]/10 flex items-center justify-center flex-shrink-0 text-sm">💕</div>
              <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm max-w-[85%]">
                <p className="text-sm leading-relaxed">
                  안녕하세요 😊 <br />
                  AI 웨딩플래너 듀이입니다.<br />
                  결혼 준비의 모든 것을 도와드릴게요.<br />
                  아래 예시 질문을 선택하거나 직접 입력해보세요!
                </p>
              </div>
            </div>
          )}

          {/* Example question chips */}
          {showChips && messages.length === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 ml-11">
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q.label}
                  onClick={() => handleChipClick(q.modal)}
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
          <button
            disabled
            className="p-2 text-gray-300 cursor-not-allowed"
            title="준비중"
          >
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

      {/* Survey Modals */}
      <VenueSurvey isOpen={activeModal === "venue"} onClose={() => setActiveModal(null)} onSubmit={handleVenueSubmit} />
      <SdmeSurvey isOpen={activeModal === "sdme"} onClose={() => setActiveModal(null)} onSubmit={handleSdmeSubmit} />
      <TimelineSurvey isOpen={activeModal === "timeline"} onClose={() => setActiveModal(null)} onSubmit={handleTimelineSubmit} />
      <BudgetSurvey isOpen={activeModal === "budget"} onClose={() => setActiveModal(null)} onSubmit={handleBudgetSubmit} />
    </div>
  );
};

export default AIPlanner;
