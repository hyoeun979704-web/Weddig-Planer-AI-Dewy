import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { ArrowLeft, Sparkles, Send, RotateCcw, FileText, Clock, Users, Lock, ChevronRight } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import TutorialOverlay from "@/components/TutorialOverlay";
import { usePageTutorial } from "@/hooks/usePageTutorial";
import { useAIPlanner } from "@/hooks/useAIPlanner";
import { useSubscription } from "@/hooks/useSubscription";
import DailyUsageBadge from "@/components/premium/DailyUsageBadge";
import UpgradeModal from "@/components/premium/UpgradeModal";
import EstimateSheet from "@/components/premium/EstimateSheet";
import BudgetReportSheet from "@/components/premium/BudgetReportSheet";
import TimelineSheet from "@/components/premium/TimelineSheet";
import StaffGuideSheet from "@/components/premium/StaffGuideSheet";
import GuestMessageSheet from "@/components/premium/GuestMessageSheet";

type SheetType = "estimate" | "budget-report" | "timeline-snap" | "timeline-ceremony" | "timeline-guest" | "staff-gabang" | "staff-reception" | "staff-mc" | "staff-parents" | "guest-message" | null;

const premiumTools = [
  { icon: FileText, label: "AI 견적서", sheet: "estimate" as SheetType },
  { icon: FileText, label: "예산 리포트", sheet: "budget-report" as SheetType },
  { icon: Clock, label: "타임라인", sheet: "timeline-ceremony" as SheetType },
  { icon: Users, label: "스태프 안내", sheet: "staff-gabang" as SheetType },
];

const suggestedQuestions = [
  "결혼 준비 어디서부터 시작해야 하나요?",
  "예산 3000만원으로 웨딩홀 추천해주세요",
  "스드메 패키지 비용은 얼마나 하나요?",
  "허니문 인기 여행지 추천해주세요",
  "우리 결혼 예산 분석 리포트 만들어줘",
  "본식 당일 타임라인 만들어줘",
];

const AIPlanner = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, sendMessage, clearMessages, showUpgradeModal, setShowUpgradeModal } = useAIPlanner();
  const { isPremium } = useSubscription();
  const tutorial = usePageTutorial("ai-planner");
  const [activeSheet, setActiveSheet] = useState<SheetType>(null);

  const handlePremiumTool = (sheet: SheetType) => {
    if (!isPremium) {
      setShowUpgradeModal(true);
      return;
    }
    setActiveSheet(sheet);
  };

  const handleSend = () => {
    if (!message.trim() || isLoading) return;
    sendMessage(message.trim());
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (question: string) => {
    if (isLoading) return;
    sendMessage(question);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative flex flex-col">
      {/* Header */}
      <header data-tutorial="ai-header" className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <h1 className="text-lg font-bold text-foreground">AI 플래너 듀이</h1>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              title="대화 초기화"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Daily Usage Badge */}
      <div className="pt-3">
        <DailyUsageBadge />
      </div>

      {/* Premium Tools Bar */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {premiumTools.map((tool) => (
            <button
              key={tool.label}
              onClick={() => handlePremiumTool(tool.sheet)}
              className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-xl text-xs font-medium text-foreground whitespace-nowrap hover:border-primary/30 transition-colors flex-shrink-0"
            >
              {isPremium ? (
                <tool.icon className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              {tool.label}
            </button>
          ))}
          <button
            onClick={() => navigate("/premium/content")}
            className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-primary whitespace-nowrap flex-shrink-0"
          >
            전체보기
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 pb-36 px-4 py-4 overflow-y-auto">
        {messages.length === 0 ? (
          <>
            {/* Welcome Message */}
            <div className="flex gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="bg-muted rounded-2xl rounded-tl-sm p-4">
                  <p className="text-sm text-foreground leading-relaxed">
                    안녕하세요! 🌿✨<br /><br />
                    저는 듀이, 여러분의 든든한 AI 웨딩플래너예요. 결혼 준비, 막막하고 어디서부터 시작해야 할지 모르시겠죠? 걱정 마세요! 둘이니까, 쉬워지니까 — 제가 하나하나 함께 챙겨드릴게요. 💍<br /><br />
                    먼저, 예식일은 정해지셨나요? 아직이시라면 함께 일정 계획부터 세워볼까요?
                  </p>
                </div>
              </div>
            </div>

            {/* Suggested Questions */}
            <div data-tutorial="ai-suggestions" className="mb-6">
              <p className="text-xs text-muted-foreground mb-3 px-1">이런 질문은 어떠세요?</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(question)}
                    disabled={isLoading}
                    className="px-3 py-2 bg-card border border-border rounded-full text-xs text-foreground hover:border-primary/30 hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Chat Messages */
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl p-4 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted text-foreground rounded-tl-sm"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm p-4">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Input Area */}
      <div data-tutorial="ai-input" className="fixed bottom-16 left-0 right-0 bg-background border-t border-border p-4">
        <div className="max-w-[430px] mx-auto">
          <div className="flex items-center gap-2 bg-muted rounded-2xl px-4 py-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="듀이에게 물어보세요..."
              disabled={isLoading}
              className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!message.trim() || isLoading}
              className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center disabled:opacity-50 transition-opacity"
            >
              <Send className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        trigger="daily_limit"
      />

      {/* Premium Sheets */}
      <EstimateSheet open={activeSheet === "estimate"} onClose={() => setActiveSheet(null)} />
      <BudgetReportSheet open={activeSheet === "budget-report"} onClose={() => setActiveSheet(null)} />
      <TimelineSheet open={activeSheet?.startsWith("timeline") ? activeSheet as "timeline-snap" | "timeline-ceremony" | "timeline-guest" : null} onClose={() => setActiveSheet(null)} />
      <StaffGuideSheet open={activeSheet?.startsWith("staff") ? activeSheet as "staff-gabang" | "staff-reception" | "staff-mc" | "staff-parents" : null} onClose={() => setActiveSheet(null)} />
      <GuestMessageSheet open={activeSheet === "guest-message"} onClose={() => setActiveSheet(null)} />

      {/* Bottom Navigation */}
      <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />

      {tutorial.isActive && tutorial.currentStep && (
        <TutorialOverlay
          isActive={tutorial.isActive}
          currentStep={tutorial.currentStep}
          currentStepIndex={tutorial.currentStepIndex}
          totalSteps={tutorial.totalSteps}
          onNext={tutorial.nextStep}
          onPrev={tutorial.prevStep}
          onSkip={tutorial.skipTutorial}
        />
      )}
    </div>
  );
};

export default AIPlanner;
