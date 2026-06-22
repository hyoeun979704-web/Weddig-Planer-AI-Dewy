// 자동 동기화 cron — pg_cron(net.http_post)이 service_role 키로 호출. verify_jwt=false.
// 임의 사용자가 호출하지 못하도록 service_role 키 일치를 fail-closed 로 검증한다.
// auto_sync=true 인 청첩장의 미동기화 하객 사진을 일괄로 드라이브에 올린다.
import { syncInvitation } from "../_shared/driveSyncCore.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 한 cron 실행에서 처리할 최대 청첩장 수(과도한 실행시간 방지). 나머지는 다음 주기에.
const MAX_INVITATIONS = 200;

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // service_role 키 정확 일치만 허용(미설정/불일치 = 전량 거부).
  const authHeader = req.headers.get("Authorization");
  if (!serviceKey || authHeader !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  try {
    const { data: settings } = await admin
      .from("invitation_drive_settings")
      .select("invitation_id")
      .eq("auto_sync", true)
      .limit(MAX_INVITATIONS);

    let uploaded = 0;
    let processed = 0;
    for (const s of settings ?? []) {
      try {
        const r = await syncInvitation(admin, s.invitation_id as string);
        uploaded += r.uploaded;
        processed++;
      } catch (e) {
        console.error("drive-sync-cron item failed", s.invitation_id, e);
      }
    }
    return new Response(JSON.stringify({ ok: true, invitations: processed, uploaded }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("drive-sync-cron error", e);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
