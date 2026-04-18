import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import type { AgentMessage, AgentResponse } from '@/types'

interface UseAgentOptions {
  onSuccess?: (response: AgentResponse) => void
}

export function useAgent(options: UseAgentOptions = {}) {
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [lastResponse, setLastResponse] = useState<AgentResponse | null>(null)
  const { toast } = useToast()

  const agentMutation = useMutation({
    mutationFn: async (instruction: string): Promise<AgentResponse> => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) throw new Error('로그인이 필요합니다.')

      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          instruction,
          conversation_history: messages,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: '알 수 없는 오류' }))
        throw new Error(err.error || `HTTP ${response.status}`)
      }

      return response.json() as Promise<AgentResponse>
    },

    onMutate: (instruction) => {
      // Optimistically add user message
      setMessages((prev) => [...prev, { role: 'user', content: instruction }])
    },

    onSuccess: (data, instruction) => {
      setLastResponse(data)
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
      options.onSuccess?.(data)
    },

    onError: (error, instruction) => {
      // Remove optimistic message on failure
      setMessages((prev) =>
        prev.filter((m) => !(m.role === 'user' && m.content === instruction)),
      )
      toast({
        title: '에이전트 오류',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      })
    },
  })

  const sendInstruction = useCallback(
    (instruction: string) => {
      agentMutation.mutate(instruction)
    },
    [agentMutation],
  )

  const clearConversation = useCallback(() => {
    setMessages([])
    setLastResponse(null)
    agentMutation.reset()
  }, [agentMutation])

  return {
    messages,
    isLoading: agentMutation.isPending,
    lastResponse,
    sendInstruction,
    clearConversation,
    toolCallsMade: lastResponse?.tool_calls_made ?? [],
    usage: lastResponse?.usage ?? null,
  }
}
