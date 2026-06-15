// 내 업체 보드 데이터 레이어. 슬롯 택소노미는 코드(vendorBoard.ts), 사용자가 채운 상태/선택
// 업체만 vendor_board_items 에 저장. 쓰기는 본인 RLS 직접 upsert/delete(별도 RPC 불필요).
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCouplePartnerId } from "@/hooks/useCouplePartnerId";
import { VENDOR_SLOTS, primarySlotForQuoteCategory, type VendorSlotStatus } from "@/lib/vendorBoard";

// 슬롯 병합 우선순위 — 진행도가 높은 상태가 이긴다(예약완료 > 견적중 > 미정).
const STATUS_RANK: Record<VendorSlotStatus, number> = { booked: 2, quoting: 1, undecided: 0 };

export interface VendorBoardItem {
  slot_key: string;
  status: VendorSlotStatus;
  place_id: string | null;
  vendor_name: string | null;
  memo: string | null;
  custom_label: string | null;
}

export interface VendorBoardSlotPatch {
  status?: VendorSlotStatus;
  placeId?: string | null;
  vendorName?: string | null;
  memo?: string | null;
}

// 커스텀(사용자 추가) 슬롯 키 접두사 — 코드 택소노미 슬롯과 구분.
export const CUSTOM_SLOT_PREFIX = "custom:";
export const isCustomSlotKey = (key: string) => key.startsWith(CUSTOM_SLOT_PREFIX);

// 슬롯별 저장값 맵 + 진행 요약을 제공. 저장이 없는 슬롯은 '미정'으로 본다.
export function useVendorBoard() {
  const { user } = useAuth();
  // 커플 연동 시 보드도 공유(RLS: 20260616000000). 양쪽 행을 읽어 슬롯별로 병합한다.
  const { partnerId } = useCouplePartnerId();
  const [items, setItems] = useState<Record<string, VendorBoardItem>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setItems({}); setLoading(false); return; }
    setLoading(true);
    const coupleIds = partnerId ? [user.id, partnerId] : [user.id];
    const { data } = await supabase
      .from("vendor_board_items")
      .select("slot_key, status, place_id, vendor_name, memo, custom_label, user_id")
      .in("user_id", coupleIds);
    // 슬롯별 대표행 선택: 진행도 높은 상태 우선, 동률이면 '내 행'을 대표로(편집이 내
    // 행을 향하도록). 커스텀 슬롯은 키에 UUID 가 있어 파트너 것과 자연히 분리된다.
    const map: Record<string, VendorBoardItem> = {};
    const mineByKey: Record<string, boolean> = {};
    for (const raw of (data ?? []) as (VendorBoardItem & { user_id: string })[]) {
      const { user_id, ...row } = raw;
      const mine = user_id === user.id;
      const prev = map[row.slot_key];
      if (
        !prev ||
        STATUS_RANK[row.status] > STATUS_RANK[prev.status] ||
        (STATUS_RANK[row.status] === STATUS_RANK[prev.status] && mine && !mineByKey[row.slot_key])
      ) {
        map[row.slot_key] = row;
        mineByKey[row.slot_key] = mine;
      }
    }
    setItems(map);
    setLoading(false);
  }, [user, partnerId]);

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
      custom_label: prev?.custom_label ?? null,
    };
    // 아무것도 안 채운 빈 슬롯이면 행 제거. 단 커스텀 슬롯은 라벨 자체가 내용이라 보존.
    const isEmpty = next.status === "undecided" && !next.place_id && !next.vendor_name && !next.memo && !next.custom_label;
    if (isEmpty) {
      if (prev) {
        // 삭제 실패 시 로컬 상태를 비우면 DB와 어긋난다 — 성공했을 때만 반영.
        const { error } = await supabase.from("vendor_board_items").delete().eq("user_id", user.id).eq("slot_key", slotKey);
        if (error) { console.error("vendor_board delete failed", error); return { ok: false }; }
        setItems((m) => { const c = { ...m }; delete c[slotKey]; return c; });
      }
      return { ok: true };
    }
    const { error } = await supabase
      .from("vendor_board_items")
      .upsert({ user_id: user.id, ...next }, { onConflict: "user_id,slot_key" });
    if (error) { console.error("vendor_board upsert failed", error); return { ok: false }; }
    setItems((m) => ({ ...m, [slotKey]: next }));
    return { ok: true };
  }, [user, items]);

  const removeSlot = useCallback(async (slotKey: string) => {
    if (!user) return { ok: false };
    const { error } = await supabase.from("vendor_board_items").delete().eq("user_id", user.id).eq("slot_key", slotKey);
    if (error) { console.error("vendor_board remove failed", error); return { ok: false }; }
    setItems((m) => { const c = { ...m }; delete c[slotKey]; return c; });
    return { ok: true };
  }, [user]);

  // 사용자 커스텀 슬롯 추가 — 라벨만 받아 새 행을 만든다(코드 택소노미에 없는 항목).
  const addCustomSlot = useCallback(async (label: string) => {
    const name = label.trim();
    if (!user || !name) return { ok: false };
    const slotKey = `${CUSTOM_SLOT_PREFIX}${crypto.randomUUID()}`;
    const row: VendorBoardItem = { slot_key: slotKey, status: "undecided", place_id: null, vendor_name: null, memo: null, custom_label: name };
    const { error } = await supabase.from("vendor_board_items").insert({ user_id: user.id, ...row });
    if (error) { console.error("vendor_board addCustom failed", error); return { ok: false }; }
    setItems((m) => ({ ...m, [slotKey]: row }));
    return { ok: true };
  }, [user]);

  // 커스텀 슬롯(직접 추가) 목록 — 추가한 순서가 없으니 라벨 정렬로 안정화.
  const customSlots = Object.values(items)
    .filter((i) => isCustomSlotKey(i.slot_key) && i.custom_label)
    .map((i) => ({ key: i.slot_key, label: i.custom_label as string }))
    .sort((a, b) => a.label.localeCompare(b.label, "ko"));

  // 진행 요약: 전체 슬롯(코드+커스텀) 대비 예약완료 / 견적중 수.
  const total = VENDOR_SLOTS.length + customSlots.length;
  const booked = Object.values(items).filter((i) => i.status === "booked").length;
  const quoting = Object.values(items).filter((i) => i.status === "quoting").length;

  return { items, customSlots, loading, saveSlot, removeSlot, addCustomSlot, reload: load, summary: { total, booked, quoting } };
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
  const { error } = await supabase
    .from("vendor_board_items")
    .upsert({ user_id: userId, slot_key: slotKey, status: "quoting" }, { onConflict: "user_id,slot_key" });
  if (error) console.warn("markBoardSlotQuoting failed (best-effort)", error);
}

// 견적 예약 성사 → 해당 place 카테고리의 대표 슬롯을 '예약완료'로 표시 + 선택 업체 기록.
// 반환 { ok } — 명시적 '이 업체로 결정' UI 는 성공 여부를 사용자에게 알려야 하고,
// 견적 성사 동기화(void 호출)는 결과를 무시한다(best-effort). 둘 다 호환.
export async function markBoardSlotBookedByQuoteCategory(
  userId: string,
  quoteCategory: string | null | undefined,
  placeId: string | null,
  vendorName: string | null,
): Promise<{ ok: boolean }> {
  const slot = primarySlotForQuoteCategory(quoteCategory);
  if (!slot) return { ok: false };
  const { error } = await supabase
    .from("vendor_board_items")
    .upsert(
      { user_id: userId, slot_key: slot.key, status: "booked", place_id: placeId, vendor_name: vendorName },
      { onConflict: "user_id,slot_key" },
    );
  if (error) { console.warn("markBoardSlotBookedByQuoteCategory failed", error); return { ok: false }; }
  return { ok: true };
}
