import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface BusinessProfile {
  id: string;
  business_name: string;
  business_number: string;
  representative_name: string;
  service_category: string;
  is_verified: boolean;
  vendor_id: number | null;
}

export const useUserRole = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<string[]>([]);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setBusinessProfile(null);
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch roles
        const { data: roleData } = await (supabase as any)
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        const userRoles = roleData?.map((r: { role: string }) => r.role) || [];
        setRoles(userRoles);

        // Fetch business profile if business role
        if (userRoles.includes("business")) {
          const { data: bpData } = await (supabase as any)
            .from("business_profiles")
            .select("id, business_name, business_number, representative_name, service_category, is_verified, vendor_id")
            .eq("user_id", user.id)
            .maybeSingle();

          setBusinessProfile(bpData || null);
        }
      } catch (e) {
        console.error("Error fetching user role:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  return {
    roles,
    isLoading,
    isBusiness: roles.includes("business"),
    isAdmin: roles.includes("admin"),
    isIndividual: roles.includes("individual"),
    businessProfile,
    needsOnboarding: user?.user_metadata?.account_type === "business" && !roles.includes("business"),
  };
};
