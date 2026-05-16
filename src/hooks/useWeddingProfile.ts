import { useEffect, useMemo, useState } from "react";
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
  // Distinct category slugs whose schedule items the user has finished
  // (e.g. ["wedding_hall", "studio"] once the venue is booked and the
  // shoot is done). Drives tip-feed demotion so already-resolved topics
  // sink below ones still pending. "general" is filtered out — it
  // covers too broad a range to be a meaningful "done" signal.
  completedCategories: string[];
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
  const { weddingSettings, scheduleItems, isLoading: weddingLoading } = useWeddingSchedule();
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

  const completedCategories = useMemo(() => {
    const seen = new Set<string>();
    for (const item of scheduleItems) {
      if (!item.completed) continue;
      const c = item.category;
      // "general" tasks span vision/budget/RSVP/etc — too broad to use as
      // a demotion signal for an entire content category.
      if (!c || c === "general") continue;
      seen.add(c);
    }
    return Array.from(seen);
  }, [scheduleItems]);

  return {
    weddingDate: weddingSettings.wedding_date ?? "",
    region: settings?.region || weddingSettings.wedding_region || "seoul",
    totalBudget: settings?.total_budget ?? 0,
    guestCount: settings?.guest_count ?? 200,
    displayName,
    partnerName: weddingSettings.partner_name ?? "",
    weddingStyle: weddingSettings.wedding_style ?? "general",
    excludedCategories: weddingSettings.excluded_categories ?? [],
    completedCategories,
    isLoaded: !weddingLoading && profileLoaded,
  };
};
