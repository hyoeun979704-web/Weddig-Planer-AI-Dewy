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
  approval_status: string;
  review_note: string | null;
  /** 기업회원 등급 — basic(일반) / friends(프렌즈·제휴) / bff(이달의 베프) */
  partner_tier: "basic" | "friends" | "bff";
}

export const useUserRole = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<string[]>([]);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // 역할 조회 실패를 "권한 없음"과 구분한다. 일시적 네트워크 오류로 승인된
  // 사업자가 온보딩 화면으로 튕기는 것을 막기 위해 호출부에서 활용한다.
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setBusinessProfile(null);
      setIsError(false);
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsError(false);
      try {
        // Fetch roles
        const { data: roleData, error: roleError } = await (supabase as any)
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        if (roleError) throw roleError;

        const userRoles = roleData?.map((r: { role: string }) => r.role) || [];
        setRoles(userRoles);

        // Fetch business profile if business role
        if (userRoles.includes("business")) {
          const { data: bpData, error: bpError } = await (supabase as any)
            .from("business_profiles")
            .select("id, business_name, business_number, representative_name, service_category, is_verified, vendor_id, approval_status, review_note, partner_tier")
            .eq("user_id", user.id)
            .maybeSingle();
          if (bpError) throw bpError;

          setBusinessProfile(bpData || null);
        }
      } catch (e) {
        console.error("Error fetching user role:", e);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  return {
    roles,
    isLoading,
    isError,
    isBusiness: roles.includes("business"),
    isAdmin: roles.includes("admin"),
    isIndividual: roles.includes("individual"),
    businessProfile,
    needsOnboarding: user?.user_metadata?.account_type === "business" && !roles.includes("business"),
  };
};
