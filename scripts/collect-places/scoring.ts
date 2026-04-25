import type { CollectedPlace } from "./types";

export function scoreConfidence(p: CollectedPlace): number {
  let score = 0;

  const hasOfficial = p.source_refs.some((r) => r.source_type === "official");
  const hasLocal = p.source_refs.some((r) => r.source_type === "local");
  const blogCafeCount = p.source_refs.filter(
    (r) => r.source_type === "blog" || r.source_type === "cafe"
  ).length;

  if (hasOfficial) score += 30;
  if (hasLocal) score += 20;
  if (blogCafeCount >= 2) score += 10;

  // Recency
  if (p.last_source_date) {
    const ageMonths =
      (Date.now() - new Date(p.last_source_date).getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (ageMonths <= 12) score += 10;
  }

  // Field completeness
  if (p.name && p.city && p.district) score += 10;

  // Penalty: only single blog source
  if (!hasOfficial && !hasLocal && blogCafeCount <= 1) score -= 30;

  return Math.max(0, Math.min(100, score));
}
