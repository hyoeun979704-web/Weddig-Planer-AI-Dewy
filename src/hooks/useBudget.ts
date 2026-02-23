import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { regionalAverages, type BudgetCategory } from "@/data/budgetData";

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
  created_at: string;
}

export interface BudgetSummary {
  totalSpent: number;
  remaining: number;
  categoryTotals: Record<string, number>;
  paidByTotals: Record<string, number>;
}

export function useBudget() {
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

  const summary: BudgetSummary = {
    totalSpent: items.reduce((s, i) => s + i.amount, 0),
    remaining: (settings?.total_budget || 0) - items.reduce((s, i) => s + i.amount, 0),
    categoryTotals: items.reduce((acc, i) => {
      acc[i.category] = (acc[i.category] || 0) + i.amount;
      return acc;
    }, {} as Record<string, number>),
    paidByTotals: items.reduce((acc, i) => {
      acc[i.paid_by] = (acc[i.paid_by] || 0) + i.amount;
      return acc;
    }, {} as Record<string, number>),
  };

  const regionalAverage = settings ? regionalAverages[settings.region] : regionalAverages.seoul;

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
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budget-settings"] }),
  });

  const addItem = useMutation({
    mutationFn: async (item: Omit<BudgetItem, "id" | "user_id" | "created_at">) => {
      if (!user) throw new Error("로그인이 필요합니다");
      const { error } = await (supabase as any)
        .from("budget_items")
        .insert({ ...item, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budget-items"] }),
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
