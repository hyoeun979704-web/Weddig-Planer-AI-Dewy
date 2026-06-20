import { corsHeaders } from "../_shared/cors.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 회원 탈퇴(계정·데이터 삭제). 본인 인증 후 service role 로 auth 사용자를 삭제한다.
// 사용자 소유 DB 행은 auth.users(id) ON DELETE CASCADE 로 함께 삭제되지만, **스토리지 객체는
// CASCADE 대상이 아니므로 별도로 지워야** 한다(개인정보보호법 파기 의무 + Apple/Google 삭제정책).
// (앱스토어·구글플레이 정책: 인앱 계정 삭제 제공 필수)

type AdminClient = ReturnType<typeof createClient>;

// 사용자 소유 파일이 `${userId}/...` 경로로 저장되는 버킷들.
const USER_CONTENT_BUCKETS = [
  "sdm-uploads",
  "quote-uploads",
  "invitation-uploads",
  "couple-diary-photos",
  "community-images",
  "vendor-images",
  "ai-uploads",
];

// 한 버킷에서 prefix(보통 userId) 하위의 모든 파일을 재귀적으로 삭제. 폴더(entry.id === null)는
// 하위로 재귀한다. 일부 버킷이 없거나 권한 문제로 실패해도 throw 하지 않고 조용히 넘어간다
// (탈퇴 자체가 막히면 안 됨 — 남은 파일은 30일 자동삭제로 보강).
async function removeUserFiles(
  supabase: AdminClient,
  bucket: string,
  prefix: string,
  depth = 0,
): Promise<void> {
  if (depth > 4) return;
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error || !data || data.length === 0) return;

  const files: string[] = [];
  for (const entry of data) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id === null) {
      await removeUserFiles(supabase, bucket, path, depth + 1); // 폴더 → 재귀
    } else {
      files.push(path);
    }
  }
  if (files.length > 0) {
    await supabase.storage.from(bucket).remove(files);
  }
}

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

    // 1) 사용자 소유 스토리지 파일 삭제(DB 행은 아래 CASCADE, 객체는 여기서 수동 파기).
    for (const bucket of USER_CONTENT_BUCKETS) {
      try {
        await removeUserFiles(supabase, bucket, user.id);
      } catch (e) {
        console.error(`delete-account storage purge failed (${bucket}):`, e);
        // 일부 버킷 실패가 전체 탈퇴를 막지 않도록 계속 진행.
      }
    }

    // 2) auth 사용자 삭제 → FK ON DELETE CASCADE 로 사용자 소유 DB 행 정리.
    const { error: delError } = await supabase.auth.admin.deleteUser(user.id);
    if (delError) {
      console.error("delete-account error:", delError);
      return json({ error: "계정 삭제에 실패했습니다. 잠시 후 다시 시도해주세요" }, 500);
    }

    // 참고(iOS): Sign in with Apple 도입 시 Apple 토큰 폐기(auth/revoke, TN3194)를 여기 추가해야
    // 가이드라인 5.1.1(v) 를 충족한다. (현재 Apple provider 미구성 → 도입 시 보강)

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
