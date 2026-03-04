import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXTERNAL_URL = "https://fjzffmmzudhxguvpapxj.supabase.co";
const EXTERNAL_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqemZmbW16dWRoeGd1dnBhcHhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NDA4NTUsImV4cCI6MjA4ODExNjg1NX0.7HO5dMBHcRQ8edRkkaKAFPXcVem0AazotiM2ngeAocY";

const VENDOR_TABLES = [
  "vendors", "vendor", "shops", "shop", "stores", "store",
  "companies", "company", "businesses", "business",
  "providers", "provider", "suppliers", "supplier",
  "partners", "partner", "merchants", "merchant",
  "wedding_vendors", "wedding_companies",
  "service_providers", "wedding_services",
  "vendor_categories", "vendor_items", "vendor_products",
  "vendor_services", "vendor_details", "vendor_info",
  "sdm", "studio", "dress", "makeup",
  "photographers", "florists", "planners",
  "trousseau", "trousseau_items", "shopping_products",
  "product_options", "item_options",
  "regions", "categories", "sub_categories",
  "halls", "ceremony_halls",
  "budgets", "budget_categories",
  "comments", "replies",
  "bookmarks", "wishlists", "favorites",
  "coupons", "promotions", "banners",
  "notifications", "messages", "inquiries",
  "faqs", "notices", "terms",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const externalClient = createClient(EXTERNAL_URL, EXTERNAL_KEY);
    const results: Record<string, any> = {};

    for (const table of VENDOR_TABLES) {
      try {
        const { data, error, count } = await externalClient
          .from(table)
          .select("*", { count: "exact" })
          .limit(2);

        if (!error) {
          const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
          results[table] = { rowCount: count, columns, sample: data };
        }
      } catch {}
    }

    return new Response(JSON.stringify({ tables: results }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
