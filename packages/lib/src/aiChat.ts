// AI 플래너 채팅 영속화 — 세션/메시지/만족도 데이터 접근 단일 소스.
// 한도 수치는 DB 트리거(supabase/migrations/20260612230000_ai_chat_sessions.sql)와
// 미러 — 변경 시 양쪽 동시 수정(서버가 강제, 클라는 UX 안내용).
import { supabase } from "@/integrations/supabase/client";

export const FREE_SESSION_LIMIT = 1;
export const PREMIUM_SESSION_LIMIT = 5;
export const FREE_MESSAGE_CAP = 100;
export const PREMIUM_MESSAGE_CAP = 500;
/** DB 트리거가 RAISE 하는 고정 식별자 — 한도 초과 분기용 */
export const SESSION_LIMIT_ERROR = "chat_session_limit";

/**
 * LLM 에 보내는 대화 컨텍스트 윈도우(메시지 수). 저장 용량(100/500)과 별개 —
 * 긴 이력을 통째로 보내면 토큰 비용이 매 턴 폭증하므로 최근 턴만 전달한다.
 */
export const LLM_CONTEXT_WINDOW = 12;

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageRow {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  intent: string | null;
  feedback: "up" | "down" | null;
  created_at: string;
}

// 새 테이블이 생성 타입(types.ts)에 아직 없어 cast — ai_usage_minute 등과 동일 관례.
// deno-lint 무관 — 클라 전용 파일.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const sessionLimitFor = (isPremium: boolean): number =>
  isPremium ? PREMIUM_SESSION_LIMIT : FREE_SESSION_LIMIT;

export const messageCapFor = (isPremium: boolean): number =>
  isPremium ? PREMIUM_MESSAGE_CAP : FREE_MESSAGE_CAP;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isSessionLimitError = (e: any): boolean =>
  typeof e?.message === "string" && e.message.includes(SESSION_LIMIT_ERROR);

/** 세션 제목 — 첫 사용자 메시지에서 유도(공백 정리 + 30자 컷). */
export const deriveSessionTitle = (firstMessage: string): string => {
  const collapsed = firstMessage.replace(/\s+/g, " ").trim();
  if (!collapsed) return "새 채팅";
  return collapsed.length > 30 ? `${collapsed.slice(0, 30)}…` : collapsed;
};

/**
 * LLM 호출용 컨텍스트 윈도우 — 최근 N개만(시스템 컨텍스트는 edge function 이
 * 별도 주입하므로 대화 턴만 자른다).
 */
export const windowForLLM = <T>(history: T[], windowSize: number = LLM_CONTEXT_WINDOW): T[] =>
  history.length > windowSize ? history.slice(-windowSize) : history;

export async function fetchSessions(userId: string): Promise<ChatSession[]> {
  const { data, error } = await db
    .from("ai_chat_sessions")
    .select("id, title, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** 한도 초과 시 DB 트리거가 거부(SESSION_LIMIT_ERROR) — isSessionLimitError 로 분기. */
export async function createSession(userId: string, title: string): Promise<ChatSession> {
  const { data, error } = await db
    .from("ai_chat_sessions")
    .insert({ user_id: userId, title })
    .select("id, title, created_at, updated_at")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSession(userId: string, sessionId: string): Promise<void> {
  const { error } = await db
    .from("ai_chat_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function updateSessionTitle(userId: string, sessionId: string, title: string): Promise<void> {
  const { error } = await db
    .from("ai_chat_sessions")
    .update({ title })
    .eq("id", sessionId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function fetchSessionMessages(userId: string, sessionId: string): Promise<ChatMessageRow[]> {
  const { data, error } = await db
    .from("ai_chat_messages")
    .select("id, session_id, role, content, intent, feedback, created_at")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function insertChatMessage(
  userId: string,
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  intent?: string | null,
): Promise<string> {
  const { data, error } = await db
    .from("ai_chat_messages")
    .insert({ user_id: userId, session_id: sessionId, role, content, intent: intent ?? null })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/** 한도(429) 등으로 전송이 취소된 사용자 메시지의 고아 행 정리용. */
export async function deleteChatMessage(userId: string, messageId: string): Promise<void> {
  const { error } = await db
    .from("ai_chat_messages")
    .delete()
    .eq("id", messageId)
    .eq("user_id", userId);
  if (error) throw error;
}

/** 응답 만족도(👍/👎) — null 이면 평가 철회. 본인 행만(RLS). */
export async function setMessageFeedback(
  userId: string,
  messageId: string,
  feedback: "up" | "down" | null,
): Promise<void> {
  const { error } = await db
    .from("ai_chat_messages")
    .update({ feedback })
    .eq("id", messageId)
    .eq("user_id", userId);
  if (error) throw error;
}
