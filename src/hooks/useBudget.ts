import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCouplePartnerId } from "@/hooks/useCouplePartnerId";
import { toast } from "@/hooks/use-toast";
import { regionalAverages, regions, type BudgetCategory } from "@/data/budgetData";

export interface BudgetSettings {
  id: string;
  user_id: string;
  region: string;
  guest_count: number;
  total_budget: number;
  category_budgets: Record<BudgetCategory, number>;
  created_at: string;
  updated_at: string;
}

export interface BudgetItem {
  id: string;
  user_id: string;
  category: string;
  title: string;
  amount: number;
  paid_by: string;
  item_date: string;
  memo: string | null;
  has_balance: boolean;
  balance_amount: number | null;
  balance_due_date: string | null;
  payment_stage: string;
  payment_method: string;
  created_at: string;
  /** NOT NULL in DB (migration 20260513120000), set by trigger on update.
   *  Older rows backfilled to now() at migration time. */
  updated_at: string;
}

export interface BudgetSummary {
  totalSpent: number;
  remaining: number;
  categoryTotals: Record<string, number>;
  paidByTotals: Record<string, number>;
}

export function useBudget(profileRegionKey?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // 커플 연동 시 예산은 둘이 공유한다. 지출 항목은 양쪽 user_id 를 합쳐서 읽고,
  // 설정(총예산·지역·항목별)은 커플당 하나 — 연결 생성자(linkOwnerId)의 행을
  // 정식(canonical)으로 본다. (RLS: 20260606190000_couple_data_sharing)
  const { partnerId, linkOwnerId } = useCouplePartnerId();
  // 설정의 정식 소유자: 연결돼 있으면 생성자, 아니면 본인.
  const settingsOwnerId = linkOwnerId ?? user?.id ?? null;
  const coupleUserIds = useMemo(
    () => (user ? (partnerId ? [user.id, partnerId] : [user.id]) : []),
    [user, partnerId],
  );

  const settingsQuery = useQuery({
    // 키 첫 두 요소는 ["budget-settings", user.id] 로 유지 — 외부 invalidate 가
    // prefix 매칭되도록. settingsOwnerId 는 연동 전후 캐시 분리용.
    queryKey: ["budget-settings", user?.id, settingsOwnerId],
    queryFn: async () => {
      if (!user) return null;
      const owner = settingsOwnerId ?? user.id;
      const { data, error } = await (supabase as any)
        .from("budget_settings")
        .select("*")
        .eq("user_id", owner)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as BudgetSettings;
      // 정식 소유자(파트너)가 아직 예산 설정을 안 만들었으면 내 행으로 폴백.
      if (owner !== user.id) {
        const { data: mine } = await (supabase as any)
          .from("budget_settings")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        return (mine ?? null) as BudgetSettings | null;
      }
      return null;
    },
    enabled: !!user,
    // 개인 데이터 — 변경은 mutation 이 invalidate 하므로 탭 복귀마다 refetch 불필요.
    staleTime: 60_000,
  });

  const itemsQuery = useQuery({
    queryKey: ["budget-items", user?.id, partnerId],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("budget_items")
        .select("*")
        .in("user_id", coupleUserIds)
        .order("item_date", { ascending: false });
      if (error) throw error;
      return (data || []) as BudgetItem[];
    },
    enabled: !!user,
    // 개인 데이터 — 변경은 mutation 이 invalidate 하므로 탭 복귀마다 refetch 불필요.
    staleTime: 60_000,
  });

  const settings = settingsQuery.data;
  const items = itemsQuery.data || [];

  // Single-pass aggregation. Memoized on (items, total_budget) so re-renders
  // triggered by unrelated state (sheet toggles, etc.) don't recompute the
  // 3-bucket reduce on every paint. Strict mode would otherwise run this
  // twice per render.
  const summary = useMemo<BudgetSummary>(() => {
    const categoryTotals: Record<string, number> = {};
    const paidByTotals: Record<string, number> = {};
    let totalSpent = 0;
    for (const i of items) {
      totalSpent += i.amount;
      categoryTotals[i.category] = (categoryTotals[i.category] || 0) + i.amount;
      paidByTotals[i.paid_by] = (paidByTotals[i.paid_by] || 0) + i.amount;
    }
    return {
      totalSpent,
      remaining: (settings?.total_budget || 0) - totalSpent,
      categoryTotals,
      paidByTotals,
    };
  }, [items, settings?.total_budget]);

  const effectiveRegion = settings?.region || profileRegionKey || "seoul";
  const regionalAverage = regionalAverages[effectiveRegion] || regionalAverages.seoul;

  const saveSettings = useMutation({
    mutationFn: async (s: Partial<BudgetSettings>) => {
      if (!user) throw new Error("로그인이 필요합니다");
      if (settings) {
        // 정식 행은 파트너 소유일 수 있으므로 user_id 는 절대 덮어쓰지 않는다
        // (덮어쓰면 행 소유권이 바뀜). 커플 UPDATE RLS 가 파트너 행 수정 허용.
        const { user_id: _ignore, ...patch } = s as Partial<BudgetSettings>;
        void _ignore;
        const { error } = await (supabase as any)
          .from("budget_settings")
          .update(patch)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("budget_settings")
          .insert({ ...s, user_id: user.id });
        if (error) throw error;
      }

      // Mirror region into user_wedding_settings using the official long
      // label so the Schedule page's region picker (which lists long forms)
      // matches. Update-only: we deliberately don't insert a settings row
      // here because that would skip the onboarding flow (planning_stage,
      // schedule template seeding, etc.). If the user hasn't onboarded yet,
      // they'll do it via WeddingInfoSetupModal and the region picker there
      // will use the long form they see in budget anyway.
      if (s.region) {
        const officialLabel = regions[s.region]?.officialLabel;
        if (officialLabel) {
          await supabase
            .from("user_wedding_settings")
            .update({ wedding_region: officialLabel } as any)
            .eq("user_id", user.id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-settings"] });
      queryClient.invalidateQueries({ queryKey: ["default-region"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "예산 설정 저장에 실패했어요";
      toast({ title: "저장 실패", description: msg, variant: "destructive" });
    },
  });

  // All three item mutations surface failures as a destructive toast. Without
  // this, schema mismatches (e.g. the old INTEGER amount column silently
  // rejecting decimal inserts) leave the user staring at an apparently-closed
  // sheet with no new row in the list and no clue why. Caller-supplied
  // onError is still honored.
  const addItem = useMutation({
    mutationFn: async (item: Omit<BudgetItem, "id" | "user_id" | "created_at">) => {
      if (!user) throw new Error("로그인이 필요합니다");
      const { data, error } = await (supabase as any)
        .from("budget_items")
        .insert({ ...item, user_id: user.id })
        .select("id")
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budget-items"] }),
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "지출 기록에 실패했어요";
      toast({ title: "저장 실패", description: msg, variant: "destructive" });
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...item }: Partial<BudgetItem> & { id: string }) => {
      const { error } = await (supabase as any)
        .from("budget_items")
        .update(item)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budget-items"] }),
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "수정에 실패했어요";
      toast({ title: "수정 실패", description: msg, variant: "destructive" });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("budget_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budget-items"] }),
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "삭제에 실패했어요";
      toast({ title: "삭제 실패", description: msg, variant: "destructive" });
    },
  });

  return {
    settings,
    items,
    summary,
    regionalAverage,
    isLoading: settingsQuery.isLoading || itemsQuery.isLoading,
    saveSettings,
    addItem,
    updateItem,
    deleteItem,
    refetchItems: itemsQuery.refetch,
  };
}
