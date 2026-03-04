import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXTERNAL_URL = "https://fjzffmmzudhxguvpapxj.supabase.co";
const EXTERNAL_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqemZmbW16dWRoeGd1dnBhcHhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NDA4NTUsImV4cCI6MjA4ODExNjg1NX0.7HO5dMBHcRQ8edRkkaKAFPXcVem0AazotiM2ngeAocY";

// Try a broad set of possible table names
const POSSIBLE_TABLES = [
  "venues", "venue_halls", "venue_special_points",
  "studios", "honeymoon", "honeymoon_gifts",
  "appliances", "suits", "hanbok", "invitation_venues",
  "partner_deals", "products", "profiles",
  "community_posts", "community_comments",
  "categories", "services", "packages",
  "wedding_halls", "wedding_venues", "wedding_packages",
  "photographers", "planners", "florists",
  "reviews", "bookmarks", "inquiries",
  "banners", "notices", "events", "coupons",
  "stores", "store_items", "shop_items",
  "articles", "magazines", "blogs", "posts",
  "users", "members", "customers",
  "orders", "order_items", "cart_items", "payments",
  "favorites", "likes", "comments",
  "notifications", "messages",
  "settings", "configs",
  "influencers", "deals",
  "budget_items", "budget_settings",
  "subscriptions", "ai_usage_daily",
  "couple_links", "couple_votes", "couple_diary",
  "user_wedding_settings", "user_schedule_items",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const externalClient = createClient(EXTERNAL_URL, EXTERNAL_KEY);
    const results: Record<string, { exists: boolean; rowCount?: number; sampleRow?: any; columns?: string[] }> = {};

    for (const table of POSSIBLE_TABLES) {
      try {
        const { data, error, count } = await externalClient
          .from(table)
          .select("*", { count: "exact" })
          .limit(1);

        if (error) {
          results[table] = { exists: false };
        } else {
          const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
          results[table] = {
            exists: true,
            rowCount: count ?? 0,
            columns,
            sampleRow: data?.[0] || null,
          };
        }
      } catch {
        results[table] = { exists: false };
      }
    }

    // Filter to only existing tables
    const existingTables = Object.fromEntries(
      Object.entries(results).filter(([_, v]) => v.exists)
    );

    return new Response(JSON.stringify({ existingTables }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
