// Normalization rules for tip_videos.categories.
//
// The collector pools the same video across multiple seed-query categories,
// so a single video can end up tagged ["general", "studio"]. The card UI
// uses the first category as the primary badge, which means "general"
// outranks the more specific match — surfacing an uninformative badge and
// pushing the actual topic into a secondary slot that visually resembles a
// keyword tag (which is what we want `tags[]` to be reserved for).
//
// Rule: when a video has at least one specific category, drop "general".
// "general" is only meaningful as the fallback for videos that have no
// more specific home (overall planning guides, budget summaries, etc.).

export const GENERAL_CATEGORY = "general";

export function normalizeTipCategories(
  cats: ReadonlyArray<string>
): string[] {
  if (cats.length === 0) return [];
  // Preserve incoming order while dropping duplicates.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of cats) {
    if (!c || seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  if (out.length > 1 && out.includes(GENERAL_CATEGORY)) {
    return out.filter((c) => c !== GENERAL_CATEGORY);
  }
  return out;
}

// Picks the primary category by match strength. The collector counts how
// many distinct seed queries returned a video for each category — a video
// matched by 3 dress queries and 1 wedding-hall query is more about
// dresses than venues, regardless of which query happened to run first.
// Ties fall back to the `tiebreaker` order (typically TIP_CATEGORIES) so
// the result is deterministic across runs.
export function orderCategoriesByMatchCount(
  matches: ReadonlyMap<string, number>,
  tiebreaker: ReadonlyArray<string>
): string[] {
  const rank = (slug: string) => {
    const i = tiebreaker.indexOf(slug);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return Array.from(matches.entries())
    .sort((a, b) => (b[1] - a[1]) || (rank(a[0]) - rank(b[0])))
    .map(([slug]) => slug);
}

