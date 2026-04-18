import Anthropic from '@anthropic-ai/sdk'
import { AGENT_TOOLS } from './tools'
import { executeToolCall } from './executor'
import type { AgentRequest, AgentResponse } from '@/types'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// Stable system prompt — module-level const. No dynamic values here.
// Dynamic context (user_id, etc.) is injected into the first user message
// so this prefix is fully cacheable across all requests.
const AGENT_SYSTEM_PROMPT = `당신은 Dewy 웨딩 플래닝 플랫폼의 데이터 관리 & 서버 자동화 에이전트입니다.

## 역할
Dewy Supabase 데이터베이스에 직접 접근하여 관리자와 인증된 사용자를 대신해 데이터를 조회, 생성, 수정, 삭제할 수 있습니다.

## 데이터베이스 스키마 개요
Dewy 플랫폼에서 관리하는 데이터:
- **사용자 데이터**: profiles, user_wedding_settings (결혼 날짜, 지역, 파트너 이름)
- **예산**: budget_items (카테고리/금액/결제 정보), budget_settings (예산 총액, 카테고리 배분)
- **일정**: user_schedule_items (웨딩 플래닝 투두 리스트)
- **업체 & 장소**: vendors, vendor_gallery, venues, venue_halls (읽기 전용 카탈로그)
- **청첩장**: invitation_venues (청첩장용 장소 목록)
- **커뮤니티**: community_posts, community_comments, favorites
- **상거래**: orders, order_items, subscriptions (읽기 전용)
- **리뷰**: reviews (읽기 전용)

## 행동 지침
1. 구조가 불확실할 때는 list_tables 또는 get_table_schema를 먼저 호출하세요
2. 연결 문제를 보고하기 전에 check_server_health를 호출하세요
3. 읽기 전용 테이블 (vendors, reviews, orders, subscriptions 등)은 절대 수정하지 마세요
4. 레코드 삭제 요청 시, 먼저 조회하여 대상을 확인한 후 진행하세요
5. 응답에 행 수와 레코드 ID를 포함하세요
6. 쿼리 결과는 마크다운 표 형식으로 정리하세요
7. 사용자 데이터 조회 시 반드시 user_id 필터를 포함하세요
8. 예산 작업 시 금액 및 합계를 항상 표시하세요

## 안전 규칙
- 서비스 롤 자격 증명이나 내부 인프라 정보를 절대 노출하지 마세요
- 허용된 테이블 목록 내에서만 작업하세요
- 쓰기 작업 성공 여부를 반드시 확인 후 보고하세요
- 작업이 실패하면 이유를 설명하고 대안을 제안하세요`

export async function runAgent(request: AgentRequest): Promise<AgentResponse> {
  const toolCallsMade: string[] = []
  const messages: Anthropic.MessageParam[] = []

  // Dynamic context goes in the user message — NOT the system prompt —
  // so the system prompt prefix remains cacheable across all users.
  let userContent = request.instruction
  if (request.user_id) {
    userContent = `[컨텍스트: user_id="${request.user_id}" 사용자를 대신하여 작업 중]\n\n${request.instruction}`
  }

  if (request.conversation_history && request.conversation_history.length > 0) {
    for (const msg of request.conversation_history) {
      messages.push({ role: msg.role, content: msg.content })
    }
  }

  messages.push({ role: 'user', content: userContent })

  let totalUsage = {
    input_tokens: 0,
    output_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
  }

  // Agentic loop — runs until Claude stops calling tools
  while (true) {
    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      system: [
        {
          type: 'text',
          text: AGENT_SYSTEM_PROMPT,
          // Cache tools + system prompt together.
          // Render order: tools → system → messages
          // This breakpoint captures the stable prefix (tool schemas + system)
          // for reuse across all subsequent requests.
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: AGENT_TOOLS,
      messages,
    })

    totalUsage.input_tokens += response.usage.input_tokens
    totalUsage.output_tokens += response.usage.output_tokens
    totalUsage.cache_read_input_tokens += response.usage.cache_read_input_tokens ?? 0
    totalUsage.cache_creation_input_tokens += response.usage.cache_creation_input_tokens ?? 0

    messages.push({ role: 'assistant', content: response.content })

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find(
        (b): b is Anthropic.TextBlock => b.type === 'text',
      )
      return {
        reply: textBlock?.text ?? '완료되었습니다.',
        tool_calls_made: toolCallsMade,
        usage: totalUsage,
      }
    }

    if (response.stop_reason !== 'tool_use') {
      return {
        reply: `에이전트가 예상치 못한 이유로 중단되었습니다 (stop_reason: ${response.stop_reason})`,
        tool_calls_made: toolCallsMade,
        usage: totalUsage,
      }
    }

    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    )

    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const toolUse of toolUseBlocks) {
      toolCallsMade.push(toolUse.name)
      const result = await executeToolCall(toolUse.name, toolUse.input)
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: JSON.stringify(result),
        is_error: !result.success,
      })
    }

    messages.push({ role: 'user', content: toolResults })
  }
}
