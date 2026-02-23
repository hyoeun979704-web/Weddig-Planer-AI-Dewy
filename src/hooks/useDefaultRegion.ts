import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useDefaultRegion = () => {
  const { user } = useAuth();
  const [defaultRegion, setDefaultRegion] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchRegion = async () => {
      if (!user) {
        setIsLoaded(true);
        return;
      }

      try {
        const { data } = await supabase
          .from("user_wedding_settings")
          .select("wedding_region")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data && (data as any).wedding_region) {
          setDefaultRegion((data as any).wedding_region);
        }
      } catch (error) {
        console.error("Error fetching default region:", error);
      } finally {
        setIsLoaded(true);
      }
    };

    fetchRegion();
  }, [user]);

  return { defaultRegion, isLoaded };
};
