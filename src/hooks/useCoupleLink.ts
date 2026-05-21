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
      // 내가 생성했거나 파트너로 연결된 '활성'(pending/linked) 링크만 조회.
      // unlinked 행은 제외해야 재초대가 막히지 않는다. 여러 행이 있어도
      // linked 를 우선(상태 오름차순: linked < pending)하고 첫 행만 사용한다.
      const { data: rows, error } = await (supabase
        .from("couple_links" as any)
        .select("*") as any)
        .or(`user_id.eq.${user.id},partner_user_id.eq.${user.id}`)
        .in("status", ["linked", "pending"])
        .order("status", { ascending: true })
        .order("linked_at", { ascending: false, nullsFirst: false });

      if (error) throw error;

      const data = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

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
        } else {
          setPartnerProfile(null);
        }
      } else {
        // 활성 링크 없음 — 이전 상태 잔여 제거(해제/만료 후).
        setCoupleLink(null);
        setPartnerProfile(null);
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
  const linkWithCode = async (code: string): Promise<boolean> => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      return false;
    }

    // Normalize: strip whitespace + uppercase. Partners often paste codes
    // with stray spaces from a kakao share.
    const normalized = code.trim().toUpperCase().replace(/\s+/g, "");
    if (normalized.length === 0) {
      toast.error("초대 코드를 입력해주세요");
      return false;
    }

    try {
      // 초대 코드로 링크 찾기
      const { data: link, error: findError } = await (supabase
        .from("couple_links" as any)
        .select("*") as any)
        .eq("invite_code", normalized)
        .eq("status", "pending")
        .maybeSingle();

      if (findError) throw findError;
      if (!link) {
        toast.error("초대 코드를 찾을 수 없어요. 6자리가 맞는지 확인해주세요");
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
      toast.success("커플이 연결되었습니다! ");
      return true;
    } catch (error) {
      console.error("Error linking couple:", error);
      toast.error("연결에 실패했습니다");
      return false;
    }
  };

  // 연결 해제
  const unlinkCouple = async (): Promise<boolean> => {
    if (!coupleLink || !user) return false;

    // 연결됐던 양쪽 user_id (settings 정리에 사용)
    const aId = coupleLink.user_id;
    const bId =
      coupleLink.partner_user_id ??
      (coupleLink.user_id === user.id ? null : user.id);

    try {
      await (supabase
        .from("couple_links" as any) as any)
        .update({ status: "unlinked", partner_user_id: null })
        .eq("id", coupleLink.id);

      // 양쪽 결혼 설정에서 partner_user_id 제거 — 안 지우면 공유 기능이 계속
      // 연결된 것으로 동작한다.
      const ids = [aId, bId].filter((v): v is string => !!v);
      await Promise.all(
        ids.map((id) =>
          (supabase.from("user_wedding_settings") as any)
            .update({ partner_user_id: null })
            .eq("user_id", id),
        ),
      );

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
