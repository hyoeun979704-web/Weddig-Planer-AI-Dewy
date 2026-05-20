// AI 업로드 사진 30일 자동 삭제 Edge Function
//
// 개인정보처리방침에 "처리 후 30일 자동 삭제" 라고 약속한 항목을 실제로 실행한다.
// pg_cron 이 매일 1회 service_role 토큰으로 이 함수를 호출.
//
// 대상 버킷:
//   - dress-uploads : 사용자가 AI 합성용으로 올린 본인 사진
//   - dress-results : AI 가 생성한 합성 결과물
//
// 다른 버킷(community-images, couple-diary-photos, vendor-images 등)은
// 사용자가 자발적으로 저장·게시한 콘텐츠라 회원 탈퇴 시까지 보관한다.
//
// 보안:
//   - Authorization 헤더의 service_role 토큰만 통과 (cron 외 호출 차단)
//   - 파일 경로 조회는 SECURITY DEFINER 함수로 storage.objects 직접 접근
//   - 삭제는 Storage API .remove() 사용 (orphan 파일 방지)
//
// 멱등성: 같은 날 여러 번 실행되어도 동일 결과. 이미 삭제된 파일은 skip.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RETENTION_DAYS = 30;
const TARGET_BUCKETS = ["dress-uploads", "dress-results"] as const;
const BATCH_SIZE = 100; // Storage API .remove() 1회 호출당 최대 경로 수

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExpiredObject {
  bucket_id: string;
  name: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ─────────────────────────────────────────────
  // 1) service_role 인증
  //    cron(net.http_post) 가 보내는 Bearer 토큰만 통과
  const auth = req.headers.get("Authorization") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceRoleKey || auth !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    serviceRoleKey,
  );

  const startedAt = new Date().toISOString();
  const summary = {
    started_at: startedAt,
    retention_days: RETENTION_DAYS,
    deleted_total: 0,
    by_bucket: {} as Record<string, number>,
    errors: [] as string[],
  };

  // ─────────────────────────────────────────────
  // 2) 만료 파일 목록 조회 (SECURITY DEFINER 함수)
  const { data: expired, error: queryError } = await supabase.rpc(
    "list_expired_ai_uploads",
    { retention_days: RETENTION_DAYS },
  );

  if (queryError) {
    summary.errors.push(`list_expired_ai_uploads: ${queryError.message}`);
    return new Response(JSON.stringify(summary), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rows = (expired ?? []) as ExpiredObject[];

  // ─────────────────────────────────────────────
  // 3) 버킷별로 그룹화 후 배치 삭제
  for (const bucket of TARGET_BUCKETS) {
    const paths = rows.filter((r) => r.bucket_id === bucket).map((r) => r.name);
    summary.by_bucket[bucket] = 0;

    for (let i = 0; i < paths.length; i += BATCH_SIZE) {
      const chunk = paths.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase.storage.from(bucket).remove(chunk);
      if (error) {
        summary.errors.push(`${bucket} batch@${i}: ${error.message}`);
        continue;
      }
      const removed = data?.length ?? 0;
      summary.by_bucket[bucket] += removed;
      summary.deleted_total += removed;
    }
  }

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
