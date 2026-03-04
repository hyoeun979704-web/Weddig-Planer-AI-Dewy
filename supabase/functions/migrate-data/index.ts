import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXTERNAL_URL = "https://fjzffmmzudhxguvpapxj.supabase.co";
const EXTERNAL_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqemZmbW16dWRoeGd1dnBhcHhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NDA4NTUsImV4cCI6MjA4ODExNjg1NX0.7HO5dMBHcRQ8edRkkaKAFPXcVem0AazotiM2ngeAocY";

// external table -> local table mapping with column renames
const MIGRATION_MAP: Array<{
  externalTable: string;
  localTable: string;
  idField: string;
}> = [
  { externalTable: "vendors", localTable: "vendors", idField: "vendor_id" },
  { externalTable: "wedding_halls", localTable: "ext_wedding_halls", idField: "vendor_id" },
  { externalTable: "products", localTable: "ext_products", idField: "item_id" },
  { externalTable: "product_options", localTable: "product_options", idField: "option_id" },
  { externalTable: "shopping_products", localTable: "shopping_products", idField: "shopping_product_id" },
  { externalTable: "events", localTable: "events", idField: "event_id" },
  { externalTable: "reviews", localTable: "reviews", idField: "review_id" },
  { externalTable: "hanbok", localTable: "ext_hanbok", idField: "hanbok_id" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const externalClient = createClient(EXTERNAL_URL, EXTERNAL_KEY);
    const LOCAL_URL = Deno.env.get("SUPABASE_URL")!;
    const LOCAL_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const localClient = createClient(LOCAL_URL, LOCAL_SERVICE_KEY);

    const results: Record<string, any> = {};

    // Must migrate in order (vendors first due to FK)
    for (const mapping of MIGRATION_MAP) {
      try {
        // Fetch all from external
        let allData: any[] = [];
        let page = 0;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await externalClient
            .from(mapping.externalTable)
            .select("*")
            .range(page * 1000, (page + 1) * 1000 - 1);

          if (error) {
            results[mapping.externalTable] = { error: `fetch: ${error.message}` };
            hasMore = false;
            break;
          }
          if (data && data.length > 0) {
            allData = allData.concat(data);
            hasMore = data.length === 1000;
            page++;
          } else {
            hasMore = false;
          }
        }

        if (results[mapping.externalTable]?.error) continue;
        if (allData.length === 0) {
          results[mapping.externalTable] = { fetched: 0, inserted: 0 };
          continue;
        }

        // Upsert into local
        const { error: insertError } = await localClient
          .from(mapping.localTable)
          .upsert(allData, { onConflict: mapping.idField });

        if (insertError) {
          results[mapping.externalTable] = {
            fetched: allData.length,
            inserted: 0,
            error: `insert: ${insertError.message}`,
          };
        } else {
          results[mapping.externalTable] = {
            fetched: allData.length,
            inserted: allData.length,
          };
        }
      } catch (e) {
        results[mapping.externalTable] = { error: String(e) };
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
