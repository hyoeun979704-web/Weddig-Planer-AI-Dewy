// 결과물 수령(S8) — 업체→소비자 결과물(보정본 등) 전달 데이터 훅.
// 프라이빗 버킷(vendor-deliveries) + 서명 URL. 접근은 vendor_deliveries RLS 로 게이팅.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "vendor-deliveries";

export interface VendorDelivery {
  id: string;
  inquiry_id: string | null;
  place_id: string | null;
  owner_user_id: string;
  recipient_user_id: string;
  title: string | null;
  message: string | null;
  file_paths: string[];
  status: "delivered" | "received";
  created_at: string;
  received_at: string | null;
}

// 프라이빗 버킷이라 다운로드는 단건 서명 URL(1시간 유효)로. SELECT 권한(행 멤버십)이
// 있어야 발급되므로 비인가 접근은 자동 차단된다.
export async function getDeliveryFileUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) {
    console.error("createSignedUrl failed", error);
    return null;
  }
  return data?.signedUrl ?? null;
}

// 소비자: 내가 받은 결과물.
export function useReceivedDeliveries() {
  const [items, setItems] = useState<VendorDelivery[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) { setItems([]); setLoading(false); return; }
    const { data, error } = await (supabase as any)
      .from("vendor_deliveries")
      .select("*")
      .eq("recipient_user_id", uid)
      .order("created_at", { ascending: false });
    if (error) console.error("useReceivedDeliveries load failed", error);
    setItems((data as VendorDelivery[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const markReceived = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await (supabase as any)
      .from("vendor_deliveries")
      .update({ status: "received", received_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { console.error("markReceived failed", error); return false; }
    setItems((prev) => prev.map((d) => (d.id === id ? { ...d, status: "received" } : d)));
    return true;
  }, []);

  return { items, loading, reload: load, markReceived };
}

// 업체: 내가 보낸 결과물(선택적으로 특정 업체).
export function useSentDeliveries(placeId?: string) {
  const [items, setItems] = useState<VendorDelivery[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) { setItems([]); setLoading(false); return; }
    let q = (supabase as any)
      .from("vendor_deliveries")
      .select("*")
      .eq("owner_user_id", uid)
      .order("created_at", { ascending: false });
    if (placeId) q = q.eq("place_id", placeId);
    const { data, error } = await q;
    if (error) console.error("useSentDeliveries load failed", error);
    setItems((data as VendorDelivery[]) ?? []);
    setLoading(false);
  }, [placeId]);

  useEffect(() => { load(); }, [load]);

  return { items, loading, reload: load };
}

// 업체: 결과물 파일 업로드(본인 uid 폴더). 성공 시 storage path 반환.
export async function uploadDeliveryFile(file: File): Promise<string | null> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return null;
  const safe = file.name.replace(/[^\w.\-]/g, "_");
  const path = `${uid}/${crypto.randomUUID()}/${safe}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) { console.error("uploadDeliveryFile failed", error); return null; }
  return path;
}

export interface CreateDeliveryInput {
  recipientUserId: string;
  placeId?: string | null;
  inquiryId?: string | null;
  title?: string | null;
  message?: string | null;
  filePaths: string[];
}

// 업체: 전달 레코드 생성. owner_user_id 는 RLS with check 로 본인만 가능.
export async function createDelivery(input: CreateDeliveryInput): Promise<boolean> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return false;
  if (!input.recipientUserId || input.filePaths.length === 0) return false;
  const { error } = await (supabase as any).from("vendor_deliveries").insert({
    owner_user_id: uid,
    recipient_user_id: input.recipientUserId,
    place_id: input.placeId ?? null,
    inquiry_id: input.inquiryId ?? null,
    title: input.title ?? null,
    message: input.message ?? null,
    file_paths: input.filePaths,
  });
  if (error) { console.error("createDelivery failed", error); return false; }
  return true;
}
