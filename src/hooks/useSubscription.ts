import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Plan = "free" | "monthly" | "yearly";

interface Subscription {
  plan: Plan;
  status: string;
  price: number;
  started_at: string | null;
  expires_at: string | null;
  trial_ends_at: string | null;
  cancelled_at: string | null;
}

interface DailyUsage {
  used: number;
  limit: number | null;
  remaining: number | null;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage>({ used: 0, limit: 3, remaining: 3 });
  const [isLoading, setIsLoading] = useState(true);

  const isPremium = useCallback(() => {
    if (!subscription) return false;
    if (subscription.plan === "free") return false;
    if (subscription.status !== "active") return false;
    const now = new Date();
    if (subscription.trial_ends_at && new Date(subscription.trial_ends_at) > now) return true;
    if (subscription.expires_at && new Date(subscription.expires_at) > now) return true;
    return false;
  }, [subscription]);

  const isTrialActive = useCallback(() => {
    if (!subscription?.trial_ends_at) return false;
    return new Date(subscription.trial_ends_at) > new Date();
  }, [subscription]);

  const trialDaysLeft = useCallback(() => {
    if (!subscription?.trial_ends_at) return null;
    const diff = Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }, [subscription]);

  const fetchData = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setDailyUsage({ used: 0, limit: 3, remaining: 3 });
      setIsLoading(false);
      return;
    }

    try {
      const today = new Date().toISOString().split("T")[0];

      const [subRes, usageRes] = await Promise.all([
        supabase.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("ai_usage_daily").select("message_count").eq("user_id", user.id).eq("usage_date", today).maybeSingle(),
      ]);

      const sub = subRes.data;
      if (sub) {
        setSubscription({
          plan: sub.plan as Plan,
          status: sub.status,
          price: sub.price || 0,
          started_at: sub.started_at,
          expires_at: sub.expires_at,
          trial_ends_at: sub.trial_ends_at,
          cancelled_at: sub.cancelled_at,
        });
      } else {
        setSubscription({ plan: "free", status: "active", price: 0, started_at: null, expires_at: null, trial_ends_at: null, cancelled_at: null });
      }

      const used = usageRes.data?.message_count || 0;
      const premium = sub && sub.plan !== "free" && sub.status === "active" &&
        ((sub.trial_ends_at && new Date(sub.trial_ends_at) > new Date()) ||
         (sub.expires_at && new Date(sub.expires_at) > new Date()));

      setDailyUsage({
        used,
        limit: premium ? null : 3,
        remaining: premium ? null : Math.max(0, 3 - used),
      });
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const startTrial = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    try {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 30);

      const { error } = await supabase.from("subscriptions").upsert({
        user_id: user.id,
        plan: "monthly",
        status: "active",
        price: 0,
        trial_ends_at: trialEnd.toISOString(),
        expires_at: trialEnd.toISOString(),
        started_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      if (error) throw error;
      await fetchData();
      return true;
    } catch (error) {
      console.error("Failed to start trial:", error);
      return false;
    }
  }, [user, fetchData]);

  const subscribe = useCallback(async (plan: "monthly" | "yearly"): Promise<boolean> => {
    if (!user) return false;
    try {
      const expiresAt = new Date();
      if (plan === "monthly") expiresAt.setMonth(expiresAt.getMonth() + 1);
      else expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      const price = plan === "monthly" ? 4900 : 39000;

      const { error } = await supabase.from("subscriptions").upsert({
        user_id: user.id,
        plan,
        status: "active",
        price,
        expires_at: expiresAt.toISOString(),
        started_at: new Date().toISOString(),
        trial_ends_at: null,
        cancelled_at: null,
      }, { onConflict: "user_id" });

      if (error) throw error;
      await fetchData();
      return true;
    } catch (error) {
      console.error("Failed to subscribe:", error);
      return false;
    }
  }, [user, fetchData]);

  const cancelSubscription = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    try {
      const { error } = await supabase.from("subscriptions").update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      }).eq("user_id", user.id);

      if (error) throw error;
      await fetchData();
      return true;
    } catch (error) {
      console.error("Failed to cancel:", error);
      return false;
    }
  }, [user, fetchData]);

  return {
    plan: subscription?.plan || "free" as Plan,
    isPremium: isPremium(),
    isTrialActive: isTrialActive(),
    trialDaysLeft: trialDaysLeft(),
    expiresAt: subscription?.expires_at ? new Date(subscription.expires_at) : null,
    dailyUsage,
    isLoading,
    startTrial,
    subscribe,
    cancelSubscription,
    refetch: fetchData,
  };
};
