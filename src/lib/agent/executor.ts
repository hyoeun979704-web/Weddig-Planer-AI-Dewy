import { createServerSupabaseClient } from './supabase-server'
import {
  ALLOWED_TABLES,
  READ_ONLY_TABLES,
  TABLE_DESCRIPTIONS,
  type AllowedTable,
} from './tools'
import type {
  QueryDatabaseParams,
  InsertRecordParams,
  UpdateRecordParams,
  DeleteRecordParams,
  CountRecordsParams,
  ToolResult,
} from '@/types'

function validateTable(table: string): table is AllowedTable {
  return ALLOWED_TABLES.includes(table as AllowedTable)
}

function validateWriteAccess(table: AllowedTable): void {
  if (READ_ONLY_TABLES.includes(table)) {
    throw new Error(`테이블 "${table}"은 읽기 전용입니다. 쓰기 작업을 수행할 수 없습니다.`)
  }
}

export async function executeToolCall(
  toolName: string,
  toolInput: unknown,
): Promise<ToolResult> {
  const supabase = createServerSupabaseClient()

  try {
    switch (toolName) {
      case 'query_database': {
        const params = toolInput as QueryDatabaseParams
        if (!validateTable(params.table)) {
          return { success: false, error: `테이블 "${params.table}"은 허용되지 않습니다.` }
        }
        const columns = params.columns || '*'
        const limit = Math.min(params.limit ?? 50, 500)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query = (supabase.from(params.table as any) as any)
          .select(columns)
          .limit(limit)

        if (params.filters) {
          for (const [col, val] of Object.entries(params.filters)) {
            query = query.eq(col, val)
          }
        }
        if (params.order_by) {
          query = query.order(params.order_by.column, {
            ascending: params.order_by.ascending,
          })
        }

        const { data, error } = await query
        if (error) return { success: false, error: error.message }
        return { success: true, data, rows_affected: data?.length ?? 0 }
      }

      case 'insert_record': {
        const params = toolInput as InsertRecordParams
        if (!validateTable(params.table)) {
          return { success: false, error: `테이블 "${params.table}"은 허용되지 않습니다.` }
        }
        validateWriteAccess(params.table)

        const { data, error } = await (supabase.from(params.table as any) as any)
          .insert(params.data)
          .select()
          .single()
        if (error) return { success: false, error: error.message }
        return { success: true, data, rows_affected: 1 }
      }

      case 'update_record': {
        const params = toolInput as UpdateRecordParams
        if (!validateTable(params.table)) {
          return { success: false, error: `테이블 "${params.table}"은 허용되지 않습니다.` }
        }
        validateWriteAccess(params.table)

        const idColumn = params.id_column ?? 'id'
        const { data, error } = await (supabase.from(params.table as any) as any)
          .update(params.data)
          .eq(idColumn, params.id)
          .select()
          .single()
        if (error) return { success: false, error: error.message }
        return { success: true, data, rows_affected: 1 }
      }

      case 'delete_record': {
        const params = toolInput as DeleteRecordParams
        if (!validateTable(params.table)) {
          return { success: false, error: `테이블 "${params.table}"은 허용되지 않습니다.` }
        }
        validateWriteAccess(params.table)

        const idColumn = params.id_column ?? 'id'
        const { error } = await (supabase.from(params.table as any) as any)
          .delete()
          .eq(idColumn, params.id)
        if (error) return { success: false, error: error.message }
        return { success: true, rows_affected: 1 }
      }

      case 'list_tables': {
        const result = ALLOWED_TABLES.map((t) => ({
          name: t,
          description: TABLE_DESCRIPTIONS[t],
          read_only: READ_ONLY_TABLES.includes(t),
        }))
        return { success: true, data: result }
      }

      case 'count_records': {
        const params = toolInput as CountRecordsParams
        if (!validateTable(params.table)) {
          return { success: false, error: `테이블 "${params.table}"은 허용되지 않습니다.` }
        }

        let query = (supabase.from(params.table as any) as any).select('*', {
          count: 'exact',
          head: true,
        })

        if (params.filters) {
          for (const [col, val] of Object.entries(params.filters)) {
            query = query.eq(col, val)
          }
        }

        const { count, error } = await query
        if (error) return { success: false, error: error.message }
        return { success: true, data: { count }, rows_affected: count ?? 0 }
      }

      case 'check_server_health': {
        const start = Date.now()
        const { error } = await (supabase.from('profiles' as any) as any)
          .select('id')
          .limit(1)
        const latency = Date.now() - start

        if (error) {
          return {
            success: true,
            data: { status: 'error', latency_ms: latency, message: error.message },
          }
        }
        return {
          success: true,
          data: { status: 'ok', latency_ms: latency, message: '데이터베이스 연결 정상' },
        }
      }

      case 'get_table_schema': {
        const params = toolInput as { table: string }
        if (!validateTable(params.table)) {
          return { success: false, error: `테이블 "${params.table}"은 허용되지 않습니다.` }
        }

        const { data, error } = await (supabase.from(params.table as any) as any)
          .select('*')
          .limit(1)

        if (error) return { success: false, error: error.message }

        const columns = data && data.length > 0 ? Object.keys(data[0]) : []
        return {
          success: true,
          data: {
            table: params.table,
            columns,
            read_only: READ_ONLY_TABLES.includes(params.table as AllowedTable),
            description: TABLE_DESCRIPTIONS[params.table as AllowedTable],
          },
        }
      }

      default:
        return { success: false, error: `알 수 없는 도구: ${toolName}` }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}
