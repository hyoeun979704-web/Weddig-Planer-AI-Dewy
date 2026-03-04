import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXTERNAL_URL = "https://fjzffmmzudhxguvpapxj.supabase.co";
const EXTERNAL_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqemZmbW16dWRoeGd1dnBhcHhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NDA4NTUsImV4cCI6MjA4ODExNjg1NX0.7HO5dMBHcRQ8edRkkaKAFPXcVem0AazotiM2ngeAocY";

// Map of local table -> allowed columns (based on current Lovable Cloud schema)
const TABLE_COLUMNS: Record<string, string[]> = {
  venues: ["id","name","address","thumbnail_url","rating","review_count","price_per_person","min_guarantee","is_partner","created_at","updated_at","hall_types","meal_options","event_options"],
  venue_halls: ["id","venue_id","name","hall_type","thumbnail_url","floor","capacity_min","capacity_max","price_per_person","meal_price","ceremony_fee","size_pyeong","created_at","updated_at"],
  venue_special_points: ["id","venue_id","title","description","icon","category","created_at"],
  studios: ["id","name","address","thumbnail_url","price_per_person","min_guarantee","rating","review_count","is_partner","created_at","updated_at","package_types","style_options","service_options"],
  honeymoon: ["id","name","destination","price_range","duration","thumbnail_url","rating","review_count","is_partner","created_at","updated_at","trip_types","included_services","accommodation_types"],
  honeymoon_gifts: ["id","name","brand","price_range","thumbnail_url","rating","review_count","is_partner","created_at","updated_at","category_types","brand_options","delivery_options"],
  appliances: ["id","name","brand","price_range","thumbnail_url","rating","review_count","is_partner","created_at","updated_at","category_types","brand_options","feature_options"],
  suits: ["id","name","address","price_range","thumbnail_url","rating","review_count","is_partner","created_at","updated_at","suit_types","brand_options","service_options"],
  hanbok: ["id","name","address","price_range","thumbnail_url","rating","review_count","is_partner","created_at","updated_at","hanbok_types","style_options","service_options"],
  invitation_venues: ["id","name","address","price_range","capacity_range","thumbnail_url","rating","review_count","is_partner","created_at","updated_at","venue_types","amenity_options","cuisine_options"],
  partner_deals: ["id","partner_name","partner_logo_url","banner_image_url","category","deal_type","discount_info","coupon_code","external_url","terms","title","description","short_description","original_price","deal_price","start_date","end_date","is_featured","is_active","display_order","view_count","claim_count","created_at","updated_at"],
  products: ["id","name","description","thumbnail_url","images","price","sale_price","stock","is_active","category","created_at","updated_at"],
};

function filterColumns(row: Record<string, unknown>, allowedColumns: string[]): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};
  for (const col of allowedColumns) {
    if (col in row) {
      filtered[col] = row[col];
    }
  }
  return filtered;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const externalClient = createClient(EXTERNAL_URL, EXTERNAL_KEY);
    const LOCAL_URL = Deno.env.get("SUPABASE_URL")!;
    const LOCAL_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const localClient = createClient(LOCAL_URL, LOCAL_SERVICE_KEY);

    const results: Record<string, { fetched: number; inserted: number; error?: string }> = {};

    for (const [table, columns] of Object.entries(TABLE_COLUMNS)) {
      try {
        // Fetch from external with pagination
        let allData: any[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await externalClient
            .from(table)
            .select("*")
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (error) {
            results[table] = { fetched: 0, inserted: 0, error: `fetch: ${error.message}` };
            hasMore = false;
            break;
          }

          if (data && data.length > 0) {
            allData = allData.concat(data);
            hasMore = data.length === pageSize;
            page++;
          } else {
            hasMore = false;
          }
        }

        if (results[table]?.error) continue;
        if (allData.length === 0) {
          results[table] = { fetched: 0, inserted: 0 };
          continue;
        }

        // Filter to only allowed columns
        const filteredData = allData.map(row => filterColumns(row, columns));

        // Upsert in batches of 100
        let insertedCount = 0;
        const batchSize = 100;
        for (let i = 0; i < filteredData.length; i += batchSize) {
          const batch = filteredData.slice(i, i + batchSize);
          const { error: insertError } = await localClient
            .from(table)
            .upsert(batch, { onConflict: "id" });

          if (insertError) {
            results[table] = { fetched: allData.length, inserted: insertedCount, error: `insert batch ${i}: ${insertError.message}` };
            break;
          }
          insertedCount += batch.length;
        }

        if (!results[table]) {
          results[table] = { fetched: allData.length, inserted: insertedCount };
        }
      } catch (e) {
        results[table] = { fetched: 0, inserted: 0, error: String(e) };
      }
    }

    return new Response(JSON.stringify({ success: true, results }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
