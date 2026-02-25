import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, Send, Diamond } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import ChatBubble from "@/components/wedding-planner/ChatBubble";
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

const MAX_DAILY_QUESTIONS = 3;

const EXAMPLE_QUESTIONS = [
  { label: "결혼 준비 어디서부터 시작해야 하나요?", modal: null as ModalType },
  { label: "예산 3000만원으로 웨딩홀 추천해주세요", modal: "venue" as ModalType },
  { label: "스드메 패키지 비용은 얼마나 하나요?", modal: "sdme" as ModalType },
  { label: "허니문 인기 여행지 추천해주세요", modal: null as ModalType },
  { label: "우리 결혼 예산 분석 리포트 만들어줘", modal: "budget" as ModalType, premium: true },
  { label: "본식 당일 타임라인 만들어줘", modal: "timeline" as ModalType },
];

const GENERIC_RESPONSE =
  "결혼 준비, 막막하고 어디서부터 시작해야 할지 모르시겠죠? 걱정 마세요! 😊\n\n" +
  "일반적으로 결혼 준비는 이런 순서로 진행해요:\n\n" +
  "1️⃣ 예식일 & 예산 정하기\n" +
  "2️⃣ 웨딩홀 예약\n" +
  "3️⃣ 스드메(스튜디오·드레스·메이크업) 계약\n" +
  "4️⃣ 신혼집 & 혼수 준비\n" +
  "5️⃣ 청첩장 & 허니문 예약\n\n" +
  "더 자세한 내용이 궁금하시면 아래 질문 버튼을 눌러주세요! 💕";

const HONEYMOON_RESPONSE =
  "허니문 인기 여행지를 추천해드릴게요! 🌴✈️\n\n" +
  "🏝️ 몰디브 — 수상빌라에서 즐기는 로맨틱한 휴양\n" +
  "🌺 하와이 — 자연과 액티비티를 동시에!\n" +
  "🏖️ 발리 — 이국적인 분위기와 합리적인 가격\n" +
  "🗼 유럽 (파리·로마·바르셀로나) — 문화와 미식 여행\n" +
  "🌊 괌/사이판 — 가까운 거리, 짧은 비행시간\n\n" +
  "예산과 일정에 맞춰 더 자세히 안내해드릴 수 있어요! 어떤 스타일의 허니문을 원하세요? 😊";

const AIPlanner = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [showChips, setShowChips] = useState(true);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [remainingQuestions, setRemainingQuestions] = useState(MAX_DAILY_QUESTIONS);
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
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "assistant", content, isHtml },
      ]);
    }, 1800);
  }, []);

  const handleChipClick = (modal: ModalType, label: string) => {
    if (remainingQuestions <= 0) return;

    setShowChips(false);

    if (modal) {
      setActiveModal(modal);
    } else {
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "user", content: label },
      ]);
      setRemainingQuestions((prev) => Math.max(0, prev - 1));

      if (label.includes("허니문") || label.includes("여행지")) {
        addAssistantMessage(HONEYMOON_RESPONSE);
      } else {
        addAssistantMessage(GENERIC_RESPONSE);
      }
    }
  };

  const handleFreeTextSend = () => {
    const text = input.trim();
    if (!text || remainingQuestions <= 0) return;
    setMessages((prev) => [...prev, { id: nextId(), role: "user", content: text }]);
    setInput("");
    setShowChips(false);
    setRemainingQuestions((prev) => Math.max(0, prev - 1));
    addAssistantMessage(GENERIC_RESPONSE);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleFreeTextSend();
    }
  };

  const handleVenueSubmit = (data: any) => {
    setRemainingQuestions((prev) => Math.max(0, prev - 1));
    const summary = `📍 지역: ${data.region} | 📅 날짜: ${data.date} | 👥 하객: ${data.guests}명 | 💰 예산: ${data.budget}\n🏛 스타일: ${data.styles.join(", ")}`;
    setMessages((prev) => [...prev, { id: nextId(), role: "user", content: summary }]);
    addAssistantMessage(generateVenueResponse(data), true);
  };

  const handleSdmeSubmit = (data: any) => {
    setRemainingQuestions((prev) => Math.max(0, prev - 1));
    const summary = `📍 지역: ${data.region} | 📅 날짜: ${data.date} | 📸 촬영: ${data.studioStyle} | 💰 예산: ${data.budget}`;
    setMessages((prev) => [...prev, { id: nextId(), role: "user", content: summary }]);
    addAssistantMessage(generateSdmeResponse(data), true);
  };

  const handleTimelineSubmit = (data: any) => {
    setRemainingQuestions((prev) => Math.max(0, prev - 1));
    const summary = `⏰ 예식: ${data.ceremonyTime} | 🏛 장소: ${data.venueType} | ⏱ 소요: ${data.duration} | 📸 촬영: ${data.photoTeam.join(", ")}`;
    setMessages((prev) => [...prev, { id: nextId(), role: "user", content: summary }]);
    addAssistantMessage(generateTimelineResponse(data), true);
  };

  const handleBudgetSubmit = (data: any) => {
    setRemainingQuestions((prev) => Math.max(0, prev - 1));
    const summary = `💰 총예산: ${data.totalBudget}만원 | 📍 지역: ${data.region} | 📅 날짜: ${data.date} | ${data.season}`;
    setMessages((prev) => [...prev, { id: nextId(), role: "user", content: summary }]);
    addAssistantMessage(generateBudgetResponse(data), true);
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "#F5F0E8",
        fontFamily: "'Noto Sans KR', sans-serif",
      }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-40 h-14 flex items-center justify-between px-4 flex-shrink-0"
        style={{
          background: "linear-gradient(180deg, #F5F0E8 0%, #EDE8DD 100%)",
          borderBottom: "1px solid #E5DFD3",
        }}
      >
        <button
          onClick={() => navigate(-1)}
          className="p-1 -ml-1 rounded-full hover:bg-black/5 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" style={{ color: "#7C7260" }} />
        </button>
        <div className="flex items-center gap-1.5">
          <span className="text-lg">🌸</span>
          <h1 className="text-base font-bold" style={{ color: "#5C6B4F" }}>
            AI 플래너 듀이
          </h1>
        </div>
        <button className="p-1 -mr-1 rounded-full hover:bg-black/5 transition-colors">
          <Diamond className="w-5 h-5" style={{ color: "#C9A96E" }} />
        </button>
      </header>

      {/* Daily Question Limit Badge */}
      <div className="flex justify-center pt-3 pb-1">
        <div
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium"
          style={{
            background: "#EDE8DD",
            color: "#7C7260",
            border: "1px solid #E0D9CC",
          }}
        >
          <span>💬</span>
          <span>오늘 남은 질문 {remainingQuestions}/{MAX_DAILY_QUESTIONS}회</span>
        </div>
      </div>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto pb-36">
        <div className="max-w-[760px] mx-auto px-4 py-4 space-y-4">
          {/* Welcome message */}
          {messages.length === 0 && (
            <div className="flex gap-3 items-start">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-base"
                style={{ background: "#E8E0D0" }}
              >
                🌸
              </div>
              <div
                className="rounded-2xl rounded-tl-sm px-4 py-3.5 max-w-[85%]"
                style={{
                  background: "#FDFBF7",
                  border: "1px solid #E8E0D0",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <p className="text-sm leading-relaxed" style={{ color: "#4A4A4A" }}>
                  <b>안녕하세요!</b> 🌸🌿
                  <br /><br />
                  저는 듀이, 여러분의 든든한 AI 웨딩플래너예요.
                  <br />
                  결혼 준비, 막막하고 어디서부터 시작해야 할지 모르시겠죠? 걱정 마세요! 둘이니까, 쉬워지니까 — 제가 하나하나 함께 챙겨드릴게요. 💍
                  <br /><br />
                  먼저, 예식일은 정해지셨나요? 아직이시라면 함께 일정 계획부터 세워볼까요?
                </p>
              </div>
            </div>
          )}

          {/* Example question chips */}
          {showChips && messages.length === 0 && (
            <div className="mt-5 ml-12">
              <p className="text-xs font-medium mb-2.5" style={{ color: "#9C9484" }}>
                이런 질문은 어떠세요?
              </p>
              <div className="flex flex-col gap-2">
                {EXAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => handleChipClick(q.modal, q.label)}
                    disabled={remainingQuestions <= 0}
                    className="text-left px-4 py-2.5 rounded-full text-sm transition-all disabled:opacity-40"
                    style={{
                      background: "transparent",
                      border: "1px solid #D4CEC2",
                      color: "#5C5647",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#EDE8DD";
                      e.currentTarget.style.borderColor = "#B8B0A0";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.borderColor = "#D4CEC2";
                    }}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat messages */}
          {messages.map((msg) => (
            <ChatBubble key={msg.id} msg={msg} />
          ))}

          {/* Typing indicator */}
          {isTyping && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Bottom Input Bar */}
      <div
        className="fixed bottom-0 left-0 right-0 p-3 z-40"
        style={{
          background: "#F5F0E8",
          borderTop: "1px solid #E5DFD3",
        }}
      >
        <div className="max-w-[760px] mx-auto flex items-center gap-2">
          <div
            className="flex-1 flex items-center rounded-full px-4 py-2.5"
            style={{
              background: "#FDFBF7",
              border: "1px solid #E0D9CC",
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="듀이에게 물어보세요..."
              disabled={remainingQuestions <= 0}
              className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-[#B8B0A0]"
              style={{ color: "#4A4A4A" }}
            />
            <button
              onClick={handleFreeTextSend}
              disabled={!input.trim() || remainingQuestions <= 0}
              className="ml-2 w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
              style={{
                background:
                  input.trim() && remainingQuestions > 0
                    ? "linear-gradient(135deg, #8B9D77, #6B7F5A)"
                    : "#D4CEC2",
              }}
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
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
