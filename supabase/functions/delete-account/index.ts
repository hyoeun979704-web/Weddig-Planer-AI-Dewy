import { corsHeaders } from "../_shared/cors.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 회원 탈퇴(계정·데이터 삭제). 본인 인증 후 ① 소유 DB 행 파기(delete_user_data RPC) ② 소유 스토리지
// 객체 파기 ③ auth 사용자 삭제 순으로 처리한다.
// ⚠️ 중요(감사 260624): auth.users 참조 FK 가 DB 에 하나도 없어 ON DELETE CASCADE 는 동작하지 않는다.
// 따라서 DB 행은 반드시 delete_user_data RPC 로 명시 파기해야 한다(과거 "CASCADE 로 삭제" 주석은 오류).
// 스토리지도 CASCADE 대상이 아니라 별도 삭제(개인정보보호법 파기 의무 + Apple/Google 삭제정책).

type AdminClient = ReturnType<typeof createClient>;

// 사용자 소유 파일이 `${userId}/...` 경로로 저장되는 버킷들(실DB storage.buckets 확인 기준).
// AI 개인사진(dress/makeup 입력·결과)과 guest-photos(하객사진) 포함 — 탈퇴 시 즉시 파기.
const USER_CONTENT_BUCKETS = [
  "dress-uploads",
  "dress-results",
  "makeup-uploads",
  "makeup-results",
  "quote-uploads",
  "invitation-uploads",
  "guest-photos",
  "couple-diary-photos",
  "community-images",
  "vendor-images",
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

    // 1) 사용자 소유 DB 행 파기 — auth.users 참조 FK 가 없어 CASCADE 가 안 되므로 명시 RPC 로 삭제.
    //    실패 시 auth 사용자를 지우지 않고 중단(데이터만 남는 부분삭제 방지 — 재시도 가능하게).
    const { error: dataError } = await supabase.rpc("delete_user_data", { p_user_id: user.id });
    if (dataError) {
      console.error("delete-account delete_user_data failed:", dataError);
      return json({ error: "계정 데이터 삭제에 실패했어요. 잠시 후 다시 시도해 주세요." }, 500);
    }

    // 2) 사용자 소유 스토리지 파일 파기(객체는 CASCADE 대상이 아니라 수동 삭제). 일부 버킷 실패는
    //    전체 탈퇴를 막지 않게 계속 진행(남은 객체는 30일 자동삭제로 보강).
    for (const bucket of USER_CONTENT_BUCKETS) {
      try {
        await removeUserFiles(supabase, bucket, user.id);
      } catch (e) {
        console.error(`delete-account storage purge failed (${bucket}):`, e);
      }
    }

    // 3) auth 사용자 삭제.
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
