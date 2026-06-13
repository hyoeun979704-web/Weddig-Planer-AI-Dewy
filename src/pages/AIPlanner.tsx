import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import LoginRequiredOverlay from "@/components/LoginRequiredOverlay";
import DewyLogo from "@/components/home/DewyLogo";
import Seo from "@/components/Seo";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Send, RotateCcw, Sparkles, ChevronDown, Brain, Check, X, MessagesSquare } from "lucide-react";
import HomeHeader from "@/components/home/HomeHeader";
import CategoryTabBar, { useCategoryTabNavigation } from "@/components/home/CategoryTabBar";
import { useAIPlanner } from "@/hooks/useAIPlanner";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { useWeddingInfoPrompt } from "@/hooks/useWeddingInfoPrompt";
import WeddingInfoSetupModal from "@/components/wedding-planner/WeddingInfoSetupModal";
import DataCollectionConsentModal from "@/components/consent/DataCollectionConsentModal";
import { useDataCollectionConsent } from "@/hooks/useDataCollectionConsent";
import ChatBubble from "@/components/wedding-planner/ChatBubble";
import MemoryManagerSheet from "@/components/wedding-planner/MemoryManagerSheet";
import ChatSessionsSheet from "@/components/wedding-planner/ChatSessionsSheet";
import { useSubscription } from "@/hooks/useSubscription";
import TypingIndicator from "@/components/wedding-planner/TypingIndicator";
import VenueSurvey from "@/components/wedding-planner/VenueSurvey";
import SdmeSurvey from "@/components/wedding-planner/SdmeSurvey";
import TimelineSurvey from "@/components/wedding-planner/TimelineSurvey";
import BudgetSurvey from "@/components/wedding-planner/BudgetSurvey";
import SuggestionPanel from "@/components/wedding-planner/SuggestionPanel";
import UpgradeModal from "@/components/premium/UpgradeModal";
import BottomNav from "@/components/BottomNav";
import PageTutorial from "@/components/tutorial/PageTutorial";
import { motion, AnimatePresence } from "framer-motion";
import { findSuggestions } from "@/data/chatbotSuggestions";
import { getFollowUpChips } from "@/lib/chatbot/followUpChips";
import type { WeddingStyle } from "@/lib/weddingStyle";
import { PERSONA_HEADER, isGroomMode, type WeddingPersonaMode } from "@/lib/weddingPersona";

type ModalType = "venue" | "sdme" | "timeline" | "budget" | null;

interface QuickQuestion {
  emoji: string;
  label: string;
  desc: string;
  modal?: ModalType;
  /** When set, clicking sends this string as a chat prompt (no modal). */
  prompt?: string;
  premium?: boolean;
}

const BASE_QUICK_QUESTIONS: QuickQuestion[] = [
  { emoji: "", label: "웨딩홀 추천", desc: "지역·예산 맞춤 추천", modal: "venue" },
  { emoji: "", label: "스드메 가이드", desc: "촬영 순서·견적 안내", modal: "sdme" },
  { emoji: "", label: "준비 타임라인", desc: "월별 체크리스트", modal: "timeline" },
  { emoji: "", label: "예산 플래너", desc: "항목별 예산 설계", modal: "budget" },
];

// Style-specific quick questions replace one slot in BASE_QUICK_QUESTIONS so
// the grid stays 2x2. We swap the 스드메(SDM) slot for self-wedding users
// (they skip studio/dress/makeup anyway) and the 웨딩홀 slot for small/general
// only when the user has the matching context.
const STYLE_OVERRIDES: Partial<Record<WeddingStyle, QuickQuestion[]>> = {
  self: [
    {
      emoji: "",
      label: "셀프촬영 로케이션",
      desc: "지역별 셀프 스냅 명소",
      prompt: "셀프웨딩 촬영하기 좋은 로케이션을 추천해줘",
    },
    {
      emoji: "",
      label: "DIY 부케·소품",
      desc: "직접 만드는 아이디어",
      prompt: "DIY 부케와 소품 아이디어 알려줘",
    },
  ],
  small: [
    {
      emoji: "",
      label: "스몰 베뉴 추천",
      desc: "한옥·하우스·카페형",
      prompt: "스몰웨딩하기 좋은 베뉴를 추천해줘",
    },
    {
      emoji: "",
      label: "답례품 아이디어",
      desc: "소규모 하객용 큐레이션",
      prompt: "스몰웨딩 답례품 아이디어 추천해줘",
    },
  ],
  general: [
    {
      emoji: "",
      label: "양가 분담 비교",
      desc: "지역 평균 기반 분배",
      prompt: "양가 분담 평균과 분배 가이드 알려줘",
    },
  ],
};

const buildQuickQuestions = (style: WeddingStyle | null): QuickQuestion[] => {
  const overrides = style ? STYLE_OVERRIDES[style] ?? [] : [];
  if (overrides.length === 0) return BASE_QUICK_QUESTIONS;
  // Keep the 4-card grid: take the first N base cards we want to preserve,
  // then style overrides. Self-wedding skips the SDM card (irrelevant) and
  // the timeline card stays. Small/general keep venue + timeline + budget.
  const baseFiltered = style === "self"
    ? BASE_QUICK_QUESTIONS.filter(q => q.modal !== "sdme")
    : BASE_QUICK_QUESTIONS;
  return [...overrides, ...baseFiltered].slice(0, 4);
};

// 호칭은 신랑·신부 모두에게 자연스럽도록 중립 문구 사용.
// (성별/역할 필드가 없어 "신부님" 고정은 신랑 사용자에게 어색했음)
const STYLE_GREETING: Record<WeddingStyle, { title: string; subtitle: string }> = {
  general: {
    title: "결혼 준비, 함께 시작해요",
    subtitle: "AI 웨딩플래너 Dewy가\n결혼 준비를 도와드릴게요",
  },
  small: {
    title: "스몰웨딩 준비 도와드릴게요",
    subtitle: "소규모 예식에 꼭 맞는\n큐레이션을 추천드릴게요",
  },
  self: {
    title: "셀프웨딩 준비 도와드릴게요",
    subtitle: "DIY부터 셀프촬영까지\n손맛 가득한 준비를 도와드릴게요",
  },
  custom: {
    title: "안녕하세요!",
    subtitle: "내가 정한 카테고리 중심으로\nDewy가 도와드릴게요",
  },
};

// Round 8 C — 비표준 페르소나는 PERSONA_HEADER 의 카피로 greeting 분기. AI 백엔드는
// 이미 페르소나를 알고 있지만(prompt.ts + user-data.ts) UI 도 같은 voice 로 진입해야
// "내 결혼식 안내" 라는 인상이 일관됨. STYLE_GREETING 은 fallback.
const PERSONA_QUICK_QUESTIONS: Partial<Record<WeddingPersonaMode, QuickQuestion[]>> = {
  // Round 9 fix — 순수 신랑(다른 페르소나 없음) 도 quickQuestions 필요. 빠지면 일반
  // style 의 양가 분담(신부 코드) 카드가 노출돼 헤더 칩과 모순.
  standard_groom: [
    {
      emoji: "",
      label: "신랑 예복 후보 좁히기",
      desc: "맞춤·기성·렌탈 비교",
      prompt: "내 결혼식에 어울리는 신랑 예복 후보 알려줘",
    },
    {
      emoji: "",
      label: "신랑 양가 분담 정리",
      desc: "지역 평균 + 표준 비율",
      prompt: "신랑 입장에서 양가 분담을 어떻게 정리하면 좋을지 알려줘",
    },
  ],
  pregnancy: [
    {
      emoji: "",
      label: "임신 차수별 일정 압축",
      desc: "초기·중기·후기 동선 안내",
      prompt: "임신 중 결혼 준비 일정을 차수별로 정리해줘",
    },
    {
      emoji: "",
      label: "임산부 드레스 후보",
      desc: "마라매니티 지원 브랜드",
      prompt: "임산부도 입을 수 있는 드레스 브랜드를 추천해줘",
    },
  ],
  remarriage: [
    {
      emoji: "",
      label: "작은 가족식 진행",
      desc: "양가 톤·자녀 동반 시나리오",
      prompt: "재혼 가족식 진행 톤과 식순 알려줘",
    },
    {
      emoji: "",
      label: "재혼 청첩장 카피",
      desc: "톤 다운 문구 예시",
      prompt: "재혼인데 자연스러운 청첩장 카피 예시 보여줘",
    },
  ],
  single_household: [
    {
      emoji: "",
      label: "1인 진행 가이드",
      desc: "친정·시댁 역할 부재 대안",
      prompt: "양가 부모님이 안 계신데 결혼 준비를 어떻게 해야 할지 알려줘",
    },
    {
      emoji: "",
      label: "혼자 준비 체크리스트",
      desc: "위임 가능 항목 정리",
      prompt: "혼자 준비하는 결혼식 체크리스트를 알려줘",
    },
  ],
  international: [
    {
      emoji: "",
      label: "한국 결혼 관습 영문",
      desc: "외국 가족에게 보낼 안내",
      prompt: "한국의 결혼 관습을 외국 가족에게 영문으로 설명해줘",
    },
    {
      emoji: "",
      label: "이중식 일정 조율",
      desc: "한국·해외 동선 최적화",
      prompt: "한국과 미국 양쪽에서 결혼식을 하려는데 일정을 어떻게 잡을지 알려줘",
    },
  ],
  remote_overseas: [
    {
      emoji: "",
      label: "한국 방문 일정 압축",
      desc: "2~3회 방문에 미팅 압축",
      prompt: "해외 거주 중 한국에 결혼 준비하러 왔는데 며칠로 압축해서 미팅 잡고 싶어",
    },
  ],
  self_no_ceremony: [
    {
      emoji: "",
      label: "셀프 촬영 노하우",
      desc: "장비·동선·후보정",
      prompt: "셀프웨딩 촬영을 처음 해보는데 준비물과 동선 알려줘",
    },
    {
      emoji: "",
      label: "혼인신고만 준비",
      desc: "필요 서류·절차",
      prompt: "혼인신고만 할 건데 필요한 서류와 절차 알려줘",
    },
  ],
  no_wedding_travel: [
    {
      emoji: "",
      label: "신혼여행 큐레이션",
      desc: "식 없이 여행 우선",
      prompt: "결혼식 없이 신혼여행만 가는데 추천 코스 알려줘",
    },
  ],
  snap_only: [
    {
      emoji: "",
      label: "콘셉트별 스냅 작가",
      desc: "내추럴·필름·라이프스타일",
      prompt: "기념일 스냅 콘셉트와 작가 추천해줘",
    },
  ],
  luxury_hotel: [
    {
      emoji: "",
      label: "호텔 패키지 비교",
      desc: "5천~1억 옵션 정렬",
      prompt: "호텔 웨딩 패키지를 가격대별로 비교해줘",
    },
  ],
  regional: [
    {
      emoji: "",
      label: "지역 식장 통합",
      desc: "시도·시군구 + 인접 권역",
      prompt: "내 지역 + 인근 식장 추천해줘",
    },
  ],
};

const AIPlanner = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const {
    messages, isLoading, sendMessage: rawSendMessage, sendStructured: rawSendStructured,
    showUpgradeModal, setShowUpgradeModal, dailyRemaining,
    recentMemories, confirmRecentMemory, rejectRecentMemory,
    sessions, activeSessionId, switchSession, startNewChat, deleteChat, rateMessage,
  } = useAIPlanner();
  // L5 메모리 검증 — 듀이가 기억 중인 정보를 보고 지울 수 있는 시트.
  const [memorySheetOpen, setMemorySheetOpen] = useState(false);
  // 채팅 기록(세션) 시트 — 이전 채팅 보기/이어하기/새 채팅. 한도 표기는 구독 상태 기준.
  const [sessionsSheetOpen, setSessionsSheetOpen] = useState(false);
  const { isPremium } = useSubscription();

  // ── AI 데이터 동의 게이트 (App Store 5.1.2 / PIPA) ──────────────────────────
  // 채팅 입력은 제3자 AI(OpenAI·Gemini)로 전송되므로, 첫 전송 전 데이터 수집·
  // AI 위탁 전송 동의를 받는다. 동의 전까지 메시지를 보내지 않고 모달로 막는다.
  // sendMessage/sendStructured 를 동의 게이트로 감싸 모든 전송 경로(채팅·칩·추천·
  // 구조화 설문)가 자동으로 동의를 거치게 한다.
  const consent = useDataCollectionConsent();
  const [consentOpen, setConsentOpen] = useState(false);
  const pendingSendRef = useRef<(() => void) | null>(null);

  // 동의 상태(state: undefined=로딩, null=미결정, true/false=결정)가 확정되면
  // 대기 중 전송을 처리한다. 이 effect 가 단일 진입점이라:
  //  - true        → 대기 전송 실행 (로딩 레이스·타 화면 동의 반영·동의 직후 모두 커버)
  //  - null/false  → 미동의 확정 → 동의 모달 표시
  //  - undefined   → 아직 로딩 → 대기(모달 안 띄움 → 동의자 깜빡임 방지)
  // agree() 가 no-op(비로그인) 이면 state 가 true 로 안 바뀌어 전송도 안 됨(안전).
  useEffect(() => {
    if (!pendingSendRef.current) return;
    if (consent.state === true) {
      setConsentOpen(false);
      const run = pendingSendRef.current;
      pendingSendRef.current = null;
      run();
    } else if (consent.state === null || consent.state === false) {
      setConsentOpen(true);
    }
  }, [consent.state]);

  const guardSend = useCallback(
    (run: () => void) => {
      if (consent.state === true) {
        run();
        return;
      }
      // 미동의/로딩 → 전송 보류. 최신 동의 상태 재확인(다른 화면에서 이미 동의했을 수
      // 있음 → refresh 로 reconcile, 위 effect 가 결과 처리). 확정 미동의면 즉시 모달.
      pendingSendRef.current = run;
      void consent.refresh();
      if (consent.state === null || consent.state === false) setConsentOpen(true);
    },
    [consent],
  );

  const sendMessage = useCallback(
    (text: string) => guardSend(() => rawSendMessage(text)),
    [guardSend, rawSendMessage],
  );
  const sendStructured = useCallback(
    (...args: Parameters<typeof rawSendStructured>) => guardSend(() => rawSendStructured(...args)),
    [guardSend, rawSendStructured],
  );

  // 동의 → state=true 로 바뀌면 위 effect 가 대기 전송을 실행(여기서 직접 전송하지 않아
  // 이중 전송/비로그인 우회를 방지). 기록 실패 시에는 전송 취소.
  const handleConsentAgree = useCallback(async () => {
    try {
      await consent.agree();
    } catch {
      pendingSendRef.current = null;
      setConsentOpen(false);
    }
  }, [consent]);

  // 거부도 이력으로 기록(PIPA). 대기 전송은 취소.
  const handleConsentDecline = useCallback(async () => {
    pendingSendRef.current = null;
    setConsentOpen(false);
    try {
      await consent.refuse();
    } catch {
      /* 기록 실패는 무시 */
    }
  }, [consent]);
  const { weddingSettings } = useWeddingSchedule();
  const weddingInfoPrompt = useWeddingInfoPrompt();
  // 결혼 정보(날짜·지역)가 모두 비어있으면 LLM이 컨텍스트 없이 일반론 답변을
  // 주게 됨. 첫 진입 화면에 1줄 chip으로 1분 설정을 유도해 무료 한도가
  // 일반론으로 소모되는 사고 방지.
  const needsWeddingSetup =
    !!user &&
    !weddingSettings.wedding_date &&
    !weddingSettings.wedding_date_tbd &&
    !weddingSettings.wedding_region &&
    !weddingSettings.wedding_region_tbd;
  const weddingStyle = (weddingSettings.wedding_style ?? "general") as WeddingStyle;
  // Round 8 C — 비표준 페르소나에 페르소나 기반 greeting + quickQuestions. 백엔드는 이미
  // 페르소나 voice 로 응답하지만 진입 UI 가 wedding_style 만 보고 분기하면 카피가 어긋남.
  const personaMode = (weddingSettings.persona_mode ?? null) as WeddingPersonaMode | null;
  const isGroom = isGroomMode(weddingSettings.role, personaMode ?? "standard_bride");
  const quickQuestions = useMemo(
    () => {
      // 페르소나 우선 — 정의돼있으면 페르소나 quick questions 사용, 없으면 style.
      const personaList = personaMode ? PERSONA_QUICK_QUESTIONS[personaMode] : undefined;
      if (personaList && personaList.length > 0) {
        // 페르소나 1~2개 + 기본 베이스 chip 으로 채워 4-card grid 유지.
        return [...personaList, ...BASE_QUICK_QUESTIONS].slice(0, 4);
      }
      return buildQuickQuestions(weddingStyle);
    },
    [personaMode, weddingStyle],
  );
  // greeting: 페르소나 우선, fallback 스타일. 신랑이면 자막에 "(신랑님 관점)" 보조.
  const greeting = useMemo(() => {
    if (personaMode && personaMode !== "standard_bride") {
      const h = PERSONA_HEADER[personaMode];
      const subtitle = isGroom && personaMode !== "standard_groom"
        ? `${h.subtitle}\n(신랑님 관점에서 안내해드릴게요)`
        : h.subtitle;
      return { title: h.title, subtitle };
    }
    const styleG = STYLE_GREETING[weddingStyle] ?? STYLE_GREETING.general;
    if (isGroom) {
      return { title: styleG.title, subtitle: `${styleG.subtitle}\n(신랑님 관점에서 안내해드릴게요)` };
    }
    return styleG;
  }, [personaMode, isGroom, weddingStyle]);
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
    // Prompt-style cards (no modal) send the prepared text straight to chat.
    if (item.prompt) {
      sendMessage(item.prompt);
      return;
    }
    if (item.modal) setActiveModal(item.modal);
  };

  // 모달 핸들러: 모든 입력 필드를 결정형 핸들러로 직접 전달 (LLM 호출 X).
  // 채팅 표시는 사람이 읽기 좋은 라벨(regionLabel / budgetLabel)을 쓰고,
  // 핸들러에는 DB 검색에 안전한 값(region/budget)을 그대로 전달.
  const handleVenueSubmit = (data: Record<string, unknown>) => {
    setActiveModal(null);
    const userText = ` 웨딩홀 추천 요청\n${[
      data.regionLabel && `지역: ${data.regionLabel}`,
      data.guests && `하객수: ${data.guests}명`,
      data.budgetLabel && `예산: ${data.budgetLabel}`,
      Array.isArray(data.styles) && data.styles.length > 0 && `스타일: ${(data.styles as string[]).join(", ")}`,
    ].filter(Boolean).join(" · ")}`;
    sendStructured(userText, { kind: "venue", params: data as never });
  };

  const handleSdmeSubmit = (data: Record<string, unknown>) => {
    setActiveModal(null);
    const userText = ` 스드메 가이드 요청\n${[
      data.regionLabel && `지역: ${data.regionLabel}`,
      data.budgetLabel && `예산: ${data.budgetLabel}`,
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
    const userText = ` 예산 분배 요청\n${[
      data.totalBudget && `총 ${data.totalBudget}만원`,
      data.regionLabel && `(${data.regionLabel})`,
      Array.isArray(data.priorities) && data.priorities.length > 0 && `우선순위: ${(data.priorities as string[]).join(", ")}`,
    ].filter(Boolean).join(" ")}`;
    sendStructured(userText, { kind: "budget", params: data as never });
  };

  const hasConversation = messages.length > 0;
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const lastMessageIsAssistant = lastMessage?.role === "assistant";
  const showFollowUps = hasConversation && lastMessageIsAssistant && !isLoading;
  // 마지막 응답의 intent에 따라 컨텍스트 맞는 후속 칩. 매핑 없으면 기본 4개.
  const followUpChips = getFollowUpChips(lastMessage?.intent);

  const handleCategoryTabChange = useCategoryTabNavigation();

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative flex flex-col">
      <Seo title="AI 웨딩플래너 - 맞춤 결혼 준비 상담 | Dewy" description="AI가 예산·일정·취향에 맞춰 나만의 웨딩 플랜을 설계해드려요. 맞춤 웨딩홀 추천부터 예산 플래너, 준비 타임라인까지." path="/ai-planner" />
      {!user && <LoginRequiredOverlay message="AI가 나만의 맞춤 웨딩 플랜을 설계해드려요" features={["맞춤 웨딩홀 추천", "예산 플래너", "준비 타임라인"]} />}
      <HomeHeader />
      <CategoryTabBar activeTab="ai-planner" onTabChange={handleCategoryTabChange} />

      {/* 챗 컨트롤 — 일일 잔여 + 채팅 기록 + 기억 관리 + 채팅 삭제 */}
      {(!!user || dailyRemaining !== null || hasConversation) && (
        <div className="flex items-center justify-end gap-2 px-4 py-2 border-b border-border bg-card/60">
          {dailyRemaining !== null && (
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {dailyRemaining}회 남음
            </span>
          )}
          {!!user && (
            <button
              onClick={() => setSessionsSheetOpen(true)}
              className="p-1.5 text-muted-foreground hover:text-foreground active:scale-95 transition-all rounded-lg hover:bg-muted"
              title="채팅 기록"
              aria-label="채팅 기록"
            >
              <MessagesSquare className="w-4 h-4" />
            </button>
          )}
          {!!user && (
            <button
              onClick={() => setMemorySheetOpen(true)}
              className="p-1.5 text-muted-foreground hover:text-foreground active:scale-95 transition-all rounded-lg hover:bg-muted"
              title="듀이가 기억하는 정보"
              aria-label="듀이가 기억하는 정보"
            >
              <Brain className="w-4 h-4" />
            </button>
          )}
          {hasConversation && (
            <button
              onClick={() => {
                // 응답 수신 중 삭제하면 도착 중인 답변이 빈 화면에 붙는다 — 응답 중엔 무시.
                if (isLoading) return;
                // 영속화된 채팅이면 세션째 삭제(기록 포함), 미저장 대화면 화면만 초기화.
                if (
                  window.confirm(
                    "이 채팅을 삭제할까요? 메시지 기록까지 복구할 수 없어요.",
                  )
                ) {
                  if (activeSessionId) void deleteChat(activeSessionId);
                  else startNewChat();
                }
              }}
              className="p-1.5 text-muted-foreground hover:text-foreground active:scale-95 transition-all rounded-lg hover:bg-muted"
              title="채팅 삭제"
              aria-label="채팅 삭제"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Chat area */}
      <main ref={scrollAreaRef} className="flex-1 overflow-y-auto safe-ai-scroll px-4">
        <div className="space-y-4 py-4">
          {/* Welcome & Quick Questions - shown when no conversation */}
          {!hasConversation && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5 mt-2"
            >
              {/* Welcome card */}
              <div data-tutorial="ai-header" className="text-center py-6">
                <div className="mx-auto mb-4 flex items-center justify-center">
                  <DewyLogo size={56} />
                </div>
                <h2 className="text-lg font-bold text-foreground mb-1">{greeting.title}</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {greeting.subtitle}
                </p>
              </div>

              {needsWeddingSetup && (
                <button
                  onClick={() => weddingInfoPrompt.openManually()}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl border border-primary/30 bg-primary/8 active:scale-[0.98] transition-all text-left"
                >
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-foreground leading-tight">
                      결혼식 정보를 1분만 알려주세요
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                      날짜·지역만 입력해도 맞춤 추천이 정확해져요
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] font-bold text-primary">설정 →</span>
                </button>
              )}

              {/* Quick question cards */}
              <div data-tutorial="ai-suggestions" className="grid grid-cols-2 gap-2.5">
                {quickQuestions.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => handleQuickClick(q)}
                    className="relative text-left p-3.5 bg-card rounded-2xl border border-border shadow-sm hover:border-primary/40 hover:shadow-md active:scale-[0.97] transition-all group"
                  >
                    {q.emoji && <span className="text-2xl block mb-2">{q.emoji}</span>}
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
            <ChatBubble key={i} msg={msg} onFeedback={rateMessage} />
          ))}
          {isLoading && <TypingIndicator />}

          {/* L5 메모리 확인 칩 — 방금 추출된 기억을 사용자가 즉시 검증(✓ 유지 / ✕ 삭제) */}
          {recentMemories.length > 0 && lastMessageIsAssistant && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-1.5 pl-11"
            >
              {recentMemories.map((m) => (
                <div
                  key={m.id}
                  className="inline-flex items-center gap-1.5 max-w-full px-3 py-1.5 rounded-full border border-border bg-muted/60 text-xs text-muted-foreground"
                >
                  <Brain className="w-3 h-3 shrink-0 text-primary" />
                  <span className="truncate min-w-0">이렇게 기억할게요: “{m.fact_text}”</span>
                  <button
                    onClick={() => confirmRecentMemory(m.id)}
                    className="shrink-0 p-0.5 rounded-full hover:bg-primary/10 text-primary active:scale-90 transition-all"
                    title="맞아요"
                    aria-label={`기억 유지: ${m.fact_text}`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => rejectRecentMemory(m.id)}
                    className="shrink-0 p-0.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive active:scale-90 transition-all"
                    title="아니에요 (지우기)"
                    aria-label={`기억 삭제: ${m.fact_text}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </motion.div>
          )}

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
            className="absolute right-4 w-8 h-8 rounded-full bg-card border border-border shadow-md flex items-center justify-center z-30"
            style={{ bottom: "calc(var(--app-bottom-nav-total-height) + 96px)" }}
          >
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div
        data-tutorial="ai-input"
        className="fixed safe-ai-input-offset left-0 right-0 max-w-[430px] mx-auto z-40"
      >
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

      <MemoryManagerSheet open={memorySheetOpen} onOpenChange={setMemorySheetOpen} />

      <ChatSessionsSheet
        open={sessionsSheetOpen}
        onOpenChange={setSessionsSheetOpen}
        sessions={sessions}
        activeSessionId={activeSessionId}
        isPremium={isPremium}
        // 스트리밍 중 전환/삭제하면 도착 중인 답변이 다른 채팅 화면에 붙는다 — 응답 중엔 무시.
        onSelect={(id) => { if (!isLoading) void switchSession(id); }}
        onNewChat={() => { if (!isLoading) startNewChat(); }}
        onDelete={(id) => { if (!isLoading) void deleteChat(id); }}
      />

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />

      <WeddingInfoSetupModal
        isOpen={weddingInfoPrompt.open}
        onClose={weddingInfoPrompt.dismiss}
      />

      {/* AI 데이터 동의 — 챗봇 텍스트가 제3자 AI 로 전송되기 전 1회 동의 */}
      <DataCollectionConsentModal
        isOpen={consentOpen}
        onAgree={handleConsentAgree}
        onRefuse={handleConsentDecline}
      />

      <PageTutorial id="ai-planner" />
    </div>
  );
};

export default AIPlanner;
