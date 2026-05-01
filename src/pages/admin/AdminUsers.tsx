import { useEffect, useState, useCallback } from "react";
import { Loader2, Search, Heart, Crown, Shield, User as UserIcon, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface UserProfile {
  user_id: string;
  email: string | null;
  nickname: string | null;
  created_at: string;
  // 조인된 데이터
  roles: string[];
  hearts_balance: number;
  hearts_spent: number;
  fittings_count: number;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    // profiles 기준으로 조회 (auth.users는 직접 조회 어려움)
    const { data: profiles, error } = await (supabase as any)
      .from("profiles")
      .select("user_id, email, nickname, created_at")
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

    // 역할·하트·피팅 데이터 병렬 조회
    const [rolesRes, heartsRes, fittingsRes] = await Promise.all([
      (supabase as any).from("user_roles").select("user_id, role").in("user_id", userIds),
      (supabase as any)
        .from("user_hearts")
        .select("user_id, balance, total_spent")
        .in("user_id", userIds),
      (supabase as any)
        .from("dress_fittings")
        .select("user_id")
        .in("user_id", userIds),
    ]);

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
      nickname: p.nickname,
      created_at: p.created_at,
      roles: rolesByUser[p.user_id] ?? [],
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

  const filtered = search
    ? users.filter(
        (u) =>
          u.email?.toLowerCase().includes(search.toLowerCase()) ||
          u.nickname?.toLowerCase().includes(search.toLowerCase()),
      )
    : users;

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
                    <th className="text-left px-4 py-2 font-semibold">사용자</th>
                    <th className="text-left px-4 py-2 font-semibold">역할</th>
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
                        <div className="text-foreground">{u.nickname || "(닉네임 없음)"}</div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                          {u.email || u.user_id}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.length === 0 && (
                            <RoleBadge role="individual" />
                          )}
                          {u.roles.map((r) => (
                            <RoleBadge key={r} role={r} />
                          ))}
                        </div>
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
