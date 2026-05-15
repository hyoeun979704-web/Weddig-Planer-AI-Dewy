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
