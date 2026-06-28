import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { deleteMemoryRow, fetchMemories, type AIMemory } from "@/lib/aiMemory";

export const AI_MEMORIES_QUERY_KEY = ["ai-memories"] as const;

/**
 * 듀이가 기억하는 사실(user_ai_memory) 조회·삭제 — 메모리 관리 시트의 단일 소스.
 * 삭제는 낙관적 갱신 없이 invalidate(목록이 짧고 정확성이 우선).
 */
export const useAIMemories = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery<AIMemory[]>({
    queryKey: [...AI_MEMORIES_QUERY_KEY, user?.id],
    queryFn: () => fetchMemories(user!.id),
    enabled: !!user,
    staleTime: 30_000,
  });

  const removeMutation = useMutation({
    mutationFn: (memoryId: string) => deleteMemoryRow(user!.id, memoryId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: AI_MEMORIES_QUERY_KEY });
    },
  });

  return {
    memories: query.data ?? [],
    isLoading: query.isLoading,
    remove: removeMutation.mutateAsync,
    isRemoving: removeMutation.isPending,
  };
};
