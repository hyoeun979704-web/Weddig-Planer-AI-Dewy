// AI 업로드 사진 30일 자동 삭제 Edge Function
//
// 개인정보처리방침에 "처리 후 30일 자동 삭제" 라고 약속한 항목을 실제로 실행한다.
// pg_cron 이 매일 1회 service_role 토큰으로 이 함수를 호출.
//
// 대상 버킷(AI 개인사진 30일 삭제):
//   - dress-uploads / dress-results : 드레스 AI 합성 입력·결과
//   - makeup-uploads / makeup-results : 메이크업 AI 합성 입력·결과
//   - invitation-uploads : 단, RPC 가 AI 결과물 prefix(consulting/hair/photofix/enhanced)만 반환.
//     (청첩장 사진·지도 등 '직접 {uid}/<file>' 은 청첩장 생명주기로 관리 → 본 일괄삭제 제외)
//
// + 청첩장 draft/published 30/90일 정리 (별도 phase, 아래).
// guest-photos(하객사진)는 청첩장 생명주기·계정 탈퇴 시 파기(여기 일괄삭제 대상 아님).
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

import { corsHeaders } from "../_shared/cors.ts";
import { jwtRole } from "../_shared/jwt.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RETENTION_DAYS = 30; // AI 업로드(dress-*) — 개인정보처리방침 30일
// 청첩장 보관 정책:
//   · 편집 가능 임시저장본(draft): 7일
//   · 발행본 종이(paper): 30일 / 발행본 모바일 공유링크(mobile): 90일
const INVITATION_DRAFT_DAYS = 7;
const PUBLISHED_PAPER_DAYS = 30;
const PUBLISHED_MOBILE_DAYS = 90;
// RPC(list_expired_ai_uploads)가 반환하는 bucket_id 와 일치해야 한다. invitation-uploads 는
// RPC 가 AI 결과물 prefix 만 반환하므로 여기서 안전하게 일괄 remove 가능(청첩장 사진 미포함).
const TARGET_BUCKETS = [
  "dress-uploads", "dress-results",
  "makeup-uploads", "makeup-results",
  "invitation-uploads",
] as const;
const BATCH_SIZE = 100; // Storage API .remove() 1회 호출당 최대 경로 수


interface ExpiredObject {
  bucket_id: string;
  name: string;
}


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ─────────────────────────────────────────────
  // 1) service_role 인증 — cron(net.http_post)이 보내는 service_role JWT 만 통과.
  //    verify_jwt=true 게이트웨이가 서명을 검증하므로 role 클레임으로 인가.
  const auth = req.headers.get("Authorization") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!serviceRoleKey || jwtRole(token) !== "service_role") {
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
    invitation_published_deleted: 0,
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
  // 4) 청첩장 draft 7일 정리 (사진 삭제 → 레코드 삭제)
  //    발행본은 list_expired_invitation_drafts 가 애초에 제외.
  await cleanupExpiredInvitationDrafts(supabase, summary);

  // 5) 발행본 만료 정리 (종이 30일 / 모바일 90일)
  await cleanupExpiredInvitationPublished(supabase, summary);

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
    { retention_days: INVITATION_DRAFT_DAYS },
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

// ════════════════════════════════════════════════════════════════
// 발행본 만료 정리 — 종이 30일 / 모바일 공유링크 90일 초과분 삭제.
//   · list_expired_invitation_published(paper_days, mobile_days)
//     → (id, photo_paths[]) 반환. 면별(front/back) 사진 path 포함.
//   · invitation-uploads 사진 배치 삭제 → invitations row 배치 삭제.
//   주의: 라이브 하객 링크가 만료·제거되는 비가역 작업.
// ════════════════════════════════════════════════════════════════
async function cleanupExpiredInvitationPublished(
  supabase: ReturnType<typeof createClient>,
  summary: {
    deleted_total: number;
    by_bucket: Record<string, number>;
    invitation_published_deleted: number;
    errors: string[];
  },
) {
  const { data, error } = await supabase.rpc(
    "list_expired_invitation_published",
    { paper_days: PUBLISHED_PAPER_DAYS, mobile_days: PUBLISHED_MOBILE_DAYS },
  );
  if (error) {
    summary.errors.push(`list_expired_invitation_published: ${error.message}`);
    return;
  }

  const rows = (data ?? []) as ExpiredDraft[];
  if (rows.length === 0) return;

  // 1) 사진 삭제
  const photoPaths = Array.from(
    new Set(rows.flatMap((d) => d.photo_paths ?? []).filter(Boolean)),
  );
  summary.by_bucket["invitation-uploads"] =
    summary.by_bucket["invitation-uploads"] ?? 0;
  for (let i = 0; i < photoPaths.length; i += BATCH_SIZE) {
    const chunk = photoPaths.slice(i, i + BATCH_SIZE);
    const { data: removed, error: rmError } = await supabase.storage
      .from("invitation-uploads")
      .remove(chunk);
    if (rmError) {
      summary.errors.push(`published invitation-uploads@${i}: ${rmError.message}`);
      continue;
    }
    const n = removed?.length ?? 0;
    summary.by_bucket["invitation-uploads"] += n;
    summary.deleted_total += n;
  }

  // 2) 레코드 삭제
  const ids = rows.map((d) => d.invitation_id);
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const chunk = ids.slice(i, i + BATCH_SIZE);
    const { error: delError } = await supabase
      .from("invitations")
      .delete()
      .in("id", chunk);
    if (delError) {
      summary.errors.push(`published delete batch@${i}: ${delError.message}`);
      continue;
    }
    summary.invitation_published_deleted += chunk.length;
  }
}
