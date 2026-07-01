// 홀 예약 가능일 조회(소비자·공개). place_availability 를 오늘 이후로 읽어 date→status 맵 반환.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AvailabilityStatus } from "@/lib/hallAvailability";

export type AvailabilityMap = Record<string, AvailabilityStatus>;

export function useHallAvailability(placeId: string | undefined, enabled = true) {
  return useQuery<AvailabilityMap>({
    queryKey: ["hall-availability", placeId],
    enabled: !!placeId && enabled,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString().slice(0, 10);
      const { data, error } = await (supabase as any)
        .from("place_availability")
        .select("date, status")
        .eq("place_id", placeId)
        .gte("date", todayIso)
        .order("date", { ascending: true })
        .limit(400);
      if (error) throw error;
      const map: AvailabilityMap = {};
      for (const r of (data ?? []) as { date: string; status: AvailabilityStatus }[]) {
        map[r.date] = r.status;
      }
      return map;
    },
  });
}
