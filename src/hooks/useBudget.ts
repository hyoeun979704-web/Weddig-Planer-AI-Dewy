import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { getRegionalAvgWithMeal, regionalAverages, regions, type BudgetCategory } from "@/data/budgetData";
import type { WeddingStyle } from "@/lib/weddingStyle";

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

export function useBudget(profileRegionKey?: string, weddingStyle?: WeddingStyle | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["budget-settings", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await (supabase as any)
        .from("budget_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as BudgetSettings | null;
    },
    enabled: !!user,
  });

  const itemsQuery = useQuery({
    queryKey: ["budget-items", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("budget_items")
        .select("*")
        .eq("user_id", user.id)
        .order("item_date", { ascending: false });
      if (error) throw error;
      return (data || []) as BudgetItem[];
    },
    enabled: !!user,
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
  // Style-aware regional average. When weddingStyle is small/self we apply
  // category multipliers (venue·sdm·etc) so the "지역 평균 vs 내 예산"
  // comparison reflects the user's actual scope. Falls back to general
  // (un-adjusted) when style is null/general/custom or settings missing.
  const styleDefaultGuests = weddingStyle === "self" ? 25 : weddingStyle === "small" ? 50 : 200;
  const effectiveGuestCount = settings?.guest_count ?? styleDefaultGuests;
  const styleAvg = getRegionalAvgWithMeal(effectiveRegion, effectiveGuestCount, weddingStyle ?? undefined);
  const regionalAverage = styleAvg ?? regionalAverages[effectiveRegion] ?? regionalAverages.seoul;

  const saveSettings = useMutation({
    mutationFn: async (s: Partial<BudgetSettings>) => {
      if (!user) throw new Error("로그인이 필요합니다");
      const payload = { ...s, user_id: user.id };
      if (settings) {
        const { error } = await (supabase as any)
          .from("budget_settings")
          .update(payload)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("budget_settings")
          .insert(payload);
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
  };
}
