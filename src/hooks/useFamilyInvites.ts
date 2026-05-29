// 가족 초대 훅 — family_invites 테이블 + create_family_invite / redeem_family_invite RPC.
// owner: 부모님·플래너·형제 등에게 초대 코드 발급. delegated_scopes 로 권한 위임 범위 선택.
// member: 받은 코드 입력 → status='linked' 로 owner 와 연결.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type FamilyRole =
  | "parent_bride"
  | "parent_groom"
  | "sibling"
  | "child"
  | "planner"
  | "other";

export const FAMILY_ROLE_LABEL: Record<FamilyRole, string> = {
  parent_bride: "신부측 부모",
  parent_groom: "신랑측 부모",
  sibling: "형제·자매",
  child: "자녀",
  planner: "플래너",
  other: "기타",
};

export type DelegatedScope =
  | "budget_view"
  | "schedule_view"
  | "guest_manage"
  | "meal_taste";

export const SCOPE_LABEL: Record<DelegatedScope, string> = {
  budget_view: "예산 보기",
  schedule_view: "일정 보기",
  guest_manage: "하객 관리",
  meal_taste: "식사 시식 메뉴",
};

export interface FamilyInvite {
  id: string;
  owner_user_id: string;
  member_user_id: string | null;
  role: FamilyRole;
  display_name: string | null;
  invite_code: string;
  status: "pending" | "linked" | "expired";
  delegated_scopes: DelegatedScope[];
  linked_at: string | null;
  expires_at: string;
  created_at: string;
}

export const useFamilyInvites = () => {
  const { user } = useAuth();
  const [owned, setOwned] = useState<FamilyInvite[]>([]);
  const [linkedAs, setLinkedAs] = useState<FamilyInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!user) {
      setOwned([]);
      setLinkedAs([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await (supabase as any)
      .from("family_invites")
      .select(
        "id, owner_user_id, member_user_id, role, display_name, invite_code, status, delegated_scopes, linked_at, expires_at, created_at"
      )
      .or(`owner_user_id.eq.${user.id},member_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    if (!error && data) {
      const rows = data as FamilyInvite[];
      setOwned(rows.filter((r) => r.owner_user_id === user.id));
      setLinkedAs(rows.filter((r) => r.member_user_id === user.id && r.owner_user_id !== user.id));
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const create = useCallback(
    async (input: {
      role: FamilyRole;
      displayName: string;
      delegatedScopes: DelegatedScope[];
    }): Promise<{ ok: boolean; inviteCode?: string; error?: string }> => {
      if (!user) return { ok: false, error: "unauthenticated" };
      setIsWorking(true);
      try {
        const { data, error } = await (supabase as any).rpc("create_family_invite", {
          p_role: input.role,
          p_display_name: input.displayName,
          p_delegated_scopes: input.delegatedScopes,
        });
        if (error) throw error;
        await fetchAll();
        if (data?.ok) return { ok: true, inviteCode: data.invite_code };
        return { ok: false, error: data?.error ?? "unknown" };
      } catch (e: any) {
        return { ok: false, error: e?.message ?? "unknown" };
      } finally {
        setIsWorking(false);
      }
    },
    [user, fetchAll],
  );

  const redeem = useCallback(
    async (code: string): Promise<{ ok: boolean; role?: FamilyRole; error?: string }> => {
      if (!user) return { ok: false, error: "unauthenticated" };
      setIsWorking(true);
      try {
        const { data, error } = await (supabase as any).rpc("redeem_family_invite", {
          p_code: code.trim().toUpperCase(),
        });
        if (error) throw error;
        await fetchAll();
        if (data?.ok) return { ok: true, role: data.role as FamilyRole };
        return { ok: false, error: data?.error ?? "unknown" };
      } catch (e: any) {
        return { ok: false, error: e?.message ?? "unknown" };
      } finally {
        setIsWorking(false);
      }
    },
    [user, fetchAll],
  );

  const revoke = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user) return false;
      setIsWorking(true);
      try {
        const { error } = await (supabase as any)
          .from("family_invites")
          .delete()
          .eq("id", id);
        if (error) throw error;
        await fetchAll();
        return true;
      } finally {
        setIsWorking(false);
      }
    },
    [user, fetchAll],
  );

  return {
    owned,
    linkedAs,
    isLoading,
    isWorking,
    create,
    redeem,
    revoke,
    refetch: fetchAll,
  };
};
