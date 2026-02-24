import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VenueHall {
  number: number;
  name: string;
  hall: string | null;
  Min_Pax: number | null;
  Max_Pax: number | null;
  Meal_Price_Min: number | null;
  Meal_Price_Max: number | null;
  description: string | null;
  image_urls: string | null;
  created_at: string;
  Keywords_Tag: string | null;
  Interval: string | null;
  sit: string | null;
  flower: string | null;
  venue_rental_fee: number | null;
  meal: string | null;
  drink: string | null;
  main_color: string | null;
  venue_id: number | null;
}

export interface VenueSpecialPoint {
  number: number;
  name: string;
  title: string;
  icon: string | null;
  description: string | null;
  created_at: string;
  venue_id: number | null;
}

export const useVenueHalls = (venueId: number | undefined) => {
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

export const useVenueSpecialPoints = (venueId: number | undefined) => {
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
