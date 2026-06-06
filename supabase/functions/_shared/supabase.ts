import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// service_role 키로 RLS 를 우회하는 admin 클라이언트(서버 전용).
//
// `createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)`
// 인라인이 15개 함수에 복붙돼 있던 것을 단일화한다. env 누락 시 여기서 한 번에 드러난다.
// anon/user-scoped/결제 전용 등 변형 클라이언트는 각 함수가 그대로 직접 생성한다.
export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}
