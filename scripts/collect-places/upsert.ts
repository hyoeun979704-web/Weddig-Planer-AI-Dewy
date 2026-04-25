import { createClient } from "@supabase/supabase-js";
import type { CollectedPlace } from "./types";

interface SupabaseEnv {
  url: string;
  serviceRoleKey: string;
}

export async function upsertPlaces(items: CollectedPlace[], env: SupabaseEnv) {
  if (items.length === 0) return { inserted: 0, updated: 0 };
  const supabase = createClient(env.url, env.serviceRoleKey, {
    auth: { persistSession: false },
  });

  const rows = items.map((p) => ({
    name: p.name,
    category: p.category,
    city: p.city,
    district: p.district,
    description: p.description,
    main_image_url: p.main_image_url,
    tags: p.tags,
    lat: p.lat,
    lng: p.lng,
    data_source: p.data_source,
    confidence: p.confidence,
    last_source_date: p.last_source_date,
    source_refs: p.source_refs,
    is_active: true,
  }));

  // We dedupe inside the script; here we insert and let Postgres assign place_id.
  // For idempotency across runs, prefer manual lookup-then-update (TODO).
  const { data, error } = await supabase
    .from("places")
    .insert(rows)
    .select("place_id");

  if (error) {
    console.error("Upsert failed:", error.message);
    throw error;
  }
  return { inserted: data?.length ?? 0, updated: 0 };
}
