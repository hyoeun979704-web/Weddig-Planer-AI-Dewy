// 외부 캘린더(Google·Kakao) 연동 클라이언트 훅 — cal-* Edge Function 호출 래퍼(provider 공용).
// 토큰은 서버에만 있고 클라는 상태(connected)·동작(connect/sync/disconnect)만 다룬다.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type CalendarProvider = "google" | "kakao";

export function useCalendarSync(provider: CalendarProvider) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const refreshStatus = useCallback(async () => {
    if (!user) { setConnected(false); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.functions.invoke("cal-sync", { body: { provider, action: "status" } });
    setConnected(!!(data as { connected?: boolean } | null)?.connected);
    setLoading(false);
  }, [user, provider]);

  useEffect(() => { void refreshStatus(); }, [refreshStatus]);

  const connect = useCallback(async (returnPath = "/settings"): Promise<{ ok: boolean; error?: string }> => {
    const { data, error } = await supabase.functions.invoke("cal-oauth-start", {
      body: { provider, origin: window.location.origin, returnPath },
    });
    const url = (data as { url?: string } | null)?.url;
    const err = (data as { error?: string } | null)?.error;
    if (error || !url) return { ok: false, error: err ?? "start_failed" };
    window.location.href = url; // OAuth 동의 → 콜백 → returnPath?calendar=connected&calprovider=...
    return { ok: true };
  }, [provider]);

  const sync = useCallback(async (): Promise<{ ok: boolean; pushed?: number; pulled?: number; error?: string }> => {
    setSyncing(true);
    const { data, error } = await supabase.functions.invoke("cal-sync", { body: { provider, action: "sync" } });
    setSyncing(false);
    const res = (data as { ok?: boolean; pushed?: number; pulled?: number; error?: string } | null) ?? {};
    if (error || !res.ok) return { ok: false, error: res.error ?? "sync_failed" };
    return { ok: true, pushed: res.pushed, pulled: res.pulled };
  }, [provider]);

  const disconnect = useCallback(async (): Promise<boolean> => {
    const { data, error } = await supabase.functions.invoke("cal-sync", { body: { provider, action: "disconnect" } });
    const ok = !!(data as { ok?: boolean } | null)?.ok && !error;
    if (ok) setConnected(false);
    return ok;
  }, [provider]);

  return { connected, loading, syncing, connect, sync, disconnect, refreshStatus };
}
