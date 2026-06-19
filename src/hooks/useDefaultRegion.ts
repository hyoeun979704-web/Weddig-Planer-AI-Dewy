import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logClientError } from "@/lib/errorLog";

export const useDefaultRegion = () => {
  const { user } = useAuth();
  const [defaultRegion, setDefaultRegion] = useState<string | null>(null);
  // 시군구 — P6(천안)·P11(종로구)·P12(양평) 페르소나가 시도 단위만 필터링되면 페인 그대로.
  // value 는 places.district ILIKE 와 매칭. NULL 이면 시도 필터만 적용.
  const [defaultSigungu, setDefaultSigungu] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchRegion = async () => {
      if (!user) {
        setIsLoaded(true);
        return;
      }

      try {
        const { data } = await (supabase as any)
          .from("user_wedding_settings")
          .select("wedding_region, wedding_region_sigungu")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data) {
          if ((data as any).wedding_region) {
            setDefaultRegion((data as any).wedding_region);
          }
          if ((data as any).wedding_region_sigungu) {
            setDefaultSigungu((data as any).wedding_region_sigungu);
          }
        }
      } catch (error) {
        console.error("Error fetching default region:", error);
        void logClientError({ message: `default region fetch failed: ${(error as Error)?.message ?? String(error)}`, source: "data-fetch" });
      } finally {
        setIsLoaded(true);
      }
    };

    fetchRegion();
  }, [user]);

  return { defaultRegion, defaultSigungu, isLoaded };
};
