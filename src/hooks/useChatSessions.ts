import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  createSession,
  deleteSession,
  fetchSessions,
  type ChatSession,
} from "@/lib/aiChat";

export const CHAT_SESSIONS_QUERY_KEY = ["ai-chat-sessions"] as const;

/**
 * AI 플래너 채팅 세션(채팅창) 목록 — 무료 1개 / 프리미엄 5개.
 * 개수 강제는 DB 트리거가 하고, 여기서는 목록·생성·삭제만 담당한다.
 */
export const useChatSessions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery<ChatSession[]>({
    queryKey: [...CHAT_SESSIONS_QUERY_KEY, user?.id],
    queryFn: () => fetchSessions(user!.id),
    enabled: !!user,
    staleTime: 10_000,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: CHAT_SESSIONS_QUERY_KEY });

  const createMutation = useMutation({
    mutationFn: (title: string) => createSession(user!.id, title),
    onSuccess: () => void invalidate(),
  });

  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) => deleteSession(user!.id, sessionId),
    onSuccess: () => void invalidate(),
  });

  return {
    sessions: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    create: createMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isMutating: createMutation.isPending || deleteMutation.isPending,
  };
};
