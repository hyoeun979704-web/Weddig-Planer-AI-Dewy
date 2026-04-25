// Fuzzy dedupe by normalized (name, region) tuple.
// Two records merge when name similarity >= 0.85 AND same district (or both unknown).

import type { CollectedPlace } from "./types";

const norm = (s: string | null) =>
  (s ?? "")
    .toLowerCase()
    .replace(/[\s\-_·.,()\/]+/g, "")
    .replace(/주식회사|㈜|株|公司|inc\.?|co\.?|ltd\.?/gi, "");

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const al = a.length, bl = b.length;
  if (!al) return bl;
  if (!bl) return al;
  const v0 = Array(bl + 1).fill(0).map((_, i) => i);
  const v1 = Array(bl + 1).fill(0);
  for (let i = 0; i < al; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < bl; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= bl; j++) v0[j] = v1[j];
  }
  return v1[bl];
}

function similarity(a: string, b: string): number {
  const A = norm(a), B = norm(b);
  if (!A || !B) return 0;
  const dist = levenshtein(A, B);
  return 1 - dist / Math.max(A.length, B.length);
}

function mergeOne(into: CollectedPlace, from: CollectedPlace): CollectedPlace {
  return {
    ...into,
    description: into.description ?? from.description,
    main_image_url: into.main_image_url ?? from.main_image_url,
    lat: into.lat ?? from.lat,
    lng: into.lng ?? from.lng,
    tags: Array.from(new Set([...(into.tags ?? []), ...(from.tags ?? [])])),
    source_refs: [...(into.source_refs ?? []), ...(from.source_refs ?? [])],
    last_source_date:
      into.last_source_date && from.last_source_date
        ? into.last_source_date > from.last_source_date
          ? into.last_source_date
          : from.last_source_date
        : into.last_source_date ?? from.last_source_date,
  };
}

export function dedupe(items: CollectedPlace[]): CollectedPlace[] {
  const buckets: CollectedPlace[] = [];
  for (const it of items) {
    const idx = buckets.findIndex(
      (b) =>
        similarity(b.name, it.name) >= 0.85 &&
        ((b.district ?? "") === (it.district ?? "") || !b.district || !it.district)
    );
    if (idx >= 0) {
      buckets[idx] = mergeOne(buckets[idx], it);
    } else {
      buckets.push({ ...it });
    }
  }
  return buckets;
}
