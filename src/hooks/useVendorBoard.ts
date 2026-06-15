// 내 업체 보드 데이터 레이어. 슬롯 택소노미는 코드(vendorBoard.ts), 사용자가 채운 상태/선택
// 업체만 vendor_board_items 에 저장. 쓰기는 본인 RLS 직접 upsert/delete(별도 RPC 불필요).
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { VENDOR_SLOTS, primarySlotForQuoteCategory, type VendorSlotStatus } from "@/lib/vendorBoard";

export interface VendorBoardItem {
  slot_key: string;
  status: VendorSlotStatus;
  place_id: string | null;
  vendor_name: string | null;
  memo: string | null;
}

export interface VendorBoardSlotPatch {
  status?: VendorSlotStatus;
  placeId?: string | null;
  vendorName?: string | null;
  memo?: string | null;
}

// 슬롯별 저장값 맵 + 진행 요약을 제공. 저장이 없는 슬롯은 '미정'으로 본다.
export function useVendorBoard() {
  const { user } = useAuth();
  const [items, setItems] = useState<Record<string, VendorBoardItem>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setItems({}); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("vendor_board_items")
      .select("slot_key, status, place_id, vendor_name, memo")
      .eq("user_id", user.id);
    const map: Record<string, VendorBoardItem> = {};
    for (const r of (data ?? []) as VendorBoardItem[]) map[r.slot_key] = r;
    setItems(map);
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  // 슬롯 저장(upsert) — 부분 패치. 빈 슬롯을 '미정+무내용'으로 되돌리면 행을 지워 깔끔히 유지.
  const saveSlot = useCallback(async (slotKey: string, patch: VendorBoardSlotPatch) => {
    if (!user) return { ok: false };
    const prev = items[slotKey];
    const next: VendorBoardItem = {
      slot_key: slotKey,
      status: patch.status ?? prev?.status ?? "undecided",
      place_id: patch.placeId !== undefined ? patch.placeId : prev?.place_id ?? null,
      vendor_name: patch.vendorName !== undefined ? patch.vendorName : prev?.vendor_name ?? null,
      memo: patch.memo !== undefined ? patch.memo : prev?.memo ?? null,
    };
    // 아무것도 안 채운 빈 슬롯이면 행 제거(존재할 때만).
    const isEmpty = next.status === "undecided" && !next.place_id && !next.vendor_name && !next.memo;
    if (isEmpty) {
      if (prev) {
        await supabase.from("vendor_board_items").delete().eq("user_id", user.id).eq("slot_key", slotKey);
        setItems((m) => { const c = { ...m }; delete c[slotKey]; return c; });
      }
      return { ok: true };
    }
    const { error } = await supabase
      .from("vendor_board_items")
      .upsert({ user_id: user.id, ...next }, { onConflict: "user_id,slot_key" });
    if (error) return { ok: false };
    setItems((m) => ({ ...m, [slotKey]: next }));
    return { ok: true };
  }, [user, items]);

  const removeSlot = useCallback(async (slotKey: string) => {
    if (!user) return;
    await supabase.from("vendor_board_items").delete().eq("user_id", user.id).eq("slot_key", slotKey);
    setItems((m) => { const c = { ...m }; delete c[slotKey]; return c; });
  }, [user]);

  // 진행 요약: 전체 슬롯 대비 예약완료 / 견적중 수.
  const total = VENDOR_SLOTS.length;
  const booked = Object.values(items).filter((i) => i.status === "booked").length;
  const quoting = Object.values(items).filter((i) => i.status === "quoting").length;

  return { items, loading, saveSlot, removeSlot, reload: load, summary: { total, booked, quoting } };
}

// 견적/예약 흐름에서 보드 상태를 best-effort 로 동기화하는 정적 헬퍼(보드 페이지 밖에서 호출).
// '예약완료'는 절대 견적중으로 강등하지 않는다(이미 성사된 슬롯 보호).
export async function markBoardSlotQuoting(userId: string, slotKey: string): Promise<void> {
  const { data } = await supabase
    .from("vendor_board_items")
    .select("status")
    .eq("user_id", userId)
    .eq("slot_key", slotKey)
    .maybeSingle();
  if ((data as { status?: string } | null)?.status === "booked") return;
  await supabase
    .from("vendor_board_items")
    .upsert({ user_id: userId, slot_key: slotKey, status: "quoting" }, { onConflict: "user_id,slot_key" });
}

// 견적 예약 성사 → 해당 place 카테고리의 대표 슬롯을 '예약완료'로 표시 + 선택 업체 기록.
export async function markBoardSlotBookedByQuoteCategory(
  userId: string,
  quoteCategory: string | null | undefined,
  placeId: string | null,
  vendorName: string | null,
): Promise<void> {
  const slot = primarySlotForQuoteCategory(quoteCategory);
  if (!slot) return;
  await supabase
    .from("vendor_board_items")
    .upsert(
      { user_id: userId, slot_key: slot.key, status: "booked", place_id: placeId, vendor_name: vendorName },
      { onConflict: "user_id,slot_key" },
    );
}
