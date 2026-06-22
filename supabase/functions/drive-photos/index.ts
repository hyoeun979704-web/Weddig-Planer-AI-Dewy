// 하객 사진 드라이브 백업 제어(인증 사용자) — verify_jwt=true.
//   body: { action: 'info'|'disconnect'|'set_auto'|'sync', invitation_id?, auto_sync? }
// 모든 청첩장 단위 액션은 호출자가 소유자/배우자인지 검증한다(인가).
import { corsHeaders } from "../_shared/cors.ts";
import { syncInvitation } from "../_shared/driveSyncCore.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Admin = ReturnType<typeof createClient>;

// 청첩장 소유자 또는 (연결된) 배우자만 허용. 통과 시 invitation 행 반환, 아니면 null.
async function authzInvitation(admin: Admin, callerId: string, invitationId: string) {
  const { data: inv } = await admin
    .from("invitations")
    .select("user_id, user_data")
    .eq("id", invitationId)
    .maybeSingle();
  if (!inv) return null;
  if (inv.user_id === callerId) return inv;
  const { data: links } = await admin
    .from("couple_links")
    .select("user_id, partner_user_id")
    .eq("status", "linked")
    .or(`user_id.eq.${callerId},partner_user_id.eq.${callerId}`);
  const partnerId = (links ?? [])
    .map((l: any) => (l.user_id === callerId ? l.partner_user_id : l.user_id))
    .find(Boolean);
  return inv.user_id === partnerId ? inv : null;
}

async function hasDriveAccount(admin: Admin, userId: string): Promise<boolean> {
  const { data } = await admin.from("user_drive_accounts").select("user_id").eq("user_id", userId).maybeSingle();
  return !!data;
}

// settings 행 보장 + 대상 계정(drive_user_id) 결정.
// 신규면 호출자로 생성. 기존 대상 계정이 끊겼고 호출자가 연결돼 있으면 호출자로 재지정.
async function ensureSettings(admin: Admin, invitationId: string, callerId: string): Promise<string> {
  const { data: s } = await admin
    .from("invitation_drive_settings")
    .select("drive_user_id")
    .eq("invitation_id", invitationId)
    .maybeSingle();
  if (!s) {
    await admin.from("invitation_drive_settings").insert({ invitation_id: invitationId, drive_user_id: callerId });
    return callerId;
  }
  if (s.drive_user_id !== callerId && !(await hasDriveAccount(admin, s.drive_user_id)) && (await hasDriveAccount(admin, callerId))) {
    await admin.from("invitation_drive_settings").update({ drive_user_id: callerId }).eq("invitation_id", invitationId);
    return callerId;
  }
  return s.drive_user_id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: claims, error: cErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (cErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const callerId = claims.claims.sub as string;

    const { action, invitation_id, auto_sync } = await req.json().catch(() => ({}));
    const admin = createClient(supabaseUrl, serviceKey);

    // 연결 해제(청첩장 무관, 본인 계정).
    if (action === "disconnect") {
      await admin.from("user_drive_accounts").delete().eq("user_id", callerId);
      return json({ ok: true });
    }

    if (typeof invitation_id !== "string" || !invitation_id) return json({ error: "invitation_required" }, 400);
    const inv = await authzInvitation(admin, callerId, invitation_id);
    if (!inv) return json({ error: "forbidden" }, 403);

    // 현황: 연결 여부·이메일·자동동기화·폴더·동기화 진행.
    if (action === "info") {
      const { data: acc } = await admin
        .from("user_drive_accounts")
        .select("email")
        .eq("user_id", callerId)
        .maybeSingle();
      const { data: setting } = await admin
        .from("invitation_drive_settings")
        .select("auto_sync, folder_id")
        .eq("invitation_id", invitation_id)
        .maybeSingle();
      const { count: total } = await admin
        .from("invitation_guest_photos")
        .select("id", { count: "exact", head: true })
        .eq("invitation_id", invitation_id);
      const { count: synced } = await admin
        .from("invitation_guest_photos")
        .select("id", { count: "exact", head: true })
        .eq("invitation_id", invitation_id)
        .not("drive_file_id", "is", null);
      return json({
        connected: !!acc,
        email: acc?.email ?? null,
        autoSync: setting?.auto_sync ?? false,
        folderId: setting?.folder_id ?? null,
        total: total ?? 0,
        synced: synced ?? 0,
      });
    }

    if (action === "set_auto") {
      if (auto_sync && !(await hasDriveAccount(admin, callerId))) return json({ error: "not_connected" }, 400);
      const driveUserId = await ensureSettings(admin, invitation_id, callerId);
      await admin
        .from("invitation_drive_settings")
        .update({ auto_sync: !!auto_sync })
        .eq("invitation_id", invitation_id);
      return json({ ok: true, autoSync: !!auto_sync, driveUserId });
    }

    if (action === "sync") {
      if (!(await hasDriveAccount(admin, callerId))) {
        // 호출자가 연결 안 했어도 기존 대상 계정이 있으면 그걸로 동기화 시도.
        const { data: s } = await admin
          .from("invitation_drive_settings")
          .select("drive_user_id")
          .eq("invitation_id", invitation_id)
          .maybeSingle();
        if (!s) return json({ error: "not_connected" }, 400);
      } else {
        await ensureSettings(admin, invitation_id, callerId);
      }
      const r = await syncInvitation(admin, invitation_id);
      if (r.reason === "not_connected") return json({ error: "not_connected" }, 400);
      return json({ ok: true, uploaded: r.uploaded, remaining: r.remaining, folderId: r.folderId });
    }

    return json({ error: "invalid_action" }, 400);
  } catch (e) {
    console.error("drive-photos error", e);
    return json({ error: "internal", detail: String((e as Error).message) }, 500);
  }
});
