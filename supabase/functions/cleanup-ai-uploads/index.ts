// AI 업로드 사진 30일 자동 삭제 Edge Function
//
// 개인정보처리방침에 "처리 후 30일 자동 삭제" 라고 약속한 항목을 실제로 실행한다.
// pg_cron 이 매일 1회 service_role 토큰으로 이 함수를 호출.
//
// 대상 버킷:
//   - dress-uploads : 사용자가 AI 합성용으로 올린 본인 사진
//   - dress-results : AI 가 생성한 합성 결과물
//
// + 청첩장 draft 30일 정리 (별도 phase):
//   - 미발행(draft) 청첩장 레코드 + 그 invitation-uploads 사진을 30일 후 삭제.
//   - 발행본(published, 하객 라이브 링크)과 그 사진은 유지.
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
    invitation_drafts_deleted: 0,
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

  // ─────────────────────────────────────────────
  // 4) 청첩장 draft 30일 정리 (사진 삭제 → 레코드 삭제)
  //    발행본은 list_expired_invitation_drafts 가 애초에 제외.
  await cleanupExpiredInvitationDrafts(supabase, summary);

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

// ════════════════════════════════════════════════════════════════
// 청첩장 draft 정리 — 30일 지난 미발행 청첩장의 사진 + 레코드 삭제.
//   · list_expired_invitation_drafts: (id, photo_paths[]) 반환 (발행본 제외/보존).
//   · invitation-uploads 사진 배치 삭제 → invitations row 배치 삭제.
//   · 사진 삭제가 일부 실패해도 레코드는 삭제(다음 회차 orphan 청소 대상 아님이라
//     errors 에만 기록). 멱등성: 이미 없는 path/row 는 skip.
// ════════════════════════════════════════════════════════════════
interface ExpiredDraft {
  invitation_id: string;
  photo_paths: string[] | null;
}

async function cleanupExpiredInvitationDrafts(
  supabase: ReturnType<typeof createClient>,
  summary: {
    deleted_total: number;
    by_bucket: Record<string, number>;
    invitation_drafts_deleted: number;
    errors: string[];
  },
) {
  const { data, error } = await supabase.rpc(
    "list_expired_invitation_drafts",
    { retention_days: RETENTION_DAYS },
  );
  if (error) {
    summary.errors.push(`list_expired_invitation_drafts: ${error.message}`);
    return;
  }

  const drafts = (data ?? []) as ExpiredDraft[];
  if (drafts.length === 0) return;

  // 1) 사진 삭제 (invitation-uploads)
  const photoPaths = Array.from(
    new Set(drafts.flatMap((d) => d.photo_paths ?? []).filter(Boolean)),
  );
  summary.by_bucket["invitation-uploads"] =
    summary.by_bucket["invitation-uploads"] ?? 0;
  for (let i = 0; i < photoPaths.length; i += BATCH_SIZE) {
    const chunk = photoPaths.slice(i, i + BATCH_SIZE);
    const { data: removed, error: rmError } = await supabase.storage
      .from("invitation-uploads")
      .remove(chunk);
    if (rmError) {
      summary.errors.push(`invitation-uploads batch@${i}: ${rmError.message}`);
      continue;
    }
    const n = removed?.length ?? 0;
    summary.by_bucket["invitation-uploads"] += n;
    summary.deleted_total += n;
  }

  // 2) 레코드 삭제 (invitations)
  const ids = drafts.map((d) => d.invitation_id);
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const chunk = ids.slice(i, i + BATCH_SIZE);
    const { error: delError } = await supabase
      .from("invitations")
      .delete()
      .in("id", chunk);
    if (delError) {
      summary.errors.push(`invitations delete batch@${i}: ${delError.message}`);
      continue;
    }
    summary.invitation_drafts_deleted += chunk.length;
  }
}
