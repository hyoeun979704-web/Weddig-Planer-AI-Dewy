// 홀 예약 가능일 — 파트너(소유자) 쓰기 데이터 레이어. RLS 가 소유자만 쓰기 허용.
import { supabase } from "@/integrations/supabase/client";
import type { AvailabilityStatus } from "@/lib/hallAvailability";

export type AvailabilityMap = Record<string, AvailabilityStatus>;

/** 이 place 의 오늘 이후 가능일 맵(소유자 관리 화면용). 공개 read 정책이라 조회는 자유. */
export async function fetchMyAvailability(placeId: string): Promise<AvailabilityMap> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data, error } = await (supabase as any)
    .from("place_availability")
    .select("date, status")
    .eq("place_id", placeId)
    .gte("date", today.toISOString().slice(0, 10))
    .order("date", { ascending: true })
    .limit(400);
  if (error) throw error;
  const map: AvailabilityMap = {};
  for (const r of (data ?? []) as { date: string; status: AvailabilityStatus }[]) map[r.date] = r.status;
  return map;
}

/** 날짜 상태 upsert. RLS: owner_user_id=auth.uid() + place 소유 확인. */
export async function setAvailability(
  placeId: string,
  ownerUserId: string,
  date: string,
  status: AvailabilityStatus,
): Promise<void> {
  const { error } = await (supabase as any)
    .from("place_availability")
    .upsert(
      { place_id: placeId, owner_user_id: ownerUserId, date, status, updated_at: new Date().toISOString() },
      { onConflict: "place_id,date" },
    );
  if (error) throw error;
}

/** 날짜 표시 제거(미표시로 되돌림). */
export async function clearAvailability(placeId: string, date: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("place_availability")
    .delete()
    .eq("place_id", placeId)
    .eq("date", date);
  if (error) throw error;
}
