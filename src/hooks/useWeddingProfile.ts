import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { useBudget } from "@/hooks/useBudget";
import type { WeddingStyle } from "@/lib/weddingStyle";

export interface WeddingProfilePrefill {
  weddingDate: string;        // YYYY-MM-DD, "" if unset
  region: string;              // budget region key (priority) → wedding_region → "seoul"
  totalBudget: number;         // budget total (만원), 0 if unset
  guestCount: number;          // budget guest_count, 200 if unset
  displayName: string;         // logged-in user's display name (profiles)
  partnerName: string;         // partner name from wedding settings
  weddingStyle: WeddingStyle;  // general | small | self | custom, "general" if unset
  // Schedule-side category slugs the user opted out of (e.g. ["studio",
  // "dress_shop", "makeup_shop"] for a self-wedding). Drives hiding logic
  // in Schedule, Budget, Home and Tips so the user only sees prep work
  // they actually plan to do.
  excludedCategories: string[];
  isLoaded: boolean;
}

/**
 * Aggregates user-registered wedding info into a single object suitable for
 * pre-filling premium PDF/template forms. Falls back to safe defaults when a
 * field hasn't been entered yet, so callers can spread the result into state
 * without conditionals.
 */
export const useWeddingProfile = (): WeddingProfilePrefill => {
  const { user } = useAuth();
  const { weddingSettings, isLoading: weddingLoading } = useWeddingSchedule();
  const budget = useBudget();
  const [displayName, setDisplayName] = useState<string>("");
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user) {
        setDisplayName("");
        setProfileLoaded(true);
        return;
      }
      try {
        const { data } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!cancelled) {
          setDisplayName((data?.display_name as string | null) ?? "");
          setProfileLoaded(true);
        }
      } catch {
        if (!cancelled) setProfileLoaded(true);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user]);

  const settings = budget.settings;

  return {
    weddingDate: weddingSettings.wedding_date ?? "",
    region: settings?.region || weddingSettings.wedding_region || "seoul",
    totalBudget: settings?.total_budget ?? 0,
    // Prefer the unified profile field; fall back to legacy budget_settings,
    // then to a sensible default. After migration 20260516170000 the two
    // should always be in sync, but during the transition / for users who
    // entered the value only in Budget pre-unification, settings is still
    // authoritative for an existing row.
    guestCount: settings?.guest_count ?? (weddingSettings as any).guest_count ?? 200,
    displayName,
    partnerName: weddingSettings.partner_name ?? "",
    weddingStyle: weddingSettings.wedding_style ?? "general",
    excludedCategories: weddingSettings.excluded_categories ?? [],
    isLoaded: !weddingLoading && profileLoaded,
  };
};
