import { useEffect, useState, useCallback } from "react";
import { Loader2, Search, Heart, Crown, Shield, User as UserIcon, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { MEMBER_TIERS, memberTierLabel, type MemberTier } from "@/lib/memberTier";
import { SERVICE_CATEGORIES } from "@/lib/businessCategories";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Affiliation = "individual" | "business" | "partner";
const AFFILIATION_LABEL: Record<Affiliation, string> = {
  individual: "일반회원",
  business: "기업회원",
  partner: "제휴업체",
};

interface UserProfile {
  user_id: string;
  email: string | null;
  nickname: string | null;
  community_nickname: string | null;
  created_at: string;
  member_tier: MemberTier;
  // 조인된 데이터
  roles: string[];
  affiliation: Affiliation;
  hearts_balance: number;
  hearts_spent: number;
  fittings_count: number;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  // 소속/역할 필터 — 긴 목록에서 기업·제휴·운영자만 빠르게 추리기(클라 필터, 로드된 200명 대상).
  const [affFilter, setAffFilter] = useState<Affiliation | "all">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin">("all");
  // 회원 유형(일반/기업/제휴) 전환 다이얼로그.
  const [convTarget, setConvTarget] = useState<UserProfile | null>(null);
  const [convAff, setConvAff] = useState<Affiliation>("business");
  const [convCat, setConvCat] = useState<string>(SERVICE_CATEGORIES[0].value);
  const [converting, setConverting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    // profiles 기준으로 조회 (auth.users는 직접 조회 어려움)
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("user_id, email, display_name, community_nickname, created_at, member_tier")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      toast({ title: "불러오기 실패", description: error.message, variant: "destructive" });
      setIsLoading(false);
      return;
    }

    const userIds = (profiles ?? []).map((p: any) => p.user_id);
    if (userIds.length === 0) {
      setUsers([]);
      setIsLoading(false);
      return;
    }

    // 역할·하트·피팅·소속 데이터 병렬 조회
    const [rolesRes, heartsRes, fittingsRes, affRes] = await Promise.all([
      supabase.from("user_roles").select("user_id, role").in("user_id", userIds),
      supabase
        .from("user_hearts")
        .select("user_id, balance, total_spent")
        .in("user_id", userIds),
      supabase
        .from("dress_fittings")
        .select("user_id")
        .in("user_id", userIds),
      // business_profiles 는 owner-only RLS → admin RPC 로 소속(일반/기업/제휴) 조회.
      (supabase as any).rpc("admin_get_member_affiliations", { p_user_ids: userIds }),
    ]);
    const affByUser: Record<string, Affiliation> = {};
    ((affRes as any)?.data ?? []).forEach((a: any) => {
      affByUser[a.user_id] = a.affiliation as Affiliation;
    });

    // 매핑 작성
    const rolesByUser: Record<string, string[]> = {};
    (rolesRes.data ?? []).forEach((r: any) => {
      rolesByUser[r.user_id] = [...(rolesByUser[r.user_id] ?? []), r.role];
    });
    const heartsByUser: Record<string, { balance: number; spent: number }> = {};
    (heartsRes.data ?? []).forEach((h: any) => {
      heartsByUser[h.user_id] = { balance: h.balance, spent: h.total_spent };
    });
    const fittingCountByUser: Record<string, number> = {};
    (fittingsRes.data ?? []).forEach((f: any) => {
      fittingCountByUser[f.user_id] = (fittingCountByUser[f.user_id] ?? 0) + 1;
    });

    const merged: UserProfile[] = (profiles ?? []).map((p: any) => ({
      user_id: p.user_id,
      email: p.email,
      nickname: p.display_name,
      community_nickname: p.community_nickname ?? null,
      created_at: p.created_at,
      member_tier: (MEMBER_TIERS as string[]).includes(p.member_tier) ? p.member_tier : "basic",
      roles: rolesByUser[p.user_id] ?? [],
      affiliation: affByUser[p.user_id] ?? "individual",
      hearts_balance: heartsByUser[p.user_id]?.balance ?? 0,
      hearts_spent: heartsByUser[p.user_id]?.spent ?? 0,
      fittings_count: fittingCountByUser[p.user_id] ?? 0,
    }));

    setUsers(merged);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // 회원 등급 변경 — 운영자 전용 RPC. 낙관적 갱신 + 실패 롤백.
  const changeTier = useCallback(async (userId: string, tier: MemberTier) => {
    let prev: MemberTier = "basic";
    setUsers((list) =>
      list.map((u) => {
        if (u.user_id !== userId) return u;
        prev = u.member_tier;
        return { ...u, member_tier: tier };
      }),
    );
    const { error } = await supabase.rpc("admin_set_member_tier", {
      p_user_id: userId,
      p_tier: tier,
    });
    if (error) {
      setUsers((list) => list.map((u) => (u.user_id === userId ? { ...u, member_tier: prev } : u)));
      toast({ title: "등급 변경 실패", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "등급을 변경했어요", description: `${memberTierLabel(tier)} 등급으로 설정` });
    }
  }, []);

  // 회원 유형 원자적 전환 — RPC 가 역할·프로필·승인·제휴등급을 한 번에 세팅.
  const submitAffiliation = useCallback(async () => {
    if (!convTarget) return;
    setConverting(true);
    const { data, error } = await (supabase as any).rpc("admin_set_member_affiliation", {
      p_user_id: convTarget.user_id,
      p_affiliation: convAff,
      p_service_category: convAff === "individual" ? null : convCat,
    });
    setConverting(false);
    const res = data as { ok?: boolean; error?: string } | null;
    if (error || !res?.ok) {
      toast({ title: "변경 실패", description: res?.error ?? error?.message ?? "오류", variant: "destructive" });
      return;
    }
    setUsers((list) =>
      list.map((u) =>
        u.user_id === convTarget.user_id
          ? {
              ...u,
              affiliation: convAff,
              roles:
                convAff === "individual"
                  ? u.roles.filter((r) => r !== "business")
                  : Array.from(new Set([...u.roles, "business"])),
            }
          : u,
      ),
    );
    toast({ title: "회원 유형을 변경했어요", description: `${convTarget.nickname || convTarget.email || "회원"} → ${AFFILIATION_LABEL[convAff]}` });
    setConvTarget(null);
  }, [convTarget, convAff, convCat]);

  const openConvert = useCallback((u: UserProfile) => {
    setConvAff(u.affiliation === "individual" ? "business" : u.affiliation);
    setConvCat(SERVICE_CATEGORIES[0].value);
    setConvTarget(u);
  }, []);

  const filtered = users.filter((u) => {
    if (affFilter !== "all" && u.affiliation !== affFilter) return false;
    if (roleFilter === "admin" && !u.roles.includes("admin")) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return u.email?.toLowerCase().includes(q) || u.nickname?.toLowerCase().includes(q);
  });

  return (
    <AdminGuard>
      <AdminLayout title="사용자 관리" description="가입 사용자 조회 (최대 200명)">
        {/* 검색 바 */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이메일·닉네임 검색"
            className="pl-9"
          />
        </div>

        {/* 소속/역할 필터 — 로드된 목록(최대 200명) 대상 빠른 추리기 */}
        <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-0.5">
          {([
            { v: "all", label: "전체" },
            { v: "individual", label: "일반회원" },
            { v: "business", label: "기업회원" },
            { v: "partner", label: "제휴업체" },
          ] as const).map((o) => (
            <button
              key={o.v}
              onClick={() => setAffFilter(o.v as Affiliation | "all")}
              className={cn(
                "shrink-0 px-2.5 py-1 rounded-full text-[12px] font-medium border transition-colors",
                affFilter === o.v ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground",
              )}
            >
              {o.label}
            </button>
          ))}
          <span className="mx-1 w-px h-4 bg-border shrink-0" />
          <button
            onClick={() => setRoleFilter(roleFilter === "admin" ? "all" : "admin")}
            className={cn(
              "shrink-0 px-2.5 py-1 rounded-full text-[12px] font-medium border transition-colors",
              roleFilter === "admin" ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground",
            )}
          >
            운영자만
          </button>
          <span className="shrink-0 ml-auto text-[11px] text-muted-foreground pl-2">{filtered.length}명</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState search={search} />
        ) : (
          <div className="bg-background rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-muted text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold">이름 · 커뮤니티 닉네임 · 계정</th>
                    <th className="text-left px-4 py-2 font-semibold">역할</th>
                    <th className="text-left px-4 py-2 font-semibold">회원 등급</th>
                    <th className="text-right px-4 py-2 font-semibold">하트 잔액</th>
                    <th className="text-right px-4 py-2 font-semibold">사용 하트</th>
                    <th className="text-right px-4 py-2 font-semibold">피팅</th>
                    <th className="text-left px-4 py-2 font-semibold">가입일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((u) => (
                    <tr key={u.user_id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        {/* 이름(display_name) + 커뮤니티 닉네임(community_nickname) 분리 — 같은 값 오인 방지 */}
                        <div className="text-foreground">{u.nickname || "(이름 없음)"}</div>
                        {u.community_nickname && (
                          <div className="text-[11px] text-primary truncate max-w-xs">커뮤니티: {u.community_nickname}</div>
                        )}
                        <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                          {u.email || u.user_id}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          {u.roles.length === 0 && (
                            <RoleBadge role="individual" />
                          )}
                          {u.roles.map((r) => (
                            <RoleBadge key={r} role={r} />
                          ))}
                          {u.affiliation === "partner" && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">제휴</span>
                          )}
                        </div>
                        <button
                          onClick={() => openConvert(u)}
                          className="mt-1 text-[11px] text-primary underline underline-offset-2"
                        >
                          유형 변경
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={u.member_tier}
                          onChange={(e) => changeTier(u.user_id, e.target.value as MemberTier)}
                          className="text-xs border border-border rounded-md px-2 py-1 bg-background text-foreground"
                          aria-label={`${u.nickname || u.email || "회원"} 등급 변경`}
                        >
                          {MEMBER_TIERS.map((t) => (
                            <option key={t} value={t}>{memberTierLabel(t)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-foreground">
                          <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                          {u.hearts_balance}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {u.hearts_spent.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-foreground">
                        {u.fittings_count}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(u.created_at).toLocaleDateString("ko-KR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t border-border text-[11px] text-muted-foreground bg-muted/30">
              {search ? `검색 결과 ${filtered.length}명` : `총 ${filtered.length}명 표시 (최대 200)`}
            </div>
          </div>
        )}

        <Dialog open={!!convTarget} onOpenChange={(o) => !o && setConvTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base">회원 유형 변경</DialogTitle>
            </DialogHeader>
            {convTarget && (
              <div className="space-y-4">
                <p className="text-[13px] text-muted-foreground">
                  {convTarget.nickname || convTarget.email || "회원"} 의 유형을 변경합니다.
                  역할·승인·제휴등급이 한 번에 적용돼요.
                </p>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-foreground">유형</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(["individual", "business", "partner"] as Affiliation[]).map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setConvAff(a)}
                        className={cn(
                          "h-9 rounded-lg border text-[12px] font-medium transition-colors",
                          convAff === a
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-muted-foreground",
                        )}
                      >
                        {AFFILIATION_LABEL[a]}
                      </button>
                    ))}
                  </div>
                </div>
                {convAff !== "individual" && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-foreground">업종</p>
                    <select
                      value={convCat}
                      onChange={(e) => setConvCat(e.target.value)}
                      className="w-full text-sm border border-border rounded-md px-2 py-2 bg-background text-foreground"
                    >
                      {SERVICE_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-muted-foreground">
                      사업자번호·상호 등은 자동 임시값으로 생성되고, 업체가 추후 업체정보에서 보완해요.
                    </p>
                  </div>
                )}
                {convAff === "individual" && (
                  <p className="text-[12px] text-amber-700 bg-amber-50 rounded-lg p-2">
                    기업/제휴 권한이 회수되고 업체 정보는 비공개(검토)로 전환돼요.
                  </p>
                )}
                <div className="flex gap-2 justify-end pt-1">
                  <Button variant="ghost" onClick={() => setConvTarget(null)} disabled={converting}>취소</Button>
                  <Button onClick={submitAffiliation} disabled={converting}>
                    {converting ? <Loader2 className="w-4 h-4 animate-spin" /> : "변경"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </AdminLayout>
    </AdminGuard>
  );
};

const RoleBadge = ({ role }: { role: string }) => {
  const config: Record<string, { label: string; icon: typeof UserIcon; color: string }> = {
    admin: { label: "운영자", icon: Crown, color: "bg-purple-100 text-purple-700" },
    business: { label: "업체", icon: Building2, color: "bg-blue-100 text-blue-700" },
    individual: { label: "일반", icon: UserIcon, color: "bg-gray-100 text-gray-700" },
  };
  const c = config[role] ?? {
    label: role,
    icon: Shield,
    color: "bg-gray-100 text-gray-600",
  };
  const Icon = c.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium",
        c.color,
      )}
    >
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
};

const EmptyState = ({ search }: { search: string }) => (
  <div className="text-center py-20 px-6">
    <h2 className="text-base font-semibold text-foreground mb-2">
      {search ? "검색 결과 없음" : "가입 사용자가 없어요"}
    </h2>
    <p className="text-sm text-muted-foreground">
      {search ? "다른 키워드로 검색해보세요" : "첫 사용자가 가입하면 여기에 표시됩니다"}
    </p>
  </div>
);

export default AdminUsers;
