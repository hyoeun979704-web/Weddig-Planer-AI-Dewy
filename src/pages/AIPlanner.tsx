import { useState, useRef, useEffect, useMemo } from "react";
import LoginRequiredOverlay from "@/components/LoginRequiredOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Send, ArrowLeft, RotateCcw, Sparkles, ChevronDown } from "lucide-react";
import { useAIPlanner } from "@/hooks/useAIPlanner";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { WEDDING_STYLE_LABEL } from "@/lib/weddingStyle";
import ChatBubble from "@/components/wedding-planner/ChatBubble";
import TypingIndicator from "@/components/wedding-planner/TypingIndicator";
import VenueSurvey from "@/components/wedding-planner/VenueSurvey";
import SdmeSurvey from "@/components/wedding-planner/SdmeSurvey";
import TimelineSurvey from "@/components/wedding-planner/TimelineSurvey";
import BudgetSurvey from "@/components/wedding-planner/BudgetSurvey";
import SuggestionPanel from "@/components/wedding-planner/SuggestionPanel";
import UpgradeModal from "@/components/premium/UpgradeModal";
import BottomNav from "@/components/BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import { findSuggestions } from "@/data/chatbotSuggestions";

type ModalType = "venue" | "sdme" | "timeline" | "budget" | null;

interface QuickQuestion {
  emoji: string;
  label: string;
  desc: string;
  /** Opens a structured modal (legacy flow). */
  modal?: ModalType;
  /** Sends this text as a free-form message — used for persona-specific
   *  prompts that don't have a dedicated structured handler. */
  prompt?: string;
  premium?: boolean;
}

const BASE_QUICK_QUESTIONS: QuickQuestion[] = [
  { emoji: "🏛️", label: "웨딩홀 추천", desc: "지역·예산 맞춤 추천", modal: "venue" },
  { emoji: "📸", label: "스드메 가이드", desc: "촬영 순서·견적 안내", modal: "sdme" },
  { emoji: "📅", label: "준비 타임라인", desc: "월별 체크리스트", modal: "timeline" },
  { emoji: "💰", label: "예산 플래너", desc: "항목별 예산 설계", modal: "budget", premium: true },
];

// Persona-specific quick cards. They send a free-form prompt that the LLM
// answers — the persona system message in useAIPlanner ensures the reply
// stays in style. Self/small cards replace categories the user already
// opted out of (스드메 등).
const SELF_QUICK_QUESTIONS: QuickQuestion[] = [
  { emoji: "🏡", label: "한옥/하우스 베뉴", desc: "셀프웨딩 어울리는 식장", prompt: "셀프웨딩에 어울리는 한옥·하우스 베뉴 추천해줘" },
  { emoji: "✏️", label: "DIY 청첩장", desc: "직접 만드는 청첩장 가이드", prompt: "셀프웨딩 DIY 청첩장 만드는 순서와 팁 알려줘" },
  { emoji: "📷", label: "셀프 스냅 팁", desc: "촬영 장비·구도", prompt: "셀프 본식 스냅 촬영 장비, 구도, 사전 점검 체크리스트 알려줘" },
  { emoji: "💐", label: "DIY 부케·소품", desc: "재료·시기 가이드", prompt: "셀프웨딩 부케·코사지·답례품 DIY 재료와 준비 시기 알려줘" },
];

const SMALL_QUICK_QUESTIONS: QuickQuestion[] = [
  { emoji: "🏡", label: "스몰 베뉴", desc: "30~80명 하우스·한옥", prompt: "30~80명 스몰웨딩에 어울리는 베뉴 종류와 추천 지역 알려줘" },
  { emoji: "💰", label: "스몰 예산", desc: "50명 기준 항목별 분배", prompt: "스몰웨딩 50명 기준 예산을 항목별로 어떻게 분배하는 게 좋아?" },
  { emoji: "📅", label: "준비 타임라인", desc: "스몰웨딩 일정", modal: "timeline" },
  { emoji: "🎀", label: "답례품 아이디어", desc: "직접 만드는 답례품", prompt: "50명 스몰웨딩에 어울리는 답례품 아이디어 추천해줘" },
];

const STYLE_QUICK_QUESTIONS: Record<string, QuickQuestion[]> = {
  self: SELF_QUICK_QUESTIONS,
  small: SMALL_QUICK_QUESTIONS,
};

const BASE_FOLLOW_UP_CHIPS = ["더 자세히 알려줘", "다른 옵션은?", "비용 비교해줘", "체크리스트 만들어줘"];
const STYLE_FOLLOW_UPS: Record<string, string[]> = {
  self: ["DIY로 가능해?", "비용은 얼마나?", "직접 해본 후기는?", "체크리스트 만들어줘"],
  small: ["50명 기준은?", "비용 비교해줘", "스몰 예식 사례는?", "체크리스트 만들어줘"],
};

const AIPlanner = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { messages, isLoading, sendMessage, sendStructured, clearMessages, showUpgradeModal, setShowUpgradeModal, dailyRemaining } = useAIPlanner();
  const { weddingSettings } = useWeddingSchedule();
  const weddingStyle = weddingSettings.wedding_style;
  const quickQuestions = (weddingStyle && STYLE_QUICK_QUESTIONS[weddingStyle]) ?? BASE_QUICK_QUESTIONS;
  const followUpChips = (weddingStyle && STYLE_FOLLOW_UPS[weddingStyle]) ?? BASE_FOLLOW_UP_CHIPS;
  const personaLabel = weddingStyle && weddingStyle !== "general" ? WEDDING_STYLE_LABEL[weddingStyle] : null;
  const [input, setInput] = useState("");
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Show/hide scroll-to-bottom button
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const onScroll = () => {
      const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(fromBottom > 200);
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput("");
  };

  // 추천 질문 매칭 (입력 변화 시 메모이제이션)
  const suggestions = useMemo(() => findSuggestions(input, 5), [input]);

  const handleSuggestionSelect = (text: string) => {
    setInput("");
    setIsInputFocused(false);
    sendMessage(text);
  };

  // 패널 표시 조건: 입력창 포커스됐을 때만 (첫 진입 시 Quick Question 카드와 중복 회피)
  const showSuggestionPanel =
    isInputFocused &&
    !isLoading &&
    suggestions.length > 0;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChipClick = (text: string) => {
    if (isLoading) return;
    sendMessage(text);
  };

  const handleQuickClick = (item: QuickQuestion) => {
    if (item.prompt) {
      sendMessage(item.prompt);
      return;
    }
    if (item.modal) setActiveModal(item.modal);
  };

  // 모달 핸들러: 모든 입력 필드를 결정형 핸들러로 직접 전달 (LLM 호출 X)
  const handleVenueSubmit = (data: Record<string, unknown>) => {
    setActiveModal(null);
    const userText = `🏛️ 웨딩홀 추천 요청\n${[
      data.region && `지역: ${data.region}`,
      data.guests && `하객수: ${data.guests}명`,
      data.budget && `예산: ${data.budget}만원`,
      Array.isArray(data.styles) && data.styles.length > 0 && `스타일: ${(data.styles as string[]).join(", ")}`,
    ].filter(Boolean).join(" · ")}`;
    sendStructured(userText, { kind: "venue", params: data as never });
  };

  const handleSdmeSubmit = (data: Record<string, unknown>) => {
    setActiveModal(null);
    const userText = `📸 스드메 가이드 요청\n${[
      data.region && `지역: ${data.region}`,
      data.budget && `예산: ${data.budget}만원`,
      data.studioStyle && `스타일: ${data.studioStyle}`,
      data.priority && `우선순위: ${data.priority}`,
    ].filter(Boolean).join(" · ")}`;
    sendStructured(userText, { kind: "sdme", params: data as never });
  };

  const handleTimelineSubmit = (data: Record<string, unknown>) => {
    setActiveModal(null);
    const userText = `⏰ 본식 타임라인 요청\n${[
      data.ceremonyTime && `예식: ${data.ceremonyTime}`,
      data.duration && `소요: ${data.duration}`,
      data.venueType && `식장 타입: ${data.venueType}`,
    ].filter(Boolean).join(" · ")}`;
    sendStructured(userText, { kind: "timeline", params: data as never });
  };

  const handleBudgetSubmit = (data: Record<string, unknown>) => {
    setActiveModal(null);
    const userText = `💰 예산 분배 요청\n${[
      data.totalBudget && `총 ${data.totalBudget}만원`,
      data.region && `(${data.region})`,
      Array.isArray(data.priorities) && data.priorities.length > 0 && `우선순위: ${(data.priorities as string[]).join(", ")}`,
    ].filter(Boolean).join(" ")}`;
    sendStructured(userText, { kind: "budget", params: data as never });
  };

  const hasConversation = messages.length > 0;
  const lastMessageIsAssistant = messages.length > 0 && messages[messages.length - 1]?.role === "assistant";
  const showFollowUps = hasConversation && lastMessageIsAssistant && !isLoading;

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative flex flex-col">
      {!user && <LoginRequiredOverlay message="AI가 나만의 맞춤 웨딩 플랜을 설계해드려요" features={["맞춤 웨딩홀 추천", "예산 플래너", "준비 타임라인"]} />}
      {/* Header */}
      <header className="sticky top-0 bg-card/95 backdrop-blur-md border-b border-border z-40 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground active:scale-95 transition-transform">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary flex items-center justify-center text-base">🌸</div>
            <div>
              <p className="text-sm font-semibold text-foreground">Dewy</p>
              <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                AI 웨딩플래너
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dailyRemaining !== null && (
              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {dailyRemaining}회 남음
              </span>
            )}
            {hasConversation && (
              <button
                onClick={clearMessages}
                className="p-2 text-muted-foreground hover:text-foreground active:scale-95 transition-all rounded-lg hover:bg-muted"
                title="대화 초기화"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Chat area */}
      <main ref={scrollAreaRef} className="flex-1 overflow-y-auto pb-36 px-4">
        <div className="space-y-4 py-4">
          {/* Welcome & Quick Questions - shown when no conversation */}
          {!hasConversation && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5 mt-2"
            >
              {/* Welcome card */}
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent mx-auto mb-4 flex items-center justify-center text-3xl">
                  💍
                </div>
                <h2 className="text-lg font-bold text-foreground mb-1">안녕하세요, 신부님!</h2>
                <p className="text-sm text-muted-foreground">
                  AI 웨딩플래너 Dewy가<br />결혼 준비를 도와드릴게요 🌸
                </p>
                {personaLabel && (
                  <span className="inline-flex mt-3 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
                    {personaLabel} 맞춤 가이드
                  </span>
                )}
              </div>

              {/* Quick question cards */}
              <div className="grid grid-cols-2 gap-2.5">
                {quickQuestions.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => handleQuickClick(q)}
                    className="relative text-left p-3.5 bg-card rounded-2xl border border-border shadow-sm hover:border-primary/40 hover:shadow-md active:scale-[0.97] transition-all group"
                  >
                    <span className="text-2xl block mb-2">{q.emoji}</span>
                    <p className="text-sm font-semibold text-foreground mb-0.5">{q.label}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">{q.desc}</p>
                    {q.premium && (
                      <span className="absolute top-2 right-2 text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5 font-medium flex items-center gap-0.5">
                        <Sparkles className="w-3 h-3" /> PRO
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <p className="text-center text-[11px] text-muted-foreground">
                아래 입력창에 직접 질문할 수도 있어요
              </p>
            </motion.div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <ChatBubble key={i} msg={msg} />
          ))}
          {isLoading && <TypingIndicator />}

          {/* Follow-up chips */}
          {showFollowUps && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-2 pl-11"
            >
              {followUpChips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleChipClick(chip)}
                  className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 active:scale-95 transition-all"
                >
                  {chip}
                </button>
              ))}
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Scroll-to-bottom */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="absolute bottom-40 right-4 w-8 h-8 rounded-full bg-card border border-border shadow-md flex items-center justify-center z-30"
          >
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="fixed bottom-16 left-0 right-0 max-w-[430px] mx-auto z-40">
        {/* 추천 질문 패널 (입력창 위) */}
        <div className="px-3 pb-2">
          <SuggestionPanel
            suggestions={suggestions}
            isVisible={showSuggestionPanel}
            isInputEmpty={input.trim().length === 0}
            onSelect={handleSuggestionSelect}
          />
        </div>
        <div className="bg-card/95 backdrop-blur-md border-t border-border p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => {
                // 추천 클릭이 onBlur보다 먼저 발생하도록 약간의 delay
                setTimeout(() => setIsInputFocused(false), 150);
              }}
              placeholder="결혼 준비에 대해 무엇이든 물어보세요..."
              rows={1}
              className="flex-1 bg-muted border-none outline-none rounded-xl px-4 py-2.5 text-sm placeholder:text-muted-foreground resize-none max-h-24 leading-relaxed"
              style={{ height: "auto", minHeight: "40px" }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = Math.min(target.scrollHeight, 96) + "px";
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center transition-all disabled:opacity-30 active:scale-90 flex-shrink-0"
            >
              <Send className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
        </div>
      </div>

      <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />

      <VenueSurvey isOpen={activeModal === "venue"} onClose={() => setActiveModal(null)} onSubmit={handleVenueSubmit} />
      <SdmeSurvey isOpen={activeModal === "sdme"} onClose={() => setActiveModal(null)} onSubmit={handleSdmeSubmit} />
      <TimelineSurvey isOpen={activeModal === "timeline"} onClose={() => setActiveModal(null)} onSubmit={handleTimelineSubmit} />
      <BudgetSurvey isOpen={activeModal === "budget"} onClose={() => setActiveModal(null)} onSubmit={handleBudgetSubmit} />

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
};

export default AIPlanner;
