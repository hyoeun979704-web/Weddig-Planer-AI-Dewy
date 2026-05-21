import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { supabase } from "@/integrations/supabase/client";
import { matchIntent } from "@/lib/chatbot/intentRouter";
import { runDbHandler } from "@/lib/chatbot/dbHandlers";
import { runGuideHandler } from "@/lib/chatbot/handlers/staticGuideHandlers";
import {
  handleVenueRecommendation,
  handleSdmeGuide,
  handleTimelinePlanning,
  handleBudgetPlanning,
  type VenueParams,
  type SdmeParams,
  type TimelineParams,
  type BudgetParams,
} from "@/lib/chatbot/handlers/quickQuestionHandlers";

export type StructuredHandler =
  | { kind: "venue"; params: VenueParams }
  | { kind: "sdme"; params: SdmeParams }
  | { kind: "timeline"; params: TimelineParams }
  | { kind: "budget"; params: BudgetParams };

/**
 * `intent` — 응답이 어떤 intent로 라우팅됐는지 (assistant 메시지에만 의미).
 * 후속 질문 칩을 동적으로 결정하는 데 사용 (followUpChips.getFollowUpChips).
 * LLM 폴백은 "llm", 매칭 안 된 비로그인 로그인 안내는 "login_required".
 */
export type Message = {
  role: "user" | "assistant";
  content: string;
  intent?: string | null;
};

const CHAT_URL = `${((import.meta as any).env?.VITE_SUPABASE_URL ?? "")}/functions/v1/ai-planner`;

export const useAIPlanner = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [dailyRemaining, setDailyRemaining] = useState<number | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { weddingSettings } = useWeddingSchedule();
  // 사용자 컨텍스트는 ai-planner edge function의 user-data.ts에서 직접
  // fetch하여 시스템 프롬프트에 주입한다 (결혼일·예산·진척률·관심 업체·
  // 장기 메모리). 클라이언트에서 다시 보내면 중복.

  const sendMessage = useCallback(async (input: string) => {
    const userMsg: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    // ── 1. 클라이언트 사이드 인텐트 게이트 ──────────────────
    // LLM 호출 전에 키워드 매칭으로 즉답 가능한지 먼저 확인.
    // 매칭되면 외부 API 호출 없이 응답 생성 → 일일 한도 차감 X, 비용 X.
    //
    // 게이트 응답이 즉답이면 거기서 종료, LLM 컨텍스트가 함께 오면
    // (B+C 하이브리드) 그 컨텍스트를 LLM 호출 시 시스템 정보로 주입.
    let llmContextInjection: string | null = null;
    try {
      const intent = matchIntent(input);
      if (intent) {
        // (a) 정적 응답 — 인사·도움말·가격 안내 등
        if (intent.staticReply) {
          setMessages(prev => [...prev, { role: "assistant", content: intent.staticReply!, intent: intent.intent }]);
          setIsLoading(false);
          return;
        }

        // (a') 정적 가이드 핸들러 — 시기·매너·계약 등 지식 응답
        // 일부는 places 통계로 동적 산출하므로 async
        if (intent.guideKey) {
          const reply = await runGuideHandler(intent.guideKey);
          setMessages(prev => [...prev, { role: "assistant", content: reply, intent: intent.intent }]);
          setIsLoading(false);
          return;
        }

        // (b) DB 조회 응답 — 디데이·예산·일정·찜 등 (로그인 필요)
        if (intent.dbHandler && user) {
          const result = await runDbHandler(
            intent.dbHandler,
            {
              userId: user.id,
              weddingStyle: weddingSettings.wedding_style,
              excludedCategories: weddingSettings.excluded_categories,
            },
            input,
            intent.args,
          );

          // 즉답 + LLM 컨텍스트 동시 → reply는 일단 안 보여주고 LLM이 정리
          if (result.llmContext) {
            llmContextInjection = result.llmContext;
            // LLM 호출 흐름으로 fallthrough
          } else if (result.reply) {
            // 즉답만 — 거기서 종료
            setMessages(prev => [...prev, { role: "assistant", content: result.reply!, intent: intent.intent }]);
            setIsLoading(false);
            return;
          }
        }
        // (c) DB 조회 필요한데 비로그인 — 로그인 안내
        else if (intent.dbHandler && !user) {
          setMessages(prev => [...prev, {
            role: "assistant",
            content: "이 정보는 로그인 후 확인할 수 있어요 \n[로그인 페이지](/auth)에서 가입·로그인 부탁드려요.",
            intent: "login_required",
          }]);
          setIsLoading(false);
          return;
        }
      }
    } catch (gateError) {
      // 게이트 실패는 무시하고 LLM fallback으로 진행
      console.warn("Intent gate error, falling back to LLM:", gateError);
    }

    // ── 2. LLM 호출 (Edge Function) ─────────────────────────
    let assistantSoFar = "";
    const upsertAssistant = (nextChunk: string) => {
      assistantSoFar += nextChunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar, intent: "llm" }];
      });
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || ((import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ?? "");

      // 사용자 컨텍스트는 ai-planner edge function이 user-data.ts로 직접
      // fetch해 시스템 프롬프트에 주입한다. 게이트가 핸들러에서 추출한
      // 추가 컨텍스트(B+C 하이브리드)만 LLM 호출 시 함께 보낸다.
      const messagesToSend: Message[] = [
        ...(llmContextInjection
          ? [{
              role: "user" as const,
              content: `[참고 컨텍스트 - 사용자 데이터에서 추출됨, 이 정보를 자연스럽게 활용해 답변해주세요]\n${llmContextInjection}`,
            }]
          : []),
        // 인라인 에러 안내 버블은 LLM 컨텍스트에서 제외 (대화 맥락 오염 방지).
        ...messages.filter(m => m.intent !== "error"),
        userMsg,
      ];

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ messages: messagesToSend }),
      });

      if (resp.status === 429) {
        // Check if it's daily limit
        try {
          const body = await resp.json();
          if (body.error === "daily_limit") {
            setShowUpgradeModal(true);
            setDailyRemaining(0);
            setMessages(prev => prev.filter(m => m !== userMsg));
            setIsLoading(false);
            return;
          }
        } catch {
          // fallback
        }
        toast({
          title: "요청 한도 초과",
          description: "잠시 후 다시 시도해주세요.",
          variant: "destructive",
        });
        setMessages(prev => prev.filter(m => m !== userMsg));
        setIsLoading(false);
        return;
      }

      if (resp.status === 402) {
        toast({
          title: "크레딧 부족",
          description: "서비스 이용을 위해 크레딧을 충전해주세요.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (!resp.ok || !resp.body) {
        throw new Error("스트림 시작에 실패했어요");
      }

      // Read remaining from header
      const remainingHeader = resp.headers.get("X-Daily-Remaining");
      if (remainingHeader !== null) {
        const remaining = parseInt(remainingHeader, 10);
        if (!isNaN(remaining) && remaining >= 0) {
          setDailyRemaining(remaining);
          if (remaining === 0) {
            toast({
              title: "마지막 무료 질문이에요",
              description: "프리미엄으로 업그레이드하면 무제한으로 이용할 수 있어요.",
            });
          }
        } else {
          setDailyRemaining(null); // premium user
        }
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            // Support both OpenAI and Gemini SSE formats
            const content = parsed.choices?.[0]?.delta?.content
              || parsed.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content
              || parsed.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
            if (content) upsertAssistant(content);
          } catch { /* ignore partial leftovers */ }
        }
      }
    } catch (error) {
      console.error("AI Planner error:", error);
      toast({
        title: "오류 발생",
        description: "메시지 전송에 실패했어요. 다시 시도해주세요.",
        variant: "destructive",
      });
      // 토스트는 곧 사라지므로, 사용자의 질문은 그대로 두고 인라인 에러
      // 버블을 남겨 무엇이 실패했는지·재시도 안내가 대화에 남도록 한다.
      // 스트리밍 중간에 끊겼다면 부분 답변 뒤에 안내만 덧붙인다.
      setMessages(prev => [...prev, {
        role: "assistant",
        content: assistantSoFar
          ? "\n\n⚠️ 답변이 중간에 끊겼어요. 다시 질문해 주시면 이어서 도와드릴게요."
          : "⚠️ 답변을 가져오지 못했어요. 잠시 후 다시 질문해 주세요.",
        intent: "error",
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, toast, user, weddingSettings.wedding_style, weddingSettings.excluded_categories]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  /**
   * 구조화된 입력 (모달 데이터)을 받아 LLM 호출 없이 즉답 처리.
   * 사용자 메시지는 채팅에 표시하되, 응답은 결정형 핸들러가 생성.
   */
  const sendStructured = useCallback(async (
    userMessageText: string,
    handler: StructuredHandler,
  ) => {
    const userMsg: Message = { role: "user", content: userMessageText };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      let reply: string;
      let intent: string;
      switch (handler.kind) {
        case "venue":
          reply = await handleVenueRecommendation(handler.params);
          intent = "venue_recommendation";
          break;
        case "sdme":
          reply = await handleSdmeGuide(handler.params);
          intent = "sdme_guide";
          break;
        case "timeline":
          reply = await handleTimelinePlanning(handler.params);
          intent = "timeline_planning";
          break;
        case "budget":
          reply = await handleBudgetPlanning(handler.params);
          intent = "budget_planning";
          break;
      }
      setMessages(prev => [...prev, { role: "assistant", content: reply, intent }]);
    } catch (e) {
      console.error("Structured handler error:", e);
      toast({
        title: "응답 생성 실패",
        description: "잠시 후 다시 시도해주세요.",
        variant: "destructive",
      });
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "⚠️ 답변을 만들지 못했어요. 잠시 후 다시 시도해 주세요.",
        intent: "error",
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    messages,
    isLoading,
    sendMessage,
    sendStructured,
    clearMessages,
    showUpgradeModal,
    setShowUpgradeModal,
    dailyRemaining,
  };
};
