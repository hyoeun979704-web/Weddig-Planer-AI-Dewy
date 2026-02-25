import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

export interface VenueSpecialPoint {
  id: string;
  venue_id: string;
  title: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  created_at: string;
}

export const useVenueHalls = (venueId: string | undefined) => {
  return useQuery({
    queryKey: ["venue_halls", venueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venue_halls")
        .select("*")
        .eq("venue_id", venueId!)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as VenueHall[];
    },
    enabled: !!venueId,
  });
};

export const useVenueSpecialPoints = (venueId: string | undefined) => {
  return useQuery({
    queryKey: ["venue_special_points", venueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venue_special_points")
        .select("*")
        .eq("venue_id", venueId!)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as VenueSpecialPoint[];
    },
    enabled: !!venueId,
  });
};
