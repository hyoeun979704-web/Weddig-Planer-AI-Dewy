import { corsHeaders } from "../_shared/cors.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 회원 탈퇴(계정·데이터 삭제). 본인 인증 후 ① 소유 DB 행 파기(delete_user_data RPC) ② 소유 스토리지
// 객체 파기 ③ auth 사용자 삭제 순으로 처리한다.
// ⚠️ 감사 260702 갱신: 260624 "auth.users FK 전무" 주석은 stale — 현재 실DB 에는 FK 다수(대부분
// ON DELETE CASCADE)가 있어 ③이 일부 테이블을 cascade 정리한다. 그래도 무FK 테이블(커뮤니티·커플·
// 견적 등)이 남아 있으므로 DB 행 파기의 정본은 여전히 delete_user_data RPC 다. 보존 대상(거래·동의
// 기록)은 20260702150000 에서 FK 를 끊어 cascade 에서 제외했다.
// 스토리지는 CASCADE 대상이 아니라 별도 삭제(개인정보보호법 파기 의무 + Apple/Google 삭제정책).

type AdminClient = ReturnType<typeof createClient>;

// 사용자 소유 파일이 `${userId}/...` 경로로 저장되는 버킷들(실DB storage.buckets 확인 기준).
// AI 개인사진(dress/makeup/sdm 입력·결과)과 guest-photos(하객사진) 포함 — 탈퇴 시 즉시 파기.
// vendor-deliveries 는 업로더(업체) uid 폴더 구조라, 여기서는 "업체 본인 탈퇴" 시의 소유 폴더만
// 커버하고, 소비자(수신자) 탈퇴 시의 파기는 아래 removeReceivedDeliveries 가 행 기준으로 처리한다.
const USER_CONTENT_BUCKETS = [
  "dress-uploads",
  "dress-results",
  "makeup-uploads",
  "makeup-results",
  "sdm-uploads",
  "sdm-results",
  "quote-uploads",
  "invitation-uploads",
  "guest-photos",
  "couple-diary-photos",
  "community-images",
  "vendor-images",
  "vendor-deliveries",
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
  const PAGE = 1000;
  const files: string[] = [];
  const folders: string[] = [];
  // list 는 1회 최대 limit 건만 반환하므로 offset 으로 끝까지 페이지네이션(1000개 초과 폴더 잔존 방지).
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: PAGE, offset });
    if (error || !data || data.length === 0) break;
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) {
        folders.push(path);
      } else {
        files.push(path);
      }
    }
    if (data.length < PAGE) break;
  }
  for (const folder of folders) {
    await removeUserFiles(supabase, bucket, folder, depth + 1); // 폴더 → 재귀
  }
  for (let i = 0; i < files.length; i += 100) {
    await supabase.storage.from(bucket).remove(files.slice(i, i + 100));
  }
}

// 업체가 소비자에게 보낸 결과물(vendor-deliveries)은 업로더(업체) uid 폴더에 저장되어 수신자
// prefix 삭제로는 못 지운다. 수신자 탈퇴 시 행의 file_paths 를 모아 직접 파기한다 — 행 자체는
// ③ auth 삭제의 FK cascade 로 사라지므로 반드시 그 전에 실행해야 한다(개인정보보호법 파기의무:
// 보정본에 소비자 얼굴 포함).
async function removeReceivedDeliveries(supabase: AdminClient, userId: string): Promise<void> {
  const { data, error } = await supabase
    .from("vendor_deliveries")
    .select("file_paths")
    .eq("recipient_user_id", userId);
  if (error || !data || data.length === 0) return;
  const paths = data.flatMap((row) => (row.file_paths as string[] | null) ?? []);
  for (let i = 0; i < paths.length; i += 100) {
    await supabase.storage.from("vendor-deliveries").remove(paths.slice(i, i + 100));
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
    // 2-b) 수신한 업체 결과물 파기(업체 uid 폴더라 위 prefix 삭제 미커버) — ③ 전에 실행 필수.
    try {
      await removeReceivedDeliveries(supabase, user.id);
    } catch (e) {
      console.error("delete-account vendor-deliveries purge failed:", e);
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
