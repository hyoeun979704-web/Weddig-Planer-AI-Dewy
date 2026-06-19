import { useState, useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { supabase } from "@/integrations/supabase/client";
import { logClientError } from "@/lib/errorLog";
import { deleteMemoryRow, fetchMemoriesSince, type AIMemory } from "@/lib/aiMemory";
import { AI_MEMORIES_QUERY_KEY } from "@/hooks/useAIMemories";
import { useChatSessions } from "@/hooks/useChatSessions";
import {
  deleteChatMessage,
  deleteSession as deleteSessionRow,
  deriveSessionTitle,
  fetchSessionMessages,
  fetchSessions,
  insertChatMessage,
  isSessionLimitError,
  createSession as createSessionRow,
  setMessageFeedback,
  windowForLLM,
} from "@/lib/aiChat";
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
  /** 영속화된 메시지의 DB 행 id — 만족도(👍/👎) 기록에 필요. 미영속이면 없음. */
  id?: string | null;
  /** 응답 만족도 — assistant 메시지에만 의미 */
  feedback?: "up" | "down" | null;
};

const CHAT_URL = `${((import.meta as any).env?.VITE_SUPABASE_URL ?? "")}/functions/v1/ai-planner`;

/** ensureSession 결과 — created 는 이 전송에서 새로 만든 세션인지(전송 취소 시 정리용). */
interface EnsuredSession {
  id: string | null;
  created: boolean;
}

// L5 확인 칩 — 서버 메모리 추출(fire-and-forget)이 끝나길 기다리는 지연과,
// 클라/DB 시계 오차(skew)를 흡수하는 조회 버퍼.
const MEMORY_CHIP_FETCH_DELAY_MS = 1_500;
const MEMORY_CLOCK_SKEW_MS = 15_000;

// 즉답(비 LLM) 연출 — LLM 응답처럼 "생각" 지연 + 점진 출력. 라우터 즉답이
// 0.1초 만에 통째로 떠서 기계적으로 보이는 것을 막는다(제품 결정 260612).
const FAKE_THINK_MIN_MS = 600;
const FAKE_THINK_JITTER_MS = 700;
const FAKE_STREAM_MIN_MS = 700;
const FAKE_STREAM_MAX_MS = 2_300;
const FAKE_STREAM_MS_PER_CHAR = 7;
const FAKE_STREAM_CHUNK_CHARS = 9;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const useAIPlanner = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [dailyRemaining, setDailyRemaining] = useState<number | null>(null);
  // L5 메모리 검증 — 방금 응답에서 자동 추출된 사실을 "이렇게 기억할게요" 칩으로
  // 보여주고 사용자가 즉시 정정(삭제)할 수 있게 한다(환각 누적 차단).
  const [recentMemories, setRecentMemories] = useState<AIMemory[]>([]);
  // skew 버퍼 때문에 직전 턴의 사실이 다시 잡힐 수 있어, 이미 보여준 id 는 제외.
  const shownMemoryIdsRef = useRef<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { weddingSettings } = useWeddingSchedule();
  // 채팅 영속화 — 세션(채팅창) 목록 + 활성 세션. 개수 한도(무료 1/프리미엄 5)는
  // DB 트리거가 강제하고, 세션은 첫 메시지 전송 시 게으르게 생성한다(빈 세션 방지).
  const chatSessions = useChatSessions();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  activeSessionIdRef.current = activeSessionId;

  /** 메시지 영속화 — 실패해도 대화는 계속(베스트에포트, 행 id 반환). */
  const persistMessage = useCallback(async (
    sessionId: string,
    role: "user" | "assistant",
    content: string,
    intent?: string | null,
  ): Promise<string | null> => {
    if (!user) return null;
    try {
      return await insertChatMessage(user.id, sessionId, role, content, intent);
    } catch (e) {
      console.warn("chat persist failed:", e);
      return null;
    }
  }, [user]);

  /**
   * 활성 세션 보장 — 없으면 첫 메시지로 제목을 지어 생성. 한도 초과(다른 기기에서
   * 이미 꽉 채운 경우 등)면 가장 최근 세션에 이어 쓴다(대화는 끊지 않음).
   * `created` 는 이 전송에서 새로 만든 세션인지 — 전송 취소(429) 시 빈 세션 정리에 쓴다.
   */
  const ensureSession = useCallback(async (firstMessageText: string): Promise<EnsuredSession> => {
    if (activeSessionIdRef.current) return { id: activeSessionIdRef.current, created: false };
    if (!user) return { id: null, created: false };
    try {
      const s = await createSessionRow(user.id, deriveSessionTitle(firstMessageText));
      setActiveSessionId(s.id);
      void chatSessions.refetch();
      return { id: s.id, created: true };
    } catch (e) {
      if (isSessionLimitError(e)) {
        try {
          const list = await fetchSessions(user.id);
          if (list.length > 0) {
            setActiveSessionId(list[0].id);
            void chatSessions.refetch();
            return { id: list[0].id, created: false };
          }
        } catch { /* 아래 공통 처리 */ }
      }
      console.warn("chat session ensure failed:", e);
      return { id: null, created: false }; // 영속화 없이 대화 진행
    }
  }, [user, chatSessions]);

  /**
   * 즉답(비 LLM)을 LLM 응답처럼 연출해서 내보내는 단일 헬퍼 —
   * sendMessage 즉답·sendStructured 가 공유한다(중복 차단).
   *  - "생각하는" 지연(타이핑 인디케이터 노출) 후 점진 출력(fake streaming):
   *    즉답이 키워드 라우팅임을 사용자가 눈치채지 않게 하는 연출. 이 지연이
   *    DB 영속화(세션 체인 → 행 id 부착) 시간도 자연스럽게 가려준다.
   *  - 영속화는 연출과 병렬(베스트에포트) — 완료되면 행 id 를 붙여 만족도
   *    (👍/👎) 버튼이 나타난다.
   */
  const appendAndPersistReply = useCallback(async (
    sessionEnsure: Promise<EnsuredSession>,
    userPersist: Promise<string | null>,
    content: string,
    intentKey: string | null,
  ): Promise<void> => {
    // 영속화는 연출과 동시에 시작(렌더와 무관하게 진행).
    const persistPromise: Promise<string | null> = (async () => {
      const { id: sid } = await sessionEnsure;
      if (!sid) return null;
      await userPersist; // user → assistant 기록 순서 보존
      return persistMessage(sid, "assistant", content, intentKey);
    })();

    // ① "생각" 지연 — 호출부가 isLoading 을 유지하는 동안 TypingIndicator 가 보인다.
    await sleep(FAKE_THINK_MIN_MS + Math.random() * FAKE_THINK_JITTER_MS);

    // ② 점진 출력 — 길이에 비례하되 상한으로 답답함 방지.
    setMessages(prev => [...prev, { role: "assistant", content: "", intent: intentKey, id: null, feedback: null }]);
    const totalMs = Math.min(FAKE_STREAM_MAX_MS, Math.max(FAKE_STREAM_MIN_MS, content.length * FAKE_STREAM_MS_PER_CHAR));
    const steps = Math.max(1, Math.ceil(content.length / FAKE_STREAM_CHUNK_CHARS));
    const stepMs = totalMs / steps;
    for (let i = 1; i <= steps; i++) {
      const partial = content.slice(0, Math.min(content.length, i * FAKE_STREAM_CHUNK_CHARS));
      setMessages(prev => {
        const lastIdx = prev.length - 1;
        const last = prev[lastIdx];
        if (last?.role !== "assistant" || last.id) return prev;
        return prev.map((m, j) => (j === lastIdx ? { ...m, content: partial } : m));
      });
      if (i < steps) await sleep(stepMs);
    }

    // ③ 영속 행 id 부착 — 출력 완료 후 전체 내용으로 매칭(부분 내용 매칭 미스 방지).
    void persistPromise.then((rowId) => {
      if (!rowId) return;
      setMessages(prev => {
        for (let i = prev.length - 1; i >= 0; i--) {
          const m = prev[i];
          if (m.role === "assistant" && !m.id && m.content === content) {
            return prev.map((x, j) => (j === i ? { ...x, id: rowId } : x));
          }
        }
        return prev;
      });
    });
  }, [persistMessage]);

  /** 이전 채팅 열기 — 저장된 메시지를 불러와 이어서 대화. */
  const switchSession = useCallback(async (sessionId: string) => {
    if (!user) return;
    try {
      const rows = await fetchSessionMessages(user.id, sessionId);
      setMessages(rows.map((r) => ({
        role: r.role,
        content: r.content,
        intent: r.intent,
        id: r.id,
        feedback: r.feedback,
      })));
      setActiveSessionId(sessionId);
      setRecentMemories([]);
    } catch (e) {
      console.warn("chat session load failed:", e);
      toast({
        title: "채팅을 불러오지 못했어요",
        description: "잠시 후 다시 시도해 주세요.",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  /** 새 채팅 시작 — 화면만 비우고 세션은 첫 전송 때 생성. */
  const startNewChat = useCallback(() => {
    setMessages([]);
    setActiveSessionId(null);
    setRecentMemories([]);
  }, []);

  /** 채팅(세션) 삭제 — 활성 채팅이면 빈 화면으로. */
  const deleteChat = useCallback(async (sessionId: string) => {
    try {
      await chatSessions.remove(sessionId);
      if (activeSessionIdRef.current === sessionId) startNewChat();
    } catch {
      toast({
        title: "채팅을 삭제하지 못했어요",
        description: "잠시 후 다시 시도해 주세요.",
        variant: "destructive",
      });
    }
  }, [chatSessions, startNewChat, toast]);

  // 첫 진입 시 가장 최근 채팅을 자동으로 이어서 연다(기록 연속성).
  // 이후 startNewChat 선택을 덮어쓰지 않도록 마운트당 1회만.
  const didAutoLoadRef = useRef(false);
  useEffect(() => {
    if (didAutoLoadRef.current || !user || chatSessions.isLoading) return;
    didAutoLoadRef.current = true;
    const latest = chatSessions.sessions[0];
    if (latest) void switchSession(latest.id);
  }, [user, chatSessions.isLoading, chatSessions.sessions, switchSession]);

  /** 응답 만족도(👍/👎) — 같은 평가 다시 누르면 철회. 낙관적 갱신 + 실패 롤백. */
  const rateMessage = useCallback(async (messageId: string, rating: "up" | "down") => {
    if (!user) return;
    let previous: "up" | "down" | null = null;
    let next: "up" | "down" | null = rating;
    setMessages(prev => prev.map((m) => {
      if (m.id !== messageId) return m;
      previous = m.feedback ?? null;
      next = previous === rating ? null : rating;
      return { ...m, feedback: next };
    }));
    try {
      await setMessageFeedback(user.id, messageId, next);
    } catch {
      setMessages(prev => prev.map((m) => (m.id === messageId ? { ...m, feedback: previous } : m)));
      toast({
        title: "평가를 저장하지 못했어요",
        description: "잠시 후 다시 시도해 주세요.",
        variant: "destructive",
      });
    }
  }, [user, toast]);
  // 사용자 컨텍스트는 ai-planner edge function의 user-data.ts에서 직접
  // fetch하여 시스템 프롬프트에 주입한다 (결혼일·예산·진척률·관심 업체·
  // 장기 메모리). 클라이언트에서 다시 보내면 중복.

  const sendMessage = useCallback(async (input: string) => {
    const userMsg: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setRecentMemories([]);

    // ── 0. 채팅 영속화 — 세션 보장(첫 메시지면 생성) + 사용자 메시지 기록.
    // 전부 백그라운드 프로미스 체인(베스트에포트): 즉답 경로(50~200ms)가
    // DB 왕복을 기다리지 않는다. 기록 순서는 체인이 보장(세션 → user → assistant).
    const sessionEnsure: Promise<EnsuredSession> = user
      ? ensureSession(input)
      : Promise.resolve({ id: null, created: false });
    const userPersist: Promise<string | null> = sessionEnsure.then(({ id }) =>
      id ? persistMessage(id, "user", input) : null,
    );

    // 즉답(비 LLM) 응답 — LLM 연출(생각 지연+점진 출력) + 백그라운드 기록(공용 헬퍼).
    const appendInstantReply = (content: string, intentKey: string | null) =>
      appendAndPersistReply(sessionEnsure, userPersist, content, intentKey);

    // 한도(429) 등으로 전송이 취소되면 방금 기록한 사용자 메시지와, 이 전송에서
    // 막 만들어진 빈 세션까지 정리(무료 1슬롯이 답 없는 빈 채팅에 점유되는 것 방지).
    const rollbackUserPersist = () => {
      void (async () => {
        try {
          const id = await userPersist;
          if (id && user) await deleteChatMessage(user.id, id);
          const { id: sid, created } = await sessionEnsure;
          if (created && sid && user) {
            await deleteSessionRow(user.id, sid);
            setActiveSessionId(null);
            void chatSessions.refetch();
          }
        } catch { /* best-effort */ }
      })();
    };

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
          await appendInstantReply(intent.staticReply, intent.intent ?? null);
          setIsLoading(false);
          return;
        }

        // (a') 정적 가이드 핸들러 — 시기·매너·계약 등 지식 응답
        // 일부는 places 통계로 동적 산출하므로 async
        if (intent.guideKey) {
          const reply = await runGuideHandler(intent.guideKey);
          await appendInstantReply(reply, intent.intent ?? null);
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
            await appendInstantReply(result.reply, intent.intent ?? null);
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
      const authToken = session?.access_token;
      if (!authToken) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "AI 플래너는 로그인 후 이용할 수 있어요.\n[로그인 페이지](/auth)에서 가입·로그인 부탁드려요.",
          intent: "login_required",
        }]);
        return;
      }

      // 사용자 컨텍스트는 ai-planner edge function이 user-data.ts로 직접
      // fetch해 시스템 프롬프트에 주입한다. 게이트가 핸들러에서 추출한
      // 추가 컨텍스트(B+C 하이브리드)만 LLM 호출 시 함께 보낸다.
      // 인라인 에러 버블 제외(맥락 오염 방지) + 최근 N턴 윈도우(영속 이력이 길어도
      // 토큰 비용이 매 턴 폭증하지 않게). DB 행 id 등 부가 필드는 전송에서 제거.
      const history = windowForLLM(messages.filter(m => m.intent !== "error"));
      const messagesToSend: Message[] = [
        ...(llmContextInjection
          ? [{
              role: "user" as const,
              content: `[참고 컨텍스트 - 사용자 데이터에서 추출됨, 이 정보를 자연스럽게 활용해 답변해주세요]\n${llmContextInjection}`,
            }]
          : []),
        ...history,
        userMsg,
      ].map((m) => ({ role: m.role, content: m.content }));

      // 확인 칩 조회 기준 시각 — 서버 추출 행의 created_at(DB 시계)과 비교하므로
      // skew 버퍼를 빼서 놓침을 줄인다(직전 턴 중복은 shownMemoryIdsRef 가 거름).
      const memorySince = new Date(Date.now() - MEMORY_CLOCK_SKEW_MS).toISOString();

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ messages: messagesToSend }),
      });

      if (resp.status === 429) {
        // 전송 취소 — 화면과 함께 영속 행도 정리(고아 사용자 메시지 방지).
        rollbackUserPersist();
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

      if (resp.status === 401) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "로그인 세션이 만료되었어요.\n다시 로그인한 뒤 이용해 주세요.",
          intent: "login_required",
        }]);
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

      // 영속화 — 완주한 응답만 저장(중간 끊김 부분답변은 미저장, catch 경로로 감).
      // 행 id 를 마지막 assistant 메시지에 붙여 만족도 평가를 가능하게 한다.
      // (세션 목록 refetch 는 안 함 — 목록은 시트를 열 때 staleTime 기준으로 갱신)
      if (assistantSoFar) {
        const { id: sid } = await sessionEnsure;
        if (sid) {
          await userPersist;
          const rowId = await persistMessage(sid, "assistant", assistantSoFar, "llm");
          if (rowId) {
            setMessages(prev => {
              const lastIdx = prev.length - 1;
              const last = prev[lastIdx];
              if (last?.role === "assistant" && last.content === assistantSoFar) {
                return prev.map((m, i) => (i === lastIdx ? { ...m, id: rowId, feedback: null } : m));
              }
              return prev;
            });
          }
        }
      }

      // L5 확인 칩 — 추출은 서버에서 fire-and-forget 으로 돌고 있으므로 잠깐
      // 기다렸다가 이번 턴에 새로 저장된 사실을 가져온다(best-effort, 실패 무시).
      if (assistantSoFar && user) {
        const uid = user.id;
        window.setTimeout(() => {
          fetchMemoriesSince(uid, memorySince)
            .then((rows) => {
              const fresh = rows.filter((m) => !shownMemoryIdsRef.current.has(m.id));
              if (fresh.length === 0) return;
              for (const m of fresh) shownMemoryIdsRef.current.add(m.id);
              setRecentMemories(fresh);
              void queryClient.invalidateQueries({ queryKey: AI_MEMORIES_QUERY_KEY });
            })
            .catch(() => { /* 칩은 부가 기능 — 조회 실패가 대화를 방해하면 안 됨 */ });
        }, MEMORY_CHIP_FETCH_DELAY_MS);
      }
    } catch (error) {
      console.error("AI Planner error:", error);
      void logClientError({ message: `AI Planner error: ${(error as Error)?.message ?? String(error)}`, source: "ai-planner" });
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
          ? "\n\n답변이 중간에 끊겼어요. 다시 질문해 주시면 이어서 도와드릴게요."
          : "답변을 가져오지 못했어요. 잠시 후 다시 질문해 주세요.",
        intent: "error",
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, toast, user, queryClient, ensureSession, persistMessage, appendAndPersistReply, chatSessions, weddingSettings.wedding_style, weddingSettings.excluded_categories]);

  /** 확인 칩 "맞아요" — 칩만 닫는다(이미 저장돼 있으므로 추가 동작 없음). */
  const confirmRecentMemory = useCallback((id: string) => {
    setRecentMemories(prev => prev.filter(m => m.id !== id));
  }, []);

  /** 확인 칩 "아니에요" — 잘못 추출된 기억을 즉시 삭제(다음 대화 오염 차단). */
  const rejectRecentMemory = useCallback(async (id: string) => {
    if (!user) return;
    try {
      await deleteMemoryRow(user.id, id);
      setRecentMemories(prev => prev.filter(m => m.id !== id));
      void queryClient.invalidateQueries({ queryKey: AI_MEMORIES_QUERY_KEY });
    } catch {
      toast({
        title: "기억을 지우지 못했어요",
        description: "잠시 후 다시 시도해 주세요.",
        variant: "destructive",
      });
    }
  }, [user, queryClient, toast]);

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
    setRecentMemories([]);

    // 구조화 입력도 채팅 기록에 영속 — 백그라운드 체인(베스트에포트), 렌더 비차단.
    const sessionEnsure: Promise<EnsuredSession> = user
      ? ensureSession(userMessageText)
      : Promise.resolve({ id: null, created: false });
    const userPersist: Promise<string | null> = sessionEnsure.then(({ id }) =>
      id ? persistMessage(id, "user", userMessageText) : null,
    );

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
      // LLM 연출 + 백그라운드 기록(sendMessage 즉답과 동일 헬퍼).
      await appendAndPersistReply(sessionEnsure, userPersist, reply, intent);
    } catch (e) {
      console.error("Structured handler error:", e);
      toast({
        title: "응답 생성 실패",
        description: "잠시 후 다시 시도해주세요.",
        variant: "destructive",
      });
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "답변을 만들지 못했어요. 잠시 후 다시 시도해 주세요.",
        intent: "error",
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [toast, user, ensureSession, persistMessage, appendAndPersistReply]);

  return {
    messages,
    isLoading,
    sendMessage,
    sendStructured,
    showUpgradeModal,
    setShowUpgradeModal,
    dailyRemaining,
    recentMemories,
    confirmRecentMemory,
    rejectRecentMemory,
    // 채팅 영속화 — 세션 목록/전환/삭제 + 만족도
    sessions: chatSessions.sessions,
    sessionsLoading: chatSessions.isLoading,
    activeSessionId,
    switchSession,
    startNewChat,
    deleteChat,
    rateMessage,
  };
};
