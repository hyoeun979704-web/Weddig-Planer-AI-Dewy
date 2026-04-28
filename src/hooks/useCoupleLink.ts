import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CoupleLink {
  id: string;
  user_id: string;
  partner_user_id: string | null;
  invite_code: string;
  status: "pending" | "linked" | "unlinked";
  linked_at: string | null;
}

interface PartnerProfile {
  display_name: string | null;
  email: string | null;
}

export const useCoupleLink = () => {
  const { user } = useAuth();
  const [coupleLink, setCoupleLink] = useState<CoupleLink | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<PartnerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCoupleLink = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // 내가 생성한 커플 링크 또는 파트너로 연결된 링크 조회
      const { data, error } = await (supabase
        .from("couple_links" as any)
        .select("*") as any)
        .or(`user_id.eq.${user.id},partner_user_id.eq.${user.id}`)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setCoupleLink(data as any);

        // 파트너 프로필 가져오기
        const partnerId = (data as any).user_id === user.id ? (data as any).partner_user_id : (data as any).user_id;
        if (partnerId && (data as any).status === "linked") {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, email")
            .eq("user_id", partnerId)
            .maybeSingle();
          setPartnerProfile(profile);
        }
      }
    } catch (error) {
      console.error("Error fetching couple link:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCoupleLink();
  }, [fetchCoupleLink]);

  // 초대 코드 생성
  const generateInviteCode = async (): Promise<string | null> => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      return null;
    }

    try {
      // 이미 링크가 있으면 기존 코드 반환
      if (coupleLink) {
        return coupleLink.invite_code;
      }

      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data, error } = await (supabase
        .from("couple_links" as any) as any)
        .insert({
          user_id: user.id,
          invite_code: code,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      setCoupleLink(data as any);
      toast.success("초대 코드가 생성되었습니다");
      return code;
    } catch (error) {
      console.error("Error generating invite code:", error);
      toast.error("초대 코드 생성에 실패했습니다");
      return null;
    }
  };

  // 초대 코드로 연결
  const linkWithCode = async (code: string): Promise<boolean> => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      return false;
    }

    try {
      // 초대 코드로 링크 찾기
      const { data: link, error: findError } = await (supabase
        .from("couple_links" as any)
        .select("*") as any)
        .eq("invite_code", code.toUpperCase())
        .eq("status", "pending")
        .maybeSingle();

      if (findError) throw findError;
      if (!link) {
        toast.error("유효하지 않은 초대 코드예요");
        return false;
      }

      if ((link as any).user_id === user.id) {
        toast.error("본인의 초대 코드는 사용할 수 없어요");
        return false;
      }

      // 연결 처리
      const { data: updated, error: updateError } = await (supabase
        .from("couple_links" as any) as any)
        .update({
          partner_user_id: user.id,
          status: "linked",
          linked_at: new Date().toISOString(),
        })
        .eq("id", (link as any).id)
        .select()
        .single();

      if (updateError) throw updateError;

      // 양쪽 user_wedding_settings에 partner_user_id 저장
      await Promise.all([
        (supabase
          .from("user_wedding_settings") as any)
          .upsert({ user_id: (link as any).user_id, partner_user_id: user.id }, { onConflict: "user_id" }),
        (supabase
          .from("user_wedding_settings") as any)
          .upsert({ user_id: user.id, partner_user_id: (link as any).user_id }, { onConflict: "user_id" }),
      ]);

      setCoupleLink(updated as any);
      await fetchCoupleLink(); // 파트너 프로필 다시 로드
      toast.success("커플이 연결되었습니다! 💕");
      return true;
    } catch (error) {
      console.error("Error linking couple:", error);
      toast.error("연결에 실패했습니다");
      return false;
    }
  };

  // 연결 해제
  const unlinkCouple = async (): Promise<boolean> => {
    if (!coupleLink) return false;

    try {
      await (supabase
        .from("couple_links" as any) as any)
        .update({ status: "unlinked", partner_user_id: null })
        .eq("id", coupleLink.id);

      setCoupleLink(null);
      setPartnerProfile(null);
      toast.success("커플 연결이 해제되었습니다");
      return true;
    } catch (error) {
      console.error("Error unlinking:", error);
      toast.error("연결 해제에 실패했습니다");
      return false;
    }
  };

  const isLinked = coupleLink?.status === "linked";
  const partnerUserId =
    isLinked && coupleLink && user
      ? coupleLink.user_id === user.id
        ? coupleLink.partner_user_id
        : coupleLink.user_id
      : null;

  return {
    coupleLink,
    partnerProfile,
    partnerUserId,
    isLinked,
    isLoading,
    generateInviteCode,
    linkWithCode,
    unlinkCouple,
    refetch: fetchCoupleLink,
  };
};
