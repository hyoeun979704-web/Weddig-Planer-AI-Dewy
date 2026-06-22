// 하객 사진 → 드라이브 동기화 코어 로직(수동 drive-photos·자동 drive-sync-cron 공용 — 복붙 방지).
// service-role supabase client(admin) 로 Storage(guest-photos) 에서 받아 커플 드라이브 폴더로 올린다.
import { ensureFolder, getValidAccessToken, uploadToFolder } from "./googleDrive.ts";

// 한 번의 호출에서 올릴 최대 장수(Edge Function 타임아웃 보호). 남으면 다음 cron/호출이 이어받는다.
const MAX_PER_RUN = 150;

export interface SyncResult {
  uploaded: number;
  remaining: number;
  folderId: string | null;
  reason?: "no_settings" | "not_connected" | "folder_failed";
}

function extOf(path: string, ct: string | null): string {
  const fromPath = path.split(".").pop()?.toLowerCase();
  if (fromPath && fromPath.length <= 5) return fromPath;
  if (ct?.includes("png")) return "png";
  if (ct?.includes("webp")) return "webp";
  if (ct?.includes("heic")) return "heic";
  if (ct?.includes("heif")) return "heif";
  return "jpg";
}

function sanitize(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "").trim().slice(0, 40);
}

// 한 청첩장의 미동기화 하객 사진을 드라이브로 올린다.
export async function syncInvitation(
  admin: { from: (t: string) => any; storage: { from: (b: string) => any } },
  invitationId: string,
): Promise<SyncResult> {
  const { data: setting } = await admin
    .from("invitation_drive_settings")
    .select("drive_user_id, folder_id")
    .eq("invitation_id", invitationId)
    .maybeSingle();
  if (!setting) return { uploaded: 0, remaining: 0, folderId: null, reason: "no_settings" };

  const token = await getValidAccessToken(admin, setting.drive_user_id);
  if (!token) return { uploaded: 0, remaining: 0, folderId: setting.folder_id ?? null, reason: "not_connected" };

  // 폴더명 = "Dewy 하객사진 - 신랑 · 신부".
  const { data: inv } = await admin
    .from("invitations")
    .select("user_data")
    .eq("id", invitationId)
    .maybeSingle();
  const g = (inv?.user_data?.groom_name as string) ?? "";
  const b = (inv?.user_data?.bride_name as string) ?? "";
  const who = [g, b].filter(Boolean).join(" · ");
  const folderName = who ? `Dewy 하객사진 - ${who}` : "Dewy 하객사진";

  const folderId = await ensureFolder(token, folderName, setting.folder_id ?? null);
  if (!folderId) return { uploaded: 0, remaining: 0, folderId: null, reason: "folder_failed" };
  if (folderId !== setting.folder_id) {
    await admin.from("invitation_drive_settings").update({ folder_id: folderId }).eq("invitation_id", invitationId);
  }

  // 미동기화 사진(오래된 것부터). +1 조회로 남은 게 더 있는지 판단.
  const { data: photos } = await admin
    .from("invitation_guest_photos")
    .select("id, uploader_name, storage_path, content_type")
    .eq("invitation_id", invitationId)
    .is("drive_file_id", null)
    .order("created_at", { ascending: true })
    .limit(MAX_PER_RUN + 1);
  const list = (photos ?? []) as Array<{
    id: string;
    uploader_name: string | null;
    storage_path: string;
    content_type: string | null;
  }>;
  const batch = list.slice(0, MAX_PER_RUN);

  let uploaded = 0;
  for (const p of batch) {
    const { data: blob, error: dErr } = await admin.storage.from("guest-photos").download(p.storage_path);
    if (dErr || !blob) {
      console.error("drive sync download failed", p.id, dErr);
      continue;
    }
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const label = sanitize(p.uploader_name ?? "하객") || "하객";
    // 파일명 충돌 방지: 업로더명 + 사진 id 앞 8자.
    const name = `${label}-${p.id.slice(0, 8)}.${extOf(p.storage_path, p.content_type)}`;
    const fileId = await uploadToFolder(token, folderId, name, bytes, p.content_type ?? "image/jpeg");
    if (!fileId) continue; // 다음 동기화에 재시도(drive_file_id 미기록).
    await admin
      .from("invitation_guest_photos")
      .update({ drive_file_id: fileId, drive_synced_at: new Date().toISOString() })
      .eq("id", p.id);
    uploaded++;
  }

  return { uploaded, remaining: Math.max(0, list.length - batch.length), folderId };
}
