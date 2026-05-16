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

      // Avoid 0/O/1/I/L — these get mistyped by partners reading off a phone.
      const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
      const code = Array.from({ length: 6 }, () =>
        ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
      ).join("");

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
  //
  // RLS 때문에 클라이언트에서 직접 invite_code를 조회할 수 없어 (couple_links
  // SELECT 정책: user_id 또는 partner_user_id 일치 필요 — 코드 입력자는
  // 아직 둘 다 아님), SECURITY DEFINER RPC redeem_couple_invite로 lookup +
  // update를 한 번에 처리. 마이그레이션 20260516180000 참고.
  const linkWithCode = async (code: string): Promise<boolean> => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      return false;
    }

    // Normalize: strip whitespace + uppercase. Partners often paste codes
    // with stray spaces from a kakao share. The RPC normalizes too — keeping
    // this client-side check lets us short-circuit empty input without a
    // round-trip.
    const normalized = code.trim().toUpperCase().replace(/\s+/g, "");
    if (normalized.length === 0) {
      toast.error("초대 코드를 입력해주세요");
      return false;
    }

    try {
      const { data, error } = await (supabase as any).rpc("redeem_couple_invite", {
        p_code: normalized,
      });
      if (error) throw error;

      const result = (data ?? {}) as { ok?: boolean; error?: string };
      if (!result.ok) {
        switch (result.error) {
          case "auth_required":
            toast.error("로그인이 필요합니다");
            break;
          case "empty_code":
            toast.error("초대 코드를 입력해주세요");
            break;
          case "not_found":
            toast.error("초대 코드를 찾을 수 없어요. 6자리가 맞는지 확인해주세요");
            break;
          case "own_code":
            toast.error("본인의 초대 코드는 사용할 수 없어요");
            break;
          case "already_redeemed":
            toast.error("이미 사용된 초대 코드예요");
            break;
          default:
            toast.error("연결에 실패했습니다");
        }
        return false;
      }

      // Refetch pulls the freshly-linked row (now visible under the SELECT
      // policy since auth.uid() is partner_user_id) and loads the partner
      // profile so UI flips to the linked state immediately.
      await fetchCoupleLink();
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

  return {
    coupleLink,
    partnerProfile,
    isLinked,
    isLoading,
    generateInviteCode,
    linkWithCode,
    unlinkCouple,
    refetch: fetchCoupleLink,
  };
};
