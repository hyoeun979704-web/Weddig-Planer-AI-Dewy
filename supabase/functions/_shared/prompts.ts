import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// AI 생성 프롬프트를 DB(ai_prompts)에서 런타임에 읽어온다 — 어드민이 고치면
// 앱/함수 재배포 없이 즉시 반영. 행이 없거나 비활성/조회실패면 코드에 박힌
// fallback 을 그대로 쓴다(머니패스가 절대 빈 프롬프트로 깨지지 않게).
//
// vars 가 주어지면 content 안의 {{key}} 토큰을 치환한다(DB 값·fallback 동일 적용).
//
// 주의: admin 은 service_role 클라이언트(adminClient())여야 한다(RLS 우회 + 일관 조회).
export async function getPrompt(
  admin: SupabaseClient,
  key: string,
  fallback: string,
  vars?: Record<string, string>,
): Promise<string> {
  let content = fallback;
  try {
    const { data, error } = await admin
      .from("ai_prompts")
      .select("content, is_active")
      .eq("key", key)
      .maybeSingle();
    if (
      !error && data && data.is_active === true &&
      typeof data.content === "string" && data.content.trim().length > 0
    ) {
      content = data.content as string;
    }
  } catch (e) {
    // DB 조회 실패(네트워크·권한 등) → fallback 유지. 관측만 남긴다.
    console.warn(`getPrompt(${key}) fell back to hardcoded default:`, e);
  }
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      content = content.split(`{{${k}}}`).join(v);
    }
  }
  return content;
}
