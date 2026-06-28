// 청첩장 하객사진 → Google Drive 백업 클라이언트 훅 — drive-* Edge Function 호출 래퍼.
// 토큰은 서버에만 있고 클라는 상태·동작(connect/sync/disconnect/auto)만 다룬다.
// useCalendarSync 패턴 미러.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DriveInfo {
  connected: boolean;
  email: string | null;
  autoSync: boolean;
  folderId: string | null;
  total: number;
  synced: number;
}

const EMPTY: DriveInfo = { connected: false, email: null, autoSync: false, folderId: null, total: 0, synced: 0 };

export function useInvitationDrive(invitationId?: string) {
  const { user } = useAuth();
  const [info, setInfo] = useState<DriveInfo>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || !invitationId) {
      setInfo(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase.functions.invoke("drive-photos", {
      body: { action: "info", invitation_id: invitationId },
    });
    const d = data as Partial<DriveInfo> | null;
    setInfo({ ...EMPTY, ...(d ?? {}) });
    setLoading(false);
  }, [user, invitationId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const connect = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (!invitationId) return { ok: false, error: "no_invitation" };
    const { data, error } = await supabase.functions.invoke("drive-oauth-start", {
      body: { origin: window.location.origin, returnPath: `/invitation/${invitationId}/photos` },
    });
    const url = (data as { url?: string } | null)?.url;
    const err = (data as { error?: string } | null)?.error;
    if (error || !url) return { ok: false, error: err ?? "start_failed" };
    window.location.href = url; // 동의 → 콜백 → returnPath?drive=connected
    return { ok: true };
  }, [invitationId]);

  const disconnect = useCallback(async (): Promise<boolean> => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("drive-photos", { body: { action: "disconnect" } });
    setBusy(false);
    const ok = !!(data as { ok?: boolean } | null)?.ok && !error;
    if (ok) setInfo((p) => ({ ...p, connected: false, email: null, autoSync: false }));
    return ok;
  }, []);

  const setAuto = useCallback(
    async (autoSync: boolean): Promise<{ ok: boolean; error?: string }> => {
      if (!invitationId) return { ok: false, error: "no_invitation" };
      setBusy(true);
      const { data, error } = await supabase.functions.invoke("drive-photos", {
        body: { action: "set_auto", invitation_id: invitationId, auto_sync: autoSync },
      });
      setBusy(false);
      const res = (data as { ok?: boolean; error?: string } | null) ?? {};
      if (error || !res.ok) return { ok: false, error: res.error ?? "failed" };
      setInfo((p) => ({ ...p, autoSync }));
      return { ok: true };
    },
    [invitationId],
  );

  const syncNow = useCallback(async (): Promise<{ ok: boolean; uploaded?: number; remaining?: number; error?: string }> => {
    if (!invitationId) return { ok: false, error: "no_invitation" };
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("drive-photos", {
      body: { action: "sync", invitation_id: invitationId },
    });
    const res = (data as { ok?: boolean; uploaded?: number; remaining?: number; error?: string } | null) ?? {};
    if (error || !res.ok) {
      setBusy(false);
      return { ok: false, error: res.error ?? "sync_failed" };
    }
    await refresh();
    setBusy(false);
    return { ok: true, uploaded: res.uploaded, remaining: res.remaining };
  }, [invitationId, refresh]);

  return { info, loading, busy, refresh, connect, disconnect, setAuto, syncNow };
}
