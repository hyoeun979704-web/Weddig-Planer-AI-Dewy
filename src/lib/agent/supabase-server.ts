import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!

// Admin client — bypasses RLS. Server-side only. Never expose to browser.
export function createServerSupabaseClient() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// User-scoped client — respects RLS. Used for JWT verification.
export function createUserSupabaseClient(accessToken: string) {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
