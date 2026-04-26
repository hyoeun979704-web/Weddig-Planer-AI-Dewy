#!/usr/bin/env tsx
// Backfill place_details from Naver Local. The original collection threw
// away `telephone` and `description`, so detail pages show "(준비중)" for
// phone everywhere. Re-fetches once per place via name + region search,
// pulls telephone/description/tags from the matching item, upserts into
// place_details.
//
// Usage:
//   npm run enrich-place-details                       # all categories
//   npm run enrich-place-details -- --category=웨딩홀  # one category
//   npm run enrich-place-details -- --limit=200
//   npm run enrich-place-details -- --dry-run

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { searchLocal, type LocalItem } from "./sources/naver";
import { CATEGORIES, CategoryLabel } from "./utils/categories";

interface Args {
  limit: number;
  dryRun: boolean;
  category?: CategoryLabel;
}

function parseArgs(): Args {
  const args: Args = { limit: 5000, dryRun: false };
  for (const a of process.argv.slice(2)) {
    if (a === "--dry-run") args.dryRun = true;
    else if (a.startsWith("--limit=")) args.limit = +a.split("=")[1];
    else if (a.startsWith("--category=")) args.category = a.split("=")[1] as CategoryLabel;
  }
  return args;
}

const stripTags = (s: string) => s.replace(/<\/?[^>]+>/g, "").trim();

function nameMatches(a: string, b: string): boolean {
  const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();
  return norm(a) === norm(b) || norm(a).includes(norm(b)) || norm(b).includes(norm(a));
}

async function main() {
  const args = parseArgs();
  if (!process.env.NAVER_CLIENT_ID || !process.env.NAVER_CLIENT_SECRET) {
    console.error("Missing NAVER_CLIENT_ID / NAVER_CLIENT_SECRET");
    process.exit(1);
  }
  if (!args.dryRun && (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (or use --dry-run)");
    process.exit(1);
  }

  const naverEnv = {
    clientId: process.env.NAVER_CLIENT_ID!,
    clientSecret: process.env.NAVER_CLIENT_SECRET!,
  };
  const supabase = createClient(
    process.env.SUPABASE_URL ?? "https://qabeywyzjsgyqpjqsvkd.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    { auth: { persistSession: false } }
  );

  const placeCategory = args.category ? CATEGORIES[args.category] : undefined;

  console.log(
    `\n[enrich-place-details] category=${args.category ?? "all"} limit=${args.limit} dry-run=${args.dryRun}`
  );

  let q = supabase
    .from("places")
    .select("place_id, name, category, city, district")
    .eq("is_active", true)
    .is("deleted_at", null);
  if (placeCategory) q = q.eq("category", placeCategory);

  const { data: places, error } = await q.limit(args.limit);
  if (error) {
    console.error("places query failed:", error.message);
    process.exit(1);
  }

  // Skip places that already have a telephone in place_details (already done).
  const placeIds = (places ?? []).map((p) => p.place_id);
  const { data: existing } = await supabase
    .from("place_details")
    .select("place_id, tel")
    .in("place_id", placeIds);
  const haveTel = new Set(
    (existing ?? []).filter((d) => d.tel && d.tel !== "").map((d) => d.place_id)
  );
  const targets = (places ?? []).filter((p) => !haveTel.has(p.place_id));
  console.log(`[enrich-place-details] ${targets.length} places need details`);

  let filledTel = 0;
  let filledDesc = 0;
  let nothing = 0;
  for (let i = 0; i < targets.length; i++) {
    const p = targets[i];
    const region = [p.city, p.district].filter(Boolean).join(" ");
    const query = `${p.name} ${region}`.trim();
    process.stdout.write(`  · [${i + 1}/${targets.length}] ${p.name} ... `);

    const local: LocalItem[] = await searchLocal(query, naverEnv, 5).catch(() => []);
    const match =
      local.find((l) => nameMatches(stripTags(l.title), p.name)) ?? local[0] ?? null;

    if (!match) {
      console.log("no match");
      nothing++;
      continue;
    }

    const tel = match.telephone?.trim() || null;
    const description = match.description ? stripTags(match.description) : null;
    if (!tel && !description) {
      console.log("no fields");
      nothing++;
      continue;
    }

    if (args.dryRun) {
      console.log(`would set tel=${tel ?? "—"} desc=${description ? description.slice(0, 30) : "—"}`);
      if (tel) filledTel++;
      if (description) filledDesc++;
      continue;
    }

    // Upsert place_details row. Only set fields we have new info for; preserve
    // anything else already there.
    const update: Record<string, unknown> = { place_id: p.place_id };
    if (tel) update.tel = tel;
    if (description) update.description = description;

    const { error: upsertErr } = await supabase
      .from("place_details")
      .upsert(update, { onConflict: "place_id" });

    if (upsertErr) {
      console.log(`upsert failed: ${upsertErr.message.slice(0, 80)}`);
      nothing++;
    } else {
      const parts: string[] = [];
      if (tel) {
        parts.push(`tel`);
        filledTel++;
      }
      if (description) {
        parts.push(`desc`);
        filledDesc++;
      }
      console.log(`✓ ${parts.join("+")}`);
    }
  }

  console.log(
    `\n[enrich-place-details] tel=${filledTel} desc=${filledDesc} skipped=${nothing}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
