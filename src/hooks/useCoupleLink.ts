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
  // couple_links.status='linked' 여도 user_wedding_settings.partner_user_id 가
  // 동기화 안 됐으면 공유 기능이 실제로는 동작하지 않는 '반쪽 연동'. UI 가
  // 가짜로 연결된 것처럼 보이지 않도록 별도 추적한다(자가복구도 시도).
  const [settingsSynced, setSettingsSynced] = useState(true);

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

          // 자가복구 — 내 결혼 설정의 partner_user_id 가 실제 파트너와 일치하는지
          // 확인. 불일치(옛 연동이라 미동기화 등)면 RLS 우회 RPC 로 양쪽 재동기화.
          const { data: settings } = await (supabase
            .from("user_wedding_settings") as any)
            .select("partner_user_id")
            .eq("user_id", user.id)
            .maybeSingle();
          const synced = (settings as any)?.partner_user_id === partnerId;
          setSettingsSynced(synced);
          if (!synced) {
            const { data: res } = await (supabase as any).rpc("resync_couple_settings");
            if ((res as { ok?: boolean })?.ok) setSettingsSynced(true);
          }
        } else {
          setPartnerProfile(null);
          setSettingsSynced(true);
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
      // 초대 코드 lookup + redeem 은 RLS 우회가 필요(파트너 후보는 아직 행을
      // 조회할 수 없음). SECURITY DEFINER RPC 로 원자 처리한다. 직접 테이블
      // 쿼리는 RLS 에 막혀 항상 "찾을 수 없어요"가 됐음.
      const { data, error } = await (supabase as any).rpc(
        "redeem_couple_invite",
        { p_code: normalized },
      );
      if (error) throw error;

      const res = data as { ok: boolean; error?: string };
      if (!res?.ok) {
        const messages: Record<string, string> = {
          not_found: "초대 코드를 찾을 수 없어요. 6자리가 맞는지 확인해주세요",
          own_code: "본인의 초대 코드는 사용할 수 없어요",
          already_redeemed: "이미 사용된 초대 코드예요",
          empty_code: "초대 코드를 입력해주세요",
          auth_required: "로그인이 필요합니다",
        };
        toast.error(messages[res?.error ?? ""] ?? "연결에 실패했습니다");
        return false;
      }

      await fetchCoupleLink(); // linked 상태 + 파트너 프로필 로드
      toast.success("커플이 연결되었습니다!");
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

  // 사용자가 직접 누르는 '재동기화' — 자동 복구가 실패했을 때의 수동 경로.
  const resyncSettings = useCallback(async (): Promise<boolean> => {
    try {
      const { data: res, error } = await (supabase as any).rpc("resync_couple_settings");
      if (error) throw error;
      if ((res as { ok?: boolean })?.ok) {
        setSettingsSynced(true);
        toast.success("연동을 다시 동기화했어요");
        return true;
      }
      toast.error("재동기화에 실패했어요");
      return false;
    } catch (error) {
      console.error("Error resyncing couple settings:", error);
      toast.error("재동기화에 실패했어요");
      return false;
    }
  }, []);

  const isLinked = coupleLink?.status === "linked";

  return {
    coupleLink,
    partnerProfile,
    isLinked,
    settingsSynced,
    isLoading,
    generateInviteCode,
    linkWithCode,
    unlinkCouple,
    resyncSettings,
    refetch: fetchCoupleLink,
  };
};
