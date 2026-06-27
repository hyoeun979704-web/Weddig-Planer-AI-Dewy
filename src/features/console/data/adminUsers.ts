// 회원 관리 데이터 접근 레이어 (Task #3 — console 도메인).
// 패턴: docs/data-access-layer.md. AdminUsers 의 profiles 집계(역할·하트·피팅·소속) + 운영자 RPC 를
// 여기로 모은다. admin_* RPC 는 types 에 존재 → (supabase as any) 캐스트 제거.

import { supabase } from "@/integrations/supabase/client";
import { MEMBER_TIERS, type MemberTier } from "@/lib/memberTier";

export type Affiliation = "individual" | "business" | "partner";

export interface UserProfile {
  user_id: string;
  email: string | null;
  nickname: string | null;
  community_nickname: string | null;
  created_at: string;
  member_tier: MemberTier;
  roles: string[];
  affiliation: Affiliation;
  hearts_balance: number;
  hearts_spent: number;
  fittings_count: number;
}

export interface AffiliationResult {
  ok: boolean;
  error?: string;
}

export const adminUsersKeys = {
  all: ["admin", "users"] as const,
  list: () => [...adminUsersKeys.all, "list"] as const,
};

const PROFILE_LIMIT = 200;

/**
 * 최근 가입 200명을 기준으로 역할·하트·피팅·소속을 병렬 조인해 매핑.
 * profiles 조회 실패는 throw(호출부 토스트). 부가 목록 실패는 빈 매핑으로 graceful.
 */
export async function fetchUsersWithDetails(): Promise<UserProfile[]> {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("user_id, email, display_name, community_nickname, created_at, member_tier")
    .order("created_at", { ascending: false })
    .limit(PROFILE_LIMIT);
  if (error) throw error;

  const rows = (profiles ?? []) as Array<{
    user_id: string;
    email: string | null;
    display_name: string | null;
    community_nickname: string | null;
    created_at: string;
    member_tier: string;
  }>;
  const userIds = rows.map((p) => p.user_id);
  if (userIds.length === 0) return [];

  const [rolesRes, heartsRes, fittingsRes, affRes] = await Promise.all([
    supabase.from("user_roles").select("user_id, role").in("user_id", userIds),
    supabase.from("user_hearts").select("user_id, balance, total_spent").in("user_id", userIds),
    supabase.from("dress_fittings").select("user_id").in("user_id", userIds),
    // business_profiles 는 owner-only RLS → admin RPC 로 소속(일반/기업/제휴) 조회.
    supabase.rpc("admin_get_member_affiliations", { p_user_ids: userIds }),
  ]);

  const affByUser: Record<string, Affiliation> = {};
  ((affRes.data as Array<{ user_id: string; affiliation: string }>) ?? []).forEach((a) => {
    affByUser[a.user_id] = a.affiliation as Affiliation;
  });
  const rolesByUser: Record<string, string[]> = {};
  ((rolesRes.data as Array<{ user_id: string; role: string }>) ?? []).forEach((r) => {
    rolesByUser[r.user_id] = [...(rolesByUser[r.user_id] ?? []), r.role];
  });
  const heartsByUser: Record<string, { balance: number; spent: number }> = {};
  ((heartsRes.data as Array<{ user_id: string; balance: number; total_spent: number }>) ?? []).forEach((hb) => {
    heartsByUser[hb.user_id] = { balance: hb.balance, spent: hb.total_spent };
  });
  const fittingCountByUser: Record<string, number> = {};
  ((fittingsRes.data as Array<{ user_id: string }>) ?? []).forEach((f) => {
    fittingCountByUser[f.user_id] = (fittingCountByUser[f.user_id] ?? 0) + 1;
  });

  return rows.map((p) => ({
    user_id: p.user_id,
    email: p.email,
    nickname: p.display_name,
    community_nickname: p.community_nickname ?? null,
    created_at: p.created_at,
    member_tier: ((MEMBER_TIERS as readonly string[]).includes(p.member_tier) ? p.member_tier : "basic") as MemberTier,
    roles: rolesByUser[p.user_id] ?? [],
    affiliation: affByUser[p.user_id] ?? "individual",
    hearts_balance: heartsByUser[p.user_id]?.balance ?? 0,
    hearts_spent: heartsByUser[p.user_id]?.spent ?? 0,
    fittings_count: fittingCountByUser[p.user_id] ?? 0,
  }));
}

/** 회원 등급 변경 — 운영자 전용 RPC. 에러 시 throw(호출부가 낙관적 갱신 롤백). */
export async function setMemberTier(userId: string, tier: MemberTier): Promise<void> {
  const { error } = await supabase.rpc("admin_set_member_tier", { p_user_id: userId, p_tier: tier });
  if (error) throw error;
}

/** 회원 유형 원자적 전환 — RPC 가 역할·프로필·승인·제휴등급을 한 번에 세팅. */
export async function setMemberAffiliation(
  userId: string,
  affiliation: Affiliation,
  serviceCategory: string | null,
): Promise<AffiliationResult> {
  const { data, error } = await supabase.rpc("admin_set_member_affiliation", {
    p_user_id: userId,
    p_affiliation: affiliation,
    p_service_category: affiliation === "individual" ? null : serviceCategory,
  });
  const res = data as { ok?: boolean; error?: string } | null;
  if (error || !res?.ok) return { ok: false, error: res?.error || error?.message || "오류" };
  return { ok: true };
}
