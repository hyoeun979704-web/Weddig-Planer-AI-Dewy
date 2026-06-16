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
      // 재조회 동안 로딩을 true 로 유지한다. 이게 없으면 직접 진입/새로고침 시
      // 첫 마운트의 `!user` 분기가 setIsLoading(false) 로 둔 상태에서 user 가
      // 뒤늦게 들어와 fetch 가 도는 동안 로딩이 false 로 남는다. 그러면
      // setRoles → (await) → setBusinessProfile 사이 갭에서 isBusiness=true 인데
      // businessProfile=null 인 중간 렌더가 커밋되고, requireApproved 가드가
      // 이를 "미승인"으로 오판해 승인된 업체를 대시보드로 튕긴다(딥링크/새로고침
      // 한정 버그). 로딩을 켜두면 roles·profile 이 모두 도착한 뒤에만 판정된다.
      setIsLoading(true);
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
