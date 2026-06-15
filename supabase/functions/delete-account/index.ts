import { corsHeaders } from "../_shared/cors.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 회원 탈퇴(계정·데이터 삭제). 본인 인증 후 service role 로 auth 사용자를 삭제한다.
// 사용자 소유 데이터는 대부분 auth.users(id) ON DELETE CASCADE 로 함께 삭제된다.
// (앱스토어·구글플레이 정책: 인앱 계정 삭제 제공 필수)


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "인증이 필요합니다" }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return json({ error: "인증에 실패했습니다" }, 401);
    }

    // auth 사용자 삭제 → FK ON DELETE CASCADE 로 사용자 소유 데이터 정리.
    const { error: delError } = await supabase.auth.admin.deleteUser(user.id);
    if (delError) {
      console.error("delete-account error:", delError);
      return json({ error: "계정 삭제에 실패했습니다. 잠시 후 다시 시도해주세요" }, 500);
    }

    return json({ ok: true });
  } catch (e) {
    console.error("delete-account exception:", e);
    return json({ error: "계정 삭제에 실패했어요. 잠시 후 다시 시도해 주세요." }, 500);
  }

  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
