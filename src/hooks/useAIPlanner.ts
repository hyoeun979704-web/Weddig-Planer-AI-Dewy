import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { matchIntent } from "@/lib/chatbot/intentRouter";
import { runDbHandler } from "@/lib/chatbot/dbHandlers";

type Message = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${((import.meta as any).env?.VITE_SUPABASE_URL ?? "")}/functions/v1/ai-planner`;

export const useAIPlanner = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [dailyRemaining, setDailyRemaining] = useState<number | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

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
          setMessages(prev => [...prev, { role: "assistant", content: intent.staticReply! }]);
          setIsLoading(false);
          return;
        }

        // (b) DB 조회 응답 — 디데이·예산·일정·찜 등 (로그인 필요)
        if (intent.dbHandler && user) {
          const result = await runDbHandler(
            intent.dbHandler,
            { userId: user.id },
            input,
            intent.args,
          );

          // 즉답 + LLM 컨텍스트 동시 → reply는 일단 안 보여주고 LLM이 정리
          if (result.llmContext) {
            llmContextInjection = result.llmContext;
            // LLM 호출 흐름으로 fallthrough
          } else if (result.reply) {
            // 즉답만 — 거기서 종료
            setMessages(prev => [...prev, { role: "assistant", content: result.reply! }]);
            setIsLoading(false);
            return;
          }
        }
        // (c) DB 조회 필요한데 비로그인 — 로그인 안내
        else if (intent.dbHandler && !user) {
          setMessages(prev => [...prev, {
            role: "assistant",
            content: "이 정보는 로그인 후 확인할 수 있어요 🌿\n[로그인 페이지](/auth)에서 가입·로그인 부탁드려요.",
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
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || ((import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ?? "");

      // 게이트가 추출한 컨텍스트(B+C 하이브리드)가 있다면 시스템 메시지로 주입.
      // LLM이 이 정보를 활용해 자연어로 정리한 답변을 만든다.
      const messagesToSend: Message[] = llmContextInjection
        ? [
            {
              role: "user",
              content: `[참고 컨텍스트 - 사용자 데이터에서 추출됨, 이 정보를 자연스럽게 활용해 답변해주세요]\n${llmContextInjection}`,
            },
            ...messages,
            userMsg,
          ]
        : [...messages, userMsg];

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
      setMessages(prev => prev.filter(m => m !== userMsg));
    } finally {
      setIsLoading(false);
    }
  }, [messages, toast, user]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isLoading, sendMessage, clearMessages, showUpgradeModal, setShowUpgradeModal, dailyRemaining };
};
