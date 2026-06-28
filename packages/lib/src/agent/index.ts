import { AGENT_FUNCTION_DECLARATIONS } from './tools'
import { executeToolCall } from './executor'
import type { AgentRequest, AgentResponse } from '@/types'

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

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

interface GeminiPart {
  text?: string
  functionCall?: { name: string; args: Record<string, unknown> }
  functionResponse?: { name: string; response: unknown }
}

interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

interface GeminiResponse {
  candidates: Array<{
    content: GeminiContent
    finishReason?: string
  }>
  usageMetadata?: {
    promptTokenCount: number
    candidatesTokenCount: number
  }
}

export async function runAgent(request: AgentRequest): Promise<AgentResponse> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.')

  const toolCallsMade: string[] = []
  const contents: GeminiContent[] = []

  if (request.conversation_history && request.conversation_history.length > 0) {
    for (const msg of request.conversation_history) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })
    }
  }

  let userText = request.instruction
  if (request.user_id) {
    userText = `[컨텍스트: user_id="${request.user_id}" 사용자를 대신하여 작업 중]\n\n${request.instruction}`
  }
  contents.push({ role: 'user', parts: [{ text: userText }] })

  let totalInputTokens = 0
  let totalOutputTokens = 0

  // Agentic loop — runs until Gemini stops calling functions
  while (true) {
    const body = {
      system_instruction: { parts: [{ text: AGENT_SYSTEM_PROMPT }] },
      tools: [{ function_declarations: AGENT_FUNCTION_DECLARATIONS }],
      contents,
      generationConfig: { temperature: 0.2 },
    }

    const res = await fetch(
      `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`Gemini API 오류 (${res.status}): ${JSON.stringify(err)}`)
    }

    const data = (await res.json()) as GeminiResponse

    totalInputTokens += data.usageMetadata?.promptTokenCount ?? 0
    totalOutputTokens += data.usageMetadata?.candidatesTokenCount ?? 0

    const candidate = data.candidates?.[0]
    if (!candidate) throw new Error('Gemini 응답에 candidates가 없습니다.')

    const modelContent = candidate.content
    if (!modelContent?.parts) throw new Error('Gemini 응답에 content.parts가 없습니다.')
    contents.push(modelContent)

    const functionCallParts = modelContent.parts.filter((p) => p.functionCall)

    if (functionCallParts.length === 0) {
      const textPart = modelContent.parts.find((p) => p.text)
      return {
        reply: textPart?.text ?? '완료되었습니다.',
        tool_calls_made: toolCallsMade,
        usage: { input_tokens: totalInputTokens, output_tokens: totalOutputTokens },
      }
    }

    const responseParts: GeminiPart[] = []
    for (const part of functionCallParts) {
      const { name, args } = part.functionCall!
      toolCallsMade.push(name)
      const result = await executeToolCall(name, args)
      responseParts.push({
        functionResponse: { name, response: result },
      })
    }

    contents.push({ role: 'user', parts: responseParts })
  }
}
