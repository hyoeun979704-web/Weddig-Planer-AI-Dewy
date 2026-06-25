import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Send, Headset } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import ChatBubble from "@/components/wedding-planner/ChatBubble";
import { createInquiry } from "@/features/consumer/data/supportChat";
import { useAuth } from "@/contexts/AuthContext";
import {
  answerSupportQuery,
  buildEscalationContent,
  deriveEscalationTitle,
} from "@/lib/cx/supportBot";

type Msg = { role: "user" | "assistant"; content: string };

const INTRO: Msg = {
  role: "assistant",
  content:
    "안녕하세요, 듀이 고객센터예요 🎧\n\n어떤 점이 불편하셨나요? 아래 버튼을 누르거나 직접 입력해 주세요. 제가 해결하지 못하면 **담당자에게 바로 연결**해 드릴게요.",
};

const QUICK_CHIPS = [
  "앱에서 오류가 발생했어요",
  "결제가 제대로 안 됐어요",
  "로그인이 안 돼요",
  "환불은 어떻게 하나요?",
];

const ESCALATED_REPLY =
  "담당자에게 전달했어요 🙏\n\n확인 후 **[내 문의 내역](/my-inquiries)** 으로 답변드릴게요. 보통 영업일 기준 1일 이내에 답변드려요.";

/**
 * CX 고객센터 챗봇 — 문제 발생 시 1차 자동 응대(룰 기반, LLM 미사용·0환각),
 * 해결 안 되면 담당자 연결(불편문의 자동 접수 + 토스트, 전화번호 미노출).
 * 오류 화면(ErrorBoundary)·문의 메뉴에서 ?context= 로 발생 맥락을 받는다.
 */
const SupportChat = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const context = searchParams.get("context");

  const [messages, setMessages] = useState<Msg[]>(() =>
    context
      ? [
          INTRO,
          {
            role: "assistant",
            content:
              "방금 오류가 발생했던 것 같아요. 우선 **새로고침**(앱이면 재실행) 후 다시 시도해 보시고, 같은 문제가 반복되면 아래 \"해결 안 됐어요\"를 눌러주세요.",
          },
        ]
      : [INTRO],
  );
  const [input, setInput] = useState("");
  // 마지막 봇 답변 뒤에만 해결 여부 칩 노출. 에스컬레이션 후에는 숨김(중복 접수 방지).
  const [showResolveChips, setShowResolveChips] = useState(!!context);
  const [escalated, setEscalated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showResolveChips]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: Msg = { role: "user", content: trimmed };
    const answer = answerSupportQuery(trimmed);
    setMessages(prev => [
      ...prev,
      userMsg,
      answer
        ? { role: "assistant", content: answer.text }
        : {
            role: "assistant",
            content:
              "이 문제는 제가 바로 해결해 드리기 어렵네요 😢\n\n아래 \"해결 안 됐어요\"를 눌러주시면 **담당자에게 바로 연결**해 드릴게요.",
          },
    ]);
    setShowResolveChips(true);
    setInput("");
  };

  /** 담당자 연결 — 불편문의 자동 접수 + 토스트(전화번호 노출 없음). */
  const escalate = async () => {
    if (!user) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "담당자 연결(문의 접수)은 로그인 후 가능해요.\n[로그인 페이지](/auth)에서 로그인해 주세요.",
      }]);
      setShowResolveChips(false);
      return;
    }
    setSubmitting(true);
    try {
      await createInquiry({
        userId: user.id,
        category: "complaint",
        title: deriveEscalationTitle(messages),
        content: buildEscalationContent(messages, context),
      });
      toast.success("담당자에게 연결했어요", {
        description: "확인 후 '내 문의 내역'으로 답변드릴게요 (보통 영업일 1일 이내)",
      });
      setMessages(prev => [...prev, { role: "assistant", content: ESCALATED_REPLY }]);
      setEscalated(true);
      setShowResolveChips(false);
    } catch (e) {
      console.error("CX escalation failed:", e);
      toast.error("접수에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const resolve = () => {
    setMessages(prev => [...prev, {
      role: "assistant",
      content: "다행이에요! 🌿 또 불편한 점이 생기면 언제든 다시 찾아주세요.",
    }]);
    setShowResolveChips(false);
  };

  const hasUserMessage = messages.some((m) => m.role === "user") || !!context;

  return (
    <div className="min-h-screen bg-background app-col mx-auto relative flex flex-col">
      <PageHeader title="고객센터" />

      <main className="flex-1 overflow-y-auto px-4 pb-36">
        <div className="space-y-4 py-4">
          {messages.map((msg, i) => (
            <ChatBubble key={i} msg={msg} />
          ))}

          {/* 해결 여부 — 미해결이면 담당자 연결(에스컬레이션) */}
          {showResolveChips && hasUserMessage && !escalated && (
            <div className="flex flex-wrap gap-2 pl-11">
              <button
                onClick={resolve}
                className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary bg-primary/5 active:scale-95 transition-all"
              >
                ✅ 해결됐어요
              </button>
              <button
                onClick={escalate}
                disabled={submitting}
                className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted text-foreground active:scale-95 transition-all disabled:opacity-50 inline-flex items-center gap-1"
              >
                <Headset className="w-3 h-3" />
                {submitting ? "연결 중..." : "해결 안 됐어요 — 담당자 연결"}
              </button>
            </div>
          )}

          {/* 첫 진입 빠른 선택 칩 */}
          {!hasUserMessage && (
            <div className="flex flex-wrap gap-2 pl-11">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => send(chip)}
                  className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary bg-primary/5 active:scale-95 transition-all"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          <div ref={endRef} />
        </div>
      </main>

      {/* 입력창 */}
      <div className="fixed bottom-[calc(var(--app-bottom-nav-total-height,64px))] left-0 right-0 app-col mx-auto z-40 bg-card/95 backdrop-blur-md border-t border-border p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="불편한 점을 알려주세요..."
            rows={1}
            className="flex-1 bg-muted border-none outline-none rounded-xl px-4 py-2.5 text-sm placeholder:text-muted-foreground resize-none max-h-24 leading-relaxed"
            style={{ height: "auto", minHeight: "40px" }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim()}
            className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center transition-all disabled:opacity-30 active:scale-90 flex-shrink-0"
            aria-label="보내기"
          >
            <Send className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      </div>

      <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default SupportChat;
