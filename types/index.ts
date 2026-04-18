// TypeScript type definitions for Dewy

// ─── Agent Tool Parameter Types ───────────────────────────────────────────────

export interface QueryDatabaseParams {
  table: string
  filters?: Record<string, unknown>
  columns?: string
  limit?: number
  order_by?: { column: string; ascending: boolean }
}

export interface InsertRecordParams {
  table: string
  data: Record<string, unknown>
}

export interface UpdateRecordParams {
  table: string
  id: string
  id_column?: string
  data: Record<string, unknown>
}

export interface DeleteRecordParams {
  table: string
  id: string
  id_column?: string
}

export interface CountRecordsParams {
  table: string
  filters?: Record<string, unknown>
}

// ─── Agent Conversation & Request/Response Types ───────────────────────────────

export interface AgentMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AgentRequest {
  instruction: string
  conversation_history?: AgentMessage[]
  user_id?: string
}

export interface AgentResponse {
  reply: string
  tool_calls_made: string[]
  usage: {
    input_tokens: number
    output_tokens: number
    cache_read_input_tokens: number
    cache_creation_input_tokens: number
  }
}

// ─── Tool Execution Result ─────────────────────────────────────────────────────

export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
  rows_affected?: number
}
