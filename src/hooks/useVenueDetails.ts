import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Shape consumed by VenueHallTab (legacy). Mapped from place_halls rows.
export interface VenueHall {
  id: string;
  venue_id: string;
  name: string;
  hall_type: string | null;
  capacity_min: number | null;
  capacity_max: number | null;
  price_per_person: number | null;
  meal_price: number | null;
  ceremony_fee: number | null;
  size_pyeong: number | null;
  floor: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

export const useVenueHalls = (placeId: string | undefined) => {
  return useQuery({
    queryKey: ["venue_halls", placeId],
    queryFn: async (): Promise<VenueHall[]> => {
      const { data, error } = await supabase
        .from("place_halls")
        .select("*")
        .eq("place_id", placeId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((h: any) => ({
        id: h.hall_id,
        venue_id: h.place_id,
        name: h.hall_name ?? h.hall_type ?? "홀",
        hall_type: h.hall_type,
        capacity_min: h.capacity_seated ?? h.min_guarantee,
        capacity_max: h.capacity_standing ?? h.max_guarantee,
        price_per_person: h.meal_price ? Number(h.meal_price) : null,
        meal_price: h.meal_price ? Number(h.meal_price) : null,
        ceremony_fee: h.rental_fee ? Number(h.rental_fee) : null,
        size_pyeong: null,
        floor: h.floor,
        thumbnail_url: h.main_image_url,
        created_at: h.created_at ?? "",
        updated_at: h.created_at ?? "",
      }));
    },
    enabled: !!placeId,
  });
};

// Mapped from place_details.advantage_1/2/3_title/content into the legacy
// shape that VenueInfoTab already renders.
export interface VenueSpecialPoint {
  id: string;
  venue_id: string;
  title: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  created_at: string;
}

export const useVenueSpecialPoints = (placeId: string | undefined) => {
  return useQuery({
    queryKey: ["venue_special_points", placeId],
    queryFn: async (): Promise<VenueSpecialPoint[]> => {
      if (!placeId) return [];
      const { data, error } = await supabase
        .from("place_details")
        .select(
          "advantage_1_title,advantage_1_content,advantage_2_title,advantage_2_content,advantage_3_title,advantage_3_content"
        )
        .eq("place_id", placeId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return [];

      const points: VenueSpecialPoint[] = [];
      for (let i = 1; i <= 3; i++) {
        const title = (data as Record<string, unknown>)[`advantage_${i}_title`];
        const content = (data as Record<string, unknown>)[`advantage_${i}_content`];
        if (typeof title === "string" && title.trim()) {
          points.push({
            id: `${placeId}-adv${i}`,
            venue_id: placeId,
            title,
            description: typeof content === "string" ? content : null,
            icon: null,
            category: null,
            created_at: "",
          });
        }
      }
      return points;
    },
    enabled: !!placeId,
  });
};
