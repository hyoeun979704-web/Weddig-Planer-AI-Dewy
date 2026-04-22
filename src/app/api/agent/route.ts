import { NextRequest, NextResponse } from 'next/server'
import { createUserSupabaseClient } from '@/lib/agent/supabase-server'
import { runAgent } from '@/lib/agent'
import type { AgentRequest, AgentResponse } from '@/types'

export const runtime = 'nodejs'
// Allow up to 2 minutes for multi-step agent loops
export const maxDuration = 120

const SENSITIVE_KEYWORDS = ['delete', 'remove all', 'clean up all', '삭제', '전체 삭제', '초기화']

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate via Supabase JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }
    const accessToken = authHeader.slice(7)

    const userSupabase = createUserSupabaseClient(accessToken)
    const {
      data: { user },
      error: authError,
    } = await userSupabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 401 })
    }

    // 2. Parse and validate request body
    const body = (await req.json()) as AgentRequest

    if (!body.instruction || typeof body.instruction !== 'string') {
      return NextResponse.json(
        { error: 'instruction 필드가 필요합니다.' },
        { status: 400 },
      )
    }

    if (body.instruction.length > 4000) {
      return NextResponse.json(
        { error: 'instruction이 너무 깁니다 (최대 4000자).' },
        { status: 400 },
      )
    }

    // 3. Admin check for sensitive (destructive) operations
    const isSensitiveOp = SENSITIVE_KEYWORDS.some((kw) =>
      body.instruction.toLowerCase().includes(kw),
    )

    if (isSensitiveOp) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: isAdmin } = await (userSupabase.rpc as any)('has_role', {
        _user_id: user.id,
        _role: 'admin',
      })

      if (!isAdmin) {
        return NextResponse.json(
          { error: '삭제 작업은 관리자 권한이 필요합니다.' },
          { status: 403 },
        )
      }
    }

    // 4. Run the agent
    const result: AgentResponse = await runAgent({
      instruction: body.instruction,
      conversation_history: body.conversation_history,
      user_id: user.id,
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[Agent API Error]', err)
    const message = err instanceof Error ? err.message : '내부 서버 오류가 발생했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
